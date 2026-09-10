const mongoose = require('mongoose');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// @desc    Get analytics for admin dashboard (all real DB data)
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
const getAdminAnalytics = async (req, res) => {
  try {
    const now = new Date();

    const [totalEquipment, equipmentList, bookings, payments] = await Promise.all([
      Equipment.countDocuments(),
      Equipment.find().select('_id name category status usageHours dailyRate location').lean(),
      Booking.find().lean(),
      Payment.find().select('amount paymentDate paymentStatus booking').lean(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availableCount = equipmentList.filter((e) => e.status === 'Available').length;
    const reservedCount = equipmentList.filter((e) => e.status === 'Rented').length;
    const maintenanceCount = equipmentList.filter((e) => e.status === 'Maintenance').length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
    const activeRentals = bookings.filter((b) => b.status === 'active').length;
    const completedRentals = bookings.filter((b) => b.status === 'completed').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

    const paidPayments = payments.filter((p) => p.paymentStatus === 'paid');
    const paidPending = payments.filter((p) => p.paymentStatus === 'pending');
    const totalRevenue = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPayments = paidPayments.filter((p) => {
        const d = new Date(p.paymentDate);
        return d >= monthStart && d < monthEnd;
      });
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.round(monthPayments.reduce((s, p) => s + (p.amount || 0), 0) * 100) / 100,
      });
    }

    // Booking trends (last 6 months)
    const bookingTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthBookings = bookings.filter((b) => {
        const d = new Date(b.createdAt);
        return d >= monthStart && d < monthEnd;
      });
      bookingTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthBookings.length,
      });
    }

    // Most rented equipment
    const equipmentRentalCount = {};
    bookings
      .filter((b) => b.status === 'completed' || b.status === 'active' || b.status === 'approved')
      .forEach((b) => {
        const key = b.equipment ? b.equipment.toString() : 'unknown';
        equipmentRentalCount[key] = (equipmentRentalCount[key] || 0) + 1;
      });
    const mostRented = Object.entries(equipmentRentalCount)
      .map(([id, count]) => {
        const eq = equipmentList.find((e) => e._id.toString() === id);
        return { _id: id, name: eq?.name || 'Unknown', category: eq?.category || 'Unknown', rentals: count };
      })
      .sort((a, b) => b.rentals - a.rentals)
      .slice(0, 5);

    // Equipment utilization (booked days / 30 days)
    const utilization = equipmentList.map((eq) => {
      const eqBookings = bookings.filter(
        (b) => b.equipment && b.equipment.toString() === eq._id.toString() && b.status !== 'cancelled' && b.status !== 'rejected'
      );
      let bookedDays = 0;
      eqBookings.forEach((b) => {
        bookedDays += b.totalDays || 0;
      });
      const utilPercent = Math.min(100, Math.round((bookedDays / 30) * 100));
      return { _id: eq._id, name: eq.name, category: eq.category, utilization: utilPercent, bookedDays };
    });

    // Equipment status for charts
    const equipmentStatusDistribution = [
      { name: 'Available', value: availableCount },
      { name: 'Rented', value: reservedCount },
      { name: 'Maintenance', value: maintenanceCount },
    ];

    // Usage hours by category
    const usageByCategory = {};
    equipmentList.forEach((e) => {
      usageByCategory[e.category] = (usageByCategory[e.category] || 0) + (Number(e.usageHours) || 0);
    });
    const usageHoursByCategory = Object.entries(usageByCategory).map(([name, hours]) => ({
      name,
      hours,
    }));

    return res.status(200).json({
      success: true,
      analytics: {
        overview: {
          totalEquipment,
          available: availableCount,
          reserved: reservedCount,
          underMaintenance: maintenanceCount,
          pendingBookings,
          activeRentals,
          completedRentals,
          cancelledBookings,
          totalRevenue,
          pendingPaymentsAmount: paidPending.reduce((s, p) => s + (p.amount || 0), 0),
          pendingPaymentsCount: paidPending.length,
          upcomingRentals: bookings.filter((b) => b.status === 'approved' && new Date(b.startDate) > today).length,
        },
        monthlyRevenue,
        bookingTrends,
        mostRented,
        equipmentUtilization: utilization,
        equipmentStatusDistribution,
        usageHoursByCategory,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error computing analytics' });
  }
};

// @desc    Get customer analytics for the customer dashboard
// @route   GET /api/analytics/my-dashboard
// @access  Private (Customer)
const getCustomerAnalytics = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Use the admin analytics endpoint.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [bookings, payments] = await Promise.all([
      Booking.find({ customer: req.user._id }).lean(),
      Payment.find({ customer: req.user._id }).lean(),
    ]);

    const upcoming = bookings.filter(
      (b) => b.status === 'approved' && new Date(b.startDate) > today
    ).length;
    const active = bookings.filter((b) => b.status === 'active').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;

    const paidPaymentIds = new Set(
      payments.filter((p) => p.paymentStatus === 'paid').map((p) => p.booking && p.booking.toString())
    );

    const pendingPaymentsBookings = bookings.filter(
      (b) => b.status === 'approved' && !paidPaymentIds.has(b._id.toString())
    );
    const pendingPaymentAmount = pendingPaymentsBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

    const totalSpent = payments
      .filter((p) => p.paymentStatus === 'paid')
      .reduce((s, p) => s + (p.amount || 0), 0);

    return res.status(200).json({
      success: true,
      analytics: {
        overview: {
          upcoming,
          active,
          completed,
          cancelled,
          pending,
          pendingPaymentAmount,
          pendingPaymentsCount: pendingPaymentsBookings.length,
          totalSpent,
        },
        bookingStatusDistribution: [
          { name: 'Approved', value: bookings.filter((b) => b.status === 'approved').length },
          { name: 'Active', value: active },
          { name: 'Completed', value: completed },
          { name: 'Cancelled', value: cancelled },
          { name: 'Pending', value: pending },
        ],
      },
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error computing customer analytics' });
  }
};

module.exports = {
  getAdminAnalytics,
  getCustomerAnalytics,
};