const NotificationLog = require('../models/NotificationLog');
const logger = require('../utils/logger');

const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }
    if (req.query.type) {
      query.type = req.query.type;
    }

    const total = await NotificationLog.countDocuments(query);
    const notifications = await NotificationLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const unreadCount = await NotificationLog.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: notifications
    });
  } catch (error) {
    logger.error(`Get notifications list error: ${error.message}`);
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await NotificationLog.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await NotificationLog.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      data: notification
    });
  } catch (error) {
    logger.error(`Mark notification read error: ${error.message}`);
    next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await NotificationLog.updateMany({ isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      unreadCount: 0,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error(`Mark all notifications read error: ${error.message}`);
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await NotificationLog.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await NotificationLog.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete notification error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
};
