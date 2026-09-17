/**
 * Generative-AI provider wrapper.
 *
 * All Gemini calls in the platform go through this module so that:
 *  - the "is the API key actually configured?" check is centralised,
 *  - failures are classified (NOT_CONFIGURED / API_ERROR) instead of being
 *    mixed with business logic,
 *  - JSON extraction from model output is consistent.
 *
 * It deliberately does NOT invent data: the caller is responsible for
 * grounding/validating model output against the real database.
 */

const { GoogleGenAI } = require('@google/genai');
const {
  isGeminiConfigured,
  getGeminiModel,
} = require('../config/intelligence');

/**
 * Strip markdown code fences that models sometimes add around JSON.
 */
function extractJsonText(text) {
  return String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

/**
 * Run a Gemini content generation request.
 *
 * @param {Object} opts
 * @param {string} opts.contents   Full prompt (system instructions + user context).
 * @param {string} [opts.model]    Model name; defaults to GEMINI_MODEL env.
 * @param {boolean} [opts.responseJson] Request JSON mime type from the model.
 * @returns {Promise<{ok: boolean, text: string, code?: string, message?: string}>}
 *  - { ok: true, text }      on success
 *  - { ok: false, code: 'NOT_CONFIGURED' } when no usable API key
 *  - { ok: false, code: 'API_ERROR', message } on provider failure
 */
async function generateContent({ contents, model, responseJson }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!isGeminiConfigured()) {
    return { ok: false, code: 'NOT_CONFIGURED', text: '' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const config = {};
    if (responseJson) {
      config.responseMimeType = 'application/json';
    }

    const response = await ai.models.generateContent({
      model: model || getGeminiModel(),
      contents: contents,
      config,
    });

    return { ok: true, text: (response && response.text) || '' };
  } catch (error) {
    console.error('Gemini API call error:', error?.message || error);
    return { ok: false, code: 'API_ERROR', text: '', message: error?.message || 'Gemini API error' };
  }
}

module.exports = {
  generateContent,
  extractJsonText,
};