/**
 * Split-and-Match Allocation Engine
 * 
 * Manages atomic portion distribution across multiple verified recipients.
 * Enforces strict portion conservation:
 *   allocatedPortions + remainingPortions === totalPortions
 * Rejects non-integer values, negative quantities, and any claim exceeding remaining portions.
 */

/**
 * Validates a portion claim request
 * 
 * @param {Object} donationState - Current state of the donation
 * @param {number} requestedPortions - Quantity requested
 * @param {string} recipientId - Identifier of claiming recipient
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateClaim(donationState, requestedPortions, recipientId) {
  if (!donationState || typeof donationState !== 'object') {
    return { isValid: false, error: 'Invalid donation state provided.' };
  }

  if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
    return { isValid: false, error: 'Recipient ID is required for a portion claim.' };
  }

  // Must be a valid positive integer
  if (typeof requestedPortions !== 'number' || !Number.isInteger(requestedPortions) || requestedPortions <= 0) {
    return {
      isValid: false,
      error: `Invalid portion count (${requestedPortions}). Portions must be a positive whole number.`
    };
  }

  // Check donation lifecycle status
  if (donationState.status === 'FULLY_ALLOCATED') {
    return { isValid: false, error: 'This donation is already fully allocated. No portions remain.' };
  }

  if (donationState.status === 'CANCELLED' || donationState.status === 'EXPIRED') {
    return { isValid: false, error: `Donation is in ${donationState.status} state and cannot accept claims.` };
  }

  // Check portion availability
  const remaining = Number(donationState.remainingPortions);
  if (requestedPortions > remaining) {
    return {
      isValid: false,
      error: `Requested portions (${requestedPortions}) exceeds currently available portions (${remaining}).`
    };
  }

  return { isValid: true };
}

/**
 * Creates a clean, normalized donation allocation state
 * 
 * @param {number} totalPortions - Total portions in the donation batch
 * @param {Object} [meta={}] - Optional metadata (id, title, etc.)
 * @returns {Object} Initialized donation state
 */
export function createDonationState(totalPortions, meta = {}) {
  if (typeof totalPortions !== 'number' || !Number.isInteger(totalPortions) || totalPortions <= 0) {
    throw new Error(`Total portions must be a positive whole number. Received: ${totalPortions}`);
  }

  return {
    id: meta.id || `DON-${Date.now()}`,
    totalPortions,
    allocatedPortions: 0,
    remainingPortions: totalPortions,
    status: 'AVAILABLE', // 'AVAILABLE' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED' | 'CANCELLED'
    allocations: [],
    history: [
      {
        action: 'CREATED',
        timestamp: new Date().toISOString(),
        totalPortions
      }
    ]
  };
}

/**
 * Atomically allocates a portion of the donation to a recipient
 * 
 * @param {Object} donationState - Current state
 * @param {Object} claim - Claim payload
 * @param {string} claim.recipientId - Recipient identifier
 * @param {string} claim.recipientName - Recipient organization name
 * @param {number} claim.portions - Number of portions to claim
 * @param {string} [claim.notes] - Optional pickup notes
 * 
 * @returns {{ success: boolean, updatedState?: Object, allocation?: Object, error?: string }}
 */
