import React from 'react';
import { 
  HeartHandshake, 
  Store, 
  Building2, 
  RefreshCw, 
  BarChart3, 
  ShieldAlert,
  Bell, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Home,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  serverConnected, 
  currentUser, 
  unreadNotificationsCount, 
  onOpenNotifications, 
  onOpenAuth, 
  onOpenProfile, 
  onLogout 
}) {
  // Navigation tabs based on user role or public visitor
  const getNavItems = () => {
    if (!currentUser) {
      return [
        { id: 'landing', label: 'Home', icon: Home },
        { id: 'recipient', label: 'Browse Surplus', icon: Building2 },
        { id: 'recovery', label: 'Recovery Board', icon: RefreshCw },
        { id: 'impact', label: 'Impact Ledger', icon: BarChart3 }
      ];
    }

    if (currentUser.role === 'DONOR') {
      return [
        { id: 'donor', label: 'My Surplus Batches', icon: Store },
        { id: 'recipient', label: 'Public Listings', icon: Building2 },
        { id: 'recovery', label: 'Recovery Board', icon: RefreshCw },
        { id: 'impact', label: 'Verified Impact', icon: BarChart3 }
      ];
    }

    if (currentUser.role === 'ADMIN') {
      return [
        { id: 'donor', label: 'Donor Manager', icon: Store },
        { id: 'recipient', label: 'Recipient Portal', icon: Building2 },
        { id: 'recovery', label: 'Recovery Board', icon: RefreshCw },
        { id: 'impact', label: 'Impact Ledger', icon: BarChart3 },
        { id: 'admin', label: 'Admin Console', icon: ShieldAlert }
      ];
    }

    // Default: RECIPIENT
    return [
      { id: 'recipient', label: 'Surplus Discovery', icon: Building2 },
      { id: 'recovery', label: 'Recovery Board', icon: RefreshCw },
      { id: 'impact', label: 'Impact Ledger', icon: BarChart3 }
    ];
  };

  const navItems = getNavItems();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-cream-200">
      {/* Top Status Bar */}
      <div className="bg-forest-950 text-cream-100 text-[11px] py-1 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${serverConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="font-semibold text-cream-200">
              SharePlate Active • {serverConnected ? 'Operational Database Connected' : 'Connecting to Platform...'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <span className="hidden sm:inline text-sage-300 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sage-400" />
              Verified Chain-of-Custody Handshake
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-cream-300 font-semibold">Zero Landfill Surplus</span>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => setActiveTab(currentUser ? (currentUser.role === 'DONOR' ? 'donor' : 'recipient') : 'landing')}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-600 to-forest-800 text-white flex items-center justify-center shadow-md shadow-sage-900/10">
            <HeartHandshake className="w-5 h-5 text-cream-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-forest-900">
                SharePlate
              </span>
            </div>
            <p className="text-[11px] font-semibold text-terracotta-600 -mt-0.5 tracking-tight">Good Food. Greater Impact.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-cream-100/90 p-1.5 rounded-2xl border border-cream-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-forest-900 shadow-xs border border-cream-200'
                    : 'text-stone-600 hover:text-forest-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-terracotta-600' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Notifications & User Profile or Auth Buttons */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* Notifications Bell */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2.5 rounded-2xl border border-cream-200 bg-cream-50/50 hover:bg-cream-100 text-stone-600 transition cursor-pointer"
                title="View notifications"
              >
                <Bell className="w-4 h-4 text-forest-800" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-terracotta-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* User Profile Pill */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-cream-200 bg-white hover:bg-cream-50 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center text-xs font-bold">
                  {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-forest-900 leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2.5 rounded-2xl border border-cream-200 bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-forest-900 hover:bg-cream-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-stone-500" />
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Sub-bar */}
      <div className="md:hidden flex items-center gap-1 bg-cream-50 px-4 py-2 border-t border-cream-200 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-white text-forest-900 shadow-2xs border border-cream-200'
                  : 'text-stone-600 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-terracotta-600' : 'text-stone-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
