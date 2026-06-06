const mongoose = require('mongoose');

const purchaseInvoiceProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  gst: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const purchaseInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true,
    unique: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  supplierName: {
    type: String,
    required: true,
    trim: true
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  products: [purchaseInvoiceProductSchema],
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
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    default: 'Paid'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
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
  cancelledAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

purchaseInvoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

purchaseInvoiceSchema.index({ supplierId: 1, purchaseDate: -1 });
purchaseInvoiceSchema.index({ paymentStatus: 1 });
purchaseInvoiceSchema.index({ status: 1 });
purchaseInvoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
