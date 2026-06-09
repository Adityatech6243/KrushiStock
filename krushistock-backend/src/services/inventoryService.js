const Product = require('../models/Product');
const logger = require('../utils/logger');
const { getStockMap } = require('./stockService');

/**
 * Helper to calculate stock status for a single product
 */
const calculateStockStatus = (expiryDate, lastSoldDate, createdAt) => {
  const today = new Date();
  
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    if (expiry <= today) {
      return 'Expired';
    }
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      return 'Near Expiry';
    }
  }

  const baseDate = lastSoldDate ? new Date(lastSoldDate) : new Date(createdAt || today);
  const diffTimeSales = today - baseDate;
  const diffDaysSales = Math.ceil(diffTimeSales / (1000 * 60 * 60 * 24));
  if (diffDaysSales >= 90) {
    return 'Dead Stock';
  }

  return 'Fresh';
};

/**
 * Recalculate stock status for all active products
 */
const updateAllStockStatuses = async () => {
  try {
    const products = await Product.find({ deletedAt: null });
    let updatedCount = 0;
    const counts = {
      Fresh: 0,
      'Near Expiry': 0,
      Expired: 0,
      'Dead Stock': 0
    };

    for (const product of products) {
      const calculatedStatus = calculateStockStatus(
        product.expiryDate,
        product.lastSoldDate,
        product.createdAt
      );

      counts[calculatedStatus]++;

      if (product.stockStatus !== calculatedStatus) {
        product.stockStatus = calculatedStatus;
        await product.save();
        updatedCount++;
      }
    }

    logger.info(`Stock statuses updated. Total: ${products.length}, Changes: ${updatedCount}`);
    return {
      success: true,
      totalProducts: products.length,
      updatedCount,
      statusCounts: counts
    };
  } catch (error) {
    logger.error(`Error updating stock statuses: ${error.message}`);
    throw error;
  }
};

/**
 * Get Near Expiry Products with Discount Recommendations
 */
