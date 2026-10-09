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

  const maxDays = Math.min(5, Math.max(0, days));
  // Free OpenWeather 5-day / 3-hour forecast API — no billing, no One Call 3.0.
  const url =
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}` +
    `&units=metric&appid=${OPENWEATHER_API_KEY}`;

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
    const list = Array.isArray(data.list) ? data.list : [];

    // Aggregate the free API's 3-hour entries into per-day summaries.
    // Every value below comes from real list[] data; absent values stay null —
    // nothing is fabricated when the API does not supply it.
    const byDay = new Map();
    list.forEach((e) => {
      const day = new Date(e.dt * 1000).toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(e);
    });

    const dayEntries = Array.from(byDay.values()).slice(0, maxDays);
    const daily = dayEntries.map((entries) => {
      const dayTs = entries[0].dt * 1000;
      const popVals = entries
        .map((e) => (e.pop != null ? Math.round(e.pop * 100) : null))
        .filter((v) => v != null);
      const rainVals = entries
        .map((e) => (e.rain && e.rain['3h'] != null ? e.rain['3h'] : null))
        .filter((v) => v != null);
      const temps = entries
        .map((e) => (e.main && e.main.temp != null ? e.main.temp : null))
        .filter((v) => v != null);

      // Representative entry: worst weather (severe first, then highest rain pop).
      const rep = entries.reduce((worst, e) => {
        const grade = (e) =>
          (e.pop != null ? e.pop : 0) + (isSevere(e.weather && e.weather[0]) ? 10 : 0);
        return grade(e) > grade(worst) ? e : worst;
      }, entries[0]);

      return {
        date: new Date(dayTs).toISOString(),
        rainProbability: popVals.length ? Math.max(...popVals) : null,
        precipitation: rainVals.length ? rainVals.reduce((a, b) => a + b, 0) : null,
        condition: (rep.weather && rep.weather[0] && rep.weather[0].description) || '',
        conditionMain: (rep.weather && rep.weather[0] && rep.weather[0].main) || '',
        tempMin: temps.length ? Math.min(...temps) : null,
        tempMax: temps.length ? Math.max(...temps) : null,
        severe: entries.some((e) => isSevere(e.weather && e.weather[0])),
      };
    });

    return {
      available: true,
      source: 'openweathermap',
      timezone: (data.city && data.city.timezone) != null ? data.city.timezone : 0,
      daily,
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
