/**
 * Failed-Pickup Recovery Engine
 * 
 * Determines whether food from a failed pickup (no-show, vehicle breakdown, cancellation)
 * can be safely redistributed to an alternative recipient.
 * 
 * CORE FOOD SAFETY PRINCIPLE:
 * Redistribution is NEVER automatic.
 * It is subject to two mandatory prerequisite gates:
 * 1. Food Safety Eligibility: Explicit certification that food temperature, handling, and sensory state remain intact.
 * 2. Feasibility Buffer: Sufficient remaining time for an alternate recipient to arrive, load, and distribute.
 * If either gate fails, the food is routed to an audited composting or disposal record.
 */

// Default operational parameters
export const RECOVERY_DEFAULTS = {
  MINIMUM_COLLECTION_WINDOW_MINUTES: 45, // Minimum time needed for secondary dispatch & transit
  MAX_ALLOWED_RECOVERY_ATTEMPTS: 2       // Prevent indefinite reassignment loops
};

/**
 * Evaluates whether a failed pickup can be safely reclaimed and offered to other recipients.
 * 
 * @param {Object} params
 * @param {Object} params.donation - Current donation data
 * @param {string} params.donation.id
 * @param {string} [params.donation.safeConsumptionDeadline] - Donor-specified deadline (ISO string)
 * @param {Object} [params.donation.safetyStatus] - Verified food safety status
 * 
 * @param {Object} params.failedAllocation - The allocation that failed
 * @param {string} params.failedAllocation.allocationId
 * @param {number} params.failedAllocation.portions
 * @param {string} params.failedAllocation.failureReason
 * @param {number} [params.failedAllocation.previousRecoveryAttempts=0]
 * 
 * @param {Object} [params.options={}] - Evaluation overrides
 * @param {Date|string} [params.options.currentTime] - Current timestamp (default: new Date())
 * @param {number} [params.options.minimumCollectionWindowMinutes=45] - Minimum required buffer
 * @param {number} [params.options.maxAllowedRecoveryAttempts=2] - Maximum reassignments
 * 
 * @returns {Object} Recovery decision, disposition, audit record, and reasons
 */
