import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function VerifyPickupModal({ claim, donation, onClose, onVerified }) {
  const [code, setCode] = useState('');
  const [portions, setPortions] = useState(claim?.portions || 1);
  const [verifiedBy, setVerifiedBy] = useState('Campus Canteen Supervisor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  if (!claim) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);

    if (!code || code.trim() === '') {
      setError('Please enter the 6-character rescue code presented by the recipient.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.verifyPickup(claim.allocationId, {
        verificationCode: code.trim().toUpperCase(),
        actualPortionsCollected: Number(portions),
        verifiedBy: verifiedBy.trim()
      });

      setSuccessResult(res.pickup);
      if (onVerified) onVerified(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-cream-200 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-leaf-100 text-leaf-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Verify Pickup Handshake</h3>
              <p className="text-xs text-stone-500">Innovation 5: Verified Chain of Custody</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cream-100 text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-leaf-100 text-leaf-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-lg">Pickup Confirmed & Verified!</h4>
              <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                Successfully recorded {successResult.actualPortionsCollected} portions collected by <strong>{successResult.recipientName}</strong>.
              </p>
            </div>

            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 text-xs text-stone-600 text-left space-y-1">
              <div><span className="font-medium text-stone-500">Pickup ID:</span> <span className="font-mono">{successResult.pickupId}</span></div>
              <div><span className="font-medium text-stone-500">Verified By:</span> {successResult.verifiedBy}</div>
              <div><span className="font-medium text-stone-500">Impact Ledger:</span> Counted toward live environmental metrics</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition cursor-pointer"
            >
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="py-4 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3.5 bg-cream-50 rounded-2xl border border-cream-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Claiming Recipient:</span>
                <span className="font-bold text-stone-900">{claim.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Portions Reserved:</span>
                <span className="font-bold text-stone-900">{claim.portions} portions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Donation:</span>
                <span className="text-stone-700 truncate max-w-[200px]">{donation?.title}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Rescue Verification Code <span className="text-coral-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SP-A7E29F"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-200 bg-white text-stone-900 font-mono font-bold tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 uppercase text-sm"
                required
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Ask the arriving courier/volunteer for their 6-character code from their device.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Actual Portions Collected
                </label>
                <input
                  type="number"
                  min="1"
                  max={claim.portions}
                  value={portions}
                  onChange={(e) => setPortions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Verified By (Staff Name)
                </label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-cream-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-cream-200 text-stone-700 text-xs font-medium hover:bg-cream-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-leaf-600 hover:bg-leaf-700 text-white text-xs font-bold shadow-sm shadow-leaf-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Verifying Handshake...' : 'Confirm & Complete Handshake'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
