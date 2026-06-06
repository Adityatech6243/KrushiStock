const cron = require('node-cron');
const { updateAllStockStatuses } = require('../services/inventoryService');
const Product = require('../models/Product');
const Reminder = require('../models/Reminder');
const NotificationLog = require('../models/NotificationLog');
const whatsAppService = require('../services/whatsAppService');
const logger = require('../utils/logger');

/**
 * Checker for low stock alerts (notifies store admin)
 */
const runLowStockAlerts = async () => {
  try {
    const settings = await whatsAppService.getSettings();
    if (!settings || !settings.lowStockAlertsEnabled || !settings.adminPhoneNumber) {
      logger.info('Low stock alerts are disabled or admin phone is not configured.');
      return;
    }

    // Find products where quantity is less than or equal to reorderLevel
    const lowStockProducts = await Product.find({
      isActive: true,
      deletedAt: null,
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });

    logger.info(`Low stock evaluation: found ${lowStockProducts.length} items below reorder thresholds.`);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const product of lowStockProducts) {
      // Check if we sent an alert in the last 24 hours to avoid spamming the admin
      const alreadySent = await NotificationLog.findOne({
        type: 'low_stock',
        referenceId: product._id,
        status: 'success',
        timestamp: { $gte: twentyFourHoursAgo }
      });

      if (alreadySent) {
        continue;
      }

      logger.info(`Triggering low stock WhatsApp alert for: ${product.name}`);
      await whatsAppService.sendLowStockAlert(product, settings.adminPhoneNumber);
    }
  } catch (error) {
    logger.error(`Error in low stock alerts cron: ${error.message}`);
  }
};

/**
 * Checker for payment due reminders (notifies farmers)
 */
const runPaymentDueReminders = async () => {
  try {
    const settings = await whatsAppService.getSettings();
    if (!settings || !settings.paymentRemindersEnabled) {
      logger.info('WhatsApp payment reminders are disabled.');
      return;
    }

    const today = new Date();
    // Find pending reminders that have hit or passed their due date
    const pendingReminders = await Reminder.find({
      isActive: true,
      paymentStatus: 'Pending',
      dueDate: { $lte: today }
    }).populate('customer');

    logger.info(`Payment due evaluation: found ${pendingReminders.length} pending reminders.`);

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    for (const reminder of pendingReminders) {
      if (!reminder.customer || !reminder.customer.phone) {
        continue;
      }

      // Check if a reminder was sent within the last 3 days to avoid spamming
      if (reminder.lastReminderSent && reminder.lastReminderSent >= threeDaysAgo) {
        continue;
      }

      logger.info(`Triggering payment due WhatsApp reminder for farmer: ${reminder.customer.name}`);
      await whatsAppService.sendPaymentReminder(reminder);
    }
  } catch (error) {
    logger.error(`Error in payment reminders cron: ${error.message}`);
  }
};

const initCronJobs = () => {
  // 1. Existing stock status updater (daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled daily stock status update cron job...');
    try {
      const result = await updateAllStockStatuses();
      logger.info(`Stock status cron job completed successfully. Updated: ${result.updatedCount} products.`);
    } catch (error) {
      logger.error(`Stock status cron job failed: ${error.message}`);
    }
  });

  // 2. Low stock alert notification checker (daily at 9:00 AM)
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily low stock alert check...');
    await runLowStockAlerts();
  });

  // 3. Farmer payment reminders checker (daily at 10:00 AM)
  cron.schedule('0 10 * * *', async () => {
    logger.info('Running daily payment reminders check...');
    await runPaymentDueReminders();
  });

  logger.info('Scheduled Cron Jobs initialized successfully.');
};

module.exports = { 
  initCronJobs,
  runLowStockAlerts,
  runPaymentDueReminders
};
