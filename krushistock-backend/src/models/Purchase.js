const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
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
  mrp: {
    type: Number,
    min: 0,
    default: 0
  },
  batchNumber: {
    type: String,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  manufactureDate: {
    type: Date,
    default: null
  }
});

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    unique: true,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Please provide a supplier']
  },
  items: [purchaseItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

purchaseSchema.pre('validate', async function(next) {
  if (this.isNew && !this.purchaseNumber) {
    try {
      const { getNextSequenceValue } = require('./Counter');
      const seq = await getNextSequenceValue('purchaseNumber', 'Purchase', 'purchaseNumber');
      this.purchaseNumber = `PUR-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

purchaseSchema.post('deleteOne', { document: true, query: false }, async function() {
  const purchaseNumber = this.purchaseNumber;
  if (purchaseNumber) {
    const match = purchaseNumber.match(/\d+/);
    if (match) {
      const seqVal = parseInt(match[0], 10);
      try {
        const { Counter } = require('./Counter');
        await Counter.findOneAndUpdate(
          { _id: 'purchaseNumber', seq: seqVal },
          { $set: { seq: seqVal - 1 } }
        );
      } catch (err) {
        console.error('Error updating purchase counter after delete:', err);
      }
    }
  }
});

purchaseSchema.post('deleteMany', async function() {
  try {
    const { Counter } = require('./Counter');
    await Counter.deleteOne({ _id: 'purchaseNumber' });
  } catch (err) {
    console.error('Error deleting purchase counter after deleteMany:', err);
  }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
