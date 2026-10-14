import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import our 4 core engines
import { 
  calculateRescuePriorityScore, 
  evaluateSafetyEligibility 
} from '../engines/priorityScore.js';

import { 
  calculateMatchScore, 
  matchRecipients, 
  checkWindowOverlap,
  timeStringToMinutes 
} from '../engines/smartMatcher.js';

import { 
  createDonationState, 
  validateClaim, 
  allocateClaim, 
  releaseClaim, 
  auditPortionConservation 
} from '../engines/splitMatcher.js';

import { 
  evaluateFailedPickupRecovery, 
  RECOVERY_DEFAULTS 
} from '../engines/recoveryEngine.js';

// ============================================================================
// 1. RESCUE PRIORITY SCORE (RPS) TESTS
// ============================================================================
describe('Innovation 1: Rescue Priority Score (RPS) Engine', () => {

  it('calculates high urgency for hot cooked meal expiring in 90 minutes', () => {
    const result = calculateRescuePriorityScore({
      foodType: 'COOKED_HOT',
      hoursUntilExpiry: 1.5,
      storageCondition: 'AMBIENT',
      estimatedTransitMinutes: 20,
      safetyData: { isCertifiedSafe: true }
    });

    assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
    assert.equal(result.urgencyLevel, 'CRITICAL');
    assert.equal(result.eligibleForRescue, true);
    assert.equal(result.breakdown.foodType, 'COOKED_HOT');
    assert.equal(result.breakdown.perishabilityScore, 35);
    assert.equal(result.breakdown.timeUrgencyScore, 38);
    assert.equal(result.breakdown.storageRiskScore, 15);
  });

  it('calculates HIGH urgency for refrigerated meal expiring in 3 hours', () => {
    const result = calculateRescuePriorityScore({
      foodType: 'COOKED_CHILLED',
      hoursUntilExpiry: 3,
      storageCondition: 'REFRIGERATED',
      estimatedTransitMinutes: 20,
      safetyData: { isCertifiedSafe: true }
    });

    assert.ok(result.score >= 50 && result.score < 80, `Expected score in [50, 80), got ${result.score}`);
    assert.equal(result.urgencyLevel, 'HIGH');
    assert.equal(result.eligibleForRescue, true);
  });

  it('keeps food-safety as a strict prerequisite: uncertified food is NOT eligible', () => {
    const result = calculateRescuePriorityScore({
      foodType: 'COOKED_HOT',
      hoursUntilExpiry: 0.5,
      storageCondition: 'AMBIENT',
      safetyData: { isCertifiedSafe: false, rejectionReason: 'Suspected bacterial contamination' }
    });

    // Score can be high due to urgency, but eligibleForRescue MUST be false
    assert.equal(result.eligibleForRescue, false);
    assert.equal(result.safetyStatus.passed, false);
    assert.match(result.safetyStatus.reason, /Suspected bacterial contamination/i);
    assert.ok(result.safetyStatus.disclaimer.includes('does not certify food safety'));
  });

  it('marks expired food (hours <= 0) as not eligible for rescue', () => {
    const result = calculateRescuePriorityScore({
      foodType: 'COOKED_HOT',
      hoursUntilExpiry: 0,
      storageCondition: 'AMBIENT',
      safetyData: { isCertifiedSafe: true }
    });

    assert.equal(result.eligibleForRescue, false);
    assert.equal(result.urgencyLevel, 'LOW');
  });

  it('scores shelf-stable packaged pantry food with lower urgency than hot meals', () => {
    const pantryResult = calculateRescuePriorityScore({
      foodType: 'PACKAGED_PANTRY',
      hoursUntilExpiry: 48,
      storageCondition: 'AMBIENT',
      safetyData: { isCertifiedSafe: true }
    });

    const hotMealResult = calculateRescuePriorityScore({
      foodType: 'COOKED_HOT',
      hoursUntilExpiry: 1.5,
      storageCondition: 'AMBIENT',
      safetyData: { isCertifiedSafe: true }
    });

    assert.ok(
      pantryResult.score < hotMealResult.score,
      `Expected pantry score (${pantryResult.score}) < hot meal score (${hotMealResult.score})`
    );
  });

  it('detects temperature abuse and sensory failure in safety evaluator', () => {
    const tempAbuse = evaluateSafetyEligibility({ isCertifiedSafe: true, hasTemperatureAbuse: true });
    assert.equal(tempAbuse.passed, false);
    assert.match(tempAbuse.reason, /Temperature abuse/i);

    const sensoryFail = evaluateSafetyEligibility({ isCertifiedSafe: true, passedSensoryCheck: false });
    assert.equal(sensoryFail.passed, false);
    assert.match(sensoryFail.reason, /sensory inspection/i);
  });
});

