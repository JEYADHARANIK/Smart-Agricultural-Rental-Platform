/**
 * Weather service abstraction for weather-aware scheduling.
 *
 * Uses OpenWeatherMap One Call API (or 2.5 forecast API) to fetch real forecast data.
 * If credentials are unavailable, returns a controlled "unavailable" result so that
 * scheduling gracefully degrades instead of crashing or inventing weather data.
 */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || null;

// Whether real weather API is configured
const isConfigured = () =>
  !!OPENWEATHER_API_KEY &&
  OPENWEATHER_API_KEY !== 'your_openweather_api_key_here';

/**
 * Fetch weather forecast for a given location.
 * @param {Object} opts - { lat, lng, locationText, days }
 * @returns {Promise<Object>} normalized forecast payload or unavailable marker
 */
async function getForecast({ lat = null, lng = null, locationText = '', days = 7 } = {}) {
  if (!isConfigured()) {
    return { available: false, reason: 'OPENWEATHER_API_KEY not configured' };
  }

  if (lat == null || lng == null) {
    // No coordinates: safely degrade rather than fabricate a location.
    return {
      available: false,
      reason: 'Location coordinates unavailable for weather lookup',
    };
  }

  const maxDays = Math.min(8, Math.max(0, days));
  const exclude = 'current,minutely,hourly,alerts';
  const url =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}` +
    `&exclude=${exclude}&units=metric&appid=${OPENWEATHER_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        available: false,
        reason: `Weather API returned status ${res.status}`,
        detail: body.slice(0, 200),
      };
    }
    const data = await res.json();
    const daily = Array.isArray(data.daily) ? data.daily.slice(0, maxDays) : [];
    return {
      available: true,
      source: 'openweathermap',
      timezone: data.timezone_offset || 0,
      daily: daily.map((d) => ({
        date: new Date(d.dt * 1000).toISOString(),
        rainProbability: d.pop != null ? Math.round(d.pop * 100) : null,
        precipitation: d.rain != null ? d.rain : 0,
        condition: (d.weather && d.weather[0] && d.weather[0].description) || '',
        conditionMain: (d.weather && d.weather[0] && d.weather[0].main) || '',
        tempMin: d.temp && d.temp.min != null ? d.temp.min : null,
        tempMax: d.temp && d.temp.max != null ? d.temp.max : null,
        severe: isSevere(d.weather && d.weather[0]),
      })),
    };
  } catch (error) {
    return { available: false, reason: `Weather API failure: ${error.message}` };
  }
}

function isSevere(weather) {
  if (!weather) return false;
  const severeIds = [200, 201, 202, 210, 211, 212, 221, 230, 231, 232, 502, 503, 504, 511, 522, 531, 781, 900, 901, 902, 903, 904, 905, 906, 957, 958, 959];
  return severeIds.includes(weather.id);
}

/**
 * Classify a weather forecast entry into BEST / USABLE / NOT RECOMMENDED.
 * Transparent rule-based classification derived from actual weather data.
 */
function classifyDay(day) {
  if (!day) return { classification: 'USABLE', reasons: ['No weather data available for this date.'] };

  const reasons = [];
  const rainProb = day.rainProbability;
  const precip = day.precipitation || 0;

  if (day.severe) {
    reasons.push('Severe weather warning in effect for this date.');
  }
  if (rainProb != null) {
    if (rainProb >= 75) reasons.push(`${rainProb}% probability of rain.`);
    else if (rainProb >= 40) reasons.push(`${rainProb}% probability of rain.`);
  }
  if (precip > 0) {
    reasons.push(`${precip} mm expected precipitation.`);
  }
  if (day.conditionMain == null || day.conditionMain === '') {
    reasons.push('No clear weather condition available.');
  }

  // Severe or very high rain => NOT RECOMMENDED
  if (day.severe || (rainProb != null && rainProb >= 75) || precip >= 10) {
    return {
      classification: 'NOT RECOMMENDED',
      reasons: reasons.length ? reasons : ['High risk of wet field conditions.'],
    };
  }

  // Moderate rain => USABLE
  if (rainProb != null && rainProb >= 40) {
    return {
      classification: 'USABLE',
      reasons: reasons.length ? reasons : ['Moderate weather risk. Work can proceed with caution.'],
    };
  }

  // Low rain => BEST
  return {
    classification: 'BEST',
    reasons: reasons.length ? reasons : ['Low probability of rain and favorable conditions.'],
  };
}

module.exports = {
  getForecast,
  classifyDay,
  isConfigured,
};
