const Purchase = require('../models/Purchase');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const {
  createPurchaseWithInvoice,
  updatePurchaseWithInvoice,
  deletePurchaseWithInvoice,
  createPurchasePdf
} = require('../services/purchaseService');

const getAllPurchases = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.supplier) {
      query.supplier = req.query.supplier;
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.startDate || req.query.endDate) {
      query.purchaseDate = {};
      if (req.query.startDate) query.purchaseDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.purchaseDate.$lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      query.purchaseNumber = { $regex: req.query.search, $options: 'i' };
    }

    const total = await Purchase.countDocuments(query);

    const purchases = await Purchase.find(query)
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

const getPurchaseHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.supplier) {
      query.supplierId = req.query.supplier;
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.startDate || req.query.endDate) {
      query.purchaseDate = {};
      if (req.query.startDate) query.purchaseDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.purchaseDate.$lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      query.$or = [
        { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
        { supplierName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await PurchaseInvoice.countDocuments(query);
    const invoices = await PurchaseInvoice.find(query)
      .populate('supplierId', 'name phone email address gst')
      .populate('products.productId', 'name unit category')
      .populate('createdBy', 'name')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: invoices.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: invoices
    });
  } catch (error) {
    logger.error(`Get purchase history error: ${error.message}`);
    next(error);
  }
};

const getPurchaseInvoiceByNumber = async (req, res, next) => {
  try {
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: req.params.invoiceNumber })
      .populate('supplierId', 'name phone email address gst')
      .populate('products.productId', 'name unit category')
      .populate('createdBy', 'name');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Purchase invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    logger.error(`Get purchase invoice error: ${error.message}`);
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
  let invoice = null;
  try {
    const result = await createPurchaseWithInvoice({
      purchaseData: req.body,
      userId: req.user.id,
      session
    });
    invoice = result.invoice;
    const purchase = result.purchase;

    await session.commitTransaction();
    logger.info(`Purchase created: ${purchase.purchaseNumber}`);

    try {
      invoice = await createPurchasePdf(invoice);
    } catch (pdfError) {
      logger.error(`Purchase invoice PDF error: ${pdfError.message}`);
    }

    res.status(201).json({
      success: true,
      data: purchase,
      invoice
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
  let invoice = null;
  try {
    const result = await updatePurchaseWithInvoice({
      purchaseId: req.params.id,
      purchaseData: req.body,
      userId: req.user.id,
      session
    });
    const purchase = result.purchase;
    invoice = result.invoice;

    await session.commitTransaction();
    logger.info(`Purchase updated: ${purchase.purchaseNumber}`);

    try {
      invoice = await createPurchasePdf(invoice);
    } catch (pdfError) {
      logger.error(`Purchase invoice PDF error: ${pdfError.message}`);
    }

    res.status(200).json({
      success: true,
      data: purchase,
      invoice
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
    const { purchase } = await deletePurchaseWithInvoice({
      purchaseId: req.params.id,
      userId: req.user.id,
      session
    });

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
  getPurchaseHistory,
  getPurchaseInvoiceByNumber,
  createPurchase,
  updatePurchase,
  deletePurchase
};
