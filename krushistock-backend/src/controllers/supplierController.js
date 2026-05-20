const Supplier = require('../models/Supplier');
const logger = require('../utils/logger');

const getAllSuppliers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Supplier.countDocuments({ deletedAt: null });

    const suppliers = await Supplier.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: suppliers.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: suppliers
    });
  } catch (error) {
    logger.error(`Get all suppliers error: ${error.message}`);
    next(error);
  }
};

const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    logger.error(`Get supplier error: ${error.message}`);
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplierData = { ...req.body };
    if (req.user) supplierData.createdBy = req.user.id;

    const supplier = await Supplier.create(supplierData);

    logger.info(`Supplier created: ${supplier.name}`);

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    logger.error(`Create supplier error: ${error.message}`);
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.user) updateData.updatedBy = req.user.id;

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    logger.info(`Supplier updated: ${supplier.name}`);

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    logger.error(`Update supplier error: ${error.message}`);
    next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    supplier.isActive = false;
    supplier.deletedAt = new Date();
    if (req.user) supplier.updatedBy = req.user.id;
    await supplier.save();

    logger.info(`Supplier deleted: ${supplier.name}`);

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete supplier error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
