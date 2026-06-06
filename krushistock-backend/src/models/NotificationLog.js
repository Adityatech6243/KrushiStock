const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['low_stock', 'payment_reminder', 'invoice']
  },
  recipient: {
    type: String,
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Sale', 'Product', 'Farmer', 'Reminder']
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed'],
    default: 'success'
  },
  error: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

notificationLogSchema.index({ type: 1 });
notificationLogSchema.index({ recipient: 1 });
notificationLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
