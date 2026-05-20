const Farmer = require('../models/Farmer');
const Sale = require('../models/Sale');
const logger = require('../utils/logger');

const getAllFarmers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Farmer.countDocuments({ deletedAt: null });

    const farmers = await Farmer.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const farmersWithPurchases = await Promise.all(
      farmers.map(async (farmer) => {
        const sales = await Sale.find({ customer: farmer._id });
        const totalPurchases = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        return {
          ...farmer.toObject(),
          totalPurchases
        };
      })
    );

    res.status(200).json({
      success: true,
      count: farmers.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: farmersWithPurchases
    });
  } catch (error) {
    logger.error(`Get all farmers error: ${error.message}`);
    next(error);
  }
};

const createFarmer = async (req, res, next) => {
  try {
    const farmerData = { ...req.body };
    if (req.user) farmerData.createdBy = req.user.id;

    const farmer = await Farmer.create(farmerData);

    logger.info(`Farmer created: ${farmer.name}`);

    res.status(201).json({
      success: true,
      data: farmer
    });
  } catch (error) {
    logger.error(`Create farmer error: ${error.message}`);
    next(error);
  }
};

const getFarmer = async (req, res, next) => {
  try {
    const farmer = await Farmer.findOne({ _id: req.params.id, deletedAt: null });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: farmer
    });
  } catch (error) {
    logger.error(`Get farmer error: ${error.message}`);
    next(error);
  }
};

const updateFarmer = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.user) updateData.updatedBy = req.user.id;

    const farmer = await Farmer.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    );

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    logger.info(`Farmer updated: ${farmer.name}`);

    res.status(200).json({
      success: true,
      data: farmer
    });
  } catch (error) {
    logger.error(`Update farmer error: ${error.message}`);
    next(error);
  }
};

const deleteFarmer = async (req, res, next) => {
  try {
    const farmer = await Farmer.findOne({ _id: req.params.id, deletedAt: null });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    farmer.isActive = false;
    farmer.deletedAt = new Date();
    if (req.user) farmer.updatedBy = req.user.id;
    await farmer.save();

    logger.info(`Farmer deleted: ${farmer.name}`);

    res.status(200).json({
      success: true,
      message: 'Farmer deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete farmer error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAllFarmers,
  createFarmer,
  getFarmer,
  updateFarmer,
  deleteFarmer
};
