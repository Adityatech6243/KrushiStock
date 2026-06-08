const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: [
      'purchase',
      'purchase_update_reversal',
      'purchase_update',
      'purchase_delete',
      'sale',
      'sale_update_reversal',
      'sale_update',
      'sale_delete',
      'adjustment',
      'disposal',
      'correction'
    ],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  referenceModel: {
    type: String,
    enum: ['Purchase', 'Sale', 'Adjustment'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ referenceModel: 1, referenceId: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
