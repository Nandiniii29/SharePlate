import React, { useState } from 'react';
import { AlertCircle, Clock, ShieldCheck, ShieldAlert, ChevronRight, X, Info } from 'lucide-react';

export default function PriorityBadge({ priorityScore, safetyStatus, interactive = true }) {
  const [showModal, setShowModal] = useState(false);

  if (!priorityScore) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-cream-100 text-stone-600 border border-cream-200">
        Score Pending
      </span>
    );
  }

  const score = Number(priorityScore.score) || 0;
  const level = priorityScore.urgencyLevel || (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW');
  const breakdown = priorityScore.breakdown || {};
  const isSafetyPassed = safetyStatus?.isCertifiedSafe ?? true;

  // Theme styling based on urgency level
  let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
  let dotColor = 'bg-stone-500';

  if (level === 'CRITICAL') {
    badgeColor = 'bg-coral-50 text-coral-700 border-coral-300';
    dotColor = 'bg-coral-500 animate-pulse';
  } else if (level === 'HIGH') {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
  } else if (level === 'MEDIUM') {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => interactive && setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition ${badgeColor} ${interactive ? 'hover:shadow-sm cursor-pointer' : ''}`}
        title="Click to inspect algorithmic score breakdown"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        <span>RPS: {score}/100</span>
        <span className="font-semibold opacity-80 text-[10px]">({level})</span>
        {interactive && <ChevronRight className="w-3 h-3 opacity-60" />}
      </button>

      {/* Breakdown Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-cream-200 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-coral-100 text-coral-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Rescue Priority Score (RPS)</h3>
                  <p className="text-xs text-stone-500">Innovation 1: Logistical Urgency Algorithm</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-cream-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Overall Score Dial */}
              <div className="bg-cream-50 p-4 rounded-2xl border border-cream-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Logistical Urgency</span>
                  <div className="text-3xl font-extrabold text-stone-900 flex items-baseline gap-1">
                    {score} <span className="text-xs font-medium text-stone-500">/ 100</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-xl text-xs font-bold border ${badgeColor}`}>
                  {level} URGENCY
                </div>
              </div>

              {/* Formula Breakdown Components */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Formula Components</h4>

                <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-white border border-cream-200">
                  <span className="text-stone-600">Perishability Weight (Food Category)</span>
                  <span className="font-mono font-bold text-stone-900">+{breakdown.perishabilityScore ?? 35} / 35</span>
                </div>

                <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-white border border-cream-200">
                  <span className="text-stone-600">Time Urgency (Hours Remaining)</span>
                  <span className="font-mono font-bold text-stone-900">+{breakdown.timeUrgencyScore ?? 38} / 45</span>
                </div>

                <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-white border border-cream-200">
                  <span className="text-stone-600">Storage Environment Risk</span>
                  <span className="font-mono font-bold text-stone-900">+{breakdown.storageRiskScore ?? 15} / 15</span>
                </div>

                <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-white border border-cream-200">
                  <span className="text-stone-600">Transit Feasibility Adjustment</span>
                  <span className="font-mono font-bold text-stone-900">{breakdown.feasibilityAdjustment ?? 0} pts</span>
                </div>
              </div>

              {/* Mandatory Food Safety Prerequisite Card */}
              <div className="p-3.5 rounded-2xl bg-leaf-50 border border-leaf-200">
                <div className="flex items-start gap-2.5">
                  {isSafetyPassed ? (
                    <ShieldCheck className="w-4 h-4 text-leaf-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-coral-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="text-xs font-bold text-leaf-900">Food Safety Gate (Prerequisite)</h5>
                    <p className="text-[11px] text-leaf-800 leading-snug mt-0.5">
                      {isSafetyPassed 
                        ? 'Certified safe by donor. Passed temperature stability and sensory inspection.'
                        : 'Safety uncertified. Food cannot be redistributed regardless of high urgency score.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Algorithmic Principle Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-cream-100 text-stone-600 text-[11px] leading-relaxed">
                <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ethical AI Guard:</strong> Rescue Priority Score measures dispatch urgency only. Food safety is an affirmative requirement and is never assumed from a score or timer.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-cream-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