export function evaluateFailedPickupRecovery({
  donation = {},
  failedAllocation = {},
  options = {}
}) {
  const currentTime = options.currentTime ? new Date(options.currentTime) : new Date();
  const minBufferMinutes = options.minimumCollectionWindowMinutes ?? RECOVERY_DEFAULTS.MINIMUM_COLLECTION_WINDOW_MINUTES;
  const maxAttempts = options.maxAllowedRecoveryAttempts ?? RECOVERY_DEFAULTS.MAX_ALLOWED_RECOVERY_ATTEMPTS;

  const previousAttempts = Number(failedAllocation.previousRecoveryAttempts) || 0;
  const portions = Number(failedAllocation.portions) || 0;

  // 1. GATE 1: Food Safety Certification Check
  const safety = donation.safetyStatus || {};

  if (safety.isCertifiedSafe !== true) {
    return {
      canRecover: false,
      decision: 'REJECTED_UNSAFE',
      disposition: 'COMPOST_OR_DISPOSE_AUDIT',
      reason: safety.rejectionReason || 'Food is not certified as safe by the donor or food handler.',
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        failureReason: failedAllocation.failureReason,
        timestamp: currentTime.toISOString(),
        outcome: 'FOOD_SAFETY_GATE_FAILED',
        notes: 'Redistribution strictly forbidden due to missing or negative food safety certification.'
      }
    };
  }

  if (safety.hasTemperatureAbuse === true) {
    return {
      canRecover: false,
      decision: 'REJECTED_TEMPERATURE_ABUSE',
      disposition: 'COMPOST_OR_DISPOSE_AUDIT',
      reason: 'Food temperature entered the danger zone (5°C - 60°C) during the delay.',
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        failureReason: failedAllocation.failureReason,
        timestamp: currentTime.toISOString(),
        outcome: 'TEMPERATURE_ABUSE_DETECTED',
        notes: 'Discarded to protect public health.'
      }
    };
  }

  if (safety.sensoryInspectionPassed === false) {
    return {
      canRecover: false,
      decision: 'REJECTED_SENSORY_FAILURE',
      disposition: 'COMPOST_OR_DISPOSE_AUDIT',
      reason: 'Food showed visible loss of quality, off-aroma, or altered texture.',
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        failureReason: failedAllocation.failureReason,
        timestamp: currentTime.toISOString(),
        outcome: 'SENSORY_CHECK_FAILED',
        notes: 'Quality compromised during waiting period.'
      }
    };
  }

  // 2. GATE 2: Time Window and Collection Feasibility Check
  if (!donation.safeConsumptionDeadline) {
    return {
      canRecover: false,
      decision: 'REJECTED_MISSING_DEADLINE',
      disposition: 'HUMAN_AUDIT_REVIEW',
      reason: 'No donor-specified safe consumption deadline is available to assess recovery window.',
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        timestamp: currentTime.toISOString(),
        outcome: 'MISSING_DEADLINE_REVIEW'
      }
    };
  }

  const deadline = new Date(donation.safeConsumptionDeadline);
  const millisecondsRemaining = deadline.getTime() - currentTime.getTime();
  const minutesRemaining = Math.floor(millisecondsRemaining / (1000 * 60));

  if (minutesRemaining <= 0) {
    return {
      canRecover: false,
      decision: 'REJECTED_EXPIRED',
      disposition: 'COMPOST_OR_DISPOSE_AUDIT',
      reason: 'The safe consumption window has completely elapsed.',
      minutesRemaining: 0,
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        timestamp: currentTime.toISOString(),
        outcome: 'CONSUMPTION_DEADLINE_PASSED',
        notes: 'Window expired before alternate recipient could be secured.'
      }
    };
  }

  if (minutesRemaining < minBufferMinutes) {
    return {
      canRecover: false,
      decision: 'REJECTED_INSUFFICIENT_TIME',
      disposition: 'COMPOST_OR_DISPOSE_AUDIT',
      reason: `Only ${minutesRemaining} minutes remain. A minimum of ${minBufferMinutes} minutes is required for secondary dispatch, pickup, and distribution.`,
      minutesRemaining,
      minimumBufferRequiredMinutes: minBufferMinutes,
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        timestamp: currentTime.toISOString(),
        outcome: 'INSUFFICIENT_LOGISTICS_BUFFER',
        notes: `Time remaining (${minutesRemaining}m) below safe dispatch buffer (${minBufferMinutes}m).`
      }
    };
  }

  // 3. GATE 3: Maximum Recovery Attempts Check
  if (previousAttempts >= maxAttempts) {
    return {
      canRecover: false,
      decision: 'REJECTED_MAX_ATTEMPTS_EXCEEDED',
      disposition: 'HUMAN_AUDIT_REVIEW',
      reason: `Item has reached maximum recovery attempts (${previousAttempts}/${maxAttempts}). Manual intervention required.`,
      auditRecord: {
        donationId: donation.id,
        allocationId: failedAllocation.allocationId,
        portions,
        timestamp: currentTime.toISOString(),
        outcome: 'EXCEEDED_MAX_RECOVERY_ATTEMPTS'
      }
    };
  }

  // 4. APPROVED FOR RECOVERY & RE-MATCHING
  return {
    canRecover: true,
    decision: 'APPROVED_FOR_REALLOCATION',
    disposition: 'SECONDARY_MATCHING_BROADCAST',
    portionsToReclaim: portions,
    minutesRemaining,
    newAttemptNumber: previousAttempts + 1,
    priorityUrgencyTag: minutesRemaining < 90 ? 'CRITICAL_RAPID_RESCUE' : 'EXPEDITED_RESCUE',
    guidance: `Re-open ${portions} portions for immediate matching. Notify nearby verified kitchens capable of collection within ${minutesRemaining} minutes.`,
    auditRecord: {
      donationId: donation.id,
      allocationId: failedAllocation.allocationId,
      portions,
      timestamp: currentTime.toISOString(),
      outcome: 'RECOVERY_APPROVED',
      minutesRemaining,
      attemptNumber: previousAttempts + 1
    }
  };
}
