/**
 * Rescue Priority Score (RPS) Engine
 * 
 * IMPORTANT FOOD SAFETY PRINCIPLE:
 * The Rescue Priority Score measures LOGISTICAL URGENCY, NOT BIOLOGICAL OR CHEMICAL SAFETY.
 * A high urgency score must NEVER be treated as a proof or guarantee that the food is safe.
 * Food safety is a separate, mandatory eligibility gate that must be verified by the donor
 * or qualified personnel before any redistribution can take place.
 */

// Perishability baseline weights (Max 35 points)
// Reflects how rapidly the food degrades under normal conditions.
const PERISHABILITY_WEIGHTS = {
  COOKED_HOT: 35,       // High moisture, high protein cooked dishes (curries, gravies, rice, meat)
  COOKED_CHILLED: 28,   // Pre-chilled cooked meals
  FRESH_PRODUCE: 20,    // Cut vegetables, salad greens, ripe fruits
  BAKED_DRY: 12,        // Bread, rotis, pastries, dry snacks
  PACKAGED_PANTRY: 5    // Sealed boxes, biscuits, dry pulses
};

// Storage risk weights (Max 15 points)
// Ambient cooked food has the highest risk of entering the temperature danger zone (5°C - 60°C).
const STORAGE_RISK_WEIGHTS = {
  AMBIENT: 15,          // Left at room temperature
  HOT_HOLDING: 10,      // Maintained above 60°C (safe while held, but must be transported urgently)
  REFRIGERATED: 5,      // Maintained below 5°C
  FROZEN: 2             // Kept frozen
};

/**
 * Calculate time urgency score based on remaining safe hours (Max 45 points)
 * @param {number} hoursRemaining - Hours left until donor-specified consumption deadline
 * @returns {number} Score between 0 and 45
 */
function calculateTimeUrgencyScore(hoursRemaining) {
  if (typeof hoursRemaining !== 'number' || isNaN(hoursRemaining) || hoursRemaining <= 0) {
    return 0; // Expired or invalid time has 0 logistical rescue urgency
  }

  if (hoursRemaining < 1.0) {
    return 45; // Critical urgency: under 1 hour remaining
  } else if (hoursRemaining < 2.0) {
    return 38; // Very high urgency: 1-2 hours remaining
  } else if (hoursRemaining < 4.0) {
    return 28; // High urgency: 2-4 hours remaining
  } else if (hoursRemaining < 8.0) {
    return 18; // Moderate urgency: 4-8 hours remaining
  } else {
    return 8;  // Low urgency: over 8 hours remaining
  }
}

/**
 * Evaluate food safety eligibility gate
 * @param {Object} safetyData - Explicit food safety checklist data
 * @returns {{ passed: boolean, reason: string }}
 */
export function evaluateSafetyEligibility(safetyData = {}) {
  if (!safetyData || typeof safetyData !== 'object') {
    return {
      passed: false,
      reason: 'Safety checklist is missing or undefined. Safety cannot be assumed.'
    };
  }

  // Explicit affirmative verification required
  if (safetyData.isCertifiedSafe !== true) {
    return {
      passed: false,
      reason: safetyData.rejectionReason || 'Food has not been affirmatively certified as safe by the donor or food handler.'
    };
  }

  // Check temperature abuse flags
  if (safetyData.hasTemperatureAbuse === true) {
    return {
      passed: false,
      reason: 'Temperature abuse reported (food remained in danger zone past allowable limit).'
    };
  }

  // Check sensory inspection
  if (safetyData.passedSensoryCheck === false) {
    return {
      passed: false,
      reason: 'Food failed visual, aroma, or texture sensory inspection.'
    };
  }

  return {
    passed: true,
    reason: 'Food passed donor safety checklist and sensory criteria.'
  };
}

/**
 * Calculate the Rescue Priority Score (0 - 100)
 * 
 * @param {Object} donation - Donation details
 * @param {string} donation.foodType - One of COOKED_HOT, COOKED_CHILLED, FRESH_PRODUCE, BAKED_DRY, PACKAGED_PANTRY
 * @param {number} donation.hoursUntilExpiry - Hours remaining until safe consumption window closes
 * @param {string} donation.storageCondition - One of AMBIENT, HOT_HOLDING, REFRIGERATED, FROZEN
 * @param {number} [donation.estimatedTransitMinutes=30] - Estimated travel time in minutes
 * @param {Object} [donation.safetyData] - Safety checklist data
 * 
 * @returns {Object} Priority score, urgency level, breakdown, and safety status
 */
export function calculateRescuePriorityScore(donation = {}) {
  const {
    foodType = 'COOKED_HOT',
    hoursUntilExpiry = 0,
    storageCondition = 'AMBIENT',
    estimatedTransitMinutes = 30,
    safetyData = { isCertifiedSafe: true }
  } = donation;

  // 1. Mandatory Food Safety Eligibility Gate
  const safetyStatus = evaluateSafetyEligibility(safetyData);

  // 2. Component 1: Perishability Score (0 - 35)
  const perishabilityScore = PERISHABILITY_WEIGHTS[foodType] ?? 15;

  // 3. Component 2: Time Urgency Score (0 - 45)
  const timeUrgencyScore = calculateTimeUrgencyScore(hoursUntilExpiry);

  // 4. Component 3: Storage Risk Score (0 - 15)
  const storageRiskScore = STORAGE_RISK_WEIGHTS[storageCondition] ?? 10;

  // 5. Component 4: Feasibility Adjustment (-10 to +5)
  // If transit time consumes a large portion of remaining window, urgency is acute but feasibility drops
  let feasibilityAdjustment = 0;
  const minutesRemaining = hoursUntilExpiry * 60;

  if (hoursUntilExpiry <= 0) {
    feasibilityAdjustment = -20;
  } else if (estimatedTransitMinutes > minutesRemaining) {
    // Cannot reach in time
    feasibilityAdjustment = -15;
  } else if (estimatedTransitMinutes > minutesRemaining * 0.7) {
    // Tight transit window
    feasibilityAdjustment = 5;
  }

  // Raw score summation
  let rawScore = perishabilityScore + timeUrgencyScore + storageRiskScore + feasibilityAdjustment;
  
  // Clamp between 0 and 100
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Derive Urgency Level
  let urgencyLevel = 'LOW';
  if (score >= 80) {
    urgencyLevel = 'CRITICAL';
  } else if (score >= 60) {
    urgencyLevel = 'HIGH';
  } else if (score >= 40) {
    urgencyLevel = 'MEDIUM';
  }

  return {
    score,
    urgencyLevel,
    eligibleForRescue: safetyStatus.passed && hoursUntilExpiry > 0 && estimatedTransitMinutes < minutesRemaining,
    safetyStatus: {
      passed: safetyStatus.passed,
      reason: safetyStatus.reason,
      disclaimer: 'Rescue Priority Score measures logistical urgency only. It does not certify food safety.'
    },
    breakdown: {
      perishabilityScore,
      timeUrgencyScore,
      storageRiskScore,
      feasibilityAdjustment,
      hoursUntilExpiry,
      foodType,
      storageCondition
    }
  };
}
