const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Supplier = require('../models/Supplier');
const logger = require('../utils/logger');
const { broadcastStatsUpdate } = require('../services/socketService');
const { getStockMap } = require('../services/stockService');
const { mutateStock } = require('../services/stockMovementService');

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

const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const query = { deletedAt: null };

    if (req.query.category) {
      query.category = req.query.category;
    }

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const productIds = products.map(p => p._id);
    const stockMap = await getStockMap(productIds);

    const productsWithStock = products.map((product) => {
      const stockInfo = stockMap.get(product._id.toString()) || { quantity: 0, batches: [] };
      return {
        ...product.toObject(),
        stock: stockInfo.quantity,
        batches: stockInfo.batches
      };
    });

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: productsWithStock
    });
  } catch (error) {
    logger.error(`Get all products error: ${error.message}`);
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, deletedAt: null })
      .populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const stock = await Stock.findOne({ product: product._id });

    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        stock: stock ? stock.quantity : 0,
        batches: stock ? (stock.batches || []) : []
      }
    });
  } catch (error) {
    logger.error(`Get product error: ${error.message}`);
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { stock: initialStock, ...productData } = req.body;
    const stockQuantity = initialStock === undefined ? 0 : Number(initialStock);

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative number'
      });
    }
    if (req.user) productData.createdBy = req.user.id;

    // Set default price mapping for backward compatibility
    if (productData.sellingPrice && !productData.price) {
      productData.price = productData.sellingPrice;
    } else if (productData.price && !productData.sellingPrice) {
      productData.sellingPrice = productData.price;
    }

    // Calculate stockStatus
    productData.stockStatus = calculateStockStatus(
      productData.expiryDate,
      productData.lastSoldDate,
      productData.createdAt || new Date()
    );

    const product = await Product.create(productData);

    if (stockQuantity > 0) {
      await mutateStock({
        productId: product._id,
        quantity: stockQuantity,
        type: 'correction',
        referenceModel: 'Adjustment',
        referenceId: product._id,
        note: 'Initial stock entry',
        userId: req.user?.id
      });
    } else {
      await Stock.create({
        product: product._id,
        quantity: 0,
        lowStockLimit: req.body.reorderLevel ?? 10
      });
    }

    logger.info(`Product created: ${product.name}`);

    broadcastStatsUpdate();

    res.status(201).json({
      success: true,
      data: {
        ...product.toObject(),
        stock: stockQuantity
      }
    });
  } catch (error) {
    logger.error(`Create product error: ${error.message}`);
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const {
      stock: requestedStock,
      quantity: legacyQuantity,
      ...updateData
    } = req.body;
    const requestedQuantity = requestedStock !== undefined ? requestedStock : legacyQuantity;
    const stockQuantity = requestedQuantity === undefined ? undefined : Number(requestedQuantity);

    if (stockQuantity !== undefined && (!Number.isFinite(stockQuantity) || stockQuantity < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative number'
      });
    }

    if (req.user) updateData.updatedBy = req.user.id;

    // Handle price mapping
    if (updateData.sellingPrice && !updateData.price) {
      updateData.price = updateData.sellingPrice;
    } else if (updateData.price && !updateData.sellingPrice) {
      updateData.sellingPrice = updateData.price;
    }

    // Before updating, we need to calculate the new status.
    const currentProduct = await Product.findOne({ _id: req.params.id, deletedAt: null });
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const expiryDate = updateData.expiryDate !== undefined ? updateData.expiryDate : currentProduct.expiryDate;
    const lastSoldDate = updateData.lastSoldDate !== undefined ? updateData.lastSoldDate : currentProduct.lastSoldDate;
    const createdAt = currentProduct.createdAt;

    updateData.stockStatus = calculateStockStatus(expiryDate, lastSoldDate, createdAt);

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    );

    if (req.body.reorderLevel !== undefined) {
      await Stock.findOneAndUpdate(
        { product: product._id },
        { $set: { lowStockLimit: req.body.reorderLevel } },
        { upsert: true, runValidators: true }
      );
    }

    if (stockQuantity !== undefined) {
      const currentStock = await Stock.findOne({ product: product._id });
      const currentQty = currentStock ? currentStock.quantity : 0;
      const diff = stockQuantity - currentQty;

      if (diff !== 0) {
        await mutateStock({
          productId: product._id,
          quantity: diff,
          type: 'correction',
          referenceModel: 'Adjustment',
          referenceId: product._id,
          note: 'Stock level correction',
          userId: req.user?.id
        });
      }
    }

    logger.info(`Product updated: ${product.name}`);

    broadcastStatsUpdate();

    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        stock: stockQuantity !== undefined
          ? stockQuantity
          : await Stock.findOne({ product: product._id }).then((stock) => stock?.quantity || 0)
      }
    });
  } catch (error) {
    logger.error(`Update product error: ${error.message}`);
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = false;
    product.deletedAt = new Date();
    if (req.user) product.updatedBy = req.user.id;
    await product.save();

    // Clean up corresponding Stock document to avoid orphan stock
    await Stock.deleteOne({ product: product._id });

    logger.info(`Product deleted: ${product.name}`);

    broadcastStatsUpdate();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete product error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
