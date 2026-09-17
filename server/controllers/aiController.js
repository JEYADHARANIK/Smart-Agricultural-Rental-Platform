const Equipment = require('../models/Equipment');
const { runRecommendation, getCapabilities } = require('../services/intelligenceService');

const recommendEquipment = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim() || prompt.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid natural-language requirement prompt (at least 3 characters).',
      });
    }

    const cleanedPrompt = prompt.trim();

    const availableEquipment = await Equipment.find({ status: 'Available' })
      .select('_id name category description dailyRate location status')
      .limit(50)
      .lean();

    if (!availableEquipment || availableEquipment.length === 0) {
      return res.status(200).json({
        success: true,
        prompt: cleanedPrompt,
        mode: 'rule-based',
        summary: 'There is currently no available equipment in the inventory.',
        recommendations: [],
      });
    }

    const result = await runRecommendation({ prompt: cleanedPrompt, availableEquipment });

    return res.status(200).json({
      success: true,
      prompt: cleanedPrompt,
      mode: result.mode,
      summary: result.summary,
      recommendations: result.recommendations,
    });
  } catch (error) {
    console.error('Recommend equipment server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating equipment recommendations',
    });
  }
};

const getCapabilitiesController = async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      capabilities: getCapabilities(),
    });
  } catch (error) {
    console.error('Capabilities error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error reading intelligence capabilities',
    });
  }
};

module.exports = {
  recommendEquipment,
  getCapabilitiesController,
};