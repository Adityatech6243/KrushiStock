const Category = require('../models/Category');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const getAllCategories = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Category.countDocuments({ deletedAt: null });

    const categories = await Category.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ category: category._id, deletedAt: null });
        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: categoriesWithCount
    });
  } catch (error) {
    logger.error(`Get all categories error: ${error.message}`);
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, deletedAt: null });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error(`Get category error: ${error.message}`);
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };
    if (req.user) categoryData.createdBy = req.user.id;

    const category = await Category.create(categoryData);

    logger.info(`Category created: ${category.name}`);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error(`Create category error: ${error.message}`);
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.user) updateData.updatedBy = req.user.id;

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    logger.info(`Category updated: ${category.name}`);

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error(`Update category error: ${error.message}`);
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, deletedAt: null });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const productsCount = await Product.countDocuments({ category: category._id, deletedAt: null });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with associated products'
      });
    }

    category.isActive = false;
    category.deletedAt = new Date();
    if (req.user) category.updatedBy = req.user.id;
    await category.save();

    logger.info(`Category deleted: ${category.name}`);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete category error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};
