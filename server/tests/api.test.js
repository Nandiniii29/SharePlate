import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set isolated test database path BEFORE importing server/store
const TEST_DB_PATH = path.join(__dirname, '../data/test-db.json');
const SEED_PATH = path.join(__dirname, '../data/seed.json');

process.env.DB_PATH = TEST_DB_PATH;
process.env.NODE_ENV = 'test';

// Import store and server
import { initializeDatabase } from '../data/store.js';
import app from '../server.js';

describe('SharePlate REST API & Persistence Test Suite', () => {
  let server;
  let baseUrl;

  // Setup isolated test environment
  before(async () => {
    // Copy seed.json to test-db.json to start with fresh test data
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    await initializeDatabase(TEST_DB_PATH, SEED_PATH);

    // Start server on an ephemeral random port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  // Teardown
  after(async () => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up temporary test database
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
    }
  });

  // ==========================================================================
  // 1. HEALTH CHECK
  // ==========================================================================
  it('GET /api/health returns ok status and server metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'SharePlate Backend API');
    assert.ok(typeof body.uptimeSeconds === 'number');
  });

  // ==========================================================================
  // 2. DONATION RETRIEVAL & SECURITY MASKING
  // ==========================================================================
  it('GET /api/donations returns seeded donations without exposing private verification codes', async () => {
    const res = await fetch(`${baseUrl}/api/donations`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.donations));
    assert.ok(body.donations.length >= 4);

    // Verify DON-001 exists and has priority score
    const don1 = body.donations.find(d => d.id === 'DON-001');
    assert.ok(don1);
    assert.equal(don1.donorName, 'Hostel 3 Mess Council');
    assert.ok(don1.priorityScore.score > 0);

    // SECURITY CHECK: verificationCode must not leak in public listing
    for (const d of body.donations) {
      for (const a of (d.allocations || [])) {
        assert.equal(a.verificationCode, undefined, 'Private verification code must never leak in public listings!');
      }
    }
  });

  it('GET /api/donations/:id returns specific donation or 404', async () => {
    const resValid = await fetch(`${baseUrl}/api/donations/DON-001`);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.donation.id, 'DON-001');

    const resInvalid = await fetch(`${baseUrl}/api/donations/NON_EXISTENT_ID`);
    assert.equal(resInvalid.status, 404);
  });

  // ==========================================================================
  // 3. CREATE DONATION & PRIORITY SCORE
  // ==========================================================================
  it('POST /api/donations creates a donation and calculates Rescue Priority Score', async () => {
    const newDonationPayload = {
      title: 'Hostel 5 Midnight Snacks Surplus',
      donorName: 'Hostel 5 Mess Committee',
      foodType: 'COOKED_HOT',
      storageCondition: 'AMBIENT',
      totalPortions: 80,
      isVeg: true,
      pickupWindowStart: '23:00',
      pickupWindowEnd: '00:30',
      safeConsumptionDeadline: new Date(Date.now() + 1.5 * 3600000).toISOString(),
      safetyStatus: {
        isCertifiedSafe: true,
        certifiedBy: 'Night Mess Supervisor'
      }
    };

    const res = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDonationPayload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.donation.title, newDonationPayload.title);
    assert.equal(body.donation.totalPortions, 80);
    assert.equal(body.donation.remainingPortions, 80);
    assert.equal(body.donation.status, 'AVAILABLE');
    assert.ok(body.donation.priorityScore.score >= 70);
  });

  it('POST /api/donations rejects invalid inputs with HTTP 400', async () => {
    // Missing title
    const resNoTitle = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorName: 'Canteen', totalPortions: 50 })
    });
    assert.equal(resNoTitle.status, 400);

    // Non-positive portions
    const resNegPortions = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Snacks', donorName: 'Canteen', totalPortions: -10 })
    });
    assert.equal(resNegPortions.status, 400);
  });

  // ==========================================================================
  // 4. SMART RECIPIENT MATCHING
  // ==========================================================================
  it('GET /api/donations/:id/matches returns ranked recipients with illustrative distance tags', async () => {
    const res = await fetch(`${baseUrl}/api/donations/DON-002/matches`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.donationId, 'DON-002');
    assert.ok(Array.isArray(body.matches));
    assert.ok(body.matches.length > 0);

    // Verify top match has illustrative sample distance flag
    const topMatch = body.matches[0];
    assert.ok(topMatch.distanceInfo.isIllustrativeSample, 'Distance must be labeled as illustrative sample');
    assert.ok(typeof topMatch.matchScore === 'number');
  });

  // ==========================================================================
  // 5. SPLIT CLAIMING & PORTION CONSERVATION
  // ==========================================================================
  it('POST /api/donations/:id/claims reserves portions and generates a secure rescue code', async () => {
    // DON-003 has 60 portions available
    const claimPayload = {
      recipientId: 'REC-001',
      recipientName: 'Robin Hood Army',
      portions: 25,
      notes: 'Volunteer bike team arriving at 19:00'
    };

    const res = await fetch(`${baseUrl}/api/donations/DON-003/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimPayload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.allocation.portions, 25);
    assert.ok(body.allocation.verificationCode.startsWith('SP-'), 'Rescue code should have SP- prefix');
    assert.equal(body.donation.remainingPortions, 35); // 60 - 25 = 35
    assert.equal(body.donation.status, 'PARTIALLY_ALLOCATED');
  });

  it('POST /api/donations/:id/claims rejects claims exceeding remaining portions', async () => {
    // DON-003 now has 35 portions remaining
    const overClaimPayload = {
      recipientId: 'REC-002',
      recipientName: 'Asha Kitchen',
      portions: 50 // Exceeds 35
    };

    const res = await fetch(`${baseUrl}/api/donations/DON-003/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overClaimPayload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exceeds currently available portions/i);
  });

  it('handles concurrent claims safely with Mutex lock', async () => {
    // DON-002 has 250 portions. Fire 3 claims of 40 portions simultaneously.
    const claimPromises = [1, 2, 3].map(i => 
      fetch(`${baseUrl}/api/donations/DON-002/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: `REC-CONCURRENT-${i}`,
          recipientName: `Concurrent Org ${i}`,
          portions: 40
        })
      }).then(r => r.json())
    );

    const results = await Promise.all(claimPromises);

    for (const r of results) {
      assert.equal(r.success, true, 'Every concurrent claim within capacity should succeed');
    }

    // Check donation remaining balance: 250 - (3 * 40) = 130
    const donRes = await fetch(`${baseUrl}/api/donations/DON-002`);
    const donBody = await donRes.json();
    assert.equal(donBody.donation.remainingPortions, 130);
    assert.equal(donBody.donation.allocatedPortions, 120);
  });

  // ==========================================================================
  // 6. CLAIM CANCELLATION
  // ==========================================================================
  it('POST /api/claims/:id/cancel releases portion and restores balance', async () => {
    // First, make a claim on DON-004 (90 portions)
    const claimRes = await fetch(`${baseUrl}/api/donations/DON-004/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-001',
        portions: 30
      })
    });
    const claimBody = await claimRes.json();
    const allocationId = claimBody.allocation.allocationId;

    // Verify remaining is 60
    assert.equal(claimBody.donation.remainingPortions, 60);

    // Now cancel the claim
    const cancelRes = await fetch(`${baseUrl}/api/claims/${allocationId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Vehicle tire puncture' })
    });

    assert.equal(cancelRes.status, 200);
    const cancelBody = await cancelRes.json();
    assert.equal(cancelBody.success, true);
    assert.equal(cancelBody.donation.remainingPortions, 90); // Restored!
  });

  // ==========================================================================
  // 7. FAILED-PICKUP RECOVERY & SAFETY GATE
  // ==========================================================================
  it('POST /api/claims/:id/report-failed-pickup approves re-matching when safe and time buffer exists', async () => {
    // Claim 20 portions on DON-001
    const claimRes = await fetch(`${baseUrl}/api/donations/DON-001/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-003',
        portions: 20
      })
    });
    const claimBody = await claimRes.json();
    const allocationId = claimBody.allocation.allocationId;

    // Report failure with certified safety intact and > 45 mins remaining
    const failRes = await fetch(`${baseUrl}/api/claims/${allocationId}/report-failed-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failureReason: 'VOLUNTEER_UNAVAILABLE',
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: false,
          sensoryInspectionPassed: true
        }
      })
    });

    assert.equal(failRes.status, 200);
    const failBody = await failRes.json();
    assert.equal(failBody.recovered, true);
    assert.match(failBody.message, /re-opened for rapid secondary matching/i);
    assert.ok(failBody.donation.recoveryAlert.isReallocationCandidate);
  });

  it('POST /api/claims/:id/report-failed-pickup strictly halts redistribution if food is compromised', async () => {
    // Create another claim
    const claimRes = await fetch(`${baseUrl}/api/donations/DON-001/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-005',
        portions: 15
      })
    });
    const claimBody = await claimRes.json();
    const allocationId = claimBody.allocation.allocationId;

    // Report failure with temperature abuse
    const failRes = await fetch(`${baseUrl}/api/claims/${allocationId}/report-failed-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failureReason: 'HELD_PAST_LIMIT',
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: true // Temperature abuse flagged!
        }
      })
    });

    assert.equal(failRes.status, 200);
    const failBody = await failRes.json();
    assert.equal(failBody.recovered, false);
    assert.match(failBody.message, /Redistribution strictly prevented/i);
    assert.equal(failBody.recoveryDetails.disposition, 'COMPOST_OR_DISPOSE_AUDIT');
  });

  // ==========================================================================
  // 8. PICKUP VERIFICATION HANDSHAKE
  // ==========================================================================
  it('POST /api/claims/:id/verify-pickup requires correct rescue code and prevents double-verification', async () => {
    // Create fresh claim on DON-002
    const claimRes = await fetch(`${baseUrl}/api/donations/DON-002/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-001',
        portions: 25
      })
    });
    const claimBody = await claimRes.json();
    const allocationId = claimBody.allocation.allocationId;
    const realCode = claimBody.allocation.verificationCode;

    // 1. Attempt with WRONG code -> should fail 400
    const wrongCodeRes = await fetch(`${baseUrl}/api/claims/${allocationId}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: 'SP-WRONG99',
        actualPortionsCollected: 25
      })
    });
    assert.equal(wrongCodeRes.status, 400);
    const wrongBody = await wrongCodeRes.json();
    assert.match(wrongBody.error, /Invalid rescue verification code/i);

    // 2. Attempt with CORRECT code -> should succeed 200
    const correctCodeRes = await fetch(`${baseUrl}/api/claims/${allocationId}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: realCode,
        actualPortionsCollected: 25,
        verifiedBy: 'Hostel Supervisor'
      })
    });
    assert.equal(correctCodeRes.status, 200);
    const correctBody = await correctCodeRes.json();
    assert.equal(correctBody.success, true);
    assert.equal(correctBody.pickup.actualPortionsCollected, 25);

    // 3. Attempt duplicate verification -> should be prevented with 400
    const duplicateRes = await fetch(`${baseUrl}/api/claims/${allocationId}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: realCode,
        actualPortionsCollected: 25
      })
    });
    assert.equal(duplicateRes.status, 400);
    const dupBody = await duplicateRes.json();
    assert.match(dupBody.error, /already verified previously/i);
  });

  // ==========================================================================
  // 9. VERIFIED IMPACT DASHBOARD
  // ==========================================================================
  it('GET /api/impact aggregates only verified pickups and includes methodology disclaimers', async () => {
    const res = await fetch(`${baseUrl}/api/impact`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(typeof body.verifiedSummary.totalPickupsCompleted === 'number');
    assert.ok(body.verifiedSummary.totalMealsRescued >= 25);
    assert.ok(body.verifiedSummary.estimatedFoodWeightKg > 0);
    assert.ok(body.verifiedSummary.estimatedCo2ePreventedKg > 0);
    assert.ok(body.verifiedSummary.estimatedWaterSavedLiters > 0);

    // Methodology & assumptions check
    assert.ok(body.methodologyAndAssumptions.disclaimer.includes('Environmental metrics are research-backed estimates'));
    assert.ok(body.leaderboard.donors.length > 0);
    assert.ok(body.leaderboard.recipients.length > 0);
  });
});