// ============================================================================
// 2. SMART RECIPIENT MATCHING TESTS
// ============================================================================
describe('Innovation 2: Smart Recipient Matcher Engine', () => {

  const sampleDonation = {
    id: 'DON-001',
    portionsAvailable: 150,
    pickupWindowStart: '13:00',
    pickupWindowEnd: '15:30',
    isVeg: true
  };

  const sampleRecipients = [
    {
      id: 'REC-01',
      name: 'City Care Shelter',
      isVerified: true,
      capacityMin: 20,
      capacityMax: 200,
      acceptsNonVeg: true,
      operatingHoursStart: '10:00',
      operatingHoursEnd: '18:00',
      illustrativeDistanceKm: 1.2
    },
    {
      id: 'REC-02',
      name: 'Youth Hostel Kitchen',
      isVerified: true,
      capacityMin: 10,
      capacityMax: 80, // Needs Split-and-Match!
      acceptsNonVeg: true,
      operatingHoursStart: '12:00',
      operatingHoursEnd: '16:00',
      illustrativeDistanceKm: 3.5
    },
    {
      id: 'REC-03',
      name: 'Unverified Community Pantry',
      isVerified: false, // Should be rejected
      capacityMin: 10,
      capacityMax: 100,
      acceptsNonVeg: true,
      operatingHoursStart: '10:00',
      operatingHoursEnd: '18:00',
      illustrativeDistanceKm: 0.8
    },
    {
      id: 'REC-04',
      name: 'Night Shelter (Closed during afternoon)',
      isVerified: true,
      capacityMin: 50,
      capacityMax: 300,
      acceptsNonVeg: true,
      operatingHoursStart: '19:00',
      operatingHoursEnd: '23:00', // No window overlap
      illustrativeDistanceKm: 2.0
    }
  ];

  it('ranks verified compatible recipients and tags illustrative distances', () => {
    const matches = matchRecipients(sampleDonation, sampleRecipients);

    // REC-01 should be top match (can take full batch, close distance, verified)
    assert.equal(matches[0].recipientId, 'REC-01');
    assert.equal(matches[0].isCompatible, true);
    assert.equal(matches[0].canTakeFullBatch, true);
    assert.equal(matches[0].distanceInfo.isIllustrativeSample, true);
    assert.ok(matches[0].matchScore > 80);

    // REC-02 is a Split-and-Match candidate because 150 > capacityMax (80)
    const rec2Match = matches.find(m => m.recipientId === 'REC-02');
    assert.equal(rec2Match.isCompatible, true);
    assert.equal(rec2Match.canTakeFullBatch, false);
    assert.equal(rec2Match.recommendationTag, 'Split-and-Match Candidate');
    assert.equal(rec2Match.recommendedPortionsToOffer, 80);
  });

  it('rejects unverified recipients strictly', () => {
    const result = calculateMatchScore(sampleDonation, sampleRecipients[2]);
    assert.equal(result.isCompatible, false);
    assert.equal(result.matchScore, 0);
    assert.match(result.rejectionReason, /not yet verified/i);
  });

  it('rejects recipients whose operating hours do not overlap with pickup window', () => {
    const result = calculateMatchScore(sampleDonation, sampleRecipients[3]);
    assert.equal(result.isCompatible, false);
    assert.equal(result.matchScore, 0);
    assert.match(result.rejectionReason, /does not overlap/i);
  });

  it('rejects non-veg food when recipient strictly accepts only vegetarian meals', () => {
    const nonVegDonation = { ...sampleDonation, isVeg: false };
    const vegOnlyRecipient = {
      id: 'REC-VEG',
      name: 'Ashram Community Kitchen',
      isVerified: true,
      capacityMin: 20,
      capacityMax: 200,
      acceptsNonVeg: false,
      operatingHoursStart: '10:00',
      operatingHoursEnd: '18:00',
      illustrativeDistanceKm: 2.0
    };

    const match = calculateMatchScore(nonVegDonation, vegOnlyRecipient);
    assert.equal(match.isCompatible, false);
    assert.match(match.rejectionReason, /does not accept non-vegetarian/i);
  });

  it('correctly parses time strings and calculates window overlaps', () => {
    assert.equal(timeStringToMinutes('01:30'), 90);
    assert.equal(timeStringToMinutes('14:45'), 885);
    assert.equal(timeStringToMinutes('invalid'), null);

    const overlap = checkWindowOverlap('13:00', '15:00', '14:00', '16:00');
    assert.equal(overlap.overlaps, true);
    assert.equal(overlap.overlapMinutes, 60);

    const noOverlap = checkWindowOverlap('10:00', '12:00', '13:00', '15:00');
    assert.equal(noOverlap.overlaps, false);
    assert.equal(noOverlap.overlapMinutes, 0);
  });
});

