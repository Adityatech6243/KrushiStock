const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Supplier = require('../models/Supplier');
const logger = require('../utils/logger');

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

    // Set quantity
    productData.quantity = initialStock || 0;

    // Resolve supplierName if not provided
    if (!productData.supplierName && productData.supplier) {
      const supplier = await Supplier.findById(productData.supplier);
      if (supplier) {
        productData.supplierName = supplier.name;
      }
    }

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

    // Resolve supplierName if supplier changed and name not provided
    if (updateData.supplier && !updateData.supplierName) {
      const supplier = await Supplier.findById(updateData.supplier);
      if (supplier) {
        updateData.supplierName = supplier.name;
      }
    }

    // Handle price mapping
    if (updateData.sellingPrice && !updateData.price) {
      updateData.price = updateData.sellingPrice;
    } else if (updateData.price && !updateData.sellingPrice) {
      updateData.sellingPrice = updateData.price;
    }

    // If stock quantity is updated, keep it in sync with Stock collection
    if (updateData.stock !== undefined) {
      updateData.quantity = updateData.stock;
    } else if (updateData.quantity !== undefined) {
      updateData.stock = updateData.quantity;
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

    if (req.body.reorderLevel) {
      await Stock.findOneAndUpdate(
        { product: product._id },
        { lowStockLimit: req.body.reorderLevel }
      );
    }

    if (updateData.quantity !== undefined) {
      await Stock.findOneAndUpdate(
        { product: product._id },
        { quantity: updateData.quantity }
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
