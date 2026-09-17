const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');
const { runAssistantReply } = require('../services/farmerAssistant');
const { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } = require('../config/intelligence');

// @desc    Chat with the multilingual farmer assistant (platform-grounded)
// @route   POST /api/chatbot/message
// @access  Private
const chatMessage = async (req, res) => {
  try {
    const { message, language } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a message.' });
    }

    const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'english';
    const cleanedMessage = message.trim().slice(0, 1000);

    // ---- Gather REAL platform context for grounding ----
    const availableEquipment = await Equipment.find({ status: 'Available' })
      .select('name category dailyRate location status')
      .limit(20)
      .lean();

    const equipmentSummary = availableEquipment.map((e) => ({
      name: e.name,
      category: e.category,
      dailyRate: e.dailyRate,
      location: e.location || 'N/A',
      status: e.status,
    }));

    let userBookingsContext = 'No bookings available.';
    if (req.user.role === 'customer') {
      const bookings = await Booking.find({ customer: req.user._id })
        .select('bookingNumber startDate endDate status totalPrice weatherSlot')
        .populate('equipment', 'name')
        .sort({ createdAt: -1 })
        .limit(10);
      if (bookings.length) {
        userBookingsContext = bookings.map((b) => ({
          number: b.bookingNumber,
          equipment: b.equipment?.name || 'Equipment',
          start: b.startDate.toISOString().slice(0, 10),
          end: b.endDate.toISOString().slice(0, 10),
          status: b.status,
          amount: b.totalPrice,
          weather: b.weatherSlot?.classification || 'UNKNOWN',
        }));
      }
    }

    const context = {
      platform: 'Smart Agricultural Rental Platform (AgriRentHub)',
      userRole: req.user.role,
      equipmentInventory: equipmentSummary,
      inventoryCount: availableEquipment.length,
      userBookings: userBookingsContext,
      languages: SUPPORTED_LANGUAGES,
      disclaimer:
        'Only answer using the supplied data. Do not invent equipment, availability, prices, weather or booking information. If data is missing, say so clearly.',
    };

    const result = await runAssistantReply({ message: cleanedMessage, language: lang, context });

    const payload = {
      success: true,
      mode: result.mode,
      language: result.language,
      reply: result.reply,
    };

    if (result.mode === 'rule-based') {
      payload.context = { inventoryCount: availableEquipment.length };
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Chatbot server error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing chatbot message' });
  }
};

// @desc    Get supported chatbot languages
// @route   GET /api/chatbot/languages
// @access  Private
const getLanguages = async (_req, res) => {
  return res.status(200).json({
    success: true,
    languages: SUPPORTED_LANGUAGES.map((code) => ({ code, name: LANGUAGE_NAMES[code] })),
  });
};

module.exports = { chatMessage, getLanguages, SUPPORTED_LANGUAGES, LANGUAGE_NAMES };