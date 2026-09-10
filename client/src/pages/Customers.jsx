import { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Search,
  X,
  Loader2,
  AlertCircle,
  CalendarCheck,
  CreditCard,
  Tractor,
  Clock,
  FileText
} from 'lucide-react';
import api from '../api/axios';
import useModal from '../hooks/useModal';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Customer detail modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, bookRes, payRes] = await Promise.all([
        api.get('/users'),
        api.get('/bookings').catch(() => ({ data: { success: false, bookings: [] } })),
        api.get('/payments').catch(() => ({ data: { success: false, payments: [] } })),
      ]);

      if (userRes.data.success) {
        setCustomers(userRes.data.customers || []);
      }
      if (bookRes.data?.success) {
        setBookings(bookRes.data.bookings || []);
      }
      if (payRes.data?.success) {
        setPayments(payRes.data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching customer directory:', err);
      setError(err.response?.data?.message || 'Failed to load the customer directory from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.location?.toLowerCase().includes(term)
    );
  });

  const customerBookings = (customerId) =>
    bookings.filter((b) => {
      const bid = typeof b.customer === 'object' ? b.customer?._id : b.customer;
      return bid === customerId;
    });

  const customerPayments = (customerId) =>
    payments.filter((p) => {
      const bid = typeof p.customer === 'object' ? p.customer?._id : p.customer;
      return bid === customerId;
    });

  const openCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const { dialogProps: customerDialogProps } = useModal({
    open: !!selectedCustomer,
    onClose: () => setSelectedCustomer(null),
    labelledBy: 'customer-detail-modal-title',
  });

  const cBookings = selectedCustomer ? customerBookings(selectedCustomer._id) : [];
  const cPayments = selectedCustomer ? customerPayments(selectedCustomer._id) : [];
  const totalSpent = cPayments
    .filter((p) => p.paymentStatus === 'paid')
    .reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page-shell py-10">
      <div className="page-container">

        {/* Header */}
        <div className="page-header">
          <div className="flex items-center space-x-3">
            <div className="page-header-icon">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="page-title">Customer Management Directory</h1>
              <p className="page-subtitle">View registered farmers, contact parameters, and rental account history.</p>
            </div>
          </div>
          <span className="badge-amber">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Restricted View</span>
          </span>
        </div>

        {/* Error Banner */}
        {error && (
          <div role="alert" className="alert-error shadow-sm">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} aria-label="Dismiss message" className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Toolbar */}
        <div className="card">
          <div className="p-4">
            <div className="flex items-center space-x-2 bg-stone-100 rounded-xl px-3.5 py-2.5 text-stone-400 w-full focus-within:ring-2 focus-within:ring-forest-500/20 border border-transparent transition-all">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="card overflow-hidden">
          <div className="card-body border-b border-stone-100 flex justify-between items-center">
            <h3 className="font-bold text-stone-900 text-lg">Registered Farmers</h3>
            <span className="badge-slate">
              {loading ? '...' : `${filteredCustomers.length} ${filteredCustomers.length === 1 ? 'customer' : 'customers'}`}
            </span>
          </div>

          {loading ? (
            <div className="state-block">
              <Loader2 className="state-icon animate-spin" />
              <p className="text-sm font-medium text-stone-600">Loading customer directory from database...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="state-block">
              <Users className="w-16 h-16 text-stone-300 mx-auto" />
              <h3 className="text-lg font-bold text-stone-800">No Customers Found</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                {customers.length === 0
                  ? 'No farmers have registered accounts yet. New customer registrations will appear here.'
                  : 'No customers match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-left text-sm text-stone-600">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Customer Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">Location</th>
                    <th className="table-th">Account Role</th>
                    <th className="table-th">Joined Date</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCustomers.map((customer) => {
                    const custBookings = customerBookings(customer._id);
                    const custPayments = customerPayments(customer._id);
                    const custTotal = custPayments
                      .filter((p) => p.paymentStatus === 'paid')
                      .reduce((s, p) => s + (p.amount || 0), 0);

                    return (
                      <tr key={customer._id} className="hover:bg-stone-50 transition-colors">
                        <td className="table-td font-bold text-stone-900 flex items-center space-x-2">
                          <Users className="w-4 h-4 text-forest-600" />
                          <span>{customer.name}</span>
                        </td>
                        <td className="table-td flex items-center space-x-1.5 text-xs text-stone-600">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span>{customer.email}</span>
                        </td>
                        <td className="table-td text-xs font-medium text-stone-700 flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{customer.phone || 'Not provided'}</span>
                        </td>
                        <td className="table-td text-xs text-stone-700 flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{customer.location || 'Not provided'}</span>
                        </td>
                        <td className="table-td">
                          <span className="badge-green capitalize">
                            {customer.role}
                          </span>
                        </td>
                        <td className="table-td text-xs text-stone-500">{formatDate(customer.createdAt)}</td>
                        <td className="table-td">
                          <span className="text-[10px] text-stone-500 block mb-1">
                            {custBookings.length} booking{custBookings.length === 1 ? '' : 's'} &bull; ₹{custTotal} spent
                          </span>
                          <button
                            onClick={() => openCustomer(customer)}
                            className="btn-primary btn-sm"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notice: live data source */}
        <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 text-center text-xs text-stone-600 flex items-center justify-center space-x-2">
          <Clock className="w-4 h-4 text-forest-600" />
          <span>Customer records, booking counts, and spending figures are pulled live from the database.</span>
        </div>

      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div {...customerDialogProps} className={`${customerDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 animate-fadeIn`}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-stone-200 space-y-5 relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-forest-50 text-forest-700 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="customer-detail-modal-title" className="text-xl font-bold text-stone-900">{selectedCustomer.name}</h2>
                  <span className="text-xs text-stone-500 capitalize">Customer since {formatDate(selectedCustomer.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close dialog"
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700">
              <div className="bg-stone-50 rounded-xl p-3 flex items-center space-x-2 border border-stone-200">
                <Mail className="w-4 h-4 text-forest-600 shrink-0" />
                <span className="truncate">{selectedCustomer.email}</span>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 flex items-center space-x-2 border border-stone-200">
                <Phone className="w-4 h-4 text-forest-600 shrink-0" />
                <span>{selectedCustomer.phone || 'Not provided'}</span>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 flex items-center space-x-2 border border-stone-200 sm:col-span-2">
                <MapPin className="w-4 h-4 text-forest-600 shrink-0" />
                <span>{selectedCustomer.location || 'Not provided'} {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}</span>
              </div>
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <CalendarCheck className="w-5 h-5 text-amber-600 mx-auto" />
                <span className="block text-xl font-extrabold text-stone-900 mt-1">{cBookings.length}</span>
                <span className="text-[10px] uppercase font-bold text-stone-500">Total Bookings</span>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
                <CreditCard className="w-5 h-5 text-sky-600 mx-auto" />
                <span className="block text-xl font-extrabold text-stone-900 mt-1">
                  {cPayments.filter((p) => p.paymentStatus === 'paid').length}
                </span>
                <span className="text-[10px] uppercase font-bold text-stone-500">Paid Rentals</span>
              </div>
              <div className="bg-forest-50 border border-forest-200 rounded-xl p-3 text-center">
                <FileText className="w-5 h-5 text-forest-600 mx-auto" />
                <span className="block text-xl font-extrabold text-forest-700 mt-1">₹{totalSpent}</span>
                <span className="text-[10px] uppercase font-bold text-stone-500">Total Spent</span>
              </div>
            </div>

            {/* Booking History */}
            <div>
              <h3 className="font-bold text-stone-900 text-sm mb-2 flex items-center space-x-2">
                <Tractor className="w-4 h-4 text-forest-600" />
                <span>Booking History</span>
              </h3>
              {cBookings.length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-xl p-3">No booking records for this customer.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
                  {cBookings.map((b) => (
                    <div key={b._id} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-stone-800 block">#{b.bookingNumber}</span>
                        <span className="text-stone-500">{b.equipment?.name || 'Equipment'} • {formatDate(b.startDate)} - {formatDate(b.endDate)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-forest-700 block">₹{b.totalPrice}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${b.status === 'cancelled' || b.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : b.status === 'completed'
                              ? 'bg-stone-100 text-stone-600'
                              : 'bg-forest-100 text-forest-800'
                          }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment History */}
            <div>
              <h3 className="font-bold text-stone-900 text-sm mb-2 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-forest-600" />
                <span>Payment History</span>
              </h3>
              {cPayments.length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-xl p-3">No payment records for this customer.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
                  {cPayments.map((p) => (
                    <div key={p._id} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-stone-800 block">{p.transactionNumber}</span>
                        <span className="text-stone-500">{p.paymentMethod} • {formatDate(p.paymentDate)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-stone-900 block">₹{p.amount}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${p.paymentStatus === 'paid'
                            ? 'bg-forest-100 text-forest-800'
                            : p.paymentStatus === 'refunded'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                          {p.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close */}
            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn-ghost btn-sm"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
