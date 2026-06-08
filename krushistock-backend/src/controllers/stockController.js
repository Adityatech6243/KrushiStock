const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const { broadcastStatsUpdate } = require('../services/socketService');
const { getStockMovements, recordAdjustmentMovement } = require('../services/stockMovementService');

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
    const numericQuantity = Number(quantity);

    if (!productId || !['add', 'subtract', 'set'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'A productId and a valid operation (add, subtract, or set) are required'
      });
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative number'
      });
    }

    let diff = 0;
    if (operation === 'add') {
      diff = numericQuantity;
    } else if (operation === 'subtract') {
      diff = -numericQuantity;
    } else {
      // set
      const currentStock = await Stock.findOne({ product: productId });
      const currentQty = currentStock ? currentStock.quantity : 0;
      diff = numericQuantity - currentQty;
    }

    if (diff === 0) {
      const stock = await Stock.findOne({ product: productId });
      return res.status(200).json({
        success: true,
        data: stock
      });
    }

    const { stock } = await recordAdjustmentMovement({
      productId,
      quantity: diff,
      type: 'adjustment',
      note: `Legacy Stock update (${operation})`,
      userId: req.user?.id
    });

    broadcastStatsUpdate();

    res.status(200).json({
      success: true,
      data: stock
    });
  } catch (error) {
    logger.error(`Update stock error: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getMovements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    
    const filters = {};
    if (req.query.productId) {
      filters.product = req.query.productId;
    }
    if (req.query.type) {
      filters.type = req.query.type;
    }

    const result = await getStockMovements(page, limit, filters);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Get movements error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const recordAdjustment = async (req, res, next) => {
  try {
    const { productId, quantity, type, note } = req.body;
    
    if (!productId || quantity === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: 'productId, quantity, and type are required'
      });
    }

    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid number'
      });
    }

    if (!['adjustment', 'disposal', 'correction'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be adjustment, disposal, or correction'
      });
    }

    const { stock, movement } = await recordAdjustmentMovement({
      productId,
      quantity: numericQuantity,
      type,
      note: note || 'Manual adjustment',
      userId: req.user?.id
    });

    broadcastStatsUpdate();

    res.status(200).json({
      success: true,
      data: {
        stock,
        movement
      }
    });
  } catch (error) {
    logger.error(`Record adjustment error: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllStock,
  getLowStock,
  updateStock,
  getMovements,
  recordAdjustment
};
