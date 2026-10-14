import React, { useState } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Phone, 
  MapPin, 
  Clock, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Profile fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [orgName, setOrgName] = useState(user?.organization?.name || '');
  const [location, setLocation] = useState(user?.organization?.location || '');
  const [capacityMin, setCapacityMin] = useState(user?.organization?.capacityMin || 10);
  const [capacityMax, setCapacityMax] = useState(user?.organization?.capacityMax || 150);
  const [acceptsNonVeg, setAcceptsNonVeg] = useState(user?.organization?.acceptsNonVeg ?? true);
  const [operatingHoursStart, setOperatingHoursStart] = useState(user?.organization?.operatingHoursStart || '09:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState(user?.organization?.operatingHoursEnd || '22:00');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    try {
      const res = await api.updateProfile({
        fullName,
        phone,
        organizationName: orgName,
        location,
        capacityMin: Number(capacityMin),
        capacityMax: Number(capacityMax),
        acceptsNonVeg,
        operatingHoursStart,
        operatingHoursEnd
      });

      setStatusMessage({ type: 'success', text: 'Organization profile updated successfully.' });
      if (onProfileUpdated) onProfileUpdated(res.user);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword !== confirmNewPassword) {
      setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setStatusMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-cream-200 shadow-2xl p-6 sm:p-8 my-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-cream-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-800 flex items-center justify-center font-bold text-lg">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-forest-900 tracking-tight">
              {user.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-stone-500 font-medium">{user.email}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                user.role === 'DONOR'
                  ? 'bg-sage-100 text-sage-800'
                  : user.role === 'ADMIN'
                  ? 'bg-forest-900 text-cream-100'
                  : 'bg-terracotta-100 text-terracotta-800'
              }`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-cream-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setStatusMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'profile'
                ? 'bg-white text-forest-900 shadow-xs'
                : 'text-stone-500 hover:text-forest-900'
            }`}
          >
            Organization & Profile
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setStatusMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'password'
                ? 'bg-white text-forest-900 shadow-xs'
                : 'text-stone-500 hover:text-forest-900'
            }`}
          >
            Security & Password
          </button>
        </div>

        {statusMessage && (
          <div className={`mb-4 p-3 rounded-2xl border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Contact Person
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1">
                Organization Name
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1">
                Pickup / Delivery Address
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            {user.role === 'RECIPIENT' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-forest-800 mb-1">
                      Min Capacity (portions)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={capacityMin}
                      onChange={(e) => setCapacityMin(e.target.value)}
                      className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest-800 mb-1">
                      Max Capacity (portions)
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={capacityMax}
                      onChange={(e) => setCapacityMax(e.target.value)}
                      className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-forest-800 mb-1">
                      Operating From
                    </label>
                    <input
                      type="time"
                      value={operatingHoursStart}
                      onChange={(e) => setOperatingHoursStart(e.target.value)}
                      className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest-800 mb-1">
                      Operating Until
                    </label>
                    <input
                      type="time"
                      value={operatingHoursEnd}
                      onChange={(e) => setOperatingHoursEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-cream-200 bg-cream-50/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsNonVeg}
                    onChange={(e) => setAcceptsNonVeg(e.target.checked)}
                    className="rounded text-sage-600 focus:ring-sage-500"
                  />
                  <span className="text-xs font-medium text-stone-800">
                    Accepts Non-Vegetarian surplus food batches
                  </span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* PASSWORD TAB */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1">
                New Password (min 6 characters)
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
