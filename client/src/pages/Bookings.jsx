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
  RotateCcw,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useModal from '../hooks/useModal';

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
  const [checkoutStep, setCheckoutStep] = useState('select'); // 'select' | 'simulated'

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

  // Customer Process Payment Submit (simulated / test mode)
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

  // Dynamically load the Razorpay checkout script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Open the secured Razorpay checkout for an approved booking
  const openRazorpayCheckout = async (orderData) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPaymentError('Razorpay secure checkout could not be loaded. Please try again later.');
      setCheckoutStep('simulated');
      setIsPaymentSubmitting(false);
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: Math.round(orderData.amount * 100),
      currency: orderData.currency || 'INR',
      name: 'AgriRentHub',
      description: `Rental booking #${payingBooking.bookingNumber}`,
      order_id: orderData.order.id,
      handler: async (response) => {
        try {
          const verifyRes = await api.post('/payments/verify', {
            bookingId: orderData.bookingId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            paymentMethod: selectedPaymentMethod,
          });

          if (verifyRes.data.success) {
            setSuccessMessage(
              `Payment completed successfully! Reference: ${verifyRes.data.payment.transactionNumber}`
            );
            setPayingBooking(null);
            fetchBookingsAndPayments();
          } else {
            setPaymentError(verifyRes.data.message || 'Payment verification failed.');
            setCheckoutStep('simulated');
          }
        } catch (err) {
          console.error('Razorpay verification error:', err);
          setPaymentError(
            err.response?.data?.message ||
              'Payment could not be verified. If money was deducted, keep your Razorpay payment ID and contact support.'
          );
          setCheckoutStep('simulated');
        } finally {
          setIsPaymentSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setIsPaymentSubmitting(false);
        },
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#1f442f' },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Start secure checkout (creates a server-side Razorpay order)
  const handleStartCheckout = async (e) => {
    e.preventDefault();
    if (!payingBooking) return;

    try {
      setIsPaymentSubmitting(true);
      setPaymentError(null);

      const res = await api.post('/payments/create-order', { bookingId: payingBooking._id });

      if (res.data.success) {
        if (res.data.testMode) {
          // Razorpay not configured: fall back to the simulated development payment.
          setIsPaymentSubmitting(false);
          setCheckoutStep('simulated');
          setPaymentError(null);
          return;
        }
        await openRazorpayCheckout(res.data);
      }
    } catch (err) {
      console.error('Create checkout order error:', err);
      setPaymentError(err.response?.data?.message || 'Failed to start secure checkout.');
      setIsPaymentSubmitting(false);
      setCheckoutStep('simulated');
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

  const { dialogProps: paymentDialogProps } = useModal({
    open: !!payingBooking,
    onClose: () => setPayingBooking(null),
    labelledBy: 'payment-modal-title',
  });
  const { dialogProps: rejectDialogProps } = useModal({
    open: !!rejectingBooking,
    onClose: () => setRejectingBooking(null),
    labelledBy: 'reject-modal-title',
  });
  const { dialogProps: refundDialogProps } = useModal({
    open: !!refundingPayment,
    onClose: () => setRefundingPayment(null),
    labelledBy: 'refund-modal-title',
  });

  return (
    <div className="page-shell">
      <div className="page-container">

        {/* Global Feedback Banners */}
        {successMessage && (
          <div role="status" className="bg-forest-50 border border-forest-200 text-forest-800 p-4 rounded-xl shadow-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <CheckCircle className="w-5 h-5 text-forest-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss message" className="text-forest-600 hover:text-forest-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="alert-error">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} aria-label="Dismiss message" className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {isAdmin ? 'Rental Bookings Operations' : 'My Equipment Reservations'}
            </h1>
            <p className="page-subtitle">
              {isAdmin
                ? 'Review, approve, or reject incoming machinery rental requests and manage transaction refunds.'
                : 'Track status, rental periods, payments, and complete digital checkout for approved reservations.'}
            </p>
          </div>

          {/* Status Filter Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs bg-stone-50 p-1.5 rounded-xl border border-stone-200 shrink-0">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${statusFilter === s
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Card Container */}
        {loading ? (
          <div className="state-block">
            <Loader2 className="state-icon animate-spin" />
            <p className="text-sm font-medium text-stone-600">Loading bookings and transaction records from database...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="state-block">
            <Clock className="w-16 h-16 text-forest-200 mx-auto" />
            <h3 className="text-lg font-bold text-stone-800">No Booking Records</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {statusFilter !== 'All'
                ? `No bookings found matching status "${statusFilter}".`
                : isAdmin
                  ? 'No rental booking requests have been submitted yet.'
                  : 'You have not submitted any equipment rental requests yet.'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-bold text-stone-900 text-lg">
                {isAdmin ? 'Fleet Rental Requests & Payment Status' : 'Your Reservation History'}
              </h3>
              <span className="text-xs bg-stone-100 text-stone-600 font-semibold px-3 py-1 rounded-full border border-stone-200">
                {filteredBookings.length} {filteredBookings.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            <div className="table-wrap">
              <table className="w-full text-left text-sm text-stone-600">
                <thead className="table-head">
                  <tr>
                    <th className="table-th px-6">Booking ID</th>
                    <th className="table-th px-6">Equipment</th>
                    <th className="table-th px-6">{isAdmin ? 'Customer' : 'Daily Rate'}</th>
                    <th className="table-th px-6">Rental Period</th>
                    <th className="table-th px-6">Total Cost</th>
                    <th className="table-th px-6">Booking Status</th>
                    <th className="table-th px-6">Payment Record</th>
                    <th className="table-th px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBookings.map((item) => {
                    const payment = paymentMap[item._id];
                    const isPaid = payment && payment.paymentStatus === 'paid';
                    const isRefunded = payment && payment.paymentStatus === 'refunded';
                    const isEligibleForPayment = item.status === 'approved' && !isPaid;

                    // Booking Status Badge
                    let statusBadgeClass = 'badge-amber';
                    let StatusIcon = Clock;

                    if (item.status === 'approved') {
                      statusBadgeClass = 'badge-green';
                      StatusIcon = CalendarCheck;
                    } else if (item.status === 'active') {
                      statusBadgeClass = 'badge-sky';
                      StatusIcon = Tractor;
                    } else if (item.status === 'completed') {
                      statusBadgeClass = 'badge-slate';
                      StatusIcon = CheckCircle;
                    } else if (item.status === 'rejected') {
                      statusBadgeClass = 'badge-red';
                      StatusIcon = AlertCircle;
                    } else if (item.status === 'cancelled') {
                      statusBadgeClass = 'badge-slate';
                      StatusIcon = Ban;
                    }

                    return (
                      <tr key={item._id} className="hover:bg-stone-50/80 transition-colors">

                        {/* Booking Number */}
                        <td className="table-td px-6 py-4 font-mono font-bold text-stone-800 text-xs shrink-0">
                          #{item.bookingNumber}
                        </td>

                        {/* Equipment Info */}
                        <td className="table-td px-6 py-4 font-medium text-stone-900">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-forest-50 text-forest-600 rounded-lg shrink-0">
                              <Tractor className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-stone-900 block line-clamp-1">
                                {item.equipment?.name || 'Equipment Machine'}
                              </span>
                              <span className="text-[11px] text-stone-400 font-normal">
                                {item.equipment?.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Customer / Rate */}
                        <td className="table-td px-6 py-4">
                          {isAdmin ? (
                            <div>
                              <span className="font-bold text-stone-900 block text-xs">
                                {item.customer?.name || 'Farmer'}
                              </span>
                              <span className="text-[11px] text-stone-500 block">
                                {item.customer?.email}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-stone-800 text-xs">
                              ${item.dailyRate}/day
                            </span>
                          )}
                        </td>

                        {/* Rental Period */}
                        <td className="table-td px-6 py-4 text-xs space-y-0.5">
                          <div className="font-semibold text-stone-800">
                            {formatDate(item.startDate)} - {formatDate(item.endDate)}
                          </div>
                          <div className="text-[11px] text-stone-400 font-medium">
                            {item.totalDays} {item.totalDays === 1 ? 'day' : 'days'}
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="table-td px-6 py-4 font-black text-forest-600 text-sm">
                          ₹{item.totalPrice}
                        </td>

                        {/* Booking Status Badge */}
                        <td className="table-td px-6 py-4">
                          <div className="space-y-1">
                            <span className={`badge capitalize ${statusBadgeClass}`}>
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
                        <td className="table-td px-6 py-4">
                          {isPaid ? (
                            <div className="space-y-0.5">
                              <span className="badge-green">
                                <CreditCard className="w-3 h-3 text-forest-600" />
                                <span>Paid</span>
                              </span>
                              <span className="text-[10px] font-mono text-stone-500 block font-semibold">
                                {payment.transactionNumber}
                              </span>
                            </div>
                          ) : isRefunded ? (
                            <div className="space-y-0.5">
                              <span className="badge-purple">
                                <RotateCcw className="w-3 h-3 text-purple-600" />
                                <span>Refunded</span>
                              </span>
                              <span className="text-[10px] font-mono text-stone-500 block font-semibold">
                                {payment.transactionNumber}
                              </span>
                            </div>
                          ) : item.status === 'approved' ? (
                            <span className="badge-amber">
                              <span>Unpaid</span>
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400 font-normal">--</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="table-td px-6 py-4">
                          {isAdmin ? (
                            <div className="flex items-center space-x-2">
                              {item.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(item._id, 'approved')}
                                    disabled={isActionSubmitting}
                                    className="bg-forest-700 hover:bg-forest-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
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
                                  className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                >
                                  Mark Active
                                </button>
                              )}
                              {item.status === 'active' && (
                                <button
                                  onClick={() => handleUpdateStatus(item._id, 'completed')}
                                  disabled={isActionSubmitting}
                                  className="bg-stone-700 hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
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
                                    setCheckoutStep('select');
                                  }}
                                  className="bg-forest-700 hover:bg-forest-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Pay Now (₹{item.totalPrice})</span>
                                </button>
                              )}

                              {/* Customer Cancel Action */}
                              {(item.status === 'pending' || item.status === 'approved') && (
                                <button
                                  onClick={() => handleCancelBooking(item)}
                                  disabled={isActionSubmitting}
                                  className="bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-stone-200 cursor-pointer disabled:opacity-50"
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
        <div {...paymentDialogProps} className={`${paymentDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 animate-fadeIn`}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-5 relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  checkoutStep === 'simulated'
                    ? 'text-amber-800 bg-amber-50 border border-amber-200'
                    : 'text-forest-700 bg-forest-50 border border-forest-200'
                }`}>
                  {checkoutStep === 'simulated' ? 'Development Checkout (Preserve Data)' : 'Secure Payment Checkout'}
                </span>
                <h2 id="payment-modal-title" className="text-lg font-bold text-stone-900 mt-1">
                  Pay for {payingBooking.equipment?.name || 'Equipment Rental'}
                </h2>
              </div>
              <button
                onClick={() => setPayingBooking(null)}
                aria-label="Close dialog"
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {paymentError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Booking Summary Box */}
            <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-2 text-xs text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Booking Number:</span>
                <span className="font-mono font-bold text-stone-900">#{payingBooking.bookingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Rental Period:</span>
                <span className="font-semibold text-stone-900">{formatDate(payingBooking.startDate)} - {formatDate(payingBooking.endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Total Days:</span>
                <span className="font-semibold text-stone-900">{payingBooking.totalDays} {payingBooking.totalDays === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
                <span className="text-stone-600 font-bold uppercase tracking-wider text-[11px]">Total Amount Due:</span>
                <span className="text-xl font-black text-forest-700">₹{payingBooking.totalPrice}</span>
              </div>
            </div>

            {/* Payment Method Form */}
            <form
              onSubmit={checkoutStep === 'simulated' ? handleProcessPayment : handleStartCheckout}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Select Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method}
                      className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === method
                          ? 'border-forest-500 bg-forest-50'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={selectedPaymentMethod === method}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="text-forest-600 focus:ring-forest-500"
                      />
                      <span className="text-xs font-bold text-stone-800">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Simulation notice (Razorpay not configured) */}
              {checkoutStep === 'simulated' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[11px] font-medium flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Auto-detected: the live Razorpay gateway is not configured on this server. The payment will be recorded in simulated development mode so you can test the full flow without a real charge.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setPayingBooking(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                {checkoutStep === 'simulated' ? (
                  <button
                    type="submit"
                    disabled={isPaymentSubmitting}
                    className="btn btn-primary flex items-center space-x-1.5"
                  >
                    {isPaymentSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Pay ₹{payingBooking.totalPrice} (Simulated)</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isPaymentSubmitting}
                    className="btn btn-primary flex items-center space-x-1.5"
                  >
                    {isPaymentSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>Pay Securely via Razorpay</span>
                  </button>
                )}
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Admin Rejection Remarks Modal */}
      {rejectingBooking && (
        <div {...rejectDialogProps} className={`${rejectDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 animate-fadeIn`}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4 relative">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 id="reject-modal-title" className="text-lg font-bold text-stone-900">
                Reject Booking #{rejectingBooking.bookingNumber}
              </h3>
              <button
                onClick={() => setRejectingBooking(null)}
                aria-label="Close dialog"
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Provide an optional reason or remark for rejecting this reservation request from farmer <span className="font-bold text-stone-800">{rejectingBooking.customer?.name}</span>.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Rejection Remarks
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows="3"
                placeholder="e.g. Machine required for scheduled maintenance..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setRejectingBooking(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectingBooking._id, 'rejected', adminRemarks)}
                disabled={isActionSubmitting}
                className="btn btn-danger"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Issue Refund Modal */}
      {refundingPayment && (
        <div {...refundDialogProps} className={`${refundDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 animate-fadeIn`}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4 relative">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 id="refund-modal-title" className="text-lg font-bold text-stone-900">
                Issue Refund for #{refundingPayment.transactionNumber}
              </h3>
              <button
                onClick={() => setRefundingPayment(null)}
                aria-label="Close dialog"
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Confirm issuing a full refund of <span className="font-extrabold text-stone-900">₹{refundingPayment.amount}</span> for transaction <span className="font-mono font-bold text-stone-800">{refundingPayment.transactionNumber}</span>. Note: The associated booking status will remain unchanged.
            </p>

            <form onSubmit={handleIssueRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Admin Refund Notes (Optional)
                </label>
                <textarea
                  value={refundAdminNotes}
                  onChange={(e) => setRefundAdminNotes(e.target.value)}
                  rows="3"
                  placeholder="e.g. Refund requested due to severe weather plan change..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundingPayment(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefundSubmitting}
                  className="btn"
                  style={{ backgroundColor: '#7e22ce', color: '#fff' }}
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
