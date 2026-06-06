const mongoose = require('mongoose');

const invoiceHistorySchema = new mongoose.Schema({
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  pdfPath: {
    type: String,
    required: true
  },
  mediaId: {
    type: String,
    default: null
  },
  sentStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Sent', 'Failed'],
    default: 'Pending'
  },
  sentAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

invoiceHistorySchema.index({ sale: 1 });
invoiceHistorySchema.index({ customer: 1 });
invoiceHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('InvoiceHistory', invoiceHistorySchema);
