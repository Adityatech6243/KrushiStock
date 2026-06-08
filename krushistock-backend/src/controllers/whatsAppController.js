const fs = require('fs');
const path = require('path');
const WhatsAppSettings = require('../models/WhatsAppSettings');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const NotificationLog = require('../models/NotificationLog');
const Reminder = require('../models/Reminder');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Farmer = require('../models/Farmer');
const whatsAppService = require('../services/whatsAppService');
const logger = require('../utils/logger');

/**
 * Webhook Verification (GET)
 */
const verifyWebhook = async (req, res, next) => {
  try {
    const settings = await whatsAppService.getSettings();
    const verifyToken = settings ? settings.webhookVerifyToken : 'krushistock_verify_token';

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        logger.info('Webhook verified successfully!');
        return res.status(200).send(challenge);
      } else {
        logger.warn('Webhook verification failed: token mismatch');
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    return res.status(400).json({ success: false, message: 'Bad Request' });
  } catch (error) {
    next(error);
  }
};

/**
 * Webhook Event Ingestion (POST)
 */
const handleWebhook = async (req, res, next) => {
  try {
    const body = req.body;
    logger.info(`Received WhatsApp Webhook body: ${JSON.stringify(body)}`);

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value
      ) {
        const value = body.entry[0].changes[0].value;

        // 1. Handle incoming messages
        if (value.messages && value.messages.length > 0) {
          for (const msg of value.messages) {
            const senderPhone = msg.from;
            const messageId = msg.id;
            const timestamp = new Date(parseInt(msg.timestamp) * 1000);
            let messageType = msg.type;
            let content = {};

            if (msg.type === 'text') {
              content = { text: msg.text.body };
            } else if (msg.type === 'button') {
              content = { buttonText: msg.button.text, payload: msg.button.payload };
              messageType = 'button_reply';
            } else if (msg.type === 'interactive') {
              const interactiveType = msg.interactive.type;
              if (interactiveType === 'button_reply') {
                content = {
                  buttonId: msg.interactive.button_reply.id,
                  buttonTitle: msg.interactive.button_reply.title
                };
                messageType = 'button_reply';
              } else if (interactiveType === 'list_reply') {
                content = {
                  listId: msg.interactive.list_reply.id,
                  listTitle: msg.interactive.list_reply.title,
                  description: msg.interactive.list_reply.description
                };
                messageType = 'interactive';
              }
            } else {
              content = { raw: msg[msg.type] || {} };
            }

            // Save incoming message in DB
            await WhatsAppMessage.create({
              whatsappMessageId: messageId,
              type: 'received',
              from: senderPhone,
              to: 'System',
              messageType,
              content,
              status: 'received',
              statusHistory: [{ status: 'received', timestamp }],
              timestamp
            });

            logger.info(`Saved incoming message from ${senderPhone}: ${JSON.stringify(content)}`);
          }
        }

        // 2. Handle message delivery status updates
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            const messageId = statusObj.id;
            const status = statusObj.status; // sent, delivered, read, failed
            const timestamp = new Date(parseInt(statusObj.timestamp) * 1000);
            
            const updateFields = {
              status,
              $push: { statusHistory: { status, timestamp } }
            };

            if (status === 'failed' && statusObj.errors) {
              updateFields.error = statusObj.errors;
            }

            const updated = await WhatsAppMessage.findOneAndUpdate(
              { whatsappMessageId: messageId },
              updateFields,
              { new: true }
            );

            if (updated) {
              logger.info(`Updated message ${messageId} status to ${status}`);
            } else {
              logger.warn(`Received status update for untracked message ID: ${messageId}`);
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).send('Not Found');
    }
  } catch (error) {
    logger.error(`Webhook handler error: ${error.message}`);
    next(error);
  }
};

/**
 * Developer-friendly simulation endpoint (POST)
 */
