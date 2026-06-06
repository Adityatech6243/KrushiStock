const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const {
  findSaleForInvoice,
  canDownloadInvoice,
  buildSaleInvoicePayload,
  ensureSaleInvoicePdf
} = require('../services/saleInvoiceService');

const getSeasonFromDate = (date) => {
  const d = date ? new Date(date) : new Date();
  const month = d.getMonth(); // 0-11
  // June to Sept (5 to 8) -> Monsoon
  // Oct to Jan (9, 10, 11, 0) -> Winter
  // Feb to May (1 to 4) -> Summer
  if (month >= 5 && month <= 8) {
    return 'Monsoon';
  } else if (month >= 9 || month === 0) {
    return 'Winter';
  } else {
    return 'Summer';
  }
};

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

    // Sync customer and farmerId
    if (saleData.customer && !saleData.farmerId) saleData.farmerId = saleData.customer;
    if (saleData.farmerId && !saleData.customer) saleData.customer = saleData.farmerId;

    // Infer season if not present
    if (!saleData.season) {
      saleData.season = getSeasonFromDate(saleData.saleDate);
    }

    // Infer cropType if not present but customer is present
    if (!saleData.cropType && saleData.customer) {
      const farmer = await Farmer.findById(saleData.customer).session(session);
      if (farmer && farmer.cropTypes && farmer.cropTypes.length > 0) {
        saleData.cropType = farmer.cropTypes[0];
      }
    }

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

      // Keep Product collection's quantity and lastSoldDate in sync
      await Product.findOneAndUpdate(
        { _id: item.product },
        { 
          $inc: { quantity: -item.quantity },
          lastSoldDate: new Date()
        },
        { session }
      );

      logger.info(`Stock decreased for product: ${item.product} by ${item.quantity}`);
    }

    // Automatically add products to the Farmer's purchaseHistory and preferredProducts
    if (sale.customer) {
      const productIds = sale.items.map(item => item.product);
      await Farmer.findByIdAndUpdate(
        sale.customer,
        {
          $addToSet: {
            purchaseHistory: { $each: productIds },
            preferredProducts: { $each: productIds }
          }
        },
        { session }
      );
    }

    await session.commitTransaction();
    logger.info(`Sale created: ${sale.saleNumber}`);

    // Asynchronously send WhatsApp invoice PDF in the background if requested
    if (req.body.sendWhatsApp) {
      const whatsAppService = require('../services/whatsAppService');
      whatsAppService.getSettings().then(async (settings) => {
        if (settings) {
          // Send invoice PDF automatically
          try {
            whatsAppService.sendInvoicePdf(sale._id);
          } catch (e) {
            logger.error(`Error sending invoice PDF WhatsApp: ${e.message}`);
          }
        }
      }).catch(err => {
        logger.error(`Error in WhatsApp billing post-save hooks: ${err.message}`);
      });
    }

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

    // Sync customer and farmerId in req.body
    if (req.body.customer && !req.body.farmerId) req.body.farmerId = req.body.customer;
    if (req.body.farmerId && !req.body.customer) req.body.customer = req.body.farmerId;

    if (req.body.saleDate && !req.body.season) {
      req.body.season = getSeasonFromDate(req.body.saleDate);
    }

    // 1. Revert old stock atomically
    for (const oldItem of existingSale.items) {
      await Stock.findOneAndUpdate(
        { product: oldItem.product },
        { $inc: { quantity: oldItem.quantity } },
        { session }
      );
      await Product.findOneAndUpdate(
        { _id: oldItem.product },
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

    // Sync customer and farmerId and season if updated but missing
    let saleUpdated = false;
    if (sale.customer && !sale.farmerId) {
      sale.farmerId = sale.customer;
      saleUpdated = true;
    }
    if (sale.farmerId && !sale.customer) {
      sale.customer = sale.farmerId;
      saleUpdated = true;
    }
    if (!sale.season) {
      sale.season = getSeasonFromDate(sale.saleDate);
      saleUpdated = true;
    }
    if (!sale.cropType && sale.customer) {
      const farmer = await Farmer.findById(sale.customer).session(session);
      if (farmer && farmer.cropTypes && farmer.cropTypes.length > 0) {
        sale.cropType = farmer.cropTypes[0];
        saleUpdated = true;
      }
    }
    if (saleUpdated) {
      await sale.save({ session });
    }

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

        await Product.findOneAndUpdate(
          { _id: newItem.product },
          { 
            $inc: { quantity: -newItem.quantity },
            lastSoldDate: new Date()
          },
          { session }
        );
      }
    }

    // Automatically add products to the Farmer's purchaseHistory and preferredProducts
    if (sale.customer) {
      const productIds = sale.items.map(item => item.product);
      await Farmer.findByIdAndUpdate(
        sale.customer,
        {
          $addToSet: {
            purchaseHistory: { $each: productIds },
            preferredProducts: { $each: productIds }
          }
        },
        { session }
      );
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
      await Product.findOneAndUpdate(
        { _id: item.product },
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

const getSaleInvoice = async (req, res, next) => {
  try {
    const sale = await findSaleForInvoice({ id: req.params.id });

    if (!canDownloadInvoice(sale, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this invoice'
      });
    }

    res.status(200).json({
      success: true,
      data: buildSaleInvoicePayload(sale)
    });
  } catch (error) {
    logger.error(`Get sale invoice error: ${error.message}`);
    next(error);
  }
};

const printSaleInvoiceById = async (req, res, next) => {
  try {
    const sale = await findSaleForInvoice({ id: req.params.id });

    if (!canDownloadInvoice(sale, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to print this invoice'
      });
    }

    const { fileName, filePath } = await ensureSaleInvoicePdf(sale);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    logger.error(`Print sale invoice error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAllSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  getSaleInvoice,
  printSaleInvoiceById
};
