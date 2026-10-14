import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const DB_PATH = path.join(__dirname, '../data/db.json');

describe('End-to-End Live System Verification & QA Suite', () => {

  let testDonationId;
  let testClaimId;
  let testVerificationCode;

  // ==========================================================================
  // 1. BACKEND & PROXY CONNECTIVITY
  // ==========================================================================
  it('1. Backend health check responds on http://localhost:5000/api/health', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'SharePlate Backend API');
  });

  it('1b. Vite proxy forwards requests successfully on port 5173', async () => {
    const res = await fetch('http://localhost:5173/api/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  // ==========================================================================
  // 2. DONOR WORKFLOW & VALIDATION
  // ==========================================================================
  it('2. Donor Workflow: Creates food donation with validation & calculates RPS', async () => {
    // A. Validation check: Missing title should fail
    const invalidRes = await fetch(`${BASE_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorName: 'QA Mess', totalPortions: 50 })
    });
    assert.equal(invalidRes.status, 400);

    // B. Validation check: Negative portions should fail
    const invalidPortionsRes = await fetch(`${BASE_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Meal', donorName: 'QA Mess', totalPortions: -20 })
    });
    assert.equal(invalidPortionsRes.status, 400);

    // C. Valid donation creation
    const validPayload = {
      title: 'QA Special Veg Pulao Surplus',
      donorName: 'Hostel 1 Dining Hall',
      donorContact: 'mess-h1@campus.edu',
      location: 'Hostel 1 Food Counter',
      foodType: 'COOKED_HOT',
      storageCondition: 'HOT_HOLDING',
      totalPortions: 60,
      isVeg: true,
      pickupWindowStart: '20:00',
      pickupWindowEnd: '22:30',
      safeConsumptionDeadline: new Date(Date.now() + 2 * 3600000).toISOString(),
      safetyStatus: {
        isCertifiedSafe: true,
        certifiedBy: 'Chief Inspector Verma',
        notes: 'Hygienically covered and thermal temp verified.'
      }
    };

    const res = await fetch(`${BASE_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    });
    assert.equal(res.status, 201);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.donation.id);
    assert.equal(body.donation.title, validPayload.title);
    assert.equal(body.donation.remainingPortions, 60);
    assert.equal(body.donation.status, 'AVAILABLE');
    assert.ok(body.donation.priorityScore.score >= 70, 'Priority score should be computed');

    testDonationId = body.donation.id;

    // D. Persistence Verification: Verify saved to db.json on disk
    assert.ok(fs.existsSync(DB_PATH));
    const rawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const foundOnDisk = rawDb.donations.find(d => d.id === testDonationId);
    assert.ok(foundOnDisk, 'Created donation must persist to db.json on disk');
  });

  // ==========================================================================
  // 3. RECIPIENT MATCHING & SPLIT-AND-MATCH CLAIMING
  // ==========================================================================
  it('3. Recipient Matching: Smart Recipient Matcher ranks partners with illustrative distance', async () => {
    const res = await fetch(`${BASE_URL}/api/donations/${testDonationId}/matches`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.matches));
    assert.ok(body.matches.length > 0);

    const top = body.matches[0];
    assert.equal(top.distanceInfo.isIllustrativeSample, true, 'Distances must be labeled illustrative');
    assert.ok(typeof top.matchScore === 'number');
  });

  it('4. Split-and-Match: Claims split portions and checks conservation', async () => {
    // Initial: 60 portions. Claim 25 portions.
    const claimRes = await fetch(`${BASE_URL}/api/donations/${testDonationId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-001',
        recipientName: 'Robin Hood Army (Campus Chapter)',
        portions: 25,
        notes: 'Arriving in 20 mins'
      })
    });
    assert.equal(claimRes.status, 201);
    const claimBody = await claimRes.json();

    assert.equal(claimBody.success, true);
    assert.equal(claimBody.allocation.portions, 25);
    assert.ok(claimBody.allocation.verificationCode.startsWith('SP-'), 'Rescue code must be generated');
    assert.equal(claimBody.donation.remainingPortions, 35); // 60 - 25 = 35
    assert.equal(claimBody.donation.status, 'PARTIALLY_ALLOCATED');

    testClaimId = claimBody.allocation.allocationId;
    testVerificationCode = claimBody.allocation.verificationCode;

    // Over-allocation prevention: Attempt to claim 40 when only 35 remain
    const overRes = await fetch(`${BASE_URL}/api/donations/${testDonationId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-002',
        portions: 40
      })
    });
    assert.equal(overRes.status, 400);
    const overBody = await overRes.json();
    assert.match(overBody.error, /exceeds currently available portions/i);
  });

  it('5. Privacy Protection: Verification code is hidden in public listings but visible on recipient pass', async () => {
    // Check public listing: GET /api/donations
    const pubRes = await fetch(`${BASE_URL}/api/donations/${testDonationId}`);
    assert.equal(pubRes.status, 200);
    const pubBody = await pubRes.json();
    for (const alc of pubBody.donation.allocations) {
      assert.equal(alc.verificationCode, undefined, 'Public endpoints must NOT expose private verification code!');
    }

    // Check authorized recipient endpoint: GET /api/recipients/REC-001/claims
    const recRes = await fetch(`${BASE_URL}/api/recipients/REC-001/claims`);
    assert.equal(recRes.status, 200);
    const recBody = await recRes.json();
    const myClaim = recBody.claims.find(c => c.allocationId === testClaimId);
    assert.ok(myClaim);
    assert.equal(myClaim.verificationCode, testVerificationCode, 'Authorized recipient must see their rescue pass code');
  });

  // ==========================================================================
  // 4. CLAIM CANCELLATION
  // ==========================================================================
  it('6. Claim Cancellation: Restores portions back to surplus balance', async () => {
    // Create temporary claim of 10 portions (remaining: 35 -> 25)
    const tempRes = await fetch(`${BASE_URL}/api/donations/${testDonationId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-003',
        portions: 10
      })
    });
    const tempBody = await tempRes.json();
    assert.equal(tempBody.donation.remainingPortions, 25);
    const cancelId = tempBody.allocation.allocationId;

    // Cancel this claim
    const cancelRes = await fetch(`${BASE_URL}/api/claims/${cancelId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'QA Cancellation Test' })
    });
    assert.equal(cancelRes.status, 200);
    const cancelBody = await cancelRes.json();
    assert.equal(cancelBody.success, true);
    assert.equal(cancelBody.donation.remainingPortions, 35, 'Portions must be restored to 35');
  });

  // ==========================================================================
  // 5. PICKUP VERIFICATION HANDSHAKE
  // ==========================================================================
  it('7. Pickup Verification Handshake: Rejects wrong code, accepts valid code, prevents duplicates', async () => {
    // A. Wrong code handshake -> HTTP 400
    const wrongRes = await fetch(`${BASE_URL}/api/claims/${testClaimId}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: 'SP-FAKE99',
        actualPortionsCollected: 25
      })
    });
    assert.equal(wrongRes.status, 400);
    const wrongBody = await wrongRes.json();
    assert.match(wrongBody.error, /Invalid rescue verification code/i);

    // B. Correct code handshake -> HTTP 200
    const correctRes = await fetch(`${BASE_URL}/api/claims/${testClaimId}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: testVerificationCode,
        actualPortionsCollected: 25,
        verifiedBy: 'QA Supervisor'
      })
    });
    assert.equal(correctRes.status, 200);
    const correctBody = await correctRes.json();
    assert.equal(correctBody.success, true);
    assert.equal(correctBody.pickup.actualPortionsCollected, 25);

    // C. Duplicate verification attempt -> HTTP 400
    const dupRes = await fetch(`${BASE_URL}/api/claims/${testClaimId}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: testVerificationCode,
        actualPortionsCollected: 25
      })
    });
    assert.equal(dupRes.status, 400);
    const dupBody = await dupRes.json();
    assert.match(dupBody.error, /already verified previously/i);
  });

  // ==========================================================================
  // 6. FAILED-PICKUP RECOVERY & FOOD SAFETY GATES
  // ==========================================================================
  it('8. Failed-Pickup Recovery: Reclaims when safe & buffer >= 45m; blocks when unsafe', async () => {
    // A. Permitted Recovery: Safe food with plenty of time
    const claimForRecovery = await fetch(`${BASE_URL}/api/donations/${testDonationId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-001',
        portions: 15
      })
    });
    const c1 = await claimForRecovery.json();
    const c1Id = c1.allocation.allocationId;

    const recoveryPermittedRes = await fetch(`${BASE_URL}/api/claims/${c1Id}/report-failed-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failureReason: 'PUNCTURED_TYRE',
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: false,
          sensoryInspectionPassed: true
        }
      })
    });
    assert.equal(recoveryPermittedRes.status, 200);
    const r1 = await recoveryPermittedRes.json();
    assert.equal(r1.recovered, true, 'Recovery must be approved for safe food with time buffer');

    // B. Blocked Recovery: Unsafe food with temperature abuse
    const claimForBlock = await fetch(`${BASE_URL}/api/donations/${testDonationId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'REC-002',
        portions: 10
      })
    });
    const c2 = await claimForBlock.json();
    const c2Id = c2.allocation.allocationId;

    const recoveryBlockedRes = await fetch(`${BASE_URL}/api/claims/${c2Id}/report-failed-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failureReason: 'TEMPERATURE_ABUSE',
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: true // Temperature abuse flagged!
        }
      })
    });
    assert.equal(recoveryBlockedRes.status, 200);
    const r2 = await recoveryBlockedRes.json();
    assert.equal(r2.recovered, false, 'Recovery must be blocked if temperature abuse occurred');
    assert.equal(r2.recoveryDetails.disposition, 'COMPOST_OR_DISPOSE_AUDIT');
  });

  // ==========================================================================
  // 7. VERIFIED IMPACT DASHBOARD
  // ==========================================================================
  it('9. Verified Impact: Aggregates strictly from completed pickups with methodology constants', async () => {
    const res = await fetch(`${BASE_URL}/api/impact`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(body.verifiedSummary.totalMealsRescued >= 25, 'Must count the 25 verified meals');
    assert.ok(body.verifiedSummary.totalPickupsCompleted >= 1);
    assert.ok(body.verifiedSummary.estimatedFoodWeightKg > 0);
    assert.ok(body.verifiedSummary.estimatedCo2ePreventedKg > 0);
    assert.ok(body.verifiedSummary.estimatedWaterSavedLiters > 0);

    // Transparency check
    assert.ok(body.methodologyAndAssumptions.disclaimer.includes('Environmental metrics are research-backed estimates'));
  });
});
