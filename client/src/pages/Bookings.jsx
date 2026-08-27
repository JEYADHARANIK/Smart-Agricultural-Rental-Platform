import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  Tractor,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Ban,
  Filter,
  User as UserIcon,
  Phone,
  Mail,
  CreditCard,
  DollarSign,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUS_FILTERS = ['All', 'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'];

const PAYMENT_METHODS = [
  'UPI / Mobile Wallet',
  'Credit/Debit Card',
  'Net Banking',
  'Cash on Delivery',
];

const Bookings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  // Admin Rejection Remarks Modal
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Customer Payment Checkout Modal
  const [payingBooking, setPayingBooking] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI / Mobile Wallet');
  const [paymentError, setPaymentError] = useState(null);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Admin Refund Modal
  const [refundingPayment, setRefundingPayment] = useState(null);
  const [refundAdminNotes, setRefundAdminNotes] = useState('');
  const [isRefundSubmitting, setIsRefundSubmitting] = useState(false);

  // Fetch Bookings & Payments from API
  const fetchBookingsAndPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const bookingEndpoint = isAdmin ? '/bookings' : '/bookings/my-bookings';
      const paymentEndpoint = isAdmin ? '/payments' : '/payments/my-payments';

      const [bookingRes, paymentRes] = await Promise.all([
        api.get(bookingEndpoint),
        api.get(paymentEndpoint).catch((err) => ({ data: { success: false, payments: [] } })),
      ]);

      if (bookingRes.data.success) {
        setBookings(bookingRes.data.bookings || []);
      }
      if (paymentRes.data?.success) {
        setPayments(paymentRes.data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load bookings and payments from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsAndPayments();
  }, [isAdmin]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Build Payment Lookup Map by Booking ID
  const paymentMap = {};
  payments.forEach((p) => {
    const bookingId = typeof p.booking === 'object' ? p.booking?._id : p.booking;
    if (bookingId) {
      // Prioritize 'paid' status if multiple payments exist
      if (!paymentMap[bookingId] || p.paymentStatus === 'paid') {
        paymentMap[bookingId] = p;
      }
    }
  });

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Admin Status Update (Approve / Direct Status Change)
  const handleUpdateStatus = async (bookingId, newStatus, remarks = '') => {
    try {
      setIsActionSubmitting(true);
      setError(null);
      const res = await api.patch(`/bookings/${bookingId}/status`, {
        status: newStatus,
        adminRemarks: remarks,
      });

      if (res.data.success) {
        setSuccessMessage(`Booking #${res.data.booking.bookingNumber} marked as ${newStatus}.`);
        setRejectingBooking(null);
        setAdminRemarks('');
        fetchBookingsAndPayments();
      }
    } catch (err) {
      console.error('Update status error:', err);
      setError(err.response?.data?.message || 'Failed to update booking status.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Customer or Admin Cancel Booking
  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel booking #${booking.bookingNumber}?`)) {
      return;
    }

    try {
      setIsActionSubmitting(true);
      setError(null);
      const res = await api.patch(`/bookings/${booking._id}/cancel`);
      if (res.data.success) {
        setSuccessMessage(`Booking #${booking.bookingNumber} cancelled successfully.`);
        fetchBookingsAndPayments();
      }
    } catch (err) {
      console.error('Cancel booking error:', err);
      setError(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Customer Process Payment Submit
  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!payingBooking) return;

    try {
      setIsPaymentSubmitting(true);
      setPaymentError(null);

      const res = await api.post('/payments/process', {
        bookingId: payingBooking._id,
        paymentMethod: selectedPaymentMethod,
      });

      if (res.data.success) {
        setSuccessMessage(
          `Payment completed successfully! Reference: ${res.data.payment.transactionNumber}`
        );
        setPayingBooking(null);
        fetchBookingsAndPayments();
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      setPaymentError(err.response?.data?.message || 'Failed to process payment.');
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // Admin Issue Refund Submit
  const handleIssueRefund = async (e) => {
    e.preventDefault();
    if (!refundingPayment) return;

    try {
      setIsRefundSubmitting(true);
      setError(null);

      const res = await api.patch(`/payments/${refundingPayment._id}/refund`, {
        adminNotes: refundAdminNotes,
      });

      if (res.data.success) {
        setSuccessMessage(
          `Refund issued for Transaction #${res.data.payment.transactionNumber}. Payment status updated to 'refunded'.`
        );
        setRefundingPayment(null);
        setRefundAdminNotes('');
        fetchBookingsAndPayments();
      }
    } catch (err) {
      console.error('Refund processing error:', err);
      setError(err.response?.data?.message || 'Failed to issue refund.');
    } finally {
      setIsRefundSubmitting(false);
    }
  };

  // Filter Bookings by status
  const filteredBookings = bookings.filter((item) => {
    if (statusFilter === 'All') return true;
    return item.status === statusFilter;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Global Feedback Banners */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAdmin ? 'Rental Bookings Operations' : 'My Equipment Reservations'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin
                ? 'Review, approve, or reject incoming machinery rental requests and manage transaction refunds.'
                : 'Track status, rental periods, payments, and complete digital checkout for approved reservations.'}
            </p>
          </div>

          {/* Status Filter Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Card Container */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading bookings and transaction records from database...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <Clock className="w-16 h-16 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No Booking Records</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {statusFilter !== 'All'
                ? `No bookings found matching status "${statusFilter}".`
                : isAdmin
                  ? 'No rental booking requests have been submitted yet.'
                  : 'You have not submitted any equipment rental requests yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">
                {isAdmin ? 'Fleet Rental Requests & Payment Status' : 'Your Reservation History'}
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full border border-slate-200">
                {filteredBookings.length} {filteredBookings.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Booking ID</th>
                    <th className="px-6 py-3.5">Equipment</th>
                    <th className="px-6 py-3.5">{isAdmin ? 'Customer' : 'Daily Rate'}</th>
                    <th className="px-6 py-3.5">Rental Period</th>
                    <th className="px-6 py-3.5">Total Cost</th>
                    <th className="px-6 py-3.5">Booking Status</th>
                    <th className="px-6 py-3.5">Payment Record</th>
                    <th className="px-6 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((item) => {
                    const payment = paymentMap[item._id];
                    const isPaid = payment && payment.paymentStatus === 'paid';
                    const isRefunded = payment && payment.paymentStatus === 'refunded';
                    const isEligibleForPayment = item.status === 'approved' && !isPaid;

                    // Booking Status Badge
                    let statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    let StatusIcon = Clock;

                    if (item.status === 'approved') {
                      statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      StatusIcon = CalendarCheck;
                    } else if (item.status === 'active') {
                      statusBadgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
                      StatusIcon = Tractor;
                    } else if (item.status === 'completed') {
                      statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                      StatusIcon = CheckCircle;
                    } else if (item.status === 'rejected') {
                      statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                      StatusIcon = AlertCircle;
                    } else if (item.status === 'cancelled') {
                      statusBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
                      StatusIcon = Ban;
                    }

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">

                        {/* Booking Number */}
                        <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs shrink-0">
                          #{item.bookingNumber}
                        </td>

                        {/* Equipment Info */}
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                              <Tractor className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block line-clamp-1">
                                {item.equipment?.name || 'Equipment Machine'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {item.equipment?.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Customer / Rate */}
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">
                                {item.customer?.name || 'Farmer'}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {item.customer?.email}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-800 text-xs">
                              ${item.dailyRate}/day
                            </span>
                          )}
                        </td>

                        {/* Rental Period */}
                        <td className="px-6 py-4 text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800">
                            {formatDate(item.startDate)} - {formatDate(item.endDate)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {item.totalDays} {item.totalDays === 1 ? 'day' : 'days'}
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="px-6 py-4 font-black text-emerald-600 text-sm">
                          ${item.totalPrice}
                        </td>

                        {/* Booking Status Badge */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center space-x-1.5 capitalize ${statusBadgeClass}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{item.status}</span>
                            </span>
                            {item.adminRemarks && (
                              <p className="text-[10px] text-rose-600 font-medium italic line-clamp-1 max-w-[150px]">
                                Note: {item.adminRemarks}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Payment Record Status Column */}
                        <td className="px-6 py-4">
                          {isPaid ? (
                            <div className="space-y-0.5">
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center space-x-1">
                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                <span>Paid</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 block font-semibold">
                                {payment.transactionNumber}
                              </span>
                            </div>
                          ) : isRefunded ? (
                            <div className="space-y-0.5">
                              <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center space-x-1">
                                <RotateCcw className="w-3 h-3 text-purple-600" />
                                <span>Refunded</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 block font-semibold">
                                {payment.transactionNumber}
                              </span>
                            </div>
                          ) : item.status === 'approved' ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                              Unpaid
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-normal">--</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <div className="flex items-center space-x-2">
                              {item.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(item._id, 'approved')}
                                    disabled={isActionSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setRejectingBooking(item)}
                                    disabled={isActionSubmitting}
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {item.status === 'approved' && (
                                <button
                                  onClick={() => handleUpdateStatus(item._id, 'active')}
                                  disabled={isActionSubmitting}
                                  className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                >
                                  Mark Active
                                </button>
                              )}
                              {item.status === 'active' && (
                                <button
                                  onClick={() => handleUpdateStatus(item._id, 'completed')}
                                  disabled={isActionSubmitting}
                                  className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                >
                                  Complete
                                </button>
                              )}

                              {/* Admin Refund Action for Eligible Paid Payments */}
                              {isPaid && (
                                <button
                                  onClick={() => setRefundingPayment(payment)}
                                  disabled={isActionSubmitting}
                                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Issue Refund</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              {/* Customer Pay Now Button for Approved Unpaid Bookings */}
                              {isEligibleForPayment && (
                                <button
                                  onClick={() => {
                                    setPayingBooking(item);
                                    setSelectedPaymentMethod('UPI / Mobile Wallet');
                                    setPaymentError(null);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Pay Now (${item.totalPrice})</span>
                                </button>
                              )}

                              {/* Customer Cancel Action */}
                              {(item.status === 'pending' || item.status === 'approved') && (
                                <button
                                  onClick={() => handleCancelBooking(item)}
                                  disabled={isActionSubmitting}
                                  className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
                                >
                                  Cancel Request
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Customer Payment Checkout Modal */}
      {payingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Simulated Payment Checkout
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  Pay for {payingBooking.equipment?.name || 'Equipment Rental'}
                </h2>
              </div>
              <button
                onClick={() => setPayingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {paymentError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Booking Summary Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Booking Number:</span>
                <span className="font-mono font-bold text-slate-900">#{payingBooking.bookingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Rental Period:</span>
                <span className="font-semibold text-slate-900">{formatDate(payingBooking.startDate)} - {formatDate(payingBooking.endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Days:</span>
                <span className="font-semibold text-slate-900">{payingBooking.totalDays} {payingBooking.totalDays === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Total Amount Due:</span>
                <span className="text-xl font-black text-emerald-700">${payingBooking.totalPrice}</span>
              </div>
            </div>

            {/* Payment Method Form */}
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method}
                      className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === method
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={selectedPaymentMethod === method}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingBooking(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaymentSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPaymentSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Pay ${payingBooking.totalPrice}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Admin Rejection Remarks Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Reject Booking #{rejectingBooking.bookingNumber}
              </h3>
              <button
                onClick={() => setRejectingBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide an optional reason or remark for rejecting this reservation request from farmer <span className="font-bold text-slate-800">{rejectingBooking.customer?.name}</span>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Rejection Remarks
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows="3"
                placeholder="e.g. Machine required for scheduled maintenance..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setRejectingBooking(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectingBooking._id, 'rejected', adminRemarks)}
                disabled={isActionSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Issue Refund Modal */}
      {refundingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Issue Refund for #{refundingPayment.transactionNumber}
              </h3>
              <button
                onClick={() => setRefundingPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Confirm issuing a full refund of <span className="font-extrabold text-slate-900">${refundingPayment.amount}</span> for transaction <span className="font-mono font-bold text-slate-800">{refundingPayment.transactionNumber}</span>. Note: The associated booking status will remain unchanged.
            </p>

            <form onSubmit={handleIssueRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Refund Notes (Optional)
                </label>
                <textarea
                  value={refundAdminNotes}
                  onChange={(e) => setRefundAdminNotes(e.target.value)}
                  rows="3"
                  placeholder="e.g. Refund requested due to severe weather plan change..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundingPayment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefundSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer disabled:opacity-50"
                >
                  Confirm Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Bookings;
