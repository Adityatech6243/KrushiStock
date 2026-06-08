const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  organizationName: {
    type: String,
    required: [true, 'Please provide an organization / store name'],
    default: 'Mahalaxmi Sheti Seva Kendra Hasur Khurd'
  },
  address: {
    type: String,
    required: [true, 'Please provide a store address'],
    default: 'Hasur Khurd, Tal. Kagal, Dist. Kolhapur, Maharashtra - 416218'
  },
  phone: {
    type: String,
    required: [true, 'Please provide a contact phone number'],
    default: '7820974939'
  },
  email: {
    type: String,
    required: [true, 'Please provide a contact email address'],
    default: 'mahalxmiShetiSevaKendra@gmail.com'
  },
  gst: {
    type: String,
    default: '27XXXXX1234X1ZX'
  },
  lowStockThreshold: {
    type: Number,
    required: [true, 'Please provide a low stock warning threshold'],
    default: 10
  },
  currency: {
    type: String,
    default: '₹'
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
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

storeSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
