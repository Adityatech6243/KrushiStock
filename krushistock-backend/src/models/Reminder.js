const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['payment_due'],
    default: 'payment_due'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  amountDue: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  lastReminderSent: {
    type: Date,
    default: null
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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

reminderSchema.index({ customer: 1 });
reminderSchema.index({ paymentStatus: 1 });
reminderSchema.index({ dueDate: 1 });

reminderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Reminder', reminderSchema);
