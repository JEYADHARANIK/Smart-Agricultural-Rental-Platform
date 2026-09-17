/**
 * Multilingual farmer assistant service.
 *
 * Two honest modes are supported:
 *  - 'gemini'       generative AI grounded on real platform context
 *  - 'rule-based'   deterministic local intents (works fully offline, and is
 *                   what the UI labels "Offline knowledge base")
 *
 * The fallback is intentionally simple: it recognises a small set of common
 * farmer questions and answers from the REAL context object passed in. It
 * never invents equipment or prices. Localised replies are provided for all
 * six supported languages so the offline mode stays multilingual.
 */

const { generateContent } = require('./aiProvider');
const { CHATBOT_SYSTEM_PROMPT } = require('./prompts');
const {
  isGeminiConfigured,
  SUPPORTED_LANGUAGES,
} = require('../config/intelligence');

/**
 * English templates (fallback base for every language).
 */
const ENGLISH_REPLIES = {
  weatherSlots:
    'Weather slot meanings: BEST = favorable conditions for fieldwork. USABLE = moderate weather risk, work with caution. NOT RECOMMENDED = high rain risk — consider alternatives. The platform shows this per booking. (Live weather classification requires weather service configuration.)',
  pricesAvailable:
    'Current available equipment and daily rates: {list}. Prices are set by the equipment owner.',
  pricesEmpty: 'There is currently no available equipment in inventory.',
  bookingSteps:
    'To rent equipment: 1) Browse the Equipment catalog, 2) Select dates, 3) Submit a booking request, 4) Wait for approval, 5) Complete payment for approved bookings.',
  maintenance:
    'Maintenance is tracked per equipment (usage hours, service interval, history). Equipment under maintenance cannot be booked. Check the admin maintenance dashboard for risk insights.',
  availabilityAvailable:
    'There are currently {count} available machines. Examples: {list}.',
  availabilityEmpty: 'There is currently no available equipment in inventory.',
  bookingStatus:
    'You can view your bookings under "My Bookings". Booking statuses: pending, approved, rejected, active, completed, cancelled.',
  generic:
    'Select a language to get localized help. For now, I can help with equipment availability, rental steps, prices, booking status, and maintenance in English.',
  greeting:
    "I'm the AgriRentHub farmer assistant. I can help with: finding equipment, rental prices, availability, booking steps, booking status, weather slot meanings (BEST/USABLE/NOT RECOMMENDED), payments, and maintenance. Please ask about any of these.",
};

/**
 * Localised templates keyed by language then template key.
 */