// ============================================================================
// 3. SPLIT-AND-MATCH ALLOCATION TESTS
// ============================================================================
describe('Innovation 3: Split-and-Match Allocation Engine', () => {

  it('initializes donation state with proper portion balance', () => {
    const state = createDonationState(200, { id: 'DON-FEST-200' });
    assert.equal(state.totalPortions, 200);
    assert.equal(state.allocatedPortions, 0);
    assert.equal(state.remainingPortions, 200);
    assert.equal(state.status, 'AVAILABLE');

    const audit = auditPortionConservation(state);
    assert.equal(audit.isSound, true);
  });

  it('allows multiple recipients to share one donation without over-allocation', () => {
    let state = createDonationState(250, { id: 'DON-MEGA-FEST' });

    // Recipient A claims 100 portions
    const claimA = allocateClaim(state, {
      recipientId: 'REC-A',
      recipientName: 'Hope Foundation',
      portions: 100
    });
    assert.equal(claimA.success, true);
    state = claimA.updatedState;
    assert.equal(state.allocatedPortions, 100);
    assert.equal(state.remainingPortions, 150);
    assert.equal(state.status, 'PARTIALLY_ALLOCATED');

    // Recipient B claims 80 portions
    const claimB = allocateClaim(state, {
      recipientId: 'REC-B',
      recipientName: 'City Shelter',
      portions: 80
    });
    assert.equal(claimB.success, true);
    state = claimB.updatedState;
    assert.equal(state.allocatedPortions, 180);
    assert.equal(state.remainingPortions, 70);

    // Recipient C claims exact remaining 70 portions
    const claimC = allocateClaim(state, {
      recipientId: 'REC-C',
      recipientName: 'Student Kitchen',
      portions: 70
    });
    assert.equal(claimC.success, true);
    state = claimC.updatedState;
    assert.equal(state.allocatedPortions, 250);
    assert.equal(state.remainingPortions, 0);
    assert.equal(state.status, 'FULLY_ALLOCATED');

    // Audit must confirm strict mathematical conservation
    const audit = auditPortionConservation(state);
    assert.equal(audit.isSound, true);
    assert.equal(audit.details.activeSum, 250);
  });

  it('strictly rejects any claim exceeding remaining available portions', () => {
    const state = createDonationState(50);
    
    // Attempting to claim 60 when only 50 exist
    const overClaim = allocateClaim(state, {
      recipientId: 'REC-GREEDY',
      recipientName: 'Greedy Org',
      portions: 60
    });

    assert.equal(overClaim.success, false);
    assert.match(overClaim.error, /exceeds currently available portions/i);
    // Original state untouched
    assert.equal(state.remainingPortions, 50);
  });

  it('rejects invalid inputs: zero, negative, floats, and empty recipient ID', () => {
    const state = createDonationState(100);

    assert.equal(allocateClaim(state, { recipientId: 'R1', portions: 0 }).success, false);
    assert.equal(allocateClaim(state, { recipientId: 'R1', portions: -10 }).success, false);
    assert.equal(allocateClaim(state, { recipientId: 'R1', portions: 12.5 }).success, false);
    assert.equal(allocateClaim(state, { recipientId: '', portions: 10 }).success, false);
  });

  it('releases an allocation cleanly upon cancellation and restores portion balance', () => {
    let state = createDonationState(100);
    const claim = allocateClaim(state, {
      recipientId: 'REC-CANCEL',
      portions: 40
    });
    state = claim.updatedState;
    assert.equal(state.remainingPortions, 60);

    // Now release the claim
    const released = releaseClaim(state, claim.allocation.allocationId, 'VOLUNTARY_CANCEL');
    assert.equal(released.success, true);
    assert.equal(released.releasedPortions, 40);

    state = released.updatedState;
    assert.equal(state.allocatedPortions, 0);
    assert.equal(state.remainingPortions, 100);
    assert.equal(state.status, 'AVAILABLE');

    const audit = auditPortionConservation(state);
    assert.equal(audit.isSound, true);
  });
});

