const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date,
    default: null
  },
  manufactureDate: {
    type: Date,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  purchasePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  mrp: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const stockSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lowStockLimit: {
    type: Number,
    default: 10,
    min: 0
  },
  batches: [batchSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

stockSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

stockSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastUpdated: new Date() });
  next();
});

module.exports = mongoose.model('Stock', stockSchema);
