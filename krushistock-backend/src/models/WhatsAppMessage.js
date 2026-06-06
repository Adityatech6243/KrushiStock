const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  whatsappMessageId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['sent', 'received']
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    required: true,
    enum: ['text', 'document', 'image', 'button_reply', 'interactive', 'template', 'unknown'],
    default: 'text'
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['sent', 'delivered', 'read', 'failed', 'received'],
    default: 'sent'
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  error: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

whatsAppMessageSchema.index({ from: 1 });
whatsAppMessageSchema.index({ to: 1 });
whatsAppMessageSchema.index({ status: 1 });
whatsAppMessageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
