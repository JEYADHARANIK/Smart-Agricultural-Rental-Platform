/**
 * Shared intelligence configuration for the Smart Agricultural Rental Platform.
 *
 * This module is the single source of truth for:
 *  - supported assistant languages
 *  - weather slot classifications and their meaning
 *  - the default generative-AI model
 *  - capability checks (Gemini / OpenWeatherMap)
 *
 * Keeping these constants here prevents the controllers, services and tests
 * from drifting apart and makes the "what is AI vs. rule-based vs. external
 * API" story auditable.
 */

const SUPPORTED_LANGUAGES = ['english', 'tamil', 'hindi', 'kannada', 'telugu', 'malayalam'];

const LANGUAGE_NAMES = {
  english: 'English',
  tamil: 'Tamil (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)',
  hindi: 'Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)',
  kannada: 'Kannada (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1)',
  telugu: 'Telugu (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)',
  malayalam: 'Malayalam (\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02)',
};

// Default generative-AI model; overridable via GEMINI_MODEL for demos.
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// Placeholder sentinel values used when credentials have not been configured.
const GEMINI_KEY_PLACEHOLDER = 'your_gemini_api_key_here';
const WEATHER_KEY_PLACEHOLDER = 'your_openweather_api_key_here';

/**
 * Weather slot classifications. BEST is the most favourable, UNKNOWN means the
 * forecast could not be obtained. This ordering is used by the scheduling
 * engine to rank alternative slots.
 */
const SLOT_CLASSIFICATIONS = ['BEST', 'USABLE', 'NOT RECOMMENDED', 'UNKNOWN'];

const SLOT_RANK = { BEST: 3, USABLE: 2, 'NOT RECOMMENDED': 1, UNKNOWN: 0 };

const SLOT_MEANINGS = {
  BEST: 'Low probability of rain and favorable field conditions.',
  USABLE: 'Moderate weather risk. Work can proceed with caution.',
  'NOT RECOMMENDED': 'High probability of rain or adverse conditions during the period.',
  UNKNOWN: 'Weather forecast is unavailable; no weather adjustment applied.',
};

const isGeminiConfigured = () => {
  const key = process.env.GEMINI_API_KEY;
  return !!key && key !== GEMINI_KEY_PLACEHOLDER;
};

const getGeminiModel = () => process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

const isWeatherConfigured = () => {
  const key = process.env.OPENWEATHER_API_KEY;
  return !!key && key !== WEATHER_KEY_PLACEHOLDER;
};

/**
 * Predictable risk levels for the predictive maintenance scoring.
 */
const RISK_LEVELS = ['Low', 'Medium', 'High'];

module.exports = {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  DEFAULT_GEMINI_MODEL,
  SLOT_CLASSIFICATIONS,
  SLOT_RANK,
  SLOT_MEANINGS,
  RISK_LEVELS,
  GEMINI_KEY_PLACEHOLDER,
  WEATHER_KEY_PLACEHOLDER,
  isGeminiConfigured,
  getGeminiModel,
  isWeatherConfigured,
};