const User = require('../models/User');
const logger = require('../utils/logger');

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments({ deletedAt: null });

    const users = await User.find({ deletedAt: null })
      .select('-password')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    logger.error(`Get all users error: ${error.message}`);
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const userData = { ...req.body };
    if (req.user) userData.createdBy = req.user.id;

    const user = await User.create(userData);

    logger.info(`User created: ${user.username}`);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Create user error: ${error.message}`);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password) {
      // Password hashing is handled by the User model pre-save hook
      const user = await User.findOne({ _id: req.params.id, deletedAt: null });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      user.password = updateData.password;
      await user.save();
      delete updateData.password;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User updated: ${user.username}`);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deletedAt: null });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deleting the last admin or the currently logged in user? 
    // For now, just a standard soft delete
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    logger.info(`User deleted: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
