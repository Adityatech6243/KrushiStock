const Purchase = require('../models/Purchase');
const Stock = require('../models/Stock');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const getAllPurchases = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Purchase.countDocuments();

    const purchases = await Purchase.find()
      .populate('supplier', 'name phone')
      .populate('items.product', 'name unit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: purchases.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: purchases
    });
  } catch (error) {
    logger.error(`Get all purchases error: ${error.message}`);
    next(error);
  }
};

const getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier', 'name phone address')
      .populate('items.product', 'name unit')
      .populate('createdBy', 'name');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    logger.error(`Get purchase error: ${error.message}`);
    next(error);
  }
};

const createPurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const purchaseData = {
      ...req.body,
      createdBy: req.user.id
    };

    const [purchase] = await Purchase.create([purchaseData], { session });

    for (const item of purchase.items) {
      const stock = await Stock.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantity: item.quantity } },
        { new: true, session }
      );

      if (!stock) {
        // If stock document doesn't exist, create it
        await Stock.create([{
          product: item.product,
          quantity: item.quantity,
          lowStockLimit: 10
        }], { session });
      }

      logger.info(`Stock increased for product: ${item.product} by ${item.quantity}`);
    }

    await session.commitTransaction();
    logger.info(`Purchase created: ${purchase.purchaseNumber}`);

    res.status(201).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Create purchase error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

const updatePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existingPurchase = await Purchase.findById(req.params.id).session(session);

    if (!existingPurchase) {
      throw new Error('Purchase not found');
    }

    // Revert old stock
    for (const oldItem of existingPurchase.items) {
      await Stock.findOneAndUpdate(
        { product: oldItem.product },
        { $inc: { quantity: -oldItem.quantity } },
        { session }
      );
    }

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true, session }
    );

    // Apply new stock
    if (purchase.items) {
      for (const newItem of purchase.items) {
        const stock = await Stock.findOneAndUpdate(
          { product: newItem.product },
          { $inc: { quantity: newItem.quantity } },
          { session }
        );

        if (!stock) {
          await Stock.create([{
            product: newItem.product,
            quantity: newItem.quantity,
            lowStockLimit: 10
          }], { session });
        }
      }
    }

    await session.commitTransaction();
    logger.info(`Purchase updated: ${purchase.purchaseNumber}`);

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.message === 'Purchase not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error(`Update purchase error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

const deletePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const purchase = await Purchase.findById(req.params.id).session(session);

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // Revert stock
    for (const item of purchase.items) {
      await Stock.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }

    await purchase.deleteOne({ session });

    await session.commitTransaction();
    logger.info(`Purchase deleted: ${purchase.purchaseNumber}`);

    res.status(200).json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.message === 'Purchase not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error(`Delete purchase error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

module.exports = {
  getAllPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase
};
