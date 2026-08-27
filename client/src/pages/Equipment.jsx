import React, { useState, useEffect } from 'react';
import {
  Tractor,
  Clock,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  MapPin,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const CATEGORIES = [
  'All Machinery',
  'Tractors',
  'Harvesters',
  'Tillage & Tilling',
  'Seeding & Planting',
  'Irrigation',
  'Haulage',
  'Other'
];

const Equipment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  // Equipment list state
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Machinery');

  // Admin Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Booking Request Modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingEquipment, setBookingEquipment] = useState(null);
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingError, setBookingError] = useState(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // Form state for Admin Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tractors',
    description: '',
    dailyRate: '',
    status: 'Available',
    location: '',
    imageUrl: '',
  });

  // Image load error tracking for fallback rendering
  const [failedImages, setFailedImages] = useState({});

  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch equipment from backend API
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/equipment');
      if (res.data.success) {
        setEquipmentList(res.data.equipment || []);
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError(err.response?.data?.message || 'Failed to load equipment catalog from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Open Admin Modal for Create or Edit
  const handleOpenModal = (equipment = null) => {
    setFormError(null);
    if (equipment) {
      setEditingEquipment(equipment);
      setFormData({
        name: equipment.name || '',
        category: equipment.category || 'Tractors',
        description: equipment.description || '',
        dailyRate: equipment.dailyRate !== undefined ? equipment.dailyRate : '',
        status: equipment.status || 'Available',
        location: equipment.location || '',
        imageUrl: equipment.imageUrl || '',
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: '',
        category: 'Tractors',
        description: '',
        dailyRate: '',
        status: 'Available',
        location: '',
        imageUrl: '',
      });
    }
    setIsModalOpen(true);
  };

  // Close Admin Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    setFormError(null);
  };

  // Open Customer Booking Request Modal
  const handleOpenBookingModal = (equipment) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setBookingEquipment(equipment);
    setBookingStartDate(todayStr);
    setBookingEndDate(todayStr);
    setBookingError(null);
    setIsBookingModalOpen(true);
  };

  // Close Customer Booking Request Modal
  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setBookingEquipment(null);
    setBookingError(null);
  };

  // Handle Form Change (Admin Modal)
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate estimated days and price for Customer Booking Modal
  const calculateEstimatedBooking = () => {
    if (!bookingStartDate || !bookingEndDate || !bookingEquipment) {
      return { days: 0, total: 0 };
    }
    const start = new Date(bookingStartDate);
    const end = new Date(bookingEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { days: 0, total: 0 };
    }
    const diffTime = end.getTime() - start.getTime();
    const days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
    const total = days * (bookingEquipment.dailyRate || 0);
    return { days, total };
  };

  // Handle Customer Booking Request Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError(null);

    if (!bookingStartDate || !bookingEndDate) {
      setBookingError('Both start date and end date are required');
      return;
    }

    const start = new Date(bookingStartDate);
    const end = new Date(bookingEndDate);
    const today = new Date(todayStr);

    if (start < today) {
      setBookingError('Start date cannot be in the past');
      return;
    }

    if (end < start) {
      setBookingError('End date cannot be earlier than start date');
      return;
    }

    try {
      setIsBookingSubmitting(true);
      const payload = {
        equipmentId: bookingEquipment._id,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
      };

      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        setSuccessMessage(`Booking request #${res.data.booking.bookingNumber} submitted successfully! Redirecting to your bookings...`);
        handleCloseBookingModal();
        setTimeout(() => {
          navigate('/bookings');
        }, 1500);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setBookingError(err.response?.data?.message || 'Failed to submit booking request.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Handle Admin Form Submit (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Equipment name is required');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return;
    }
    if (formData.dailyRate === '' || Number(formData.dailyRate) < 0) {
      setFormError('Daily rate must be a valid non-negative number');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        dailyRate: Number(formData.dailyRate),
      };

      if (editingEquipment) {
        const res = await api.put(`/equipment/${editingEquipment._id}`, payload);
        if (res.data.success) {
          setSuccessMessage(`"${res.data.equipment.name}" updated successfully.`);
          handleCloseModal();
          fetchEquipment();
        }
      } else {
        const res = await api.post('/equipment', payload);
        if (res.data.success) {
          setSuccessMessage(`"${res.data.equipment.name}" created successfully.`);
          handleCloseModal();
          fetchEquipment();
        }
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setFormError(err.response?.data?.message || 'Failed to save equipment machine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Delete Equipment
  const handleDelete = async (equipment) => {
    if (!window.confirm(`Are you sure you want to delete "${equipment.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      const res = await api.delete(`/equipment/${equipment._id}`);
      if (res.data.success) {
        setSuccessMessage(`"${equipment.name}" was successfully deleted.`);
        fetchEquipment();
      }
    } catch (err) {
      console.error('Delete equipment error:', err);
      setError(err.response?.data?.message || 'Failed to delete equipment machine.');
    }
  };

  // Client-side Filter Logic
  const filteredEquipment = equipmentList.filter((item) => {
    const categoryMatch =
      selectedCategory === 'All Machinery' ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();

    const term = searchTerm.toLowerCase();
    const searchMatch =
      !term ||
      item.name?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term);

    return categoryMatch && searchMatch;
  });

  const handleImageError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const { days: estimatedDays, total: estimatedTotal } = calculateEstimatedBooking();

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Global Feedback Messages */}
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAdmin ? 'Equipment Fleet Management' : 'Agricultural Equipment Catalog'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin
                ? 'Manage inventory specs, daily pricing, location tags, and operational availability.'
                : 'Browse available tractors, harvesters, and tillage machinery for your farm.'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Machine</span>
            </button>
          )}
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

            {/* Search Input */}
            <div className="flex items-center space-x-2 bg-slate-100 rounded-xl px-3.5 py-2.5 text-slate-400 w-full md:w-96 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 border border-transparent transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by name, category, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Select Dropdown (Mobile) */}
            <div className="w-full md:hidden">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-100 text-slate-800 text-sm font-medium rounded-xl p-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter Pills (Desktop & Tablet) */}
          <div className="hidden md:flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1 flex items-center space-x-1 shrink-0">
              <Filter className="w-3 h-3" />
              <span>Category:</span>
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section: Loading, Empty, or Equipment Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading equipment fleet from database...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <Tractor className="w-16 h-16 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No Machinery Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || selectedCategory !== 'All Machinery'
                ? 'No equipment matches your current search keywords or category filters. Try clearing your search filters.'
                : 'There are currently no equipment machines registered in the system.'}
            </p>
            {(searchTerm || selectedCategory !== 'All Machinery') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All Machinery');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Reset Filters
              </button>
            )}
            {isAdmin && !searchTerm && selectedCategory === 'All Machinery' && (
              <button
                onClick={() => handleOpenModal()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Machine</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => {
              const hasImage = item.imageUrl && !failedImages[item._id];

              let statusBadgeClass = 'bg-emerald-500 text-emerald-950';
              if (item.status === 'Rented') statusBadgeClass = 'bg-amber-500 text-amber-950';
              if (item.status === 'Maintenance') statusBadgeClass = 'bg-rose-500 text-rose-950';

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  {/* Card Header & Image Container */}
                  <div>
                    <div className="bg-slate-900 h-48 relative overflow-hidden flex items-center justify-center">
                      {hasImage ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          onError={() => handleImageError(item._id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-emerald-400 flex flex-col items-center justify-center space-y-1">
                          <Tractor className="w-16 h-16 opacity-80" />
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">No Image</span>
                        </div>
                      )}

                      {/* Status Pill Badge */}
                      <span className={`absolute top-3 right-3 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm ${statusBadgeClass}`}>
                        {item.status || 'Available'}
                      </span>

                      {/* Category Tag */}
                      <span className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-slate-700">
                        {item.category}
                      </span>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{item.name}</h3>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {item.location && (
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Rate</span>
                      <span className="font-extrabold text-emerald-600 text-lg">${item.dailyRate} <span className="text-xs text-slate-500 font-normal">/ day</span></span>
                    </div>

                    {/* Dynamic Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenModal(item)}
                            title="Edit Details"
                            className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 p-2 rounded-xl text-xs font-bold transition-colors border border-slate-200 flex items-center space-x-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Delete Machine"
                            className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 p-2 rounded-xl text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenBookingModal(item)}
                          disabled={item.status === 'Maintenance'}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${item.status !== 'Maintenance'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                          <span>{item.status === 'Maintenance' ? 'Under Maintenance' : 'Request Booking'}</span>
                          {item.status !== 'Maintenance' && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Customer Booking Request Modal */}
      {isBookingModalOpen && bookingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Equipment Rental Request
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{bookingEquipment.name}</h2>
              </div>
              <button
                onClick={handleCloseBookingModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Equipment Summary Banner */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category & Rate</span>
                <span className="font-bold text-slate-800">{bookingEquipment.category}</span> • <span className="font-extrabold text-emerald-600">${bookingEquipment.dailyRate}/day</span>
              </div>
              {bookingEquipment.location && (
                <div className="text-right max-w-[140px]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-medium text-slate-700 truncate block">{bookingEquipment.location}</span>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {bookingError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleBookingSubmit} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={bookingStartDate}
                    onChange={(e) => {
                      setBookingStartDate(e.target.value);
                      if (bookingEndDate && e.target.value > bookingEndDate) {
                        setBookingEndDate(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={bookingStartDate || todayStr}
                    value={bookingEndDate}
                    onChange={(e) => setBookingEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Estimated Cost Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between text-slate-900">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Estimated Rental Duration</span>
                    <span className="font-extrabold text-sm text-slate-900">{estimatedDays} {estimatedDays === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 block">Estimated Total</span>
                  <span className="font-black text-lg text-emerald-700">${estimatedTotal}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseBookingModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBookingSubmitting || estimatedDays <= 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isBookingSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Booking Request</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Admin Add/Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEquipment ? 'Edit Equipment Details' : 'Add New Machinery'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Validation Error Banner */}
            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="space-y-4">

              {/* Machine Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Machine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. John Deere 5075E Utility Tractor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Category & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Machinery').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operational Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Daily Rate & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Daily Rate ($ USD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="dailyRate"
                    value={formData.dailyRate}
                    onChange={handleFormChange}
                    placeholder="e.g. 120"
                    min="0"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Station / Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g. Springfield Central Hub"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleFormChange}
                  placeholder="https://example.com/tractor-photo.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description & Specs <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder="Describe machine power, HP rating, attachment support, or usage guidance..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingEquipment ? 'Save Changes' : 'Create Machine'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Equipment;