// ============================================================================
// 4. FAILED-PICKUP RECOVERY TESTS
// ============================================================================
describe('Innovation 4: Failed-Pickup Recovery Engine', () => {

  const baseNow = new Date('2026-10-14T12:00:00Z');

  it('approves recovery and secondary matching when food is certified safe and 120 mins remain', () => {
    const result = evaluateFailedPickupRecovery({
      donation: {
        id: 'DON-REC-01',
        safeConsumptionDeadline: new Date('2026-10-14T14:00:00Z').toISOString(), // 120 mins from baseNow
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: false,
          sensoryInspectionPassed: true
        }
      },
      failedAllocation: {
        allocationId: 'ALC-FAIL-01',
        portions: 50,
        failureReason: 'TRANSPORT_BREAKDOWN',
        previousRecoveryAttempts: 0
      },
      options: {
        currentTime: baseNow,
        minimumCollectionWindowMinutes: 45
      }
    });

    assert.equal(result.canRecover, true);
    assert.equal(result.decision, 'APPROVED_FOR_REALLOCATION');
    assert.equal(result.disposition, 'SECONDARY_MATCHING_BROADCAST');
    assert.equal(result.portionsToReclaim, 50);
    assert.equal(result.minutesRemaining, 120);
    assert.equal(result.newAttemptNumber, 1);
  });

  it('strictly forbids recovery if food safety is uncertain or compromised', () => {
    const result = evaluateFailedPickupRecovery({
      donation: {
        id: 'DON-UNSAFE-01',
        safeConsumptionDeadline: new Date('2026-10-14T15:00:00Z').toISOString(),
        safetyStatus: {
          isCertifiedSafe: false, // Safety uncertified!
          rejectionReason: 'Held at ambient temperature without temperature logs'
        }
      },
      failedAllocation: {
        allocationId: 'ALC-02',
        portions: 40,
        failureReason: 'NO_SHOW'
      },
      options: { currentTime: baseNow }
    });

    assert.equal(result.canRecover, false);
    assert.equal(result.decision, 'REJECTED_UNSAFE');
    assert.equal(result.disposition, 'COMPOST_OR_DISPOSE_AUDIT');
    assert.equal(result.auditRecord.outcome, 'FOOD_SAFETY_GATE_FAILED');
  });

  it('forbids recovery if temperature abuse occurred during the waiting delay', () => {
    const result = evaluateFailedPickupRecovery({
      donation: {
        id: 'DON-TEMP-01',
        safeConsumptionDeadline: new Date('2026-10-14T14:30:00Z').toISOString(),
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: true // Temperature abuse flagged!
        }
      },
      failedAllocation: {
        allocationId: 'ALC-03',
        portions: 30,
        failureReason: 'DRIVER_DELAY'
      },
      options: { currentTime: baseNow }
    });

    assert.equal(result.canRecover, false);
    assert.equal(result.decision, 'REJECTED_TEMPERATURE_ABUSE');
    assert.equal(result.disposition, 'COMPOST_OR_DISPOSE_AUDIT');
    assert.equal(result.auditRecord.outcome, 'TEMPERATURE_ABUSE_DETECTED');
  });

  it('forbids recovery if remaining time is below the minimum logistical buffer (e.g. 25m < 45m)', () => {
    const result = evaluateFailedPickupRecovery({
      donation: {
        id: 'DON-TIGHT-01',
        safeConsumptionDeadline: new Date('2026-10-14T12:25:00Z').toISOString(), // Only 25 mins left
        safetyStatus: {
          isCertifiedSafe: true,
          hasTemperatureAbuse: false,
          sensoryInspectionPassed: true
        }
      },
      failedAllocation: {
        allocationId: 'ALC-04',
        portions: 60,
        failureReason: 'NO_SHOW'
      },
      options: {
        currentTime: baseNow,
        minimumCollectionWindowMinutes: 45 // 45 mins needed
      }
    });

    assert.equal(result.canRecover, false);
    assert.equal(result.decision, 'REJECTED_INSUFFICIENT_TIME');
    assert.equal(result.disposition, 'COMPOST_OR_DISPOSE_AUDIT');
    assert.equal(result.minutesRemaining, 25);
    assert.match(result.reason, /Only 25 minutes remain/i);
  });

  it('stops endless loops when maximum recovery attempts (2) are exceeded', () => {
    const result = evaluateFailedPickupRecovery({
      donation: {
        id: 'DON-LOOP-01',
        safeConsumptionDeadline: new Date('2026-10-14T15:00:00Z').toISOString(),
        safetyStatus: { isCertifiedSafe: true }
      },
      failedAllocation: {
        allocationId: 'ALC-05',
        portions: 50,
        failureReason: 'SECOND_DRIVER_BREAKDOWN',
        previousRecoveryAttempts: 2 // Already attempted twice
      },
      options: {
        currentTime: baseNow,
        maxAllowedRecoveryAttempts: 2
      }
    });

    assert.equal(result.canRecover, false);
    assert.equal(result.decision, 'REJECTED_MAX_ATTEMPTS_EXCEEDED');
    assert.equal(result.disposition, 'HUMAN_AUDIT_REVIEW');
  });
});
