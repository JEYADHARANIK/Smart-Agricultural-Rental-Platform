import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck,
  Tractor,
  CreditCard,
  ArrowUpRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
  Bell,
  CloudSun,
  CloudRain,
  Sun,
  CloudOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const WEATHER_STYLE = {
  BEST: { icon: Sun, label: 'Good conditions expected', cls: 'bg-forest-100 text-forest-800 border border-forest-200' },
  USABLE: { icon: CloudSun, label: 'Usable with caution', cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
  'NOT RECOMMENDED': { icon: CloudRain, label: 'Not recommended', cls: 'bg-rose-100 text-rose-800 border border-rose-200' },
  UNKNOWN: { icon: CloudOff, label: 'Weather data unavailable', cls: 'bg-stone-100 text-stone-600 border border-stone-200' },
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        const [bookRes, payRes, notifRes] = await Promise.all([
          api.get('/bookings/my-bookings'),
          api.get('/payments/my-payments').catch(() => ({ data: { success: false, payments: [] } })),
          api.get('/notifications', { params: { limit: 1 } }).catch(() => ({ data: { success: false } })),
        ]);

        if (bookRes.data.success) {
          setBookings(bookRes.data.bookings || []);
        }
        if (payRes.data?.success) {
          setPayments(payRes.data.payments || []);
        }
        if (notifRes.data?.success) {
          setUnreadCount(notifRes.data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error loading customer dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paidBookingIds = new Set(
    payments
      .filter((p) => p.paymentStatus === 'paid')
      .map((p) => (typeof p.booking === 'object' ? p.booking?._id : p.booking))
  );

  const upcomingCount = bookings.filter((b) => {
    const start = new Date(b.startDate);
    return b.status === 'approved' && start > today;
  }).length;

  const activeCount = bookings.filter((b) => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    return b.status === 'active' || (b.status === 'approved' && start <= today && end >= today);
  }).length;

  const unpaidApprovedBookings = bookings.filter(
    (b) => b.status === 'approved' && !paidBookingIds.has(b._id)
  );

  const pendingPaymentCount = unpaidApprovedBookings.length;
  const pendingPaymentTotal = unpaidApprovedBookings.reduce(
    (sum, b) => sum + (b.totalPrice || 0),
    0
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-shell">
      <div className="page-container">

        {/* Welcome Header Banner */}
        <div className="hero-banner p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="bg-white/10 text-forest-100 text-xs font-semibold px-3 py-1 rounded-full border border-white/15">
                Customer Portal
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {user?.name || 'Farmer'}!
              </h1>
              <p className="text-forest-200 text-sm max-w-xl">
                Manage your farming equipment rentals, inspect upcoming schedules, and review payment history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/notifications"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <Bell className="w-4 h-4" />
                <span>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</span>
              </Link>
              <Link
                to="/equipment"
                className="bg-forest-600 hover:bg-forest-700 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 text-sm shrink-0"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Browse Equipment</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="card card-body grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-stone-600">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-forest-50 text-forest-600 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Email</span>
              <span className="font-semibold text-stone-800">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-forest-50 text-forest-600 rounded-xl">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Phone</span>
              <span className="font-semibold text-stone-800">{user?.phone || 'Not provided'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-forest-50 text-forest-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Location</span>
              <span className="font-semibold text-stone-800">{user?.location || 'Not provided'}</span>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Upcoming Bookings */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Upcoming Bookings
              </span>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">{loading ? '...' : upcomingCount}</span>
              <span className="text-xs text-stone-500">reservations</span>
            </div>
            <p className="text-xs text-stone-500">
              {upcomingCount > 0 ? `${upcomingCount} equipment unit(s) scheduled for future deployment.` : 'No upcoming equipment reserved.'}
            </p>
          </div>

          {/* Card 2: Active Rentals */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Active Rentals
              </span>
              <div className="p-3 bg-forest-50 text-forest-600 rounded-xl">
                <Tractor className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">{loading ? '...' : activeCount}</span>
              <span className="text-xs text-stone-500">in operation</span>
            </div>
            <p className="text-xs text-stone-500">
              {activeCount > 0 ? `${activeCount} machine(s) currently active in your farm.` : 'No machinery currently dispatched to your farm.'}
            </p>
          </div>

          {/* Card 3: Pending Payments */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Pending Payments
              </span>
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">₹{loading ? '...' : pendingPaymentTotal}</span>
              <span className="text-xs text-stone-500">due ({pendingPaymentCount} unpaid)</span>
            </div>
            <p className="text-xs text-stone-500">
              {pendingPaymentCount > 0
                ? `${pendingPaymentCount} approved booking(s) awaiting payment completion.`
                : 'All invoice balances are clear.'}
            </p>
          </div>

        </div>

        {/* Recent Activity Section */}
        <div className="card p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-forest-50 text-forest-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">Recent Booking Activity</h2>
                <p className="text-xs text-stone-500">Live Reservation Status Overview</p>
              </div>
            </div>

            <Link
              to="/bookings"
              className="text-xs font-bold text-forest-600 hover:text-forest-700 flex items-center space-x-1"
            >
              <span>View All Bookings</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-6 text-stone-500 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-forest-600" />
              <span>Loading recent activity...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="state-block">
              <AlertCircle className="state-icon text-forest-500" />
              <h3 className="font-bold text-stone-900 text-base">No Equipment Reservations Yet</h3>
              <p className="text-xs text-stone-500 max-w-xl mx-auto">
                Explore our catalog of tractors, harvesters, and tilling machinery to request your first rental.
              </p>
              <div className="pt-2">
                <Link
                  to="/equipment"
                  className="inline-flex items-center space-x-2 text-xs font-bold text-forest-700 hover:text-forest-800 underline"
                >
                  <span>Browse Available Equipment Catalog</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {bookings.slice(0, 4).map((item) => {
                const isPaid = paidBookingIds.has(item._id);
                const weather = item.weatherSlot?.classification;
                const WeatherIcon = WEATHER_STYLE[weather]?.icon || CloudOff;
                const hasWeather = !!weather && weather !== 'UNKNOWN';

                return (
                  <div key={item._id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <Tractor className="w-4 h-4 text-forest-600 shrink-0" />
                      <div>
                        <span className="font-bold text-stone-900 block">{item.equipment?.name || 'Machine'}</span>
                        <span className="text-stone-400">{formatDate(item.startDate)} - {formatDate(item.endDate)} ({item.totalDays} days)</span>
                        {hasWeather && (
                          <span className={`inline-flex items-center space-x-1 text-[11px] font-bold mt-1 px-2 py-0.5 rounded-full border ${WEATHER_STYLE[weather].cls}`}>
                            <WeatherIcon className="w-3 h-3" />
                            <span>{WEATHER_STYLE[weather].label}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <div>
                        <span className="font-extrabold text-stone-900 block">₹{item.totalPrice}</span>
                        <span className="capitalize text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {item.status}
                        </span>
                      </div>
                      {isPaid && (
                        <span className="badge-green text-[11px] font-bold px-2 py-0.5">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomerDashboard;
