const mongoose = require('mongoose');

const jobLogSchema = new mongoose.Schema({
  jobName: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['running', 'success', 'failed'],
    default: 'running'
  },
  message: {
    type: String,
    default: ''
  },
  durationMs: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  error: {
    type: String,
    default: null
  }
});

// Optimization index
jobLogSchema.index({ startedAt: -1 });

module.exports = mongoose.model('JobLog', jobLogSchema);