export function allocateClaim(donationState, claim = {}) {
  const { recipientId, recipientName = 'Anonymous Recipient', portions, notes = '' } = claim;

  const validation = validateClaim(donationState, portions, recipientId);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error
    };
  }

  // Create deep clone to ensure pure immutability
  const nextState = JSON.parse(JSON.stringify(donationState));

  // Compute new balances
  const newAllocated = nextState.allocatedPortions + portions;
  const newRemaining = nextState.totalPortions - newAllocated;

  // Invariant verification check
  if (newRemaining < 0 || newAllocated > nextState.totalPortions) {
    return {
      success: false,
      error: 'CRITICAL: Arithmetic invariant violation detected. Allocation aborted to prevent over-allocation.'
    };
  }

  const allocationRecord = {
    allocationId: `ALC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipientId,
    recipientName,
    portions,
    notes,
    timestamp: new Date().toISOString(),
    status: 'RESERVED' // 'RESERVED' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
  };

  // Ensure arrays exist
  if (!Array.isArray(nextState.allocations)) nextState.allocations = [];
  if (!Array.isArray(nextState.history)) nextState.history = [];

  nextState.allocatedPortions = newAllocated;
  nextState.remainingPortions = newRemaining;
  nextState.allocations.push(allocationRecord);

  // Update overall donation status
  if (newRemaining === 0) {
    nextState.status = 'FULLY_ALLOCATED';
  } else {
    nextState.status = 'PARTIALLY_ALLOCATED';
  }

  nextState.history.push({
    action: 'PORTION_ALLOCATED',
    allocationId: allocationRecord.allocationId,
    recipientId,
    portions,
    remainingPortions: newRemaining,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    updatedState: nextState,
    allocation: allocationRecord
  };
}

/**
 * Releases or cancels an existing claim, returning portions back to remaining availability
 * 
 * @param {Object} donationState - Current state
 * @param {string} allocationId - ID of allocation to cancel/release
 * @param {string} reason - Reason for release (e.g. 'FAILED_PICKUP', 'VOLUNTARY_CANCELLATION')
 * 
 * @returns {{ success: boolean, updatedState?: Object, releasedPortions?: number, error?: string }}
 */
export function releaseClaim(donationState, allocationId, reason = 'RELEASED') {
  if (!donationState || !Array.isArray(donationState.allocations)) {
    return { success: false, error: 'Invalid donation state provided.' };
  }

  const nextState = JSON.parse(JSON.stringify(donationState));
  const target = nextState.allocations.find(a => a.allocationId === allocationId);

  if (!target) {
    return { success: false, error: `Allocation with ID '${allocationId}' not found.` };
  }

  if (target.status === 'RELEASED' || target.status === 'CANCELLED') {
    return { success: false, error: `Allocation '${allocationId}' is already ${target.status}.` };
  }

  if (target.status === 'COMPLETED') {
    return { success: false, error: `Cannot release allocation '${allocationId}' because pickup was already completed.` };
  }

  const portionsToRestore = target.portions;
  target.status = 'RELEASED';
  target.releaseReason = reason;
  target.releasedAt = new Date().toISOString();

  nextState.allocatedPortions -= portionsToRestore;
  nextState.remainingPortions += portionsToRestore;

  // Re-evaluate donation status
  if (nextState.remainingPortions === nextState.totalPortions) {
    nextState.status = 'AVAILABLE';
  } else {
    nextState.status = 'PARTIALLY_ALLOCATED';
  }

  if (!Array.isArray(nextState.history)) nextState.history = [];

  nextState.history.push({
    action: 'PORTION_RELEASED',
    allocationId,
    portionsRestored: portionsToRestore,
    reason,
    remainingPortions: nextState.remainingPortions,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    updatedState: nextState,
    releasedPortions: portionsToRestore
  };
}

/**
 * Audits a donation state to mathematically prove zero portion leaks
 * 
 * @param {Object} state - State to audit
 * @returns {{ isSound: boolean, details: Object }}
 */
export function auditPortionConservation(state) {
  const activeAllocated = state.allocations
    .filter(a => a.status === 'RESERVED' || a.status === 'COMPLETED')
    .reduce((sum, a) => sum + a.portions, 0);

  const isMathSound = (
    activeAllocated === state.allocatedPortions &&
    (state.allocatedPortions + state.remainingPortions) === state.totalPortions &&
    state.remainingPortions >= 0 &&
    state.allocatedPortions <= state.totalPortions
  );

  return {
    isSound: isMathSound,
    details: {
      total: state.totalPortions,
      allocated: state.allocatedPortions,
      remaining: state.remainingPortions,
      activeSum: activeAllocated
    }
  };
}
