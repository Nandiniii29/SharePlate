import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function RecoveryView() {
  const [donations, setDonations] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [donRes, auditRes] = await Promise.all([
        api.getDonations(),
        api.getAuditEvents()
      ]);
      setDonations(donRes.donations || []);
      setAuditEvents(auditRes.auditEvents || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load recovery board data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter donations that have recovery alerts or active re-allocations
  const recoveryDonations = donations.filter(d => 
    d.recoveryAlert?.isReallocationCandidate || 
    (d.allocations || []).some(a => a.status === 'FAILED_DISCARDED' || a.status === 'FAILED_RECOVERED')
  );

  // Filter audit events related to recovery and safety
  const recoveryAuditLog = auditEvents
    .filter(e => e.type?.includes('FAILED_PICKUP') || e.type?.includes('CLAIM_CANCELLED') || e.type?.includes('DONATION_CREATED'))
    .reverse();

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-900 text-cream-100 text-xs font-bold mb-2">
            <RefreshCw className="w-3.5 h-3.5 text-sage-400" />
            Safety Guard & Failed-Pickup Recovery
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            Failed-Pickup Recovery Board
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            When scheduled collections fail (volunteer breakdown, courier no-show), SharePlate evaluates affirmative food safety and remaining logistical time buffers before permitting secondary distribution.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-3 rounded-2xl border border-cream-200 text-stone-600 hover:bg-cream-100 transition cursor-pointer self-start md:self-auto"
          title="Refresh board"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Two-Gate Policy Infographic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-sage-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-forest-900 text-sm">Gate 1: Affirmative Food Safety Check</h3>
              <p className="text-xs text-stone-500">Biological & Chemical Safety Protocol</p>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Redistribution is <strong>strictly blocked</strong> if temperature abuse occurred, sensory inspection failed, or safety certification is missing. Compromised food routes to audited composting.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-terracotta-100 text-terracotta-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-terracotta-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-forest-900 text-sm">Gate 2: Logistical Time Buffer</h3>
              <p className="text-xs text-stone-500">Minimum 45-Minute Dispatch Threshold</p>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Re-opening for secondary matching requires at least <strong>45 minutes</strong> before safe consumption window closes to allow alternate couriers to arrive and deliver.
          </p>
        </div>
      </div>

      {/* Live Recovery Candidates */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-forest-900 flex items-center gap-2">
          <span>Active Recovery Candidates & Dispositions</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cream-200 text-forest-800">
            {recoveryDonations.length}
          </span>
        </h2>

        {recoveryDonations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-cream-200 text-stone-400 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-sage-600 mx-auto" />
            <div className="font-bold text-stone-600">Zero active failed pickups</div>
            <p>All active donation pickups are proceeding on schedule with verified recipient couriers.</p>
          </div>
        ) : (
          recoveryDonations.map(don => {
            const alert = don.recoveryAlert;
            return (
              <div 
                key={don.id}
                className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                        Recovery Active
                      </span>
                      <StatusBadge status={don.status} size="xs" />
                    </div>
                    <h3 className="text-base font-extrabold text-forest-900">{don.title}</h3>
                    <div className="text-xs text-stone-500 mt-0.5">Location: {don.location}</div>
                  </div>

                  <div className="bg-cream-50 p-3 rounded-2xl border border-cream-200 text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Remaining Buffer</span>
                    <span className="text-base font-black text-forest-900 font-mono">
                      {alert?.minutesRemaining ? `${alert.minutesRemaining} mins` : 'Evaluated'}
                    </span>
                  </div>
                </div>

                {alert && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Secondary Redistribution Candidate:</strong> Food passed biological safety checks and was re-opened with elevated priority ({alert.elevatedPriority || 'EXPEDITED_RESCUE'}).
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Safety & Recovery Audit Stream */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-soft p-6">
        <h3 className="font-extrabold text-forest-900 text-sm mb-4">Safety & Recovery Ledger Stream</h3>
        <div className="space-y-3">
          {recoveryAuditLog.slice(0, 15).map(e => (
            <div key={e.id || e.eventId} className="p-3.5 rounded-2xl bg-cream-50/50 border border-cream-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-cream-200 text-forest-900 mr-2">
                  {e.type}
                </span>
                <span className="text-stone-700">{e.details}</span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono shrink-0">
                {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