const getNearExpiryProducts = async (page = 1, limit = 10, filters = {}, sortField = 'expiryDate', sortOrder = 'asc') => {
  try {
    const skip = (page - 1) * limit;
    const today = new Date();

    // Query filters
    const query = {
      stockStatus: 'Near Expiry',
      deletedAt: null,
      ...filters
    };

    const total = await Product.countDocuments(query);
    const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const stockMap = await getStockMap(products.map((product) => product._id));

    // Apply Discount Recommendation Rules
    const data = products.map(product => {
      const p = product.toObject();
      p.quantity = stockMap.get(product._id.toString())?.quantity || 0;
      let suggestedDiscount = 0;

      if (p.expiryDate) {
        const expiry = new Date(p.expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          suggestedDiscount = 40; // 7 days or less remaining -> 40% discount
        } else if (diffDays <= 15) {
          suggestedDiscount = 20; // 15 days or less remaining -> 20% discount
        } else if (diffDays <= 30) {
          suggestedDiscount = 10; // 30 days or less remaining -> 10% discount
        }
      }

      const discountedPrice = p.sellingPrice ? Number((p.sellingPrice * (1 - suggestedDiscount / 100)).toFixed(2)) : 0;
      const potentialLoss = p.quantity ? Number(((p.sellingPrice - discountedPrice) * p.quantity).toFixed(2)) : 0;

      // Smart recommendation message
      let recommendation = `Fresh inventory. No action needed.`;
      if (suggestedDiscount > 0) {
        const remainingDays = p.expiryDate ? Math.ceil((new Date(p.expiryDate) - today) / (1000 * 60 * 60 * 24)) : 0;
        recommendation = `Sell this ${p.name} within ${remainingDays} days. Apply ${suggestedDiscount}% discount to clear stock.`;
      }

      return {
        ...p,
        suggestedDiscount,
        discountedPrice,
        potentialLoss,
        recommendation
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Error in getNearExpiryProducts service: ${error.message}`);
    throw error;
  }
};

/**
 * Get Expired Products
 */
const getExpiredProducts = async (page = 1, limit = 10, filters = {}, sortField = 'expiryDate', sortOrder = 'asc') => {
  try {
    const skip = (page - 1) * limit;

    const query = {
      stockStatus: 'Expired',
      deletedAt: null,
      ...filters
    };

    const total = await Product.countDocuments(query);
    const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const stockMap = await getStockMap(products.map((product) => product._id));

    const data = products.map(product => {
      const p = product.toObject();
      p.quantity = stockMap.get(product._id.toString())?.quantity || 0;
      const wasteValue = Number((p.purchasePrice * p.quantity).toFixed(2));
      return {
        ...p,
        wasteValue,
        recommendation: `Expired stock detected. Remove ${p.name} from active inventory immediately to prevent hazards.`
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Error in getExpiredProducts service: ${error.message}`);
    throw error;
  }
};

/**
 * Get Dead Stock Products
 */
const getDeadStockProducts = async (page = 1, limit = 10, filters = {}, sortField = 'lastSoldDate', sortOrder = 'asc') => {
  try {
    const skip = (page - 1) * limit;
    const today = new Date();

    const query = {
      stockStatus: 'Dead Stock',
      deletedAt: null,
      ...filters
    };

    const total = await Product.countDocuments(query);
    const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const stockMap = await getStockMap(products.map((product) => product._id));

    const data = products.map(product => {
      const p = product.toObject();
      p.quantity = stockMap.get(product._id.toString())?.quantity || 0;
      const baseDate = p.lastSoldDate ? new Date(p.lastSoldDate) : new Date(p.createdAt);
      const diffTime = today - baseDate;
      const daysInactive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const deadStockValue = Number((p.purchasePrice * p.quantity).toFixed(2));

      return {
        ...p,
        daysInactive,
        deadStockValue,
        recommendation: `Dead stock detected for ${daysInactive} days. Bundling with fast-moving items or listing with a 15% discount is advised.`
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Error in getDeadStockProducts service: ${error.message}`);
    throw error;
  }
};

/**
 * Get Waste & Expiry Analytics
 */
const getWasteAnalytics = async () => {
  try {
    const activeProducts = await Product.find({ deletedAt: null });
    const stockMap = await getStockMap(activeProducts.map((product) => product._id));

    // Summary counters
    let nearExpiryCount = 0;
    let expiredCount = 0;
    let deadStockCount = 0;
    let freshCount = 0;

    let nearExpiryValue = 0;
    let expiredValue = 0;
    let deadStockValue = 0;
    let totalInventoryValue = 0;

    // Categorized breakdown
    const categoryBreakdown = {};

    // Monthly expiration predictions
    const monthlyExpirations = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // AI/Smart recommendation alerts log
    const smartAlerts = [];
    const today = new Date();

    activeProducts.forEach(product => {
      const status = product.stockStatus;
      const qty = stockMap.get(product._id.toString())?.quantity || 0;
      const cost = product.purchasePrice || 0;
      const value = qty * cost;
      totalInventoryValue += value;

      // Classify counts & values
      if (status === 'Near Expiry') {
        nearExpiryCount++;
        nearExpiryValue += value;
        
        // Smart alert
        if (product.expiryDate) {
          const remainingDays = Math.ceil((new Date(product.expiryDate) - today) / (1000 * 60 * 60 * 24));
          smartAlerts.push({
            type: 'warning',
            message: `Sell ${product.name} (Batch: ${product.batchNumber || 'N/A'}) within ${remainingDays} days.`,
            action: 'Apply discount to clear stock.'
          });
        }
      } else if (status === 'Expired') {
        expiredCount++;
        expiredValue += value;
        
        // Smart alert
        smartAlerts.push({
          type: 'danger',
          message: `${product.name} has EXPIRED. Potential loss: ₹${value.toFixed(2)}.`,
          action: 'Dispose and record waste immediately.'
        });
      } else if (status === 'Dead Stock') {
        deadStockCount++;
        deadStockValue += value;

        // Smart alert
        const baseDate = product.lastSoldDate ? new Date(product.lastSoldDate) : new Date(product.createdAt);
        const daysInactive = Math.ceil((today - baseDate) / (1000 * 60 * 60 * 24));
        smartAlerts.push({
          type: 'info',
          message: `Dead stock detected for ${product.name} (${daysInactive} days inactive). Value locked: ₹${value.toFixed(2)}.`,
          action: 'Bundle or run clearing promotions.'
        });
      } else {
        freshCount++;
      }

      // Group by Category
      const catId = product.category ? product.category.toString() : 'Uncategorized';
      if (!categoryBreakdown[catId]) {
        categoryBreakdown[catId] = {
          fresh: 0,
          nearExpiry: 0,
          expired: 0,
          deadStock: 0,
          totalValue: 0
        };
      }
      categoryBreakdown[catId].totalValue += value;
      if (status === 'Near Expiry') categoryBreakdown[catId].nearExpiry++;
      else if (status === 'Expired') categoryBreakdown[catId].expired++;
      else if (status === 'Dead Stock') categoryBreakdown[catId].deadStock++;
      else categoryBreakdown[catId].fresh++;

      // Monthly expiration mapping (looking at upcoming year)
      if (product.expiryDate && status !== 'Expired') {
        const expDate = new Date(product.expiryDate);
        if (expDate >= today && expDate.getFullYear() === today.getFullYear()) {
          const monthIndex = expDate.getMonth();
          const monthLabel = months[monthIndex];
          if (!monthlyExpirations[monthLabel]) {
            monthlyExpirations[monthLabel] = { count: 0, value: 0 };
          }
          monthlyExpirations[monthLabel].count++;
          monthlyExpirations[monthLabel].value += value;
        }
      }
    });

    // Populate category names for breakdown
    const categoryDataBreakdown = [];
    const CategoryModel = require('../models/Category');
    const categories = await CategoryModel.find({ deletedAt: null });
    const categoryMap = {};
    categories.forEach(c => {
      categoryMap[c._id.toString()] = c.name;
    });

    Object.keys(categoryBreakdown).forEach(key => {
      categoryDataBreakdown.push({
        categoryName: categoryMap[key] || 'Uncategorized',
        ...categoryBreakdown[key]
      });
    });

    // Format monthly expirations as sorted array
    const monthlyData = months.map(m => ({
      month: m,
      count: monthlyExpirations[m]?.count || 0,
      value: Number((monthlyExpirations[m]?.value || 0).toFixed(2))
    }));

    return {
      summary: {
        totalProducts: activeProducts.length,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        nearExpiry: { count: nearExpiryCount, value: Number(nearExpiryValue.toFixed(2)) },
        expired: { count: expiredCount, value: Number(expiredValue.toFixed(2)) },
        deadStock: { count: deadStockCount, value: Number(deadStockValue.toFixed(2)) },
        fresh: { count: freshCount }
      },
      categoryBreakdown: categoryDataBreakdown,
      monthlyExpirations: monthlyData,
      smartAlerts: smartAlerts.slice(0, 10) // Limit to top 10 alerts
    };
  } catch (error) {
    logger.error(`Error in getWasteAnalytics service: ${error.message}`);
    throw error;
  }
};

module.exports = {
  calculateStockStatus,
  updateAllStockStatuses,
  getNearExpiryProducts,
  getExpiredProducts,
  getDeadStockProducts,
  getWasteAnalytics
};
