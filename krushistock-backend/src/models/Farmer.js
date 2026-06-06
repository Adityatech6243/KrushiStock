const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a farmer name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  village: {
    type: String,
    required: [true, 'Please provide a village name'],
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  landSize: {
    type: String,
    trim: true
  },
  crops: {
    type: String,
    trim: true
  },
  fullName: {
    type: String,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    default: 'Maharashtra',
    trim: true
  },
  soilType: {
    type: String,
    enum: ['Black', 'Red', 'Alluvial', 'Sandy', 'Loamy', 'Clayey', 'Laterite', 'Other'],
    default: 'Loamy'
  },
  cropTypes: {
    type: [String],
    default: []
  },
  purchaseHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  preferredProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Indexes for query optimization
farmerSchema.index({ cropTypes: 1 });
farmerSchema.index({ village: 1 });
farmerSchema.index({ soilType: 1 });

module.exports = mongoose.model('Farmer', farmerSchema);
