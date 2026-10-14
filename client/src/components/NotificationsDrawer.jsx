import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Check, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function NotificationsDrawer({ isOpen, onClose, onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }
    if (n.link && onNavigateTab) {
      const tab = n.link.replace('/', '');
      onNavigateTab(tab);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filtered = filter === 'UNREAD' ? notifications.filter(n => !n.isRead) : notifications;
  const unreadTotal = notifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white max-w-md w-full h-full shadow-2xl flex flex-col border-l border-cream-200">
        {/* Header */}
        <div className="p-6 border-b border-cream-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center">
              <Bell className="w-4 h-4 text-sage-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-forest-900 text-base">Notifications</h2>
              <p className="text-xs text-stone-500">Live operational alerts & status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-cream-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-cream-50/50 border-b border-cream-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-forest-900 text-cream-100'
                  : 'text-stone-600 hover:bg-cream-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-forest-900 text-cream-100'
                  : 'text-stone-600 hover:bg-cream-200'
              }`}
            >
              Unread ({unreadTotal})
            </button>
          </div>

          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-sage-700 hover:text-sage-800 flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sage-600" />
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-xs">
              <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              No {filter === 'UNREAD' ? 'unread' : ''} notifications at this time.
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-1.5 ${
                  n.isRead
                    ? 'bg-white border-cream-200 hover:bg-cream-50/50'
                    : 'bg-sage-50/50 border-sage-200/90 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-terracotta-500 shrink-0" />
                    )}
                    <h3 className="text-xs font-bold text-forest-900">
                      {n.title}
                    </h3>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      title="Mark as read"
                      className="p-1 rounded-md text-stone-400 hover:text-sage-700 hover:bg-sage-100 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {n.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                  <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {n.link && (
                    <span className="text-sage-700 font-bold flex items-center gap-1">
                      View details <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
