const Stock = require('../models/Stock');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const getAllStock = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const activeProducts = await Product.find({ deletedAt: null }).select('_id');
    const activeProductIds = activeProducts.map(p => p._id);
    const query = { product: { $in: activeProductIds } };

    const globalStats = await Stock.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      {
        $unwind: '$productDoc'
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$productDoc.price'] } },
          totalItems: { $sum: 1 },
          lowStockItems: {
            $sum: { $cond: [{ $lte: ['$quantity', '$lowStockLimit'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = globalStats[0] || { totalValue: 0, totalItems: 0, lowStockItems: 0 };
    const total = stats.totalItems;

    const stocks = await Stock.find(query)
      .populate({
        path: 'product',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'supplier', select: 'name' }
        ]
      })
      .sort({ lastUpdated: -1 })
      .skip(skip)
      .limit(limit);

    const stockItems = stocks.map(stock => ({
      _id: stock._id,
      product: stock.product,
      quantity: stock.quantity,
      unit: stock.product?.unit,
      price: stock.product?.price,
      value: stock.quantity * (stock.product?.price || 0),
      reorderLevel: stock.lowStockLimit,
      lastUpdated: stock.lastUpdated
    }));

    res.status(200).json({
      success: true,
      count: stocks.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: {
        items: stockItems,
        summary: stats
      }
    });
  } catch (error) {
    logger.error(`Get all stock error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLowStock = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const activeProducts = await Product.find({ deletedAt: null }).select('_id');
    const activeProductIds = activeProducts.map(p => p._id);

    const query = { 
      $expr: { $lte: ['$quantity', '$lowStockLimit'] },
      product: { $in: activeProductIds }
    };
    
    const total = await Stock.countDocuments(query);

    const stocks = await Stock.find(query)
      .populate({
        path: 'product',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'supplier', select: 'name phone' }
        ]
      })
      .skip(skip)
      .limit(limit);

    const lowStockItems = stocks.map(stock => ({
      _id: stock._id,
      product: stock.product,
      currentStock: stock.quantity,
      reorderLevel: stock.lowStockLimit,
      unit: stock.product?.unit,
      supplier: stock.product?.supplier
    }));

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: lowStockItems
    });
  } catch (error) {
    logger.error(`Get low stock error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateStock = async (req, res) => {
  try {
    const { productId, quantity, operation } = req.body;

    let updateQuery = {};
    let findQuery = { product: productId };

    if (operation === 'add') {
      updateQuery = { $inc: { quantity: quantity } };
    } else if (operation === 'subtract') {
      findQuery.quantity = { $gte: quantity }; // Prevent negative stock atomically
      updateQuery = { $inc: { quantity: -quantity } };
    } else if (operation === 'set') {
      updateQuery = { $set: { quantity: quantity } };
    }

    const stock = await Stock.findOneAndUpdate(
      findQuery,
      updateQuery,
      { new: true, upsert: operation !== 'subtract' && operation !== 'set' }
    );

    if (!stock) {
      if (operation === 'subtract') {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock or product not found'
        });
      }
    }

    // Set lowStockLimit if newly created
    if (stock.lowStockLimit === undefined) {
      stock.lowStockLimit = 10;
      await stock.save();
    }

    logger.info(`Stock updated atomically for product: ${productId}`);

    res.status(200).json({
      success: true,
      data: stock
    });
  } catch (error) {
    logger.error(`Update stock error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllStock,
  getLowStock,
  updateStock
};
