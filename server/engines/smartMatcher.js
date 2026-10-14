/**
 * Smart Recipient Matching Engine
 * 
 * Recommends verified recipient organizations (NGOs, community kitchens, student pantries)
 * based on portion capacity, pickup time window compatibility, dietary fit, and proximity.
 * 
 * NOTE ON DISTANCE DATA:
 * Real GPS coordinates or routing APIs may not be active in this hackathon prototype.
 * All distance values are explicitly treated and labeled as ILLUSTRATIVE SAMPLE DATA.
 */

/**
 * Helper to convert "HH:MM" string to minutes from midnight
 * @param {string} timeStr - "HH:MM" format (e.g. "14:30")
 * @returns {number} Minutes from midnight
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Check if donation pickup window overlaps with recipient operating hours
 * @param {string} pickupStart - "HH:MM"
 * @param {string} pickupEnd - "HH:MM"
 * @param {string} opStart - "HH:MM"
 * @param {string} opEnd - "HH:MM"
 * @returns {{ overlaps: boolean, overlapMinutes: number }}
 */
export function checkWindowOverlap(pickupStart, pickupEnd, opStart, opEnd) {
  const pStart = timeStringToMinutes(pickupStart);
  const pEnd = timeStringToMinutes(pickupEnd);
  const oStart = timeStringToMinutes(opStart);
  const oEnd = timeStringToMinutes(opEnd);

  if (pStart === null || pEnd === null || oStart === null || oEnd === null) {
    // If times are unspecified, assume neutral overlap for demo flexibility
    return { overlaps: true, overlapMinutes: 60 };
  }

  const latestStart = Math.max(pStart, oStart);
  const earliestEnd = Math.min(pEnd, oEnd);
  const overlapMinutes = Math.max(0, earliestEnd - latestStart);

  return {
    overlaps: overlapMinutes > 0,
    overlapMinutes
  };
}

/**
 * Score a single recipient match (0 - 100)
 * 
 * @param {Object} donation
 * @param {number} donation.portionsAvailable
 * @param {string} [donation.pickupWindowStart]
 * @param {string} [donation.pickupWindowEnd]
 * @param {boolean} [donation.isVeg=true]
 * 
 * @param {Object} recipient
 * @param {string} recipient.id
 * @param {string} recipient.name
 * @param {boolean} recipient.isVerified
 * @param {number} recipient.capacityMin
 * @param {number} recipient.capacityMax
 * @param {boolean} recipient.acceptsNonVeg
 * @param {string} [recipient.operatingHoursStart]
 * @param {string} [recipient.operatingHoursEnd]
 * @param {number} [recipient.illustrativeDistanceKm=2.5]
 * 
 * @returns {Object} Match details with score, compatibility breakdown, and reasons
 */
export function calculateMatchScore(donation = {}, recipient = {}) {
  // 1. Mandatory verification check
  if (!recipient.isVerified) {
    return {
      recipientId: recipient.id,
      recipientName: recipient.name,
      matchScore: 0,
      isCompatible: false,
      rejectionReason: 'Recipient organization is not yet verified.'
    };
  }

  // 2. Dietary constraint check
  const isDonationNonVeg = donation.isVeg === false;
  if (isDonationNonVeg && recipient.acceptsNonVeg === false) {
    return {
      recipientId: recipient.id,
      recipientName: recipient.name,
      matchScore: 0,
      isCompatible: false,
      rejectionReason: 'Recipient kitchen does not accept non-vegetarian donations.'
    };
  }

  // 3. Minimum Capacity check
  const portions = Number(donation.portionsAvailable) || 0;
  if (portions <= 0) {
    return {
      recipientId: recipient.id,
      recipientName: recipient.name,
      matchScore: 0,
      isCompatible: false,
      rejectionReason: 'No portions are available in this donation.'
    };
  }

  const minCap = recipient.capacityMin || 1;
  const maxCap = recipient.capacityMax || 500;

  if (portions < minCap) {
    return {
      recipientId: recipient.id,
      recipientName: recipient.name,
      matchScore: 0,
      isCompatible: false,
      rejectionReason: `Available portions (${portions}) are below recipient minimum dispatch threshold (${minCap}).`
    };
  }

  // 4. Pickup Window Overlap (Weight: 35 points)
  const windowCheck = checkWindowOverlap(
    donation.pickupWindowStart,
    donation.pickupWindowEnd,
    recipient.operatingHoursStart,
    recipient.operatingHoursEnd
  );

  if (!windowCheck.overlaps) {
    return {
      recipientId: recipient.id,
      recipientName: recipient.name,
      matchScore: 0,
      isCompatible: false,
      rejectionReason: 'Donation pickup window does not overlap with recipient operating hours.'
    };
  }

  const windowScore = Math.min(35, Math.round((windowCheck.overlapMinutes / 90) * 35));

  // 5. Capacity Fit Score (Weight: 40 points)
  // Optimal fit is when portions fit cleanly within recipient capacity
  let capacityScore = 0;
  let canTakeFullBatch = false;
  let maxPortionsTheyCanTake = 0;

  if (portions <= maxCap) {
    // Recipient can take the entire batch
    canTakeFullBatch = true;
    maxPortionsTheyCanTake = portions;
    // Closer to their maximum capacity = better utilization
    const utilizationRatio = portions / maxCap;
    capacityScore = Math.round(25 + (utilizationRatio * 15));
  } else {
    // Batch is larger than recipient max capacity: ideal candidate for Split-and-Match!
    canTakeFullBatch = false;
    maxPortionsTheyCanTake = maxCap;
    capacityScore = 32; // Solid score for split candidate
  }

  // 6. Proximity / Distance Score (Weight: 25 points)
  // Distance is illustrative sample data
  const distanceKm = typeof recipient.illustrativeDistanceKm === 'number' 
    ? recipient.illustrativeDistanceKm 
    : 3.0;

  let distanceScore = 0;
  if (distanceKm <= 1.5) {
    distanceScore = 25; // Campus walking / very close
  } else if (distanceKm <= 4.0) {
    distanceScore = 20; // Short 10-min drive
  } else if (distanceKm <= 8.0) {
    distanceScore = 14; // Moderate distance
  } else if (distanceKm <= 15.0) {
    distanceScore = 8;
  } else {
    distanceScore = 3;
  }

  const totalScore = Math.min(100, windowScore + capacityScore + distanceScore);

  return {
    recipientId: recipient.id,
    recipientName: recipient.name,
    matchScore: totalScore,
    isCompatible: true,
    canTakeFullBatch,
    recommendedPortionsToOffer: maxPortionsTheyCanTake,
    distanceInfo: {
      valueKm: distanceKm,
      isIllustrativeSample: true,
      label: `${distanceKm.toFixed(1)} km (illustrative sample distance)`
    },
    scoringBreakdown: {
      capacityScore,
      windowScore,
      distanceScore,
      overlapMinutes: windowCheck.overlapMinutes
    },
    recommendationTag: canTakeFullBatch ? 'Full Batch Match' : 'Split-and-Match Candidate'
  };
}

/**
 * Rank and filter all potential recipients for a donation
 * 
 * @param {Object} donation - Donation to match
 * @param {Array<Object>} recipients - Pool of potential recipients
 * @returns {Array<Object>} Sorted list of compatible recipient matches
 */
export function matchRecipients(donation, recipients = []) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return [];
  }

  const results = recipients.map(recipient => calculateMatchScore(donation, recipient));

  // Sort by match score descending (highest compatibility first)
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
