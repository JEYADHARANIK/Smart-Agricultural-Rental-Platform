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
  CloudSun,
  CloudRain,
  Sun,
  CloudOff,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Send,
  Bot,
  Star
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useModal from '../hooks/useModal';

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

  // Smart scheduling / weather-aware slot analysis state
  const [slotAnalysis, setSlotAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // AI Equipment Recommendation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiMode, setAiMode] = useState(null);

  // Form state for Admin Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tractors',
    description: '',
    dailyRate: '',
    status: 'Available',
    location: '',
    imageUrl: '',
    usageHours: 0,
    maintenanceIntervalDays: 90,
    lastMaintenanceDate: '',
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
        usageHours: equipment.usageHours || 0,
        maintenanceIntervalDays: equipment.maintenanceIntervalDays || 90,
        lastMaintenanceDate: equipment.lastMaintenanceDate ? equipment.lastMaintenanceDate.slice(0, 10) : '',
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
        usageHours: 0,
        maintenanceIntervalDays: 90,
        lastMaintenanceDate: '',
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

  // Analyze the selected slot with weather + maintenance + availability intelligence
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isBookingModalOpen || !bookingEquipment || !bookingStartDate || !bookingEndDate) {
        setSlotAnalysis(null);
        setAnalysisError(null);
        return;
      }
      const start = new Date(bookingStartDate);
      const end = new Date(bookingEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        setSlotAnalysis(null);
        setAnalysisError(null);
        return;
      }

      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const res = await api.post('/scheduler/analyze', {
          equipmentId: bookingEquipment._id,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
          customerLocation: user?.location || '',
        });
        if (!cancelled && res.data.success) {
          setSlotAnalysis(res.data);
        }
      } catch (err) {
        console.error('Slot analysis error:', err);
        if (!cancelled) {
          setAnalysisError(err.response?.data?.message || 'Weather-aware slot analysis is unavailable right now.');
          setSlotAnalysis(null);
        }
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isBookingModalOpen, bookingEquipment, bookingStartDate, bookingEndDate, user]);

  // Switch the booking target to a recommended alternative machine
  const handlePickAlternative = async (alt) => {
    try {
      setIsAnalyzing(true);
      const res = await api.get(`/equipment/${alt.equipmentId}`);
      if (res.data.success) {
        setBookingEquipment(res.data.equipment);
        setSlotAnalysis(null);
        setBookingError(null);
      }
    } catch (err) {
      console.error('Load alternative equipment error:', err);
      setBookingError(err.response?.data?.message || 'Could not load the recommended alternative.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { days: estimatedDays, total: estimatedTotal } = calculateEstimatedBooking();

  // Request AI equipment recommendations based on a natural-language farming task
  const handleAiRecommend = async (e) => {
    e?.preventDefault();
    const prompt = aiPrompt.trim();

    if (!prompt) {
      setAiError('Please describe the farming task you need equipment for.');
      setAiRecommendations(null);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiRecommendations(null);
    setAiSummary('');
    setAiMode(null);

    try {
      const res = await api.post('/ai/recommend-equipment', { prompt });

      if (res.data?.success) {
        setAiSummary(res.data.summary || '');
        setAiRecommendations(res.data.recommendations || []);
        setAiMode(res.data.mode || null);
      } else {
        setAiError(res.data?.message || 'Could not generate recommendations. Please try again.');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 503) {
        setAiError('AI recommendations are currently unavailable. Please browse the available equipment manually.');
      } else if (status === 502) {
        setAiError('The AI recommendation engine could not be reached. Please try again later or browse the equipment manually.');
      } else if (status === 401 || status === 403) {
        setAiError(msg || 'You are not authorized to use AI recommendations. Please log in again.');
      } else if (err.request) {
        setAiError('Could not reach the server. Please check your connection and try again.');
      } else {
        setAiError(msg || 'Something went wrong while generating recommendations. Please try again.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };


  const { dialogProps: bookingDialogProps } = useModal({
    open: isBookingModalOpen && !!bookingEquipment,
    onClose: handleCloseBookingModal,
    labelledBy: 'equipment-booking-modal-title',
  });
  const { dialogProps: adminDialogProps } = useModal({
    open: isModalOpen,
    onClose: handleCloseModal,
    labelledBy: 'admin-equipment-modal-title',
  });


  return (
    <div className="page-shell">
      <div className="page-container">

        {/* Global Feedback Messages */}
        {successMessage && (
          <div role="status" className="alert-info">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <CheckCircle className="w-5 h-5 text-forest-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss message" className="text-forest-500 hover:text-forest-700">
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
              {isAdmin ? 'Equipment Fleet Management' : 'Agricultural Equipment Catalog'}
            </h1>
            <p className="page-subtitle mt-1">
              {isAdmin
                ? 'Manage inventory specs, daily pricing, location tags, and operational availability.'
                : 'Browse available tractors, harvesters, and tillage machinery for your farm.'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Machine</span>
            </button>
          )}
        </div>

        {/* Filter & Search Toolbar */}
        <div className="card p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

            {/* Search Input */}
            <div className="input-search w-full md:w-96">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                aria-label="Search equipment"
                placeholder="Search by name, category, location..."
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

            {/* Category Select Dropdown (Mobile) */}
            <div className="w-full md:hidden">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-stone-100 text-stone-800 text-sm font-medium rounded-xl p-2.5 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
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
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[11px] mr-1 flex items-center space-x-1 shrink-0">
              <Filter className="w-3 h-3" />
              <span>Category:</span>
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === cat
                    ? 'bg-forest-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* AI Equipment Recommendation */}
        {!isAdmin && (
          <div className="bg-white rounded-2xl border border-forest-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="bg-forest-800 px-6 py-5 text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/10 text-forest-100 rounded-xl border border-white/15">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight flex items-center space-x-2">
                    <span>Find the right equipment</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-white/10 text-forest-100 px-2 py-0.5 rounded-full border border-white/15">
                      AI Powered
                    </span>
                  </h2>
                  <p className="text-forest-100 text-xs mt-0.5">
                    Describe your farming task and get equipment suggestions matched to what is available to rent.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Input form */}
              <form onSubmit={handleAiRecommend} className="space-y-3">
                <div className="flex items-start space-x-2 bg-stone-100 rounded-2xl px-4 py-3 border border-transparent focus-within:ring-2 focus-within:ring-forest-500/20 focus-within:border-forest-500 transition-all">
                  <Bot className="w-5 h-5 text-forest-600 shrink-0 mt-1" />
                  <textarea
                    rows="2"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. I need equipment for ploughing 2 acres of wet soil."
                    className="bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none w-full resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-stone-400">
                    Suggestions are based on the equipment currently available to rent.
                  </p>
                  <button
                    type="submit"
                    disabled={isAiLoading}
                    className="btn-primary text-xs"
                  >
                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isAiLoading ? 'Searching...' : 'Get Suggestions'}</span>
                  </button>
                </div>
              </form>

              {/* Empty / idle state */}
              {!isAiLoading && !aiError && !aiRecommendations && (
                <div className="bg-forest-50/60 border border-forest-100 rounded-2xl p-5 text-center">
                  <Sparkles className="w-7 h-7 text-forest-500 mx-auto mb-2" />
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Tell us what field work you need to do — like tilling, harvesting, or hauling — and we will match you with equipment that is currently available to rent.
                  </p>
                </div>
              )}

              {/* Loading state */}
              {isAiLoading && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-forest-600 animate-spin mx-auto" />
                  <p className="text-xs font-medium text-stone-600">Finding the best equipment match for your task...</p>
                </div>
              )}

              {/* Error state (incl. missing API key) */}
              {!isAiLoading && aiError && (
                <div role="alert" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">AI suggestions unavailable</p>
                    <p className="text-xs text-amber-700 mt-0.5">{aiError}</p>
                    <p className="text-[11px] text-amber-600 mt-2">
                      You can still browse and book from the available equipment catalog below.
                    </p>
                  </div>
                </div>
              )}

              {/* Success state */}
              {!isAiLoading && !aiError && aiRecommendations && (
                <div className="space-y-4">
                  {aiMode && (
                    <div className="flex items-center justify-end">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        aiMode === 'ai'
                          ? 'text-forest-700 bg-forest-50 border-forest-200'
                          : 'text-stone-600 bg-stone-100 border-stone-200'
                      }`}>
                        {aiMode === 'ai' ? 'Gemini AI match' : 'Rule-based match'}
                      </span>
                    </div>
                  )}

                  {aiSummary && (
                    <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 text-xs text-forest-900 font-medium">
                      {aiSummary}
                    </div>
                  )}

                  {aiRecommendations.length === 0 ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center space-y-2">
                      <Tractor className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="text-xs font-bold text-stone-700">No suitable equipment found</p>
                      <p className="text-[11px] text-stone-500">
                        We couldn't match your task to available equipment right now. Try rephrasing your requirement or browse the catalog below.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiRecommendations.map((rec) => {
                        const eq = rec.equipment || {};
                        const score = rec.matchScore ?? 0;
                        const statusOk = eq.status !== 'Maintenance';
                        return (
                          <div
                            key={eq._id}
                            className="bg-white border border-stone-200 hover:border-forest-300 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                          >
                            <div className="p-5 space-y-3">
                              <div className="flex items-start justify-between">
                                <h3 className="font-bold text-stone-900 text-base leading-snug">{eq.name}</h3>
                                <span className="flex items-center space-x-1 text-amber-500 text-xs font-bold shrink-0 ml-2">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span>{score}%</span>
                                </span>
                              </div>

                              {eq.category && (
                                <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700 bg-forest-50 border border-forest-100 px-2.5 py-0.5 rounded-full">
                                  {eq.category}
                                </span>
                              )}

                              {eq.description && (
                                <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{eq.description}</p>
                              )}

                              {rec.reasoning && (
                                <p className="text-[11px] text-stone-600 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
                                  <span className="font-bold text-forest-700">Why this fits: </span>{rec.reasoning}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div>
                                  <span className="text-[11px] text-stone-400 uppercase font-bold block">Daily Rate</span>
                                  <span className="font-extrabold text-forest-600 text-base">₹{eq.dailyRate} <span className="text-xs text-stone-500 font-normal">/ day</span></span>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${eq.status === 'Available' ? 'badge-green' : eq.status === 'Rented' ? 'badge-amber' : 'badge-red'}`}>
                                  {eq.status || 'Available'}
                                </span>
                              </div>

                              {eq.location && (
                                <div className="flex items-center space-x-1.5 text-[11px] text-stone-500">
                                  <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                                  <span className="truncate">{eq.location}</span>
                                </div>
                              )}
                            </div>

                            <div className="px-5 pb-5 pt-3 border-t border-stone-100 flex items-center justify-end">
                              <button
                                onClick={() => handleOpenBookingModal(eq)}
                                disabled={!statusOk}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${statusOk
                                    ? 'btn-primary'
                                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                  }`}
                              >
                                <span>{statusOk ? 'Request Booking' : 'Under Maintenance'}</span>
                                {statusOk && <ArrowRight className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Section: Loading, Empty, or Equipment Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading equipment">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="skeleton h-48 rounded-none" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-6 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton h-9 w-full mt-4" />
                </div>
              </div>
            ))}
            <p className="sr-only">Loading equipment fleet from database...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="state-block">
            <Tractor className="w-16 h-16 text-stone-300 mx-auto" />
            <h3 className="text-lg font-bold text-stone-800">No Machinery Found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
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
                className="btn-ghost text-xs"
              >
                Reset Filters
              </button>
            )}
            {isAdmin && !searchTerm && selectedCategory === 'All Machinery' && (
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary text-xs inline-flex items-center space-x-1.5"
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

              let statusBadgeClass = 'badge-green';
              if (item.status === 'Rented') statusBadgeClass = 'badge-amber';
              if (item.status === 'Maintenance') statusBadgeClass = 'badge-red';

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  {/* Card Header & Image Container */}
                  <div>
                    <div className="bg-forest-900 h-48 relative overflow-hidden flex items-center justify-center">
                      {hasImage ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          onError={() => handleImageError(item._id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-forest-300 flex flex-col items-center justify-center space-y-1">
                          <Tractor className="w-16 h-16 opacity-80" />
                          <span className="text-[11px] text-forest-200 uppercase tracking-widest font-mono">No Image</span>
                        </div>
                      )}

                      {/* Status Pill Badge */}
                      <span className={`absolute top-3 right-3 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm ${statusBadgeClass}`}>
                        {item.status || 'Available'}
                      </span>

                      {/* Category Tag */}
                      <span className="absolute bottom-3 left-3 bg-forest-950/70 text-forest-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-xl border border-forest-700">
                        {item.category}
                      </span>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-stone-900 text-lg line-clamp-1" title={item.name}>{item.name}</h3>
                      </div>

                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {item.location && (
                        <div className="flex items-center space-x-1.5 text-xs text-stone-500 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 pb-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-stone-400 uppercase font-bold block">Rate</span>
                      <span className="font-extrabold text-forest-600 text-lg">₹{item.dailyRate} <span className="text-xs text-stone-500 font-normal">/ day</span></span>
                    </div>

                    {/* Dynamic Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenModal(item)}
                            title="Edit Details"
                            className="btn btn-sm btn-outline"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Delete Machine"
                            aria-label={`Delete ${item.name}`}
                            className="btn btn-sm btn-outline hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenBookingModal(item)}
                          disabled={item.status === 'Maintenance'}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${item.status !== 'Maintenance'
                              ? 'btn-primary'
                              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
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
        <div {...bookingDialogProps} className={`${bookingDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50`}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-xl space-y-5 relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700 bg-forest-50 px-2.5 py-0.5 rounded-full">
                  Equipment Rental Request
                </span>
                <h2 id="equipment-booking-modal-title" className="text-lg font-bold text-stone-900 mt-1">{bookingEquipment.name}</h2>
              </div>
              <button
                onClick={handleCloseBookingModal}
                aria-label="Close dialog"
                className="text-stone-400 hover:text-stone-600 p-1 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Equipment Summary Banner */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-stone-600">
              <div>
                <span className="text-stone-400 block text-[11px] uppercase font-bold">Category & Rate</span>
                <span className="font-bold text-stone-800">{bookingEquipment.category}</span> • <span className="font-extrabold text-forest-600">₹{bookingEquipment.dailyRate}/day</span>
              </div>
              {bookingEquipment.location && (
                <div className="text-right max-w-[140px]">
                  <span className="text-stone-400 block text-[11px] uppercase font-bold">Location</span>
                  <span className="font-medium text-stone-700 truncate block">{bookingEquipment.location}</span>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {bookingError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleBookingSubmit} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bk-start" className="label">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="bk-start"
                    type="date"
                    min={todayStr}
                    value={bookingStartDate}
                    onChange={(e) => {
                      setBookingStartDate(e.target.value);
                      if (bookingEndDate && e.target.value > bookingEndDate) {
                        setBookingEndDate(e.target.value);
                      }
                    }}
                    className="input text-xs"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="bk-end" className="label">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="bk-end"
                    type="date"
                    min={bookingStartDate || todayStr}
                    value={bookingEndDate}
                    onChange={(e) => setBookingEndDate(e.target.value)}
                    className="input text-xs"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Estimated Cost Banner */}
              <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 flex items-center justify-between text-stone-900">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-forest-600 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-stone-500 block">Estimated Rental Duration</span>
                    <span className="font-extrabold text-sm text-stone-900">{estimatedDays} {estimatedDays === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-stone-500 block">Estimated Total</span>
                  <span className="font-black text-lg text-forest-700">₹{estimatedTotal}</span>
                </div>
              </div>

              {/* Smart Scheduling: Weather-Aware Slot Analysis */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-forest-600" />
                    <span>Smart Slot Analysis</span>
                  </span>
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 text-forest-600 animate-spin" />
                  ) : (
                    slotAnalysis && (
                      <span className={`text-[11px] font-semibold ${slotAnalysis.weatherAvailable ? 'text-forest-600' : 'text-stone-400'}`}>
                        {slotAnalysis.weatherAvailable
                          ? `Live weather • ${slotAnalysis.weatherReason || 'weather combined with availability & maintenance'}`
                          : `Weather information is currently unavailable. ${slotAnalysis.weatherReason || 'Slot guidance is based on availability & maintenance only.'}`}
                      </span>
                    )
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {isAnalyzing ? (
                    <p className="text-xs text-stone-500 flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-forest-600" />
                      <span>Checking weather forecasts, availability, and maintenance windows...</span>
                    </p>
                  ) : analysisError ? (
                    <p className="text-xs text-rose-600 flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{analysisError}</span>
                    </p>
                  ) : !slotAnalysis?.requestedSlot ? (
                    <p className="text-xs text-stone-400">Pick valid dates to see weather and availability guidance.</p>
                  ) : (
                    <>
                      {/* Classification badge */}
                      {(() => {
                        const cls = slotAnalysis.requestedSlot.classification;
                        const cfg =
                          cls === 'BEST'
                            ? { icon: Sun, badge: 'badge-green', note: 'Favorable conditions for fieldwork.' }
                            : cls === 'USABLE'
                              ? { icon: CloudSun, badge: 'badge-amber', note: 'Moderate weather risk — proceed with caution.' }
                              : cls === 'NOT RECOMMENDED'
                                ? { icon: CloudRain, badge: 'badge-red', note: 'Rain or adverse weather is expected. Consider alternatives.' }
                                : { icon: CloudOff, badge: 'badge-slate', note: 'Weather information is currently unavailable. Guidance below is based on availability & maintenance only.' };
                        const Icon = cfg.icon;
                        const badgeCls = cfg.badge === 'badge-green' ? 'bg-forest-100 text-forest-800' : cfg.badge === 'badge-amber' ? 'bg-amber-100 text-amber-800' : cfg.badge === 'badge-red' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-600';
                        return (
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-xl ${badgeCls}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${badgeCls}`}>
                                {cls === 'NOT RECOMMENDED' ? 'Not Recommended' : (cls === 'BEST' ? 'Good conditions expected' : cls === 'USABLE' ? 'Moderate conditions' : (cls || 'Unknown'))}
                              </span>
                              <p className="text-xs text-stone-600 mt-1">{slotAnalysis.requestedSlot.summary || cfg.note}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Availability notice */}
                      {slotAnalysis.requestedSlot.available === false && (
                        <p className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>This machine is not available for the selected dates (already reserved or in maintenance).</span>
                        </p>
                      )}

                      {/* Recommended alternatives */}
                      {slotAnalysis.alternatives && slotAnalysis.alternatives.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                            Recommended alternatives for these dates:
                          </span>
                          <div className="space-y-1.5">
                            {slotAnalysis.alternatives.slice(0, 3).map((alt, idx) => (
                              <button
                                key={`${alt.equipmentId}-${idx}`}
                                onClick={() => handlePickAlternative(alt)}
                                className="w-full text-left bg-white border border-stone-200 hover:border-forest-300 rounded-xl px-3 py-2 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div>
                                  <span className="text-xs font-bold text-stone-800 block">{alt.equipmentName}</span>
                                  <span className="text-[11px] text-stone-400 capitalize">
                                    {alt.classification === 'NOT RECOMMENDED' ? 'Not Recommended' : (alt.classification === 'BEST' ? 'Good conditions expected' : alt.classification === 'USABLE' ? 'Moderate conditions' : (alt.classification || 'Unknown'))} • {alt.slot?.start ? new Date(alt.slot.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} - {alt.slot?.end ? new Date(alt.slot.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold text-forest-600 flex items-center space-x-1 shrink-0">
                                  <ArrowRight className="w-3 h-3" />
                                  <span>Book this</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseBookingModal}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBookingSubmitting || estimatedDays <= 0}
                  className="btn-primary text-xs"
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
        <div {...adminDialogProps} className={`${adminDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50`}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-6 relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <h2 id="admin-equipment-modal-title" className="text-xl font-bold text-stone-900">
                {editingEquipment ? 'Edit Equipment Details' : 'Add New Machinery'}
              </h2>
              <button
                onClick={handleCloseModal}
                aria-label="Close dialog"
                className="text-stone-400 hover:text-stone-600 p-1 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Validation Error Banner */}
            {formError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="space-y-4">

              {/* Machine Name */}
              <div>
                <label htmlFor="eq-name" className="label">
                  Machine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="eq-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. John Deere 5075E Utility Tractor"
                  className="input"
                  required
                />
              </div>

              {/* Category & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eq-category" className="label">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="eq-category"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="input"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Machinery').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="eq-status" className="label">
                    Operational Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="eq-status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="input"
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
                  <label htmlFor="eq-rate" className="label">
                    Daily Rate (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="eq-rate"
                    type="number"
                    name="dailyRate"
                    value={formData.dailyRate}
                    onChange={handleFormChange}
                    placeholder="e.g. 120"
                    min="0"
                    step="0.01"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="eq-location" className="label">
                    Station / Location
                  </label>
                  <input
                    id="eq-location"
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g. Coimbatore District Hub"
                    className="input"
                  />
                </div>
              </div>

              {/* Maintenance Tracking Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="eq-hours" className="label">
                    Usage Hours
                  </label>
                  <input
                    id="eq-hours"
                    type="number"
                    name="usageHours"
                    value={formData.usageHours}
                    onChange={handleFormChange}
                    min="0"
                    step="0.1"
                    placeholder="e.g. 120"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="eq-interval" className="label">
                    Service Interval (days)
                  </label>
                  <input
                    id="eq-interval"
                    type="number"
                    name="maintenanceIntervalDays"
                    value={formData.maintenanceIntervalDays}
                    onChange={handleFormChange}
                    min="1"
                    placeholder="e.g. 90"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="eq-servicedate" className="label">
                    Last Service Date
                  </label>
                  <input
                    id="eq-servicedate"
                    type="date"
                    name="lastMaintenanceDate"
                    value={formData.lastMaintenanceDate}
                    onChange={handleFormChange}
                    className="input"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label htmlFor="eq-image" className="label">
                  Image URL (Optional)
                </label>
                <input
                  id="eq-image"
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleFormChange}
                  placeholder="https://example.com/tractor-photo.jpg"
                  className="input"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="eq-desc" className="label">
                  Description & Specs <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="eq-desc"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder="Describe machine power, HP rating, attachment support, or usage guidance..."
                  className="input"
                  required
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
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
