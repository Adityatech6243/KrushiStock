const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const getAllSales = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Sale.countDocuments();

    const sales = await Sale.find()
      .populate('customer', 'name phone village')
      .populate('items.product', 'name unit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: sales.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: sales
    });
  } catch (error) {
    logger.error(`Get all sales error: ${error.message}`);
    next(error);
  }
};

const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name phone village')
      .populate('items.product', 'name unit')
      .populate('createdBy', 'name');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    logger.error(`Get sale error: ${error.message}`);
    next(error);
  }
};

const createSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const saleData = {
      ...req.body,
      createdBy: req.user.id
    };

    const [sale] = await Sale.create([saleData], { session });

    for (const item of sale.items) {
      const stock = await Stock.findOneAndUpdate(
        { product: item.product, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );

      if (!stock) {
        throw new Error(`Insufficient stock or product not found for product ID: ${item.product}`);
      }

      logger.info(`Stock decreased for product: ${item.product} by ${item.quantity}`);
    }

    await session.commitTransaction();
    logger.info(`Sale created: ${sale.saleNumber}`);

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    await session.abortTransaction();
    
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error(`Create sale error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

const updateSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existingSale = await Sale.findById(req.params.id).session(session);

    if (!existingSale) {
      throw new Error('Sale not found');
    }

    // 1. Revert old stock atomically
    for (const oldItem of existingSale.items) {
      await Stock.findOneAndUpdate(
        { product: oldItem.product },
        { $inc: { quantity: oldItem.quantity } },
        { session }
      );
    }

    // 2. Perform update
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true, session }
    );

    // 3. Subtract new stock atomically
    if (sale.items) {
      for (const newItem of sale.items) {
        const stock = await Stock.findOneAndUpdate(
          { product: newItem.product, quantity: { $gte: newItem.quantity } },
          { $inc: { quantity: -newItem.quantity } },
          { session, new: true }
        );
        
        if (!stock) {
          throw new Error(`Insufficient stock for product ID: ${newItem.product}`);
        }
      }
    }

    await session.commitTransaction();
    logger.info(`Sale updated: ${sale.saleNumber}`);

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    await session.abortTransaction();
    
    if (error.message === 'Sale not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    logger.error(`Update sale error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

const deleteSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(req.params.id).session(session);

    if (!sale) {
      throw new Error('Sale not found');
    }

    // Revert stock atomically
    for (const item of sale.items) {
      await Stock.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantity: item.quantity } },
        { session }
      );
    }

    await sale.deleteOne({ session });

    await session.commitTransaction();
    logger.info(`Sale deleted: ${sale.saleNumber}`);
    
    res.status(200).json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.message === 'Sale not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error(`Delete sale error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

module.exports = {
  getAllSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
};