const simulateWebhookEvent = async (req, res, next) => {
  try {
    const { eventType, phone, text, messageId, status } = req.body;

    logger.info(`Simulating webhook event: ${eventType}`);

    if (eventType === 'incoming_message') {
      const mockMsgId = messageId || `wamid.sim.${Math.random().toString(36).substring(2, 10)}`;
      const incoming = await WhatsAppMessage.create({
        whatsappMessageId: mockMsgId,
        type: 'received',
        from: phone || '919876543210',
        to: 'System',
        messageType: 'text',
        content: { text: text || 'Hello, I have an inquiry about fertilizers.' },
        status: 'received',
        statusHistory: [{ status: 'received', timestamp: new Date() }]
      });

      return res.status(201).json({
        success: true,
        message: 'Incoming message simulated successfully',
        data: incoming
      });
    }

    if (eventType === 'status_update') {
      if (!messageId) {
        return res.status(400).json({ success: false, message: 'messageId is required to update status' });
      }

      const targetStatus = status || 'delivered';
      const updated = await WhatsAppMessage.findOneAndUpdate(
        { whatsappMessageId: messageId },
        {
          status: targetStatus,
          $push: { statusHistory: { status: targetStatus, timestamp: new Date() } }
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: `Message with ID ${messageId} not found` });
      }

      return res.status(200).json({
        success: true,
        message: `Status updated to ${targetStatus} successfully`,
        data: updated
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid simulation eventType' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dynamic settings
 */
const getWhatsAppSettings = async (req, res, next) => {
  try {
    const settings = await whatsAppService.getSettings();
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update dynamic settings
 */
const updateWhatsAppSettings = async (req, res, next) => {
  try {
    let settings = await WhatsAppSettings.findOne();
    if (!settings) {
      settings = new WhatsAppSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'WhatsApp settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch messages logs history
 */
const getMessageLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;
    if (req.query.phone) {
      query.$or = [
        { from: new RegExp(req.query.phone, 'i') },
        { to: new RegExp(req.query.phone, 'i') }
      ];
    }

    const total = await WhatsAppMessage.countDocuments(query);
    const logs = await WhatsAppMessage.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry failed message
 */
const retryFailedMessage = async (req, res, next) => {
  try {
    const log = await WhatsAppMessage.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Message log not found' });
    }

    if (log.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Only failed messages can be retried' });
    }

    logger.info(`Retrying failed message ID: ${log._id} to ${log.to}`);

    let retryResult;
    if (log.messageType === 'text') {
      retryResult = await whatsAppService.sendMessage(log.to, log.content.text);
    } else if (log.messageType === 'document') {
      retryResult = await whatsAppService.sendDocumentMessage(log.to, log.content.mediaId, log.content.caption, log.content.filename);
    } else if (log.messageType === 'image') {
      retryResult = await whatsAppService.sendMessage(log.to, log.content.caption || 'Product image retry');
    } else if (log.messageType === 'template') {
      retryResult = await whatsAppService.sendTemplateMessage(log.to, log.content.templateName, log.content.components);
    } else {
      return res.status(400).json({ success: false, message: 'Cannot retry unknown message type' });
    }

    if (retryResult.success) {
      log.status = 'sent';
      log.whatsappMessageId = retryResult.messageId;
      log.error = null;
      log.statusHistory.push({ status: 'sent', timestamp: new Date() });
      await log.save();

      return res.status(200).json({
        success: true,
        message: 'Message retried and sent successfully',
        data: log
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Retry failed',
        error: retryResult.error
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Share Product Catalog
 */
const shareProductCatalog = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Recipient phone number is required' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const stock = await Stock.findOne({ product: product._id }).select('quantity');
    const productWithStock = {
      ...product.toObject(),
      quantity: stock?.quantity || 0
    };

    logger.info(`Sharing product ${product.name} with ${phone}`);
    const result = await whatsAppService.sendProductCatalog(phone, productWithStock);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Product catalog shared successfully on WhatsApp',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to share product catalog',
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
};


/**
 * Manually trigger a payment reminder (Admin/Staff only)
 */
const triggerPaymentReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findById(req.params.id).populate('customer');
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder record not found' });
    }

    if (reminder.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'This payment is already fully paid.' });
    }

    logger.info(`Manually triggering payment reminder for Farmer ${reminder.customer.name}`);
    const result = await whatsAppService.sendPaymentReminder(reminder);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Payment reminder sent successfully',
        data: reminder
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send payment reminder',
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Product Image (Multer Handler)
 */
const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const relativeUrl = `/uploads/products/${req.file.filename}`;
    product.imageUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product image uploaded successfully',
      imageUrl: product.imageUrl,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger a sale invoice send (Admin/Staff only)
 */
const sendManualSaleInvoice = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    logger.info(`Manually triggering WhatsApp invoice for Sale: ${sale.saleNumber}`);
    const result = await whatsAppService.sendInvoicePdf(sale._id);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'WhatsApp invoice sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send WhatsApp invoice',
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  simulateWebhookEvent,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getMessageLogs,
  retryFailedMessage,
  shareProductCatalog,
  triggerPaymentReminder,
  uploadProductImage,
  sendManualSaleInvoice
};
