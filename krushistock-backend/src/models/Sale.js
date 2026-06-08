const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  batchNumber: {
    type: String,
    default: null
  }
});

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer'
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer'
  },
  cropType: {
    type: String,
    trim: true
  },
  season: {
    type: String,
    enum: ['Monsoon', 'Summer', 'Winter'],
    trim: true
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer'],
    default: 'Cash'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    default: 'Paid',
    required: true
  },
  amountPaid: {
    type: Number,
    min: 0,
    default: 0
  },
  amountDue: {
    type: Number,
    min: 0,
    default: 0
  },
  dueDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for query optimization
saleSchema.index({ season: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ dueDate: 1 });

saleSchema.pre('validate', async function(next) {
  if (this.isNew && !this.saleNumber) {
    try {
      const { getNextSequenceValue } = require('./Counter');
      const seq = await getNextSequenceValue('saleNumber', 'Sale', 'saleNumber');
      this.saleNumber = `SAL-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

saleSchema.post('deleteOne', { document: true, query: false }, async function() {
  const saleNumber = this.saleNumber;
  if (saleNumber) {
    const match = saleNumber.match(/\d+/);
    if (match) {
      const seqVal = parseInt(match[0], 10);
      try {
        const { Counter } = require('./Counter');
        await Counter.findOneAndUpdate(
          { _id: 'saleNumber', seq: seqVal },
          { $set: { seq: seqVal - 1 } }
        );
      } catch (err) {
        console.error('Error updating sale counter after delete:', err);
      }
    }
  }
});

saleSchema.post('deleteMany', async function() {
  try {
    const { Counter } = require('./Counter');
    await Counter.deleteOne({ _id: 'saleNumber' });
  } catch (err) {
    console.error('Error deleting sale counter after deleteMany:', err);
  }
});

module.exports = mongoose.model('Sale', saleSchema);
