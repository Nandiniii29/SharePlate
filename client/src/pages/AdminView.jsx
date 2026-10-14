import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Lock, 
  Unlock, 
  Check, 
  X,
  Search,
  Building2,
  Store,
  BarChart3,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminView() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'incidents' | 'audit'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, incidentsRes, auditRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminIncidents(),
        api.getAuditEvents()
      ]);

      setStats(statsRes.stats);
      setUsers(usersRes.users || []);
      setIncidents(incidentsRes.incidents || []);
      setAuditEvents(auditRes.auditEvents || []);
    } catch (err) {
      setError(`Failed to load admin data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change user status to ${nextStatus}?`)) {
      return;
    }

    try {
      await api.updateUserStatus(userId, nextStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    } catch (err) {
      alert(`Error updating user status: ${err.message}`);
    }
  };

  const handleResolveIncident = async (e) => {
    e.preventDefault();
    if (!resolvingIncident) return;

    setSubmittingResolution(true);
    try {
      await api.resolveIncident(resolvingIncident.id, resolutionNotes);
      setIncidents(prev => prev.map(inc => inc.id === resolvingIncident.id ? { ...inc, status: 'RESOLVED', resolutionNotes } : inc));
      setResolvingIncident(null);
      setResolutionNotes('');
    } catch (err) {
      alert(`Error resolving incident: ${err.message}`);
    } finally {
      setSubmittingResolution(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-900 text-cream-100 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-sage-400" />
            Administration & Incident Moderation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            Platform Administration Console
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Monitor verified chain-of-custody, manage authorized partner organizations, investigate reported food-safety incidents, and inspect immutable audit logs.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="p-3 rounded-2xl border border-cream-200 text-stone-600 hover:bg-cream-100 transition cursor-pointer self-start md:self-auto"
          title="Refresh console"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-cream-100 p-1.5 rounded-2xl max-w-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'overview' ? 'bg-white text-forest-900 shadow-xs' : 'text-stone-600 hover:text-forest-900'
          }`}
        >
          Overview ({stats?.totalDonations || 0} Batches)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'users' ? 'bg-white text-forest-900 shadow-xs' : 'text-stone-600 hover:text-forest-900'
          }`}
        >
          Users & Orgs ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'incidents' ? 'bg-white text-forest-900 shadow-xs' : 'text-stone-600 hover:text-forest-900'
          }`}
        >
          Incidents ({incidents.filter(i => i.status === 'OPEN').length} Open)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'audit' ? 'bg-white text-forest-900 shadow-xs' : 'text-stone-600 hover:text-forest-900'
          }`}
        >
          Audit Stream ({auditEvents.length})
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft">
            <span className="text-xs font-semibold text-stone-500 block mb-1">Registered Users</span>
            <div className="text-3xl font-black text-forest-900 font-mono">{stats.totalUsers}</div>
            <div className="text-[11px] text-stone-400 mt-1">{stats.totalOrganizations} Partner Orgs</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft">
            <span className="text-xs font-semibold text-stone-500 block mb-1">Active Surplus Batches</span>
            <div className="text-3xl font-black text-sage-700 font-mono">{stats.activeDonations}</div>
            <div className="text-[11px] text-stone-400 mt-1">of {stats.totalDonations} total listed</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft">
            <span className="text-xs font-semibold text-stone-500 block mb-1">Verified Completed Pickups</span>
            <div className="text-3xl font-black text-terracotta-700 font-mono">{stats.totalPickups}</div>
            <div className="text-[11px] text-stone-400 mt-1">100% digital handshake</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft">
            <span className="text-xs font-semibold text-stone-500 block mb-1">Open Food Safety Incidents</span>
            <div className={`text-3xl font-black font-mono ${stats.openIncidents > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.openIncidents}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">Requires review</div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-cream-200 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-cream-200">
            <h3 className="font-extrabold text-forest-900 text-sm">Registered Accounts & Partner Organizations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-50/70 border-b border-cream-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">User / Contact</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Organization</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-cream-50/30 transition">
                    <td className="p-4 font-bold text-forest-900">
                      <div>{u.fullName}</div>
                      <div className="text-[11px] text-stone-400 font-normal">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'DONOR' ? 'bg-sage-100 text-sage-800' : u.role === 'ADMIN' ? 'bg-forest-900 text-cream-100' : 'bg-terracotta-100 text-terracotta-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-stone-700">
                      {u.organization?.name || 'Individual'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend Account' : 'Restore Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INCIDENTS TAB */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-cream-200 text-stone-400 text-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              No reported food-safety incidents. All listings comply with safety criteria.
            </div>
          ) : (
            incidents.map(inc => (
              <div key={inc.id} className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inc.status === 'OPEN' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {inc.status}
                    </span>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Severity: {inc.severity}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-forest-900 text-sm">{inc.title}</h4>
                  <p className="text-xs text-stone-600 max-w-xl">{inc.description}</p>
                  {inc.resolutionNotes && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-xl mt-2 border border-emerald-200">
                      <strong>Resolution:</strong> {inc.resolutionNotes}
                    </div>
                  )}
                </div>

                {inc.status === 'OPEN' && (
                  <button
                    onClick={() => { setResolvingIncident(inc); setResolutionNotes(''); }}
                    className="px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-cream-100 text-xs font-bold transition cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    Resolve Incident
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* AUDIT STREAM TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-cream-200 shadow-soft p-6">
          <h3 className="font-extrabold text-forest-900 text-sm mb-4">Immutable Audit Event Stream</h3>
          <div className="space-y-3">
            {auditEvents.map(e => (
              <div key={e.id || e.eventId} className="p-3.5 rounded-2xl bg-cream-50/50 border border-cream-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-cream-200 text-forest-900 mr-2">
                    {e.type}
                  </span>
                  <span className="text-stone-700">{e.details}</span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono shrink-0">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-cream-200 shadow-2xl p-6">
            <h3 className="font-extrabold text-forest-900 text-base mb-1">Resolve Incident</h3>
            <p className="text-xs text-stone-500 mb-4">{resolvingIncident.title}</p>
            <form onSubmit={handleResolveIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Resolution & Corrective Action Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Donor inspected, temperature logs verified, volunteer re-instructed."
                  className="w-full p-3 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  className="flex-1 py-2 rounded-xl border border-cream-200 text-stone-600 text-xs font-bold hover:bg-cream-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="flex-1 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-cream-100 text-xs font-bold transition cursor-pointer"
                >
                  {submittingResolution ? 'Submitting...' : 'Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