const TRANSLATIONS = {
  tamil: {
    weatherSlots:
      'வானிலை ஸ்லாட் பொருள்: BEST = வயல் வேலைக்கு சாதகமான நிலை. USABLE = மிதமான அபாயம்; எச்சரிக்கையுடன் வேலை செய்யுங்கள். NOT RECOMMENDED = அதிக மழை அபாயம் — மாற்று வழிகளைக் கருதுங்கள். இந்தத் தகவல் ஒவ்வொரு முன்பதிவிலும் காட்டப்படும். (நேரலை வானிலை வகைப்பாட்டிற்கு வானிலை சேவை அமைப்பு தேவை.)',
    pricesAvailable:
      'தற்போது கிடைக்கும் உபகரணங்களும் தினசரி வாடகையும்: {list}. வாடகை உபகரண உரிமையாளரால் நிர்ணயிக்கப்படுகிறது.',
    pricesEmpty: 'தற்போது கையிருப்பில் உபகரணங்கள் எதுவும் இல்லை.',
    bookingSteps:
      'உபகரணத்தை வாடகைக்கு எடுக்க: 1) உபகரணப் பட்டியலைப் பார்க்கவும், 2) தேதிகளைத் தேர்ந்தெடுக்கவும், 3) முன்பதிவு கோரிக்கையைச் சமர்ப்பிக்கவும், 4) ஒப்புதல் கிடைக்கும் வரை காத்திருக்கவும், 5) ஒப்புதல் பெற்ற முன்பதிவுகளுக்கு கட்டணம் செலுத்தவும்.',
    maintenance:
      'பராமரிப்பு ஒவ்வொரு உபகரணத்திற்கும் கண்காணிக்கப்படுகிறது (பயன்பாட்டு மணிநேரம், சேவை இடைவெளி, வரலாறு). பராமரிப்பில் இருக்கும் உபகரணத்தை முன்பதிவு செய்ய முடியாது.',
    availabilityAvailable:
      'தற்போது {count} இயந்திரங்கள் கிடைக்கின்றன. எடுத்துக்காட்டு: {list}.',
    availabilityEmpty: 'தற்போது கையிருப்பில் உபகரணங்கள் எதுவும் இல்லை.',
    bookingStatus:
      'உங்கள் முன்பதிவுகளை "My Bookings" பிரிவில் காணலாம். நிலைகள்: pending, approved, rejected, active, completed, cancelled.',
    generic:
      'உங்கள் கேள்விக்கான பதில் இங்கே இல்லை. உபகரண கிடைக்கும் தன்மை, வாடகை விலை, முன்பதிவு படிகள், முன்பதிவு நிலை, வானிலை ஸ்லாட் பொருள் மற்றும் பராமரிப்பு பற்றி கேளுங்கள்.',
    greeting:
      'நான் AgriRentHub உதவியாளர். உபகரணங்கள், வாடகை விலை, கிடைக்கும் தன்மை, முன்பதிவு படிகள், முன்பதிவு நிலை, வானிலை ஸ்லாட் வகைகள் (BEST/USABLE/NOT RECOMMENDED), கட்டணம் மற்றும் பராமரிப்பு குறித்து உதவ முடியும்.',
  },
  hindi: {
    weatherSlots:
      'मौसम स्लॉट का अर्थ: BEST = अनुकूल मौसम। USABLE = मध्यम जोखिम; सावधानी से काम करें। NOT RECOMMENDED = अधिक बारिश का जोखिम — विकल्प देखें। यह जानकारी हर बुकिंग में दिखाई जाती है। (लाइव मौसम वर्गीकरण के लिए मौसम सेवा कॉन्फ़िगर होनी चाहिए।)',
    pricesAvailable:
      'वर्तमान उपलब्ध उपकरण और दैनिक दरें: {list}। दरें उपकरण स्वामी द्वारा निर्धारित की जाती हैं।',
    pricesEmpty: 'वर्तमान में इन्वेंट्री में कोई उपकरण उपलब्ध नहीं है।',
    bookingSteps:
      'उपकरण किराए पर लेने के लिए: 1) कैटलॉग देखें, 2) तिथियाँ चुनें, 3) बुकिंग अनुरोध भेजें, 4) अनुमोदन की प्रतीक्षा करें, 5) अनुमोदित बुकिंग का भुगतान करें।',
    maintenance:
      'रखरखाव प्रति उपकरण ट्रैक किया जाता है (उपयोग घंटे, सेवा अंतराल, इतिहास)। रखरखाव में उपकरण बुक नहीं किया जा सकता।',
    availabilityAvailable: 'अभी {count} उपकरण उपलब्ध हैं। उदाहरण: {list}।',
    availabilityEmpty: 'वर्तमान में इन्वेंट्री में कोई उपकरण उपलब्ध नहीं है।',
    bookingStatus:
      'अपनी बुकिंग "My Bookings" में देखें। बुकिंग स्थितियाँ: pending, approved, rejected, active, completed, cancelled।',
    generic:
      'आपके प्रश्न का उत्तर यहाँ उपलब्ध नहीं है। उपलब्धता, किराया दरें, बुकिंग चरण, बुकिंग स्थिति, मौसम स्लॉट और रखरखाव के बारे में पूछें।',
    greeting:
      'मैं AgriRentHub सहायक हूँ। मैं उपकरण खोज, किराया दरें, उपलब्धता, बुकिंग चरण, बुकिंग स्थिति, मौसम स्लॉट (BEST/USABLE/NOT RECOMMENDED), भुगतान और रखरखाव में मदद कर सकता हूँ।',
  },
  kannada: {
    weatherSlots:
      'ಹವಾಮಾನ ಸ್ಲಾಟ್ ಅರ್ಥ: BEST = ಕ್ಷೇತ್ರ ಕೆಲಸಕ್ಕೆ ಅನುಕೂಲಕರ. USABLE = ಮಧ್ಯಮ ಅಪಾಯ; ಜಾಗರೂಕತೆಯಿಂದ ಕೆಲಸ ಮಾಡಿ. NOT RECOMMENDED = ಹೆಚ್ಚಿನ ಮಳೆ ಅಪಾಯ — ಪರ್ಯಾಯವನ್ನು ಪರಿಗಣಿಸಿ. ಇದನ್ನು ಪ್ರತಿ ಬುಕಿಂಗ್ನಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ. (ಲೈವ್ ಹವಾಮಾನ ವರ್ಗೀಕರಣಕ್ಕೆ ಹವಾಮಾನ ಸೇವೆ ಸಂರಚನೆ ಬೇಕು.)',
    pricesAvailable:
      'ಪ್ರಸ್ತುತ ಲಭ್ಯವಿರುವ ಉಪಕರಣಗಳು ಮತ್ತು ದೈನಂದಿನ ದರಗಳು: {list}. ದರಗಳನ್ನು ಉಪಕರಣದ ಮಾಲೀಕರು ನಿಗದಿಪಡಿಸುತ್ತಾರೆ.',
    pricesEmpty: 'ಈಗ ಸ್ಟಾಕ್ನಲ್ಲಿ ಯಾವುದೇ ಉಪಕರಣ ಲಭ್ಯವಿಲ್ಲ.',
    bookingSteps:
      'ಉಪಕರಣ ಬಾಡಿಗೆಗೆ: 1) ಪಟ್ಟಿಯನ್ನು ನೋಡಿ, 2) ದಿನಾಂಕಗಳನ್ನು ಆರಿಸಿ, 3) ಬುಕಿಂಗ್ ವಿನಂತಿ ಸಲ್ಲಿಸಿ, 4) ಅನುಮೋದನೆಗಾಗಿ ಕಾಯಿರಿ, 5) ಅನುಮೋದಿತ ಬುಕಿಂಗ್ಗೆ ಪಾವತಿ ಮಾಡಿ.',
    maintenance:
      'ನಿರ್ವಹಣೆಯನ್ನು ಪ್ರತಿ ಉಪಕರಣಕ್ಕೂ ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತದೆ (ಬಳಕೆಯ ಗಂಟೆಗಳು, ಸೇವಾ ಅಂತರ, ಇತಿಹಾಸ). ನಿರ್ವಹಣೆಯಲ್ಲಿರುವ ಉಪಕರಣವನ್ನು ಬುಕ್ ಮಾಡಲಾಗುವುದಿಲ್ಲ.',
    availabilityAvailable:
      'ಪ್ರಸ್ತುತ {count} ಯಂತ್ರಗಳು ಲಭ್ಯವಿವೆ. ಉದಾಹರಣೆ: {list}.',
    availabilityEmpty: 'ಈಗ ಸ್ಟಾಕ್ನಲ್ಲಿ ಯಾವುದೇ ಉಪಕರಣ ಲಭ್ಯವಿಲ್ಲ.',
    bookingStatus:
      'ನಿಮ್ಮ ಬುಕಿಂಗ್ಗಳನ್ನು "My Bookings" ನಲ್ಲಿ ನೋಡಬಹುದು. ಸ್ಥಿತಿಗಳು: pending, approved, rejected, active, completed, cancelled.',
    generic:
      'ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರ ಇಲ್ಲಿ ಇಲ್ಲ. ಉಪಕರಣಗಳ ಲಭ್ಯತೆ, ದರ, ಬುಕಿಂಗ್ ಹಂತಗಳು, ಸ್ಥಿತಿ, ಹವಾಮಾನ ಸ್ಲಾಟ್ ಮತ್ತು ನಿರ್ವಹಣೆ ಬಗ್ಗೆ ಕೇಳಿ.',
    greeting:
      'ನಾನು AgriRentHub ಸಹಾಯಕ. ಉಪಕರಣ ಹುಡುಕಾಟ, ದರಗಳು, ಲಭ್ಯತೆ, ಬುಕಿಂಗ್ ಹಂತಗಳು, ಸ್ಥಿತಿ, ಹವಾಮಾನ ಸ್ಲಾಟ್ಗಳು (BEST/USABLE/NOT RECOMMENDED), ಪಾವತಿ ಮತ್ತು ನಿರ್ವಹಣೆಯಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.',
  },
  telugu: {
    weatherSlots:
      'వాతావరణ స్లాట్ అర్థం: BEST = పంట పొలం పనికి అనుకూలం. USABLE = మధ్యస్థ ప్రమాదం; జాగ్రత్తగా పని చేయండి. NOT RECOMMENDED = అధిక వర్ష ప్రమాదం — ప్రత్యామ్నాయాలను పరిగణించండి. ఇది ప్రతి బుకింగ్లో చూపబడుతుంది. (లైవ్ వాతావరణ వర్గీకరణకు వాతావరణ సేవ అమరిక అవసరం.)',
    pricesAvailable:
      'ప్రస్తుతం అందుబాటులో ఉన్న పరికరాలు మరియు రోజువారీ రేట్లు: {list}. ధరలను పరికర యజమాని నిర్ణయిస్తారు.',
    pricesEmpty: 'ప్రస్తుతం స్టాక్లో ఎలాంటి పరికరం అందుబాటులో లేదు.',
    bookingSteps:
      'పరికరాన్ని అద్దెకు తీసుకోవడానికి: 1) కేటలాగ్ చూడండి, 2) తేదీలను ఎంచుకోండి, 3) బుకింగ్ అభ్యర్థన సమర్పించండి, 4) ఆమోదం కోసం వేచి ఉండండి, 5) ఆమోదించబడిన బుకింగ్కు చెల్లించండి.',
    maintenance:
      'నిర్వహణ ప్రతి పరికరానికి ట్రాక్ చేయబడుతుంది (వినియోగ గంటలు, సేవా విరామం, చరిత్ర). నిర్వహణలో ఉన్న పరికరాన్ని బుక్ చేయలేరు.',
    availabilityAvailable:
      'ప్రస్తుతం {count} యంత్రాలు అందుబాటులో ఉన్నాయి. ఉదాహరణలు: {list}.',
    availabilityEmpty: 'ప్రస్తుతం స్టాక్లో ఎలాంటి పరికరం అందుబాటులో లేదు.',
    bookingStatus:
      'మీ బుకింగ్లను "My Bookings" లో చూడవచ్చు. స్థితులు: pending, approved, rejected, active, completed, cancelled.',
    generic:
      'మీ ప్రశ్నకు సమాధానం ఇక్కడ లేదు. పరికరాల లభ్యత, రేట్లు, బుకింగ్ దశలు, స్థితి, వాతావరణ స్లాట్ మరియు నిర్వహణ గురించి అడగండి.',
    greeting:
      'నేను AgriRentHub సహాయకుడిని. పరికరాల శోధన, రేట్లు, లభ్యత, బుకింగ్ దశలు, స్థితి, వాతావరణ స్లాట్లు (BEST/USABLE/NOT RECOMMENDED), చెల్లింపు మరియు నిర్వహణలో సహాయం చేయగలను.',
  },
  malayalam: {
    weatherSlots:
      'കാലാവസ്ഥ സ്ലോട്ട് അർത്ഥം: BEST = കൃഷി ജോലിക്ക് അനുകൂലം. USABLE = മിതമായ അപകടസാധ്യത; ജാഗ്രതയോടെ പ്രവർത്തിക്കുക. NOT RECOMMENDED = ഉയർന്ന മഴ സാധ്യത — ബദൽ മാർഗങ്ങൾ പരിഗണിക്കുക. ഓരോ ബുക്കിംഗിലും ഇത് കാണിക്കും. (തത്സമയ കാലാവസ്ഥാ വർഗ്ഗീകരണത്തിന് കാലാവസ്ഥാ സേവന കോൺഫിഗറേഷൻ ആവശ്യമാണ്.)',
    pricesAvailable:
      'നിലവിൽ ലഭ്യമായ ഉപകരണങ്ങളും പ്രതിദിന നിരക്കുകളും: {list}. നിരക്കുകൾ ഉപകരണ ഉടമ നിശ്ചയിക്കുന്നു.',
    pricesEmpty: 'നിലവിൽ സ്റ്റോക്കിൽ ഉപകരണങ്ങളൊന്നും ലഭ്യമല്ല.',
    bookingSteps:
      'ഉപകരണം വാടകയ്ക്ക് എടുക്കാൻ: 1) കാറ്റലോഗ് കാണുക, 2) തീയതികൾ തിരഞ്ഞെടുക്കുക, 3) ബുക്കിംഗ് അഭ്യർത്ഥന സമർപ്പിക്കുക, 4) അനുമതിക്കായി കാത്തിരിക്കുക, 5) അംഗീകരിച്ച ബുക്കിംഗിന് പണം നൽകുക.',
    maintenance:
      'പരിപാലനം ഓരോ ഉപകരണത്തിനും ട്രാക്ക് ചെയ്യുന്നു (ഉപയോഗ സമയം, സേവന ഇടവേള, ചരിത്രം). പരിപാലനത്തിലുള്ള ഉപകരണം ബുക്ക് ചെയ്യാൻ കഴിയില്ല.',
    availabilityAvailable:
      'നിലവിൽ {count} യന്ത്രങ്ങൾ ലഭ്യമാണ്. ഉദാഹരണം: {list}.',
    availabilityEmpty: 'നിലവിൽ സ്റ്റോക്കിൽ ഉപകരണങ്ങളൊന്നും ലഭ്യമല്ല.',
    bookingStatus:
      'നിങ്ങളുടെ ബുക്കിംഗുകൾ "My Bookings" ൽ കാണാം. സ്റ്റാറ്റസുകൾ: pending, approved, rejected, active, completed, cancelled.',
    generic:
      'നിങ്ങളുടെ ചോദ്യത്തിനുള്ള ഉത്തരം ഇവിടെ ഇല്ല. ലഭ്യത, നിരക്കുകൾ, ബుక്കിംഗ് ഘട്ടങ്ങൾ, സ്റ്റാറ്റസ്, കാലാവസ്ഥാ സ്ലോട്ട്, പരിപാലനം എന്നിവയെക്കുറിച്ച് ചോദിക്കുക.',
    greeting:
      'ഞാൻ AgriRentHub സഹായിയാണ്. ഉപകരണങ്ങൾ കണ്ടെത്തൽ, നിരക്കുകൾ, ലഭ്യത, ബುക്കിംഗ് ഘട്ടങ്ങൾ, സ്റ്റാറ്റസ്, കാലാവസ്ഥാ സ്ലോട്ടുകൾ (BEST/USABLE/NOT RECOMMENDED), പേയ്മെന്റ്, പരിപാലനം എന്നിവയിൽ സഹായിക്കാം.',
  },
};

