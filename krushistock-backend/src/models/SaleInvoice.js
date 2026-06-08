const mongoose = require('mongoose');

const saleInvoiceProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  batchNumber: {
    type: String,
    default: null
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const saleInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: false
  },
  customerName: {
    type: String,
    required: true,
    default: 'Walk-in Customer'
  },
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  products: [saleInvoiceProductSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    required: true,
    default: 'Paid'
  },
  pdfPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Cancelled'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

saleInvoiceSchema.index({ sale: 1 });
saleInvoiceSchema.index({ customer: 1 });

module.exports = mongoose.model('SaleInvoice', saleInvoiceSchema);
