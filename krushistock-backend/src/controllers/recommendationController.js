const recommendationService = require('../services/recommendationService');
const logger = require('../utils/logger');

const getFarmerRecommendations = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const recommendations = await recommendationService.getFarmerRecommendations(farmerId);
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error(`Get farmer recommendations error: ${error.message}`);
    next(error);
  }
};

const getTrendingRecommendations = async (req, res, next) => {
  try {
    const trending = await recommendationService.getTrendingRecommendations();
    
    res.status(200).json({
      success: true,
      data: trending
    });
  } catch (error) {
    logger.error(`Get trending recommendations error: ${error.message}`);
    next(error);
  }
};

const getSeasonalRecommendations = async (req, res, next) => {
  try {
    const { season } = req.query;
    const recommendations = await recommendationService.getSeasonalRecommendations(season);
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error(`Get seasonal recommendations error: ${error.message}`);
    next(error);
  }
};

const getCropRecommendations = async (req, res, next) => {
  try {
    const { cropName } = req.params;
    const recommendations = await recommendationService.getCropRecommendations(cropName);
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error(`Get crop recommendations error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getFarmerRecommendations,
  getTrendingRecommendations,
  getSeasonalRecommendations,
  getCropRecommendations
};