function t(lang, key) {
  const table = TRANSLATIONS[lang];
  return table && table[key] ? table[key] : null;
}

function withVars(text, vars = {}) {
  return Object.keys(vars).reduce((out, k) => out.split(`{${k}}`).join(String(vars[k])), text);
}

function tpl(lang, key, vars) {
  return withVars(t(lang, key) || ENGLISH_REPLIES[key], vars);
}

/**
 * Deterministic offline fallback so the chatbot never crashes or hallucinates
 * when generative AI is unavailable.
 */
function buildFallbackReply(message, context, lang) {
  const lower = String(message || '').toLowerCase();
  const names = context.equipmentInventory || [];
  const count = context.inventoryCount;
  const priceList = names.map((e) => `${e.name} (${e.dailyRate}/day)`).join('; ');
  const nameList = names.slice(0, 5).map((e) => e.name).join(', ');

  if (lower.includes('best') || lower.includes('usable') || lower.includes('weather') || lower.includes('slot')) {
    return tpl(lang, 'weatherSlots');
  }
  if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('₹') || lower.includes('rent')) {
    return count > 0
      ? tpl(lang, 'pricesAvailable', { list: priceList })
      : tpl(lang, 'pricesEmpty');
  }
  if (lower.includes('book') || lower.includes('rent')) {
    return tpl(lang, 'bookingSteps');
  }
  if (lower.includes('maintenance') || lower.includes('service')) {
    return tpl(lang, 'maintenance');
  }
  if (lower.includes('available') || lower.includes('availability') || lower.includes('inventory') || lower.includes('have') || lower.includes('list')) {
    return count > 0
      ? tpl(lang, 'availabilityAvailable', { count, list: nameList })
      : tpl(lang, 'availabilityEmpty');
  }
  if (lower.includes('booking') || lower.includes('status') || lower.includes('dashboard')) {
    return tpl(lang, 'bookingStatus');
  }
  if (lang !== 'english') {
    return tpl(lang, 'generic');
  }
  return ENGLISH_REPLIES.greeting;
}

