const JobLog = require('../models/JobLog');
const logger = require('../utils/logger');
const {
  runJobWithLogging,
  runLowStockAlerts,
  runPaymentDueReminders,
  runStockStatusUpdate
} = require('../config/cron');

const getJobs = async (req, res, next) => {
  try {
    const cronJobs = [
      {
        name: 'stock_status_update',
        title: 'Stock Status Update',
        description: 'Updates all products stock status (Fresh, Near Expiry, Expired, Dead Stock) based on dates.',
        schedule: '0 0 * * * (Daily at midnight)'
      },
      {
        name: 'low_stock_alerts',
        title: 'Low Stock Alerts',
        description: 'Evaluates inventory against reorder levels and sends WhatsApp alerts to the store administrator.',
        schedule: '0 9 * * * (Daily at 9:00 AM)'
      },
      {
        name: 'payment_reminders',
        title: 'Payment Due Reminders',
        description: 'Identifies outstanding credit payments and sends payment reminders to farmers via WhatsApp.',
        schedule: '0 10 * * * (Daily at 10:00 AM)'
      }
    ];

    const jobsWithStats = [];
    for (const job of cronJobs) {
      const lastRun = await JobLog.findOne({ jobName: job.name }).sort({ startedAt: -1 });
      jobsWithStats.push({
        ...job,
        lastRunStatus: lastRun ? lastRun.status : 'never_run',
        lastRunTime: lastRun ? lastRun.startedAt : null,
        lastRunMessage: lastRun ? lastRun.message : null,
        lastRunDurationMs: lastRun ? lastRun.durationMs : 0
      });
    }

    res.status(200).json({
      success: true,
      data: jobsWithStats
    });
  } catch (error) {
    logger.error(`Get background jobs list error: ${error.message}`);
    next(error);
  }
};

const runJobManual = async (req, res, next) => {
  try {
    const { jobName } = req.params;
    let jobFn = null;

    if (jobName === 'stock_status_update') {
      jobFn = runStockStatusUpdate;
    } else if (jobName === 'low_stock_alerts') {
      jobFn = runLowStockAlerts;
    } else if (jobName === 'payment_reminders') {
      jobFn = runPaymentDueReminders;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid job name'
      });
    }

    // Trigger in the background
    runJobWithLogging(jobName, jobFn).catch(err => {
      logger.error(`Manual run of job [${jobName}] failed background execution: ${err.message}`);
    });

    res.status(200).json({
      success: true,
      message: `Job [${jobName}] triggered in the background. Check logs tab for status updates.`
    });
  } catch (error) {
    logger.error(`Trigger background job manually error: ${error.message}`);
    next(error);
  }
};

const getJobLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.jobName) {
      query.jobName = req.query.jobName;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const total = await JobLog.countDocuments(query);
    const logs = await JobLog.find(query)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (error) {
    logger.error(`Get job logs history error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getJobs,
  runJobManual,
  getJobLogs
};
