const cron = require('node-cron');
const { updateAllStockStatuses } = require('../services/inventoryService');
const Stock = require('../models/Stock');
const Reminder = require('../models/Reminder');
const NotificationLog = require('../models/NotificationLog');
const whatsAppService = require('../services/whatsAppService');
const logger = require('../utils/logger');
const JobLog = require('../models/JobLog');

/**
 * Generic runner wrapper to log job execution into MongoDB JobLog
 */
const runJobWithLogging = async (jobName, jobFn) => {
  const startedAt = new Date();
  let log = null;
  try {
    log = await JobLog.create({
      jobName,
      status: 'running',
      startedAt
    });

    const resultMessage = await jobFn();
    const completedAt = new Date();
    const durationMs = completedAt - startedAt;

    log.status = 'success';
    log.message = resultMessage || 'Job executed successfully';
    log.durationMs = durationMs;
    log.completedAt = completedAt;
    await log.save();

    logger.info(`Job [${jobName}] finished successfully in ${durationMs}ms`);
    return log;
  } catch (error) {
    const completedAt = new Date();
    const durationMs = completedAt - startedAt;

    if (log) {
      log.status = 'failed';
      log.message = error.message || 'Job execution failed';
      log.error = error.stack || error.message;
      log.durationMs = durationMs;
      log.completedAt = completedAt;
      await log.save();
    } else {
      await JobLog.create({
        jobName,
        status: 'failed',
        message: error.message,
        error: error.stack,
        durationMs,
        startedAt,
        completedAt
      });
    }
    logger.error(`Job [${jobName}] failed: ${error.message}`);
    throw error;
  }
};

/**
 * Checker for low stock alerts (notifies store admin)
 */
const runLowStockAlerts = async () => {
  const settings = await whatsAppService.getSettings();
  if (!settings || !settings.lowStockAlertsEnabled || !settings.adminPhoneNumber) {
    return 'Low stock alerts are disabled or admin phone is not configured.';
  }

  const lowStocks = await Stock.find({
    $expr: { $lte: ['$quantity', '$lowStockLimit'] }
  }).populate({
    path: 'product',
    match: { isActive: true, deletedAt: null }
  });

  const lowStockProducts = lowStocks
    .filter((stock) => stock.product)
    .map((stock) => {
      return {
        ...stock.product.toObject(),
        quantity: stock.quantity
      };
    });

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let sentCount = 0;

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
    sentCount++;
  }

  return `Evaluated stock alerts. Found ${lowStockProducts.length} low stock items. Sent ${sentCount} WhatsApp alerts.`;
};

/**
 * Checker for payment due reminders (notifies farmers)
 */
const runPaymentDueReminders = async () => {
  const settings = await whatsAppService.getSettings();
  if (!settings || !settings.paymentRemindersEnabled) {
    return 'WhatsApp payment reminders are disabled.';
  }

  const today = new Date();
  // Find pending reminders that have hit or passed their due date
  const pendingReminders = await Reminder.find({
    isActive: true,
    paymentStatus: 'Pending',
    dueDate: { $lte: today }
  }).populate('customer');

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  let sentCount = 0;

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
    sentCount++;
  }

  return `Evaluated payment due reminders. Found ${pendingReminders.length} pending items. Sent ${sentCount} reminders.`;
};

/**
 * Stock status updater (runs daily at midnight)
 */
const runStockStatusUpdate = async () => {
  const result = await updateAllStockStatuses();
  return `Stock status update completed. Updated: ${result?.updatedCount || 0} products.`;
};

const initCronJobs = () => {
  // 1. Stock status updater (daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting scheduled daily stock status update job...');
    await runJobWithLogging('stock_status_update', runStockStatusUpdate);
  });

  // 2. Low stock alert notification checker (daily at 9:00 AM)
  cron.schedule('0 9 * * *', async () => {
    logger.info('Starting scheduled daily low stock alert check...');
    await runJobWithLogging('low_stock_alerts', runLowStockAlerts);
  });

  // 3. Farmer payment reminders checker (daily at 10:00 AM)
  cron.schedule('0 10 * * *', async () => {
    logger.info('Starting scheduled daily payment reminders check...');
    await runJobWithLogging('payment_reminders', runPaymentDueReminders);
  });

  logger.info('Scheduled Cron Jobs initialized successfully.');
};

module.exports = {
  initCronJobs,
  runJobWithLogging,
  runLowStockAlerts,
  runPaymentDueReminders,
  runStockStatusUpdate
};
