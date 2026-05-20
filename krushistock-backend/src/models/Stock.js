const mongoose = require('mongoose');

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
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

stockSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Stock', stockSchema);
