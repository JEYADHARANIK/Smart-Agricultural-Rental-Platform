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
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        const [bookRes, payRes] = await Promise.all([
          api.get('/bookings/my-bookings'),
          api.get('/payments/my-payments').catch(() => ({ data: { success: false, payments: [] } })),
        ]);

        if (bookRes.data.success) {
          setBookings(bookRes.data.bookings || []);
        }
        if (payRes.data?.success) {
          setPayments(payRes.data.payments || []);
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

  // Set of booking IDs that have a successful 'paid' payment
  const paidBookingIds = new Set(
    payments
      .filter((p) => p.paymentStatus === 'paid')
      .map((p) => (typeof p.booking === 'object' ? p.booking?._id : p.booking))
  );

  // Compute live metrics
  const upcomingCount = bookings.filter((b) => {
    const start = new Date(b.startDate);
    return b.status === 'approved' && start > today;
  }).length;

  const activeCount = bookings.filter((b) => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    return b.status === 'active' || (b.status === 'approved' && start <= today && end >= today);
  }).length;

  // Unpaid approved bookings (Approved bookings minus paid bookings)
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
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Welcome Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
                Customer Portal
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {user?.name || 'Farmer'}! 👋
              </h1>
              <p className="text-emerald-100 text-sm max-w-xl">
                Manage your farming equipment rentals, inspect upcoming schedules, and review payment history.
              </p>
            </div>

            <Link
              to="/equipment"
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Browse Equipment</span>
            </Link>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Email</span>
              <span className="font-semibold text-slate-800">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Phone</span>
              <span className="font-semibold text-slate-800">{user?.phone || 'Not provided'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Location</span>
              <span className="font-semibold text-slate-800">{user?.location || 'Not provided'}</span>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Upcoming Bookings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Upcoming Bookings
              </span>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{loading ? '...' : upcomingCount}</span>
              <span className="text-xs text-slate-500">reservations</span>
            </div>
            <p className="text-xs text-slate-500">
              {upcomingCount > 0 ? `${upcomingCount} equipment unit(s) scheduled for future deployment.` : 'No upcoming equipment reserved.'}
            </p>
          </div>

          {/* Card 2: Active Rentals */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Rentals
              </span>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Tractor className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{loading ? '...' : activeCount}</span>
              <span className="text-xs text-slate-500">in operation</span>
            </div>
            <p className="text-xs text-slate-500">
              {activeCount > 0 ? `${activeCount} machine(s) currently active in your farm.` : 'No machinery currently dispatched to your farm.'}
            </p>
          </div>

          {/* Card 3: Pending Payments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Payments
              </span>
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">${loading ? '...' : pendingPaymentTotal}</span>
              <span className="text-xs text-slate-500">due ({pendingPaymentCount} unpaid)</span>
            </div>
            <p className="text-xs text-slate-500">
              {pendingPaymentCount > 0
                ? `${pendingPaymentCount} approved booking(s) awaiting payment completion.`
                : 'All invoice balances are clear.'}
            </p>
          </div>

        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Recent Booking Activity</h2>
                <p className="text-xs text-slate-500">Live Reservation Status Overview</p>
              </div>
            </div>

            <Link
              to="/bookings"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>View All Bookings</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Loading recent activity...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-emerald-950 text-base">No Equipment Reservations Yet</h3>
              <p className="text-xs text-slate-600 max-w-xl mx-auto">
                Explore our catalog of tractors, harvesters, and tilling machinery to request your first rental.
              </p>
              <div className="pt-2">
                <Link
                  to="/equipment"
                  className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
                >
                  <span>Browse Available Equipment Catalog</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 4).map((item) => {
                const isPaid = paidBookingIds.has(item._id);

                return (
                  <div key={item._id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <Tractor className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 block">{item.equipment?.name || 'Machine'}</span>
                        <span className="text-slate-400">{formatDate(item.startDate)} - {formatDate(item.endDate)} ({item.totalDays} days)</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <div>
                        <span className="font-extrabold text-slate-900 block">${item.totalPrice}</span>
                        <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {item.status}
                        </span>
                      </div>
                      {isPaid && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
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
