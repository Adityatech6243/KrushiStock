const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { broadcastStatsUpdate } = require('../services/socketService');
const {
  findSaleForInvoice,
  canDownloadInvoice,
  buildSaleInvoicePayload,
  ensureSaleInvoicePdf
} = require('../services/saleInvoiceService');
const { recordSaleMovement } = require('../services/stockMovementService');

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

const adjustSaleStock = async ({
  sale,
  item,
  direction,
  movementType,
  note,
  userId,
  session
}) => {
  const { stock } = await recordSaleMovement({
    sale,
    item,
    direction,
    movementType,
    note,
    userId,
    session
  });

  return stock;
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

    // Clean up empty strings
    if (saleData.customer === '') saleData.customer = null;
    if (saleData.farmerId === '') saleData.farmerId = null;

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

    // Calculate and set payment fields
    const totalAmount = Number(saleData.totalAmount || 0);
    let amountPaid = Number(saleData.amountPaid !== undefined ? saleData.amountPaid : 0);
    let amountDue = Number(saleData.amountDue !== undefined ? saleData.amountDue : 0);
    let paymentStatus = saleData.paymentStatus;

    if (!paymentStatus) {
      if (saleData.amountPaid !== undefined) {
        if (amountPaid >= totalAmount) {
          paymentStatus = 'Paid';
          amountDue = 0;
          amountPaid = totalAmount;
        } else if (amountPaid > 0) {
          paymentStatus = 'Partial';
          amountDue = totalAmount - amountPaid;
        } else {
          paymentStatus = 'Pending';
          amountDue = totalAmount;
        }
      } else {
        paymentStatus = 'Paid';
        amountPaid = totalAmount;
        amountDue = 0;
      }
    } else {
      if (paymentStatus === 'Paid') {
        amountPaid = totalAmount;
        amountDue = 0;
      } else if (paymentStatus === 'Pending') {
        amountPaid = 0;
        amountDue = totalAmount;
      } else if (paymentStatus === 'Partial') {
        if (saleData.amountPaid === undefined && saleData.amountDue !== undefined) {
          amountPaid = totalAmount - amountDue;
        } else if (saleData.amountPaid !== undefined) {
          amountDue = totalAmount - amountPaid;
        } else {
          amountPaid = 0;
          amountDue = totalAmount;
        }
      }
    }

    saleData.paymentStatus = paymentStatus;
    saleData.amountPaid = amountPaid;
    saleData.amountDue = amountDue;

    if (paymentStatus !== 'Paid' && !saleData.dueDate) {
      saleData.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (paymentStatus === 'Paid') {
      saleData.dueDate = null;
    }

    const [sale] = await Sale.create([saleData], { session });

    // Automatically create a Reminder if the sale has a customer and is pending/partial
    if (sale.customer && (sale.paymentStatus === 'Pending' || sale.paymentStatus === 'Partial')) {
      const Reminder = require('../models/Reminder');
      await Reminder.create([{
        type: 'payment_due',
        customer: sale.customer,
        sale: sale._id,
        amountDue: sale.amountDue,
        dueDate: sale.dueDate,
        paymentStatus: 'Pending',
        isActive: true
      }], { session });
      logger.info(`Reminder created for sale: ${sale.saleNumber}`);
    }

    for (const item of sale.items) {
      await adjustSaleStock({
        sale,
        item,
        direction: -1,
        movementType: 'sale',
        note: 'Sale stock issued',
        userId: req.user.id,
        session
      });

      await Product.findOneAndUpdate(
        { _id: item.product },
        { $set: { lastSoldDate: new Date() } },
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

    // Generate and persist invoice synchronously before completing response
    const { findSaleForInvoice, generateAndPersistInvoice } = require('../services/saleInvoiceService');
    try {
      const populatedSale = await findSaleForInvoice({ id: sale._id });
      await generateAndPersistInvoice(populatedSale);
      logger.info(`Successfully generated and stored invoice PDF for sale: ${sale.saleNumber}`);
    } catch (err) {
      logger.error(`Error generating and storing invoice PDF: ${err.message}`);
    }

    // Asynchronously send WhatsApp invoice PDF in the background if requested
    if (req.body.sendWhatsApp && sale.customer) {
      const whatsAppService = require('../services/whatsAppService');
      whatsAppService.getSettings().then(async (settings) => {
        if (settings) {
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

    broadcastStatsUpdate();

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

    // Clean up empty strings
    if (req.body.customer === '') req.body.customer = null;
    if (req.body.farmerId === '') req.body.farmerId = null;

    // Sync customer and farmerId in req.body
    if (req.body.customer && !req.body.farmerId) req.body.farmerId = req.body.customer;
    if (req.body.farmerId && !req.body.customer) req.body.customer = req.body.farmerId;

    if (req.body.saleDate && !req.body.season) {
      req.body.season = getSeasonFromDate(req.body.saleDate);
    }

    // Calculate and set payment fields
    const totalAmount = Number(req.body.totalAmount !== undefined ? req.body.totalAmount : existingSale.totalAmount);
    let amountPaid = Number(req.body.amountPaid !== undefined ? req.body.amountPaid : (existingSale.amountPaid || 0));
    let amountDue = Number(req.body.amountDue !== undefined ? req.body.amountDue : (existingSale.amountDue || 0));
    let paymentStatus = req.body.paymentStatus || existingSale.paymentStatus || 'Paid';

    if (req.body.paymentStatus !== undefined || req.body.amountPaid !== undefined || req.body.amountDue !== undefined || req.body.totalAmount !== undefined) {
      if (req.body.paymentStatus === undefined) {
        if (amountPaid >= totalAmount) {
          paymentStatus = 'Paid';
          amountDue = 0;
          amountPaid = totalAmount;
        } else if (amountPaid > 0) {
          paymentStatus = 'Partial';
          amountDue = totalAmount - amountPaid;
        } else {
          paymentStatus = 'Pending';
          amountDue = totalAmount;
        }
      } else {
        if (paymentStatus === 'Paid') {
          amountPaid = totalAmount;
          amountDue = 0;
        } else if (paymentStatus === 'Pending') {
          amountPaid = 0;
          amountDue = totalAmount;
        } else if (paymentStatus === 'Partial') {
          if (req.body.amountPaid === undefined && req.body.amountDue !== undefined) {
            amountPaid = totalAmount - amountDue;
          } else if (req.body.amountPaid !== undefined) {
            amountDue = totalAmount - amountPaid;
          } else {
            amountDue = totalAmount - amountPaid;
          }
        }
      }
    }

    req.body.paymentStatus = paymentStatus;
    req.body.amountPaid = amountPaid;
    req.body.amountDue = amountDue;

    if (paymentStatus !== 'Paid') {
      req.body.dueDate = req.body.dueDate || existingSale.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      req.body.dueDate = null;
    }

    // 1. Revert old stock atomically
    for (const oldItem of existingSale.items) {
      await adjustSaleStock({
        sale: existingSale,
        item: oldItem,
        direction: 1,
        movementType: 'sale_update_reversal',
        note: 'Reverted sale stock before update',
        userId: req.user.id,
        session
      });
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
        await adjustSaleStock({
          sale,
          item: newItem,
          direction: -1,
          movementType: 'sale_update',
          note: 'Applied updated sale stock',
          userId: req.user.id,
          session
        });

        await Product.findOneAndUpdate(
          { _id: newItem.product },
          { $set: { lastSoldDate: new Date() } },
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

    // Sync Reminder record
    const Reminder = require('../models/Reminder');
    if (sale.customer && (sale.paymentStatus === 'Pending' || sale.paymentStatus === 'Partial')) {
      await Reminder.findOneAndUpdate(
        { sale: sale._id },
        {
          type: 'payment_due',
          customer: sale.customer,
          amountDue: sale.amountDue,
          dueDate: sale.dueDate,
          paymentStatus: 'Pending',
          isActive: true
        },
        { upsert: true, new: true, session }
      );
      logger.info(`Reminder updated/created for sale: ${sale.saleNumber}`);
    } else {
      await Reminder.findOneAndUpdate(
        { sale: sale._id },
        {
          paymentStatus: 'Paid',
          isActive: false,
          amountDue: 0
        },
        { session }
      );
      logger.info(`Reminder cleared/deactivated for sale: ${sale.saleNumber}`);
    }

    await session.commitTransaction();
    logger.info(`Sale updated: ${sale.saleNumber}`);

    // Regenerate invoice PDF and update/record invoice history synchronously
    const { findSaleForInvoice, generateAndPersistInvoice } = require('../services/saleInvoiceService');
    try {
      const populatedSale = await findSaleForInvoice({ id: sale._id });
      await generateAndPersistInvoice(populatedSale);
      logger.info(`Successfully regenerated and stored invoice PDF for updated sale: ${sale.saleNumber}`);
    } catch (err) {
      logger.error(`Error regenerating and storing invoice PDF: ${err.message}`);
    }

    broadcastStatsUpdate();

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
      await adjustSaleStock({
        sale,
        item,
        direction: 1,
        movementType: 'sale_delete',
        note: 'Sale deleted and stock reverted',
        userId: req.user.id,
        session
      });
    }

    await sale.deleteOne({ session });

    // Delete associated reminders
    const Reminder = require('../models/Reminder');
    await Reminder.deleteMany({ sale: sale._id }, { session });

    // Cancel corresponding SaleInvoice
    const SaleInvoice = require('../models/SaleInvoice');
    await SaleInvoice.findOneAndUpdate(
      { sale: sale._id },
      { $set: { status: 'Cancelled' } },
      { session }
    );

    await session.commitTransaction();
    logger.info(`Sale deleted: ${sale.saleNumber}`);
    
    broadcastStatsUpdate();

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
      data: await buildSaleInvoicePayload(sale)
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

const updateSalePaymentStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amountPaid, paymentStatus, dueDate } = req.body;
    const existingSale = await Sale.findById(req.params.id).session(session);

    if (!existingSale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const totalAmount = existingSale.totalAmount;
    let newAmountPaid = amountPaid !== undefined ? Number(amountPaid) : existingSale.amountPaid;
    let newPaymentStatus = paymentStatus || existingSale.paymentStatus;
    let newAmountDue = totalAmount - newAmountPaid;

    if (paymentStatus !== undefined && amountPaid === undefined) {
      if (paymentStatus === 'Paid') {
        newAmountPaid = totalAmount;
        newAmountDue = 0;
      } else if (paymentStatus === 'Pending') {
        newAmountPaid = 0;
        newAmountDue = totalAmount;
      }
    } else if (amountPaid !== undefined && paymentStatus === undefined) {
      if (newAmountPaid >= totalAmount) {
        newPaymentStatus = 'Paid';
        newAmountPaid = totalAmount;
        newAmountDue = 0;
      } else if (newAmountPaid > 0) {
        newPaymentStatus = 'Partial';
      } else {
        newPaymentStatus = 'Pending';
      }
    }

    const updateFields = {
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      paymentStatus: newPaymentStatus
    };

    if (newPaymentStatus !== 'Paid') {
      updateFields.dueDate = dueDate || existingSale.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      updateFields.dueDate = null;
    }

    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true, session }
    );

    // Sync Reminder record
    const Reminder = require('../models/Reminder');
    if (sale.customer && (sale.paymentStatus === 'Pending' || sale.paymentStatus === 'Partial')) {
      await Reminder.findOneAndUpdate(
        { sale: sale._id },
        {
          type: 'payment_due',
          customer: sale.customer,
          amountDue: sale.amountDue,
          dueDate: sale.dueDate,
          paymentStatus: 'Pending',
          isActive: true
        },
        { upsert: true, new: true, session }
      );
      logger.info(`Reminder updated/created after payment update for sale: ${sale.saleNumber}`);
    } else {
      await Reminder.findOneAndUpdate(
        { sale: sale._id },
        {
          paymentStatus: 'Paid',
          isActive: false,
          amountDue: 0
        },
        { session }
      );
      logger.info(`Reminder cleared/deactivated after payment update for sale: ${sale.saleNumber}`);
    }

    // Regenerate invoice PDF and update/record invoice history synchronously
    const { findSaleForInvoice, generateAndPersistInvoice } = require('../services/saleInvoiceService');
    try {
      const populatedSale = await findSaleForInvoice({ id: sale._id });
      await generateAndPersistInvoice(populatedSale);
      logger.info(`Successfully regenerated and stored invoice PDF after payment status update: ${sale.saleNumber}`);
    } catch (err) {
      logger.error(`Error regenerating invoice PDF: ${err.message}`);
    }

    await session.commitTransaction();

    broadcastStatsUpdate();

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Update sale payment status error: ${error.message}`);
    next(error);
  } finally {
    session.endSession();
  }
};

const getSaleInvoicePDF = async (req, res, next) => {
  try {
    const saleId = req.params.id;
    const SaleInvoice = require('../models/SaleInvoice');
    let saleInvoice = await SaleInvoice.findOne({ sale: saleId });

    const { findSaleForInvoice, generateAndPersistInvoice } = require('../services/saleInvoiceService');
    const path = require('path');
    const fs = require('fs');

    let absolutePath = '';
    let fileName = '';

    if (!saleInvoice || !saleInvoice.pdfPath || !fs.existsSync(path.resolve(__dirname, '../../', saleInvoice.pdfPath))) {
      // Generate it on-the-fly
      const sale = await findSaleForInvoice({ id: saleId });
      if (!canDownloadInvoice(sale, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this invoice'
        });
      }
      const persistResult = await generateAndPersistInvoice(sale);
      absolutePath = persistResult.filePath;
      fileName = persistResult.fileName;
    } else {
      const sale = await findSaleForInvoice({ id: saleId });
      if (!canDownloadInvoice(sale, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this invoice'
        });
      }
      absolutePath = path.resolve(__dirname, '../../', saleInvoice.pdfPath);
      fileName = path.basename(absolutePath);
    }

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.sendFile(absolutePath);
  } catch (error) {
    logger.error(`Get sale invoice PDF error: ${error.message}`);
    next(error);
  }
};

const sendInvoiceWhatsApp = async (req, res, next) => {
  try {
    const saleId = req.params.id;
    const whatsAppService = require('../services/whatsAppService');
    
    const result = await whatsAppService.sendInvoicePdf(saleId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Invoice sent via WhatsApp successfully',
        messageId: result.messageId
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to send invoice via WhatsApp'
      });
    }
  } catch (error) {
    logger.error(`Send invoice WhatsApp error: ${error.message}`);
    next(error);
  }
};

const triggerSalePaymentReminder = async (req, res, next) => {
  try {
    const saleId = req.params.id;
    const Reminder = require('../models/Reminder');
    const reminder = await Reminder.findOne({ sale: saleId }).populate('customer');
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'No active reminder found for this sale.'
      });
    }

    if (reminder.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'This payment is already fully paid.'
      });
    }

    const whatsAppService = require('../services/whatsAppService');
    const result = await whatsAppService.sendPaymentReminder(reminder);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Payment reminder sent successfully',
        data: reminder
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to send payment reminder'
      });
    }
  } catch (error) {
    logger.error(`Manual payment reminder error: ${error.message}`);
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
  printSaleInvoiceById,
  updateSalePaymentStatus,
  getSaleInvoicePDF,
  sendInvoiceWhatsApp,
  triggerSalePaymentReminder
};
