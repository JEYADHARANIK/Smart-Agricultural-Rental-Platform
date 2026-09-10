import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle,
  CalendarCheck,
  CreditCard,
  AlertTriangle,
  Info,
  X,
  Loader2,
  RotateCcw
} from 'lucide-react';
import api from '../api/axios';

const TYPE_STYLES = {
  booking_submitted: { icon: Bell, cls: 'bg-amber-100 text-amber-700' },
  booking_approved: { icon: CheckCircle, cls: 'bg-forest-100 text-forest-700' },
  booking_rejected: { icon: AlertTriangle, cls: 'bg-rose-100 text-rose-700' },
  booking_cancelled: { icon: X, cls: 'bg-stone-100 text-stone-600' },
  schedule_change: { icon: CalendarCheck, cls: 'bg-sky-100 text-sky-700' },
  payment_success: { icon: CreditCard, cls: 'bg-forest-100 text-forest-700' },
  payment_refunded: { icon: RotateCcw, cls: 'bg-purple-100 text-purple-700' },
  system: { icon: Info, cls: 'bg-stone-100 text-stone-600' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read error:', err);
      setError(err.response?.data?.message || 'Failed to mark notifications as read.');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Mark one read error:', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' • ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="page-shell">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Header */}
        <div className="page-header">
          <div className="flex items-center space-x-3">
            <div className="page-header-icon">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="page-title">Notifications</h1>
              <p className="page-subtitle">
                Booking updates, payment confirmations, refunds, and system alerts.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn btn-primary btn-sm"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read ({unreadCount})</span>
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="alert-error p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} aria-label="Dismiss message" className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Notification list */}
        {loading ? (
          <div className="state-block">
            <Loader2 className="state-icon animate-spin" />
            <p className="text-sm font-medium text-stone-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="state-block">
            <Bell className="w-16 h-16 text-stone-300 mx-auto" />
            <h3 className="text-lg font-bold text-stone-800">No Notifications Yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              You will be notified here about booking approvals, payment confirmations, refunds, and schedule changes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const style = TYPE_STYLES[n.type] || TYPE_STYLES.system;
              const Icon = style.icon;

              return (
                <button
                  key={n._id}
                  onClick={() => !n.isRead && handleMarkOneRead(n._id)}
                  className={`card w-full text-left p-4 transition-colors cursor-pointer flex items-start space-x-3 hover:border-forest-200 ${n.isRead ? 'opacity-70' : 'border-forest-300'}`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${style.cls}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-bold text-stone-900 text-sm">{n.title}</h3>
                      {!n.isRead && <span className="w-2.5 h-2.5 bg-forest-500 rounded-full animate-pulse shrink-0 mt-1"></span>}
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[11px] text-stone-400 block mt-2">{formatTime(n.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
