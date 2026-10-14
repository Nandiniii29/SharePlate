import React, { useState } from 'react';
import { Split, AlertCircle, CheckCircle2, ShieldCheck, Copy, KeyRound } from 'lucide-react';
import { api } from '../services/api';

export default function ClaimModal({ donation, activeRecipient, onClose, onClaimSuccess }) {
  const [portions, setPortions] = useState(
    Math.min(donation?.remainingPortions || 10, activeRecipient?.capacityMax || 50)
  );
  const [notes, setNotes] = useState('Volunteer courier arriving in ~25 minutes.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedClaim, setConfirmedClaim] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!donation || !activeRecipient) return null;

  const maxClaimable = donation.remainingPortions || 0;

  const handleClaim = async (e) => {
    e.preventDefault();
    setError(null);

    const count = Number(portions);
    if (!count || count <= 0 || count > maxClaimable) {
      setError(`Claim quantity must be between 1 and ${maxClaimable} portions.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.claimPortions(donation.id, {
        recipientId: activeRecipient.id,
        recipientName: activeRecipient.name,
        portions: count,
        notes
      });

      setConfirmedClaim(res.allocation);
      if (onClaimSuccess) onClaimSuccess(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (confirmedClaim?.verificationCode) {
      navigator.clipboard.writeText(confirmedClaim.verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-cream-200 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-coral-100 text-coral-600 flex items-center justify-center">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">Claim Portions (Split-and-Match)</h3>
              <p className="text-xs text-stone-500">Innovation 3: Guaranteed Portion Conservation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-cream-100 text-stone-500 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {confirmedClaim ? (
          /* SUCCESS RESCUE PASS - Displays secret verification code privately to this recipient */
          <div className="py-5 space-y-4">
            <div className="w-12 h-12 rounded-full bg-leaf-100 text-leaf-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-lg font-extrabold text-stone-900">Portions Reserved Successfully!</h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Reserved <strong>{confirmedClaim.portions} portions</strong> for {activeRecipient.name}.
              </p>
            </div>

            {/* Private Verification Code Pass */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono tracking-wider text-coral-400 uppercase font-bold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  Rescue Verification Handshake Pass
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-700 text-stone-300">
                  Private to Recipient
                </span>
              </div>

              <div className="text-xs text-stone-300 mb-2">
                Present this code to the mess supervisor when picking up:
              </div>

              <div className="flex items-center justify-between bg-stone-800/80 p-3 rounded-xl border border-stone-700">
                <span className="font-mono text-2xl font-black tracking-widest text-leaf-400">
                  {confirmedClaim.verificationCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
                * This code is never shown in public listings to prevent unverified claims.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition cursor-pointer"
            >
              Done & Return to Listings
            </button>
          </div>
        ) : (
          /* CLAIM FORM */
          <form onSubmit={handleClaim} className="py-4 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Donation Summary Box */}
            <div className="p-3.5 bg-cream-50 rounded-2xl border border-cream-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Surplus Donation:</span>
                <span className="font-bold text-stone-900 truncate max-w-[200px]">{donation.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Donor Mess:</span>
                <span className="font-semibold text-stone-800">{donation.donorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Available Remaining:</span>
                <span className="font-bold text-leaf-700 font-mono">{maxClaimable} portions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Claiming Org:</span>
                <span className="font-semibold text-coral-600">{activeRecipient.name}</span>
              </div>
            </div>

            {/* Portions Slider & Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-stone-800">
                  Portions to Claim (Split or Full)
                </label>
                <span className="text-xs font-mono font-bold text-coral-600 bg-coral-50 px-2 py-0.5 rounded-md border border-coral-200">
                  {portions} portions
                </span>
              </div>

              <input
                type="range"
                min="1"
                max={maxClaimable}
                value={portions}
                onChange={(e) => setPortions(Number(e.target.value))}
                className="w-full accent-coral-500 cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                <span>1 portion</span>
                <span>Split Option: Claim any amount</span>
                <span>Max: {maxClaimable}</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-500 font-medium">Presets:</span>
              <button
                type="button"
                onClick={() => setPortions(Math.min(25, maxClaimable))}
                className="px-2 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 text-[11px] font-semibold text-stone-700 cursor-pointer"
              >
                25
              </button>
              <button
                type="button"
                onClick={() => setPortions(Math.min(50, maxClaimable))}
                className="px-2 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 text-[11px] font-semibold text-stone-700 cursor-pointer"
              >
                50
              </button>
              <button
                type="button"
                onClick={() => setPortions(Math.min(100, maxClaimable))}
                className="px-2 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 text-[11px] font-semibold text-stone-700 cursor-pointer"
              >
                100
              </button>
              <button
                type="button"
                onClick={() => setPortions(maxClaimable)}
                className="px-2 py-1 rounded-lg bg-coral-100 hover:bg-coral-200 text-[11px] font-semibold text-coral-800 cursor-pointer"
              >
                Take Entire Batch ({maxClaimable})
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Volunteer Dispatch / Pickup Note
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
                placeholder="e.g. Volunteer arriving via auto rickshaw"
              />
            </div>

            <div className="pt-3 border-t border-cream-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-cream-200 text-stone-700 text-xs font-semibold hover:bg-cream-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold shadow-md shadow-coral-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Reserving Portions...' : `Confirm Claim of ${portions} Portions`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
