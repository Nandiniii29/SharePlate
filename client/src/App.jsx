import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DonorView from './pages/DonorView';
import RecipientView from './pages/RecipientView';
import RecoveryView from './pages/RecoveryView';
import ImpactDashboard from './pages/ImpactDashboard';
import AdminView from './pages/AdminView';

// Modals and Drawers
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import NotificationsDrawer from './components/NotificationsDrawer';

import { api } from './services/api';
import { ShieldCheck, HeartHandshake, Leaf, Heart } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('landing');
  const [serverConnected, setServerConnected] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Check current session & backend connection on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await api.getHealth();
        setServerConnected(true);

        // Fetch authenticated user
        const meRes = await api.getMe();
        if (meRes.user) {
          setCurrentUser(meRes.user);
          setActiveTab(meRes.user.role === 'DONOR' ? 'donor' : meRes.user.role === 'ADMIN' ? 'admin' : 'recipient');
        } else {
          setActiveTab('landing');
        }
      } catch (err) {
        setServerConnected(false);
      }
    };

    initializeAuth();
  }, []);

  // Poll notifications count periodically
  useEffect(() => {
    const fetchNotificationsCount = async () => {
      try {
        const res = await api.getNotifications();
        setUnreadNotificationsCount(res.unreadCount || 0);
      } catch (e) {}
    };

    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'DONOR') {
      setActiveTab('donor');
    } else if (user.role === 'ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('recipient');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setActiveTab('landing');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 flex flex-col font-sans selection:bg-sage-200 selection:text-forest-900">
      {/* Header & Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        serverConnected={serverConnected}
        currentUser={currentUser}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {activeTab === 'landing' && (
          <LandingPage 
            onOpenAuth={handleOpenAuth}
            onExploreTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'donor' && <DonorView currentUser={currentUser} />}
        {activeTab === 'recipient' && (
          <RecipientView 
            currentUser={currentUser} 
            onOpenAuth={handleOpenAuth} 
          />
        )}
        {activeTab === 'recovery' && <RecoveryView />}
        {activeTab === 'impact' && <ImpactDashboard />}
        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        user={currentUser}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          // Refresh count
          api.getNotifications().then(r => setUnreadNotificationsCount(r.unreadCount || 0)).catch(() => {});
        }}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Professional Footer */}
      <footer className="border-t border-cream-200 bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-cream-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-sage-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <HeartHandshake className="w-5 h-5 text-cream-100" />
              </div>
              <div>
                <span className="font-black text-forest-900 text-base tracking-tight block">
                  SharePlate
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  Good Food. Greater Impact.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-stone-600 font-medium">
              <button onClick={() => setActiveTab('landing')} className="hover:text-forest-900 cursor-pointer">About Platform</button>
              <button onClick={() => setActiveTab('recipient')} className="hover:text-forest-900 cursor-pointer">Live Surplus Listings</button>
              <button onClick={() => setActiveTab('recovery')} className="hover:text-forest-900 cursor-pointer">Recovery Board</button>
              <button onClick={() => setActiveTab('impact')} className="hover:text-forest-900 cursor-pointer">Verified Impact</button>
              <span className="text-stone-300">•</span>
              <span className="text-stone-500">Contact: support@shareplate.org</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
            <div>
              © {new Date().getFullYear()} SharePlate Surplus Food Network. All rights reserved.
            </div>

            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-stone-600 font-semibold">
                <ShieldCheck className="w-4 h-4 text-sage-600" />
                Biological Safety Verification Standard
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-stone-600 font-semibold">
                <Leaf className="w-4 h-4 text-sage-600" />
                Zero Landfill Methane Commitment
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
