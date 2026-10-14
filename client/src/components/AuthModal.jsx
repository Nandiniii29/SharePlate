import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  Phone, 
  MapPin, 
  Store, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState('DONOR'); // 'DONOR' | 'RECIPIENT'
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      if (onAuthSuccess) onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.signup({
        fullName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword,
        accountType,
        organizationName,
        phone,
        location
      });
      if (onAuthSuccess) onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (onAuthSuccess) onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
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

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sage-100 text-sage-800 mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-sage-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-forest-900 tracking-tight">
            {mode === 'login' ? 'Sign in to SharePlate' : 'Create your SharePlate Account'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Good Food. Greater Impact. Connect food donors with community kitchens.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-cream-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'login'
                ? 'bg-white text-forest-900 shadow-xs'
                : 'text-stone-500 hover:text-forest-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'signup'
                ? 'bg-white text-forest-900 shadow-xs'
                : 'text-stone-500 hover:text-forest-900'
            }`}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@organization.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-cream-50/50 border border-cream-200 rounded-2xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-cream-50/50 border border-cream-200 rounded-2xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Login Helpers for testing/review */}
            <div className="pt-4 border-t border-cream-200">
              <span className="text-[11px] font-semibold text-stone-400 block mb-2 text-center uppercase tracking-wider">
                Quick Demonstration Accounts
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('hostel3@shareplate.org', 'Password123!')}
                  className="p-2 rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200 text-sage-800 text-[11px] font-bold text-center transition cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 mx-auto mb-1 text-sage-600" />
                  Canteen Donor
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('robinhooda@shareplate.org', 'Password123!')}
                  className="p-2 rounded-xl bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-200 text-terracotta-800 text-[11px] font-bold text-center transition cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 mx-auto mb-1 text-terracotta-600" />
                  NGO Recipient
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin@shareplate.org', 'AdminSecure2026!')}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-forest-900 text-[11px] font-bold text-center transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1 text-forest-700" />
                  Platform Admin
                </button>
              </div>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            {/* Account Type Selector */}
            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
                  accountType === 'DONOR' 
                    ? 'border-sage-500 bg-sage-50/70 text-sage-900 font-bold' 
                    : 'border-cream-200 bg-cream-50/40 text-stone-600'
                }`}>
                  <input
                    type="radio"
                    name="accountType"
                    checked={accountType === 'DONOR'}
                    onChange={() => setAccountType('DONOR')}
                    className="sr-only"
                  />
                  <Store className="w-4 h-4 text-sage-600" />
                  <div className="text-left">
                    <div className="text-xs">Food Donor</div>
                    <div className="text-[10px] text-stone-500 font-normal">Canteen, Caterer, Mess</div>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
                  accountType === 'RECIPIENT' 
                    ? 'border-terracotta-500 bg-terracotta-50/70 text-terracotta-900 font-bold' 
                    : 'border-cream-200 bg-cream-50/40 text-stone-600'
                }`}>
                  <input
                    type="radio"
                    name="accountType"
                    checked={accountType === 'RECIPIENT'}
                    onChange={() => setAccountType('RECIPIENT')}
                    className="sr-only"
                  />
                  <Building2 className="w-4 h-4 text-terracotta-600" />
                  <div className="text-left">
                    <div className="text-xs">Recipient Org</div>
                    <div className="text-[10px] text-stone-500 font-normal">NGO, Shelter, Kitchen</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Full Name & Organization Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contact Name"
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Organization / Mess Name
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Campus Hostel 4 Mess"
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@org.edu"
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
                    placeholder="+91-98765-43210"
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>
            </div>

            {/* Location / Address */}
            <div>
              <label className="block text-xs font-bold text-forest-800 mb-1">
                Dispatch / Collection Location
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Canteen Ground Floor, North Campus"
                  className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-800 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
