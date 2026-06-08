const StoreSettings = require('../models/StoreSettings');
const logger = require('../utils/logger');

/**
 * Get store settings
 * GET /api/v1/settings
 */
const getSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      // Create settings with defaults if none exists
      settings = await StoreSettings.create({});
      logger.info('Initialized default store settings in database');
    }
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error(`Get settings error: ${error.message}`);
    next(error);
  }
};

/**
 * Update store settings
 * POST /api/v1/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    logger.info('Store settings updated successfully');
    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error(`Update settings error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings
};
