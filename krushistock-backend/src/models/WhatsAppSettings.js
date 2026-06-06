const mongoose = require('mongoose');

const whatsAppSettingsSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    default: ''
  },
  phoneNumberId: {
    type: String,
    default: ''
  },
  businessAccountId: {
    type: String,
    default: ''
  },
  webhookVerifyToken: {
    type: String,
    default: ''
  },
  adminPhoneNumber: {
    type: String,
    default: ''
  },
  lowStockAlertsEnabled: {
    type: Boolean,
    default: true
  },
  paymentRemindersEnabled: {
    type: Boolean,
    default: true
  },
  catalogSharingEnabled: {
    type: Boolean,
    default: true
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  isConfigured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

whatsAppSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Mark as configured if main settings are present
  if (this.accessToken && this.phoneNumberId && this.adminPhoneNumber) {
    this.isConfigured = true;
  } else {
    this.isConfigured = false;
  }
  
  next();
});

module.exports = mongoose.model('WhatsAppSettings', whatsAppSettingsSchema);
