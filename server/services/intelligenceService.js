/**
 * Unified Intelligence Layer.
 *
 * One facade for the platform's four intelligent features:
 *   1. AI equipment recommendation      (Gemini or deterministic fallback)
 *   2. Multilingual farmer assistant    (Gemini or deterministic fallback)
 *   3. Weather-aware smart scheduling   (constraint engine, always on)
 *   4. Predictive maintenance risk      (explainable scoring, always on)
 *
 * It also reports the honest runtime capability of each feature
 * (see getCapabilities) so the frontend and the conference documentation can
 * show exactly which mode is active.
 */

const {
  isGeminiConfigured,
  isWeatherConfigured,
  getGeminiModel,
  SUPPORTED_LANGUAGES,
  SLOT_CLASSIFICATIONS,
} = require('../config/intelligence');

const { generateContent, extractJsonText } = require('./aiProvider');
const { RECOMMENDATION_SYSTEM_PROMPT } = require('./prompts');
const { ruleBasedRecommend } = require('./recommendationEngine');

const { runAssistantReply } = require('./farmerAssistant');
const { buildFallbackReply } = require('./farmerAssistant');

/**
 * Grounded recommendation pipeline. Returns a uniform shape regardless of mode:
 *   { mode, summary, recommendations: [{ equipment, matchScore, reasoning }] }
 *
 * - With Gemini: the model's output is re-validated against the real available
 *   inventory (only real IDs, de-duplicated, max 3, score clamped 0-100).
 * - Without Gemini (or on model failure / malformed JSON): falls back to the
 *   deterministic rule engine over the same inventory. It never hallucinates.
 */
async function runRecommendation({ prompt, availableEquipment }) {
  const makeFallback = () => {
    const result = ruleBasedRecommend(prompt, availableEquipment);
    return { mode: 'rule-based', ...result };
  };

  if (!isGeminiConfigured()) {
    return makeFallback();
  }

  const promptText = `${RECOMMENDATION_SYSTEM_PROMPT}

Farmer Requirement:
"${prompt}"

Available Equipment Inventory (JSON):
${JSON.stringify(availableEquipment, null, 2)}`;

  const aiResult = await generateContent({ contents: promptText, responseJson: true });
  if (!aiResult.ok) {
    console.error('AI recommendation failed, using rule engine:', aiResult.code, aiResult.message);
    return makeFallback();
  }

  let parsedData = {};
  try {
    parsedData = JSON.parse(extractJsonText(aiResult.text));
  } catch (parseError) {
    console.error('Error parsing Gemini JSON response, using rule engine:', parseError);
    return makeFallback();
  }

  const availableMap = new Map();
  availableEquipment.forEach((item) => availableMap.set(item._id.toString(), item));

  const rawRecommendations = Array.isArray(parsedData.recommendations) ? parsedData.recommendations : [];
  const validatedRecommendations = [];
  const seenIds = new Set();

  for (const item of rawRecommendations) {
    if (!item || !item.equipmentId) continue;
    const targetId = String(item.equipmentId).trim();

    if (availableMap.has(targetId) && !seenIds.has(targetId)) {
      seenIds.add(targetId);
      const realEquipment = availableMap.get(targetId);
      const parsedScore = Number(item.matchScore);
      const matchScore = isNaN(parsedScore) ? 80 : Math.min(100, Math.max(0, Math.round(parsedScore)));

      validatedRecommendations.push({
        equipment: realEquipment,
        matchScore,
        reasoning: item.reasoning || `Suitable machine for ${realEquipment.category}.`,
      });

      if (validatedRecommendations.length >= 3) break;
    }
  }

  return {
    mode: 'ai',
    summary: parsedData.summary || 'AI recommendations generated based on available fleet inventory.',
    recommendations: validatedRecommendations,
    detectedBudget: null,
  };
}

/**
 * Honest capability report. Each feature lists whether it is live AI,
 * deterministic, or disabled, so no misleading claims are possible.
 */
function getCapabilities() {
  const geminiConfigured = isGeminiConfigured();
  const weatherConfigured = isWeatherConfigured();

  return {
    generatedAt: new Date().toISOString(),
    recommendation: {
      available: true,
      mode: geminiConfigured ? 'ai' : 'rule-based',
      provider: geminiConfigured ? getGeminiModel() : 'deterministic',
    },
    assistant: {
      available: true,
      mode: geminiConfigured ? 'ai' : 'rule-based',
      languages: SUPPORTED_LANGUAGES,
    },
    scheduling: {
      available: true,
      mode: 'deterministic', // constraint-based engine, always on
      weather: weatherConfigured ? 'live' : 'unavailable',
      classifications: SLOT_CLASSIFICATIONS,
    },
    maintenance: {
      available: true,
      mode: 'deterministic', // explainable risk scoring
    },
  };
}

module.exports = {
  runRecommendation,
  getCapabilities,
  runAssistantReply,
  buildFallbackReply,
};