const { GoogleGenAI } = require('@google/genai');
const Equipment = require('../models/Equipment');

// @desc    Recommend agricultural equipment using Gemini AI & real MongoDB inventory
// @route   POST /api/ai/recommend-equipment
// @access  Private
const recommendEquipment = async (req, res) => {
  try {
    const { prompt } = req.body;

    // 1. Input Validation
    if (!prompt || typeof prompt !== 'string' || !prompt.trim() || prompt.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid natural-language requirement prompt (at least 3 characters).',
      });
    }

    const cleanedPrompt = prompt.trim();

    // 2. Query MongoDB for ONLY available equipment
    const availableEquipment = await Equipment.find({ status: 'Available' })
      .select('_id name category description dailyRate location status')
      .lean();

    // 3. Handle Empty Inventory
    if (!availableEquipment || availableEquipment.length === 0) {
      return res.status(200).json({
        success: true,
        prompt: cleanedPrompt,
        summary: 'There is currently no available equipment in the inventory.',
        recommendations: [],
      });
    }

    // Map of valid available equipment IDs for post-AI grounding
    const availableMap = new Map();
    availableEquipment.forEach((item) => {
      availableMap.set(item._id.toString(), item);
    });

    // 4. Verify Gemini API Key configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({
        success: false,
        message: 'AI Equipment Recommendation service is currently unavailable. API key is not configured.',
      });
    }

    // 5. Construct System Instructions & Grounding Context for Gemini
    const systemInstruction = `You are an AI farming equipment recommendation assistant for an agricultural rental platform.

You must recommend equipment ONLY from the inventory provided below.

Do not invent machine names.
Do not invent equipment IDs.
Only return IDs that exactly exist in the provided inventory.
Only recommend equipment with status Available.

Analyze the farmer's natural-language requirement and consider:
- farming activity
- crop or land context if provided
- farm size
- equipment category
- budget
- location
- equipment description and capabilities
- daily rental price

Return a JSON object only, with no markdown and no explanatory text outside JSON.

Use this exact structure:

{
  "summary": "Short overall recommendation summary",
  "recommendations": [
    {
      "equipmentId": "VALID_DATABASE_ID",
      "matchScore": 95,
      "reasoning": "Short explanation of why this real equipment matches"
    }
  ]
}

Rules:
- Return a maximum of 3 recommendations.
- matchScore must be an integer from 0 to 100.
- If no suitable equipment exists, return:
  {
    "summary": "No suitable available equipment was found for this requirement.",
    "recommendations": []
  }`;

    const promptText = `${systemInstruction}

Farmer Requirement:
"${cleanedPrompt}"

Available Equipment Inventory (JSON):
${JSON.stringify(availableEquipment, null, 2)}`;

    // 6. Call Gemini SDK
    let rawResponseText = '';
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
        },
      });

      rawResponseText = response.text || '';
    } catch (aiError) {
      console.error('Gemini API call error:', aiError?.message || aiError);
      return res.status(502).json({
        success: false,
        message: 'Failed to communicate with AI recommendation engine.',
      });
    }

    // 7. Safe JSON Parsing of Gemini Response
    let parsedData = {};
    try {
      const cleanedJsonStr = rawResponseText.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(cleanedJsonStr);
    } catch (parseError) {
      console.error('Error parsing Gemini JSON response:', parseError);
      return res.status(502).json({
        success: false,
        message: 'Received an invalid response format from AI recommendation engine.',
      });
    }

    // 8. Grounding Validation & Safety Filtering
    const rawRecommendations = Array.isArray(parsedData.recommendations) ? parsedData.recommendations : [];
    const validatedRecommendations = [];
    const seenIds = new Set();

    for (const item of rawRecommendations) {
      if (!item || !item.equipmentId) continue;
      const targetId = String(item.equipmentId).trim();

      // Ensure equipment exists in our available MongoDB inventory and hasn't been duplicated
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

    // 9. Final Success Response
    return res.status(200).json({
      success: true,
      prompt: cleanedPrompt,
      summary: parsedData.summary || 'AI recommendations generated based on available fleet inventory.',
      recommendations: validatedRecommendations,
    });
  } catch (error) {
    console.error('Recommend equipment server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating equipment recommendations',
    });
  }
};

module.exports = {
  recommendEquipment,
};
