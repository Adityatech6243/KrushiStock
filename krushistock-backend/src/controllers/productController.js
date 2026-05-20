const Product = require('../models/Product');
const Stock = require('../models/Stock');
const logger = require('../utils/logger');

const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments({ deletedAt: null });

    const products = await Product.find({ deletedAt: null })
      .populate('category', 'name')
      .populate('supplier', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const productIds = products.map(p => p._id);
    const stocks = await Stock.find({ product: { $in: productIds } });
    
    const stockMap = {};
    stocks.forEach(stock => {
      stockMap[stock.product.toString()] = stock.quantity;
    });

    const productsWithStock = products.map((product) => {
      return {
        ...product.toObject(),
        stock: stockMap[product._id.toString()] || 0
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
      .populate('category', 'name')
      .populate('supplier', 'name phone');

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
        stock: stock ? stock.quantity : 0
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
    
    if (req.user) productData.createdBy = req.user.id;

    const product = await Product.create(productData);

    await Stock.create({
      product: product._id,
      quantity: initialStock || 0,
      lowStockLimit: req.body.reorderLevel || 10
    });

    logger.info(`Product created: ${product.name}`);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Create product error: ${error.message}`);
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.user) updateData.updatedBy = req.user.id;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (req.body.reorderLevel) {
      await Stock.findOneAndUpdate(
        { product: product._id },
        { lowStockLimit: req.body.reorderLevel }
      );
    }

    logger.info(`Product updated: ${product.name}`);

    res.status(200).json({
      success: true,
      data: product
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

    logger.info(`Product deleted: ${product.name}`);

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
