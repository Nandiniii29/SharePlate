import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Sparkles, 
  Split, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Check,
  Utensils,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import ClaimModal from '../components/ClaimModal';

export default function RecipientView({ currentUser, onOpenAuth }) {
  const [donations, setDonations] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState(
    currentUser?.organizationId || 'REC-001'
  );
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Match Inspection
  const [claimingDonation, setClaimingDonation] = useState(null);
  const [matchingDonationId, setMatchingDonationId] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Action status message
  const [statusMessage, setStatusMessage] = useState(null);
  const [myClaims, setMyClaims] = useState([]);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const effectiveRecipientId = currentUser?.organizationId || selectedRecipientId;

  const loadData = async (recipientId = effectiveRecipientId) => {
    setLoading(true);
    try {
      const [donRes, recRes, claimsRes] = await Promise.all([
        api.getDonations(),
        api.getRecipients(),
        api.getRecipientClaims(recipientId)
      ]);
      setDonations(donRes.donations || []);
      setRecipients(recRes.recipients || []);
      setMyClaims(claimsRes.claims || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load surplus listings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(effectiveRecipientId);
  }, [effectiveRecipientId]);

  const activeRecipient = recipients.find(r => r.id === effectiveRecipientId) || {
    id: effectiveRecipientId,
    name: currentUser?.organization?.name || 'Community Recipient',
    capacityMax: currentUser?.organization?.capacityMax || 150
  };

  // Inspect Smart Recipient Matches (Innovation 2)
  const handleInspectMatches = async (donationId) => {
    if (matchingDonationId === donationId) {
      setMatchingDonationId(null);
      setMatchResults(null);
      return;
    }

    setMatchingDonationId(donationId);
    setLoadingMatches(true);
    try {
      const data = await api.getMatches(donationId);
      setMatchResults(data);
    } catch (err) {
      setError(`Failed to compute matches: ${err.message}`);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Cancel an existing claim
  const handleCancelClaim = async (allocationId) => {
    if (!window.confirm('Are you sure you want to cancel this claim? Portions will be returned to the mess surplus immediately.')) {
      return;
    }

    try {
      const res = await api.cancelClaim(allocationId, 'Voluntary cancellation by recipient organization');
      setStatusMessage({ type: 'success', text: res.message });
      await loadData(effectiveRecipientId);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Filter donations
  const availableDonations = donations.filter(d => {
    if (d.status === 'CANCELLED' || d.remainingPortions <= 0) return false;
    if (vegOnlyFilter && !d.isVeg) return false;
    if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase()) && !d.location.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta-100 text-terracotta-800 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5 text-terracotta-600" />
            Community Kitchen & Recipient Discovery
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            Available Surplus Food Batches
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Browse prepared surplus, inspect algorithmic suitability rankings, and reserve split portions tailored to your dispatch capabilities.
          </p>
        </div>

        <button
          onClick={() => loadData(effectiveRecipientId)}
          disabled={loading}
          className="p-3 rounded-2xl border border-cream-200 text-stone-600 hover:bg-cream-100 transition cursor-pointer self-start md:self-auto"
          title="Refresh listings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="cursor-pointer text-stone-400 hover:text-stone-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MY RESERVED PASSES SECTION (If recipient has active claims) */}
      {myClaims.length > 0 && (
        <div className="bg-white rounded-3xl border border-cream-200 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-terracotta-100 text-terracotta-800 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-terracotta-600" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-forest-900">
                  Your Digital Pickup Passes ({myClaims.filter(c => c.status === 'RESERVED').length} Active)
                </h2>
                <p className="text-[11px] text-stone-400">
                  Present your confidential 6-character code upon arriving at the pickup location.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myClaims.map(claim => (
              <div 
                key={claim.allocationId || claim.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                  claim.status === 'RESERVED' 
                    ? 'bg-cream-50/70 border-cream-200 shadow-2xs' 
                    : 'bg-stone-50 border-stone-200 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-forest-900 text-xs">
                      {claim.donationTitle || 'Surplus Meal Batch'}
                    </span>
                    <StatusBadge status={claim.status} size="xs" />
                  </div>

                  <div className="text-[11px] text-stone-500 space-y-0.5">
                    <div>Location: <strong>{claim.location}</strong></div>
                    <div>Window: {claim.pickupWindowStart} – {claim.pickupWindowEnd}</div>
                    <div>Reserved: <strong>{claim.portions} portions</strong></div>
                  </div>
                </div>

                {claim.status === 'RESERVED' && (
                  <div className="pt-3 border-t border-cream-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Code:</span>
                      <span className="font-mono font-black text-sm bg-white px-2.5 py-1 rounded-lg border border-cream-200 text-forest-900 tracking-wider">
                        {claim.verificationCode}
                      </span>
                      <button
                        onClick={() => handleCopyCode(claim.verificationCode, claim.allocationId || claim.id)}
                        className="p-1 rounded-md hover:bg-cream-200 text-stone-500 cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCodeId === (claim.allocationId || claim.id) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleCancelClaim(claim.allocationId || claim.id)}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Cancel Claim
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search surplus by keyword, location..."
            className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500 font-semibold"
          >
            <option value="ALL">All Food Categories</option>
            <option value="PREPARED_MEALS">Prepared Meals</option>
            <option value="BAKED_GOODS">Baked Goods</option>
            <option value="FRESH_PRODUCE">Fresh Produce</option>
            <option value="PANTRY">Pantry Staples</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-cream-200 bg-cream-50/50 text-xs font-semibold text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={vegOnlyFilter}
              onChange={(e) => setVegOnlyFilter(e.target.checked)}
              className="rounded text-sage-600 focus:ring-sage-500"
            />
            <span>Vegetarian Only</span>
          </label>
        </div>
      </div>

      {/* Available Surplus Cards Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sage-600" />
            Loading fresh surplus listings...
          </div>
        ) : availableDonations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-cream-200 text-stone-400 text-xs space-y-3">
            <Utensils className="w-10 h-10 text-stone-300 mx-auto" />
            <div className="font-bold text-stone-600 text-sm">No active surplus batches match your criteria</div>
            <p className="max-w-md mx-auto text-stone-400">
              When university messes or restaurants post surplus, fresh batches will appear here for split-and-match portioning.
            </p>
          </div>
        ) : (
          availableDonations.map(donation => {
            const isMatchInspected = matchingDonationId === donation.id;

            return (
              <div 
                key={donation.id}
                className="bg-white rounded-3xl border border-cream-200 shadow-soft overflow-hidden transition-all duration-200"
              >
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge 
                        priorityScore={donation.priorityScore}
                        safetyStatus={donation.safetyStatus}
                      />
                      <StatusBadge status={donation.status} />
                      {donation.isVeg && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% Veg
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-extrabold text-forest-900 tracking-tight">
                      {donation.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {donation.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        Window: {donation.pickupWindowStart} – {donation.pickupWindowEnd}
                      </span>
                      <span>
                        Dietary: <strong>{donation.dietaryInfo || 'Standard'}</strong>
                      </span>
                      {donation.allergens && donation.allergens !== 'None declared' && (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          Allergens: {donation.allergens}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Portions Meter */}
                  <div className="flex items-center gap-6 bg-cream-50/70 p-4 rounded-2xl border border-cream-200">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Remaining</span>
                      <span className="text-2xl font-black text-sage-700 font-mono">{donation.remainingPortions}</span>
                      <span className="text-[10px] text-stone-400 block">of {donation.totalPortions}</span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-center">
                    <button
                      onClick={() => handleInspectMatches(donation.id)}
                      className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        isMatchInspected 
                          ? 'bg-sage-100 text-sage-900 border-sage-300' 
                          : 'bg-white hover:bg-cream-100 text-stone-600 border-cream-200'
                      }`}
                      title="Inspect Smart Matcher recommendation reasoning"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sage-600" />
                      Smart Match Fit
                    </button>

                    <button
                      onClick={() => {
                        if (!currentUser) {
                          onOpenAuth('login');
                        } else {
                          setClaimingDonation(donation);
                        }
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Split className="w-4 h-4" />
                      Claim Portions
                    </button>
                  </div>
                </div>

                {/* Smart Matcher Inspection Sub-panel */}
                {isMatchInspected && (
                  <div className="bg-sage-50/70 border-t border-sage-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-forest-900 text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-sage-600" />
                          Innovation 2: Smart Recipient Matcher Recommendations
                        </h4>
                        <p className="text-xs text-stone-500">
                          Recipients ranked by capacity compatibility, operating window overlap, and illustrative distance tags.
                        </p>
                      </div>
                      <button
                        onClick={() => setMatchingDonationId(null)}
                        className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                      >
                        Close
                      </button>
                    </div>

                    {loadingMatches ? (
                      <div className="text-center py-6 text-xs text-stone-400">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-sage-600" />
                        Evaluating matches...
                      </div>
                    ) : matchResults?.matches?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {matchResults.matches.map(m => (
                          <div 
                            key={m.recipientId}
                            className={`p-3.5 rounded-2xl border text-xs flex flex-col justify-between ${
                              m.isCompatible 
                                ? 'bg-white border-sage-200 shadow-2xs' 
                                : 'bg-stone-50 border-stone-200 opacity-60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-forest-900 truncate">{m.recipientName}</span>
                                <span className="font-mono font-bold text-sage-700">{m.matchScore}%</span>
                              </div>
                              <div className="text-[11px] text-stone-500 mb-2">
                                {m.distanceInfo?.label}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-cream-200 text-[10px] font-semibold text-stone-600">
                              {m.isCompatible ? (
                                <span className="text-sage-800 font-bold">{m.recommendationTag}</span>
                              ) : (
                                <span className="text-rose-700 font-bold">{m.rejectionReason}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-stone-400">No compatible recipient matches calculated.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Split Claiming Modal */}
      {claimingDonation && (
        <ClaimModal
          donation={claimingDonation}
          activeRecipient={activeRecipient}
          onClose={() => setClaimingDonation(null)}
          onClaimSuccess={async (res) => {
            setStatusMessage({
              type: 'success',
              text: `Reserved ${res.allocation.portions} portions. Verification code: ${res.allocation.verificationCode}. Present code upon physical arrival.`
            });
            setClaimingDonation(null);
            await loadData(effectiveRecipientId);
          }}
        />
      )}
    </div>
  );
}
