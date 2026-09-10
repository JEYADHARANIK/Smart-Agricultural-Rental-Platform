import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Tractor,
  CheckCircle,
  Clock,
  CalendarCheck,
  ShieldCheck,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Loader2,
  Check,
  X,
  CreditCard,
  DollarSign,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AnalyticsCharts from '../components/AnalyticsCharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [eqRes, bookRes, payRes, analyticsRes] = await Promise.all([
        api.get('/equipment'),
        api.get('/bookings'),
        api.get('/payments').catch(() => ({ data: { success: false, payments: [] } })),
        api.get('/analytics/dashboard').catch(() => ({ data: { success: false } })),
      ]);

      if (eqRes.data.success) {
        setEquipmentList(eqRes.data.equipment || []);
      }
      if (bookRes.data.success) {
        setBookings(bookRes.data.bookings || []);
      }
      if (payRes.data?.success) {
        setPayments(payRes.data.payments || []);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.analytics || null);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute live admin metrics
  const totalEquipment = equipmentList.length;
  const availableEquipment = equipmentList.filter((e) => e.status === 'Available').length;

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const pendingCount = pendingBookings.length;

  const activeRentalsCount = bookings.filter((b) => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    return b.status === 'active' || (b.status === 'approved' && start <= today && end >= today);
  }).length;

  // Compute Total Revenue Collected (only paymentStatus === 'paid')
  const totalRevenue = payments
    .filter((p) => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleQuickStatus = async (bookingId, newStatus) => {
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      if (res.data.success) {
        setActionMessage(`Booking #${res.data.booking.bookingNumber} ${newStatus}.`);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Quick status update error:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-shell">
      <div className="page-container space-y-8">

        {/* Admin Header Banner */}
        <div className="bg-forest-800 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 bg-amber-500/15 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-400/20">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Administrator Operations Console</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Equipment Owner Dashboard
              </h1>
              <p className="text-forest-200 text-sm max-w-xl">
                Logged in as <span className="text-white font-semibold">{user?.name}</span> ({user?.email})
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/equipment"
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center space-x-2 text-sm border border-white/10"
              >
                <Plus className="w-4 h-4" />
                <span>Add Equipment</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Global Action Toast */}
        {actionMessage && (
          <div role="status" className="card bg-forest-50 border border-forest-200 text-forest-800 p-4 flex items-center justify-between">
            <span className="text-xs font-bold">{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} aria-label="Dismiss message" className="text-forest-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">

          {/* Card 1: Total Revenue Collected */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Total Revenue
              </span>
              <div className="p-3 bg-forest-100 text-forest-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">₹{loading ? '...' : totalRevenue}</span>
            </div>
            <p className="text-xs text-forest-600 font-medium">
              Collected from paid transactions
            </p>
          </div>

          {/* Card 2: Total Equipment */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Total Equipment
              </span>
              <div className="p-3 bg-forest-100 text-forest-500 rounded-xl">
                <Tractor className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">{loading ? '...' : totalEquipment}</span>
              <span className="text-xs text-stone-500">fleet units</span>
            </div>
            <p className="text-xs text-forest-600 font-medium">
              Registered in machinery database
            </p>
          </div>

          {/* Card 3: Available Equipment */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Available Fleet
              </span>
              <div className="p-3 bg-forest-100 text-forest-400 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">{loading ? '...' : availableEquipment}</span>
              <span className="text-xs text-stone-500">ready to rent</span>
            </div>
            <p className="text-xs text-forest-600 font-medium">
              {totalEquipment > 0 ? `${Math.round((availableEquipment / totalEquipment) * 100)}% readiness` : 'No fleet'}
            </p>
          </div>

          {/* Card 4: Pending Bookings */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Pending Requests
              </span>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">{loading ? '...' : pendingCount}</span>
              <span className="text-xs text-stone-500">awaiting review</span>
            </div>
            <p className="text-xs text-amber-600 font-medium">
              Action required by admin
            </p>
          </div>

          {/* Card 5: Active Rentals */}
          <div className="stat-card">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Active Rentals
              </span>
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-stone-900">{loading ? '...' : activeRentalsCount}</span>
              <span className="text-xs text-stone-500">in field use</span>
            </div>
            <p className="text-xs text-sky-600 font-medium">
              Dispatched to active farms
            </p>
          </div>

        </div>

        {/* Dashboard Grid: Pending Reservation Queue & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Pending Requests Queue */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Pending Reservations</h2>
                  <p className="text-xs text-stone-500">Review & Process Incoming Farmer Requests</p>
                </div>
              </div>

              <Link
                to="/admin/bookings"
                className="text-xs font-bold text-forest-600 hover:text-forest-700 flex items-center space-x-1"
              >
                <span>Manage All</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-6 text-stone-500 text-xs flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-forest-600" />
                <span>Loading pending reservations...</span>
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="state-block">
                <CheckCircle className="w-8 h-8 text-forest-500 mx-auto" />
                <h3 className="font-bold text-stone-800 text-sm">All Pending Requests Processed</h3>
                <p className="text-xs text-stone-500">There are no pending booking requests requiring review.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingBookings.map((b) => (
                  <div key={b._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center space-x-3">
                      <Tractor className="w-4 h-4 text-forest-600 shrink-0" />
                      <div>
                        <span className="font-bold text-stone-900 block font-mono">#{b.bookingNumber} • {b.equipment?.name}</span>
                        <span className="text-stone-500">Customer: {b.customer?.name}</span>
                        <span className="text-stone-400 block text-[11px]">{formatDate(b.startDate)} - {formatDate(b.endDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-extrabold text-forest-600 mr-2">₹{b.totalPrice}</span>
                      <button
                        onClick={() => handleQuickStatus(b._id, 'approved')}
                        className="bg-forest-600 hover:bg-forest-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleQuickStatus(b._id, 'rejected')}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payment Transactions */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-forest-100 text-forest-600 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Recent Payment Transactions</h2>
                  <p className="text-xs text-stone-500">Fleet Financial Receipts & Activity</p>
                </div>
              </div>

              <Link
                to="/admin/bookings"
                className="text-xs font-bold text-forest-600 hover:text-forest-700 flex items-center space-x-1"
              >
                <span>View Transactions</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-6 text-stone-500 text-xs flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-forest-600" />
                <span>Loading payment transactions...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="state-block">
                <CreditCard className="w-8 h-8 text-stone-400 mx-auto" />
                <h3 className="font-bold text-stone-800 text-sm">No Payment Transactions Recorded</h3>
                <p className="text-xs text-stone-500">No customers have completed equipment rental payments yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {payments.slice(0, 5).map((p) => (
                  <div key={p._id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-4 h-4 text-forest-600 shrink-0" />
                      <div>
                        <span className="font-bold text-stone-900 block font-mono">{p.transactionNumber}</span>
                        <span className="text-stone-500">Customer: {p.customer?.name || 'Farmer'} ({p.paymentMethod})</span>
                        <span className="text-stone-400 block text-[11px]">{formatDate(p.paymentDate)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-stone-900 block">₹{p.amount}</span>
                      <span
                        className={`badge ${p.paymentStatus === 'paid'
                            ? 'badge-green'
                            : p.paymentStatus === 'refunded'
                              ? 'badge-purple'
                              : 'badge-slate'
                          }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Analytics & Charts Section */}
        <div className="card p-6">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Fleet Analytics Dashboard</h2>
              <p className="text-xs text-stone-500 mt-0.5">Revenue, booking trends, utilization, and usage insights computed from live database records.</p>
            </div>
          </div>
          <AnalyticsCharts analytics={analytics} loading={!analytics && loading} />
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
