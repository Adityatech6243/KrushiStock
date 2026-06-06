const inventoryService = require('../services/inventoryService');
const logger = require('../utils/logger');

/**
 * Helper to construct search/category query filters
 */
const buildFilters = (req) => {
  const filters = {};
  if (req.query.search) {
    // Basic sanitization and regex search for product name
    filters.name = { $regex: req.query.search.trim(), $options: 'i' };
  }
  if (req.query.category) {
    filters.category = req.query.category;
  }
  return filters;
};

/**
 * GET /api/inventory/near-expiry
 */
const getNearExpiry = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sortField = req.query.sortField || 'expiryDate';
    const sortOrder = req.query.sortOrder || 'asc';
    const filters = buildFilters(req);

    const result = await inventoryService.getNearExpiryProducts(page, limit, filters, sortField, sortOrder);

    res.status(200).json({
      success: true,
      count: result.data.length,
      pagination: result.pagination,
      data: result.data
    });
  } catch (error) {
    logger.error(`Get near expiry products controller error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/inventory/expired
 */
const getExpired = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sortField = req.query.sortField || 'expiryDate';
    const sortOrder = req.query.sortOrder || 'asc';
    const filters = buildFilters(req);

    const result = await inventoryService.getExpiredProducts(page, limit, filters, sortField, sortOrder);

    res.status(200).json({
      success: true,
      count: result.data.length,
      pagination: result.pagination,
      data: result.data
    });
  } catch (error) {
    logger.error(`Get expired products controller error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/inventory/dead-stock
 */
const getDeadStock = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sortField = req.query.sortField || 'lastSoldDate';
    const sortOrder = req.query.sortOrder || 'asc'; // asc = oldest first
    const filters = buildFilters(req);

    const result = await inventoryService.getDeadStockProducts(page, limit, filters, sortField, sortOrder);

    res.status(200).json({
      success: true,
      count: result.data.length,
      pagination: result.pagination,
      data: result.data
    });
  } catch (error) {
    logger.error(`Get dead stock products controller error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/inventory/waste-analytics
 */
const getWasteAnalytics = async (req, res, next) => {
  try {
    const analytics = await inventoryService.getWasteAnalytics();

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error(`Get waste analytics controller error: ${error.message}`);
    next(error);
  }
};

/**
 * PUT /api/inventory/update-stock-status
 * Manually trigger stock status update
 */
const updateStockStatus = async (req, res, next) => {
  try {
    const result = await inventoryService.updateAllStockStatuses();

    res.status(200).json({
      success: true,
      message: 'Product stock statuses updated successfully.',
      data: result
    });
  } catch (error) {
    logger.error(`Update stock status controller error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getNearExpiry,
  getExpired,
  getDeadStock,
  getWasteAnalytics,
  updateStockStatus
};
