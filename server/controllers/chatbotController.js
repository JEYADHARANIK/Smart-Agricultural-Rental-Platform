const { GoogleGenAI } = require('@google/genai');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');

const SUPPORTED_LANGUAGES = ['english', 'tamil', 'hindi', 'kannada', 'telugu', 'malayalam'];

const LANGUAGE_NAMES = {
  english: 'English',
  tamil: 'Tamil (தமிழ்)',
  hindi: 'Hindi (हिन्दी)',
  kannada: 'Kannada (ಕನ್ನಡ)',
  telugu: 'Telugu (తెలుగు)',
  malayalam: 'Malayalam (മലയാളം)',
};

const isGeminiConfigured = () => {
  const key = process.env.GEMINI_API_KEY;
  return !!key && key !== 'your_gemini_api_key_here';
};

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
      .select('name category dailyRate location')
      .lean();

    const equipmentSummary = availableEquipment.slice(0, 20).map((e) => ({
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

    // ---- Fallback deterministic response when Gemini is not configured ----
    if (!isGeminiConfigured()) {
      return res.status(200).json({
        success: true,
        mode: 'rule-based',
        language: lang,
        reply: buildFallbackReply(cleanedMessage, context, lang),
        context: { inventoryCount: availableEquipment.length },
      });
    }

    // ---- Gemini-based grounded response ----
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const systemInstruction = `You are a multilingual farmer assistant chatbot for the Smart Agricultural Rental Platform (AgriRentHub).

Respond ONLY using the platform data provided in the context. Never invent:
- equipment names or availability
- rental prices
- booking information
- weather forecasts

If the user asks about anything outside the provided data, tell them you don't have that information and advise what they can do in the app.

Reply in the requested language. If the language is not in the supported list, use English.

Explain concepts like BEST / USABLE / NOT RECOMMENDED weather slots, availability, booking steps, prices, and maintenance reminders using the supplied data when relevant.

Keep responses concise, friendly, and practical for a farmer.`;

      const promptText = `${systemInstruction}

PLATFORM CONTEXT (JSON):
${JSON.stringify(context, null, 2)}

User Language: ${LANGUAGE_NAMES[lang]} (${lang})
User Message: "${cleanedMessage}"

Respond with a plain text answer only (no JSON).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
      });

      const reply = (response.text || '')
        .replace(/```/g, '')
        .trim();

      if (!reply) {
        return res.status(200).json({
          success: true,
          mode: 'rule-based',
          language: lang,
          reply: buildFallbackReply(cleanedMessage, context, lang),
        });
      }

      return res.status(200).json({
        success: true,
        mode: 'gemini',
        language: lang,
        reply,
      });
    } catch (aiError) {
      console.error('Chatbot Gemini error:', aiError?.message || aiError);
      return res.status(200).json({
        success: true,
        mode: 'rule-based',
        language: lang,
        reply: buildFallbackReply(cleanedMessage, context, lang),
      });
    }
  } catch (error) {
    console.error('Chatbot server error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing chatbot message' });
  }
};

// @desc    Get supported chatbot languages
// @route   GET /api/chatbot/languages
// @access  Private
const getLanguages = async (req, res) => {
  return res.status(200).json({
    success: true,
    languages: SUPPORTED_LANGUAGES.map((code) => ({ code, name: LANGUAGE_NAMES[code] })),
  });
};

// Deterministic fallback so the chatbot never crashes when AI is unavailable.
function buildFallbackReply(message, context, lang) {
  const lower = message.toLowerCase();
  const count = context.inventoryCount;
  const prices = context.equipmentInventory.map((e) => `${e.name} (${e.dailyRate}/day)`).join('; ');

  let reply = '';
  if (lower.includes('best') || lower.includes('usable') || lower.includes('weather') || lower.includes('slot')) {
    reply =
      'Weather slot meanings: BEST = favorable conditions for fieldwork. USABLE = moderate weather risk, work with caution. NOT RECOMMENDED = high rain risk — consider alternatives. The platform shows this per booking. (Live weather classification requires weather service configuration.)';
  } else if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('₹') || lower.includes('rent')) {
    reply =
      count > 0
        ? `Current available equipment and daily rates: ${prices}. Prices are set by the equipment owner.`
        : 'There is currently no available equipment in inventory.';
  } else if (lower.includes('book') || lower.includes('rent')) {
    reply =
      'To rent equipment: 1) Browse the Equipment catalog, 2) Select dates, 3) Submit a booking request, 4) Wait for approval, 5) Complete payment for approved bookings.';
  } else if (lower.includes('maintenance') || lower.includes('service')) {
    reply =
      'Maintenance is tracked per equipment (usage hours, service interval, history). Equipment under maintenance cannot be booked. Check the admin maintenance dashboard for risk insights.';
  } else if (lower.includes('available') || lower.includes('availability')) {
    reply =
      count > 0
        ? `There are currently ${count} available machines. Examples: ${context.equipmentInventory.slice(0, 5).map((e) => e.name).join(', ')}.`
        : 'There is currently no available equipment in inventory.';
  } else if (lower.includes('booking') || lower.includes('status') || lower.includes('dashboard')) {
    reply =
      'You can view your bookings under "My Bookings". Booking statuses: pending, approved, rejected, active, completed, cancelled.';
  } else if (lang !== 'english') {
    reply = 'Select a language to get localized help. For now, I can help with equipment availability, rental steps, prices, booking status, and maintenance in English.';
  } else {
    reply =
      "I'm the AgriRentHub farmer assistant. I can help with: finding equipment, rental prices, availability, booking steps, booking status, weather slot meanings (BEST/USABLE/NOT RECOMMENDED), payments, and maintenance. Please ask about any of these.";
  }
  return reply;
}

module.exports = { chatMessage, getLanguages, SUPPORTED_LANGUAGES, LANGUAGE_NAMES };