/**
 * Produce an assistant reply (AI or deterministic fallback) for one message.
 *
 * @param {{ message: string, language: string, context: object }} params
 * @returns {Promise<{ mode: 'gemini'|'rule-based', reply: string, language: string }>}
 */
async function runAssistantReply({ message, language, context }) {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'english';
  const cleanedMessage = String(message || '').trim().slice(0, 1000);

  if (!isGeminiConfigured()) {
    return {
      mode: 'rule-based',
      language: lang,
      reply: buildFallbackReply(cleanedMessage, context, lang),
    };
  }

  try {
    const result = await generateContent({
      contents: `${CHATBOT_SYSTEM_PROMPT}\n\nPLATFORM CONTEXT (JSON):\n${JSON.stringify(context)}\n\nUser Language: ${lang}\nUser Message: "${cleanedMessage}"\n\nRespond with a plain text answer only (no JSON).`,
    });

    if (result.ok && result.text.trim()) {
      return { mode: 'gemini', language: lang, reply: result.text.replace(/```/g, '').trim() };
    }
  } catch (error) {
    console.error('Chatbot Gemini error:', error?.message || error);
  }

  return {
    mode: 'rule-based',
    language: lang,
    reply: buildFallbackReply(cleanedMessage, context, lang),
  };
}

module.exports = {
  buildFallbackReply,
  runAssistantReply,
  TRANSLATIONS,
  ENGLISH_REPLIES,
};