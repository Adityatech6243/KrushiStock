const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const WhatsAppSettings = require('../models/WhatsAppSettings');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const NotificationLog = require('../models/NotificationLog');
const InvoiceHistory = require('../models/InvoiceHistory');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// Get current configuration from DB or fallback settings
const getSettings = async () => {
  try {
    let settings = await WhatsAppSettings.findOne();
    if (!settings) {
      // Create default settings if not exists
      settings = await WhatsAppSettings.create({
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'krushistock_verify_token',
        adminPhoneNumber: process.env.ADMIN_PHONE_NUMBER || '',
        lowStockAlertsEnabled: true,
        paymentRemindersEnabled: true,
        catalogSharingEnabled: true,
        lowStockThreshold: 10
      });
    } else {
      // Automatically sync non-empty .env parameters to the database settings document
      let updated = false;
      if (process.env.WHATSAPP_ACCESS_TOKEN && settings.accessToken !== process.env.WHATSAPP_ACCESS_TOKEN) {
        settings.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        updated = true;
      }
      if (process.env.WHATSAPP_PHONE_NUMBER_ID && settings.phoneNumberId !== process.env.WHATSAPP_PHONE_NUMBER_ID) {
        settings.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        updated = true;
      }
      if (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID && settings.businessAccountId !== process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
        settings.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
        updated = true;
      }
      if (process.env.ADMIN_PHONE_NUMBER && settings.adminPhoneNumber !== process.env.ADMIN_PHONE_NUMBER) {
        settings.adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER;
        updated = true;
      }
      if (updated) {
        await settings.save();
        logger.info('WhatsApp credentials updated in database from .env configuration file.');
      }
    }
    return settings;
  } catch (error) {
    logger.error(`Error fetching WhatsApp settings: ${error.message}`);
    return null;
  }
};

// Check if we should use Mock Mode
const isMockMode = (settings) => {
  if (process.env.MOCK_WHATSAPP === 'true') return true;
  if (!settings || !settings.accessToken || !settings.phoneNumberId || settings.accessToken.startsWith('YOUR_') || settings.phoneNumberId.startsWith('YOUR_') || !settings.isConfigured) {
    return true;
  }
  return false;
};

/**
 * Send custom text message
 */
const sendMessage = async (to, text) => {
  const settings = await getSettings();
  const mock = isMockMode(settings);
  const formattedPhone = formatPhoneNumber(to);
  const whatsappMessageId = `wamid.${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  logger.info(`Sending WhatsApp message to ${formattedPhone} (Mock: ${mock})`);

  if (mock) {
    // Log to DB
    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: 'System (Mock)',
      to: formattedPhone,
      messageType: 'text',
      content: { text },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }],
      metadata: { mock: true }
    });

    // Auto-progress status for testing if database is still connected
    setTimeout(async () => {
      try {
        if (mongoose.connection.readyState === 1) {
          await WhatsAppMessage.findOneAndUpdate(
            { whatsappMessageId },
            { 
              status: 'read',
              $push: { statusHistory: { status: 'delivered', timestamp: new Date() } }
            }
          );
          await WhatsAppMessage.findOneAndUpdate(
            { whatsappMessageId },
            { $push: { statusHistory: { status: 'read', timestamp: new Date() } } }
          );
        }
      } catch (e) {
        logger.error(`Error auto-progressing mock status: ${e.message}`);
      }
    }, 1500);

    return { success: true, messageId: whatsappMessageId, mock: true };
  }

  // Real WhatsApp Business API Call
  try {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const realId = response.data.messages[0].id;

    await WhatsAppMessage.create({
      whatsappMessageId: realId,
      type: 'sent',
      from: settings.phoneNumberId,
      to: formattedPhone,
      messageType: 'text',
      content: { text },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }]
    });

    return { success: true, messageId: realId };
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    logger.error(`Real WhatsApp Send Error: ${JSON.stringify(errorDetails)}`);
    
    // Log failure
    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: settings ? settings.phoneNumberId : 'System',
      to: formattedPhone,
      messageType: 'text',
      content: { text },
      status: 'failed',
      statusHistory: [{ status: 'failed', timestamp: new Date() }],
      error: errorDetails
    });

    return { success: false, error: errorDetails };
  }
};

/**
 * Send template message
 */
const sendTemplateMessage = async (to, templateName, components = []) => {
  const settings = await getSettings();
  const mock = isMockMode(settings);
  const formattedPhone = formatPhoneNumber(to);
  const whatsappMessageId = `wamid.tpl.${Math.random().toString(36).substring(2, 15)}`;

  logger.info(`Sending WhatsApp template (${templateName}) to ${formattedPhone} (Mock: ${mock})`);

  if (mock) {
    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: 'System (Mock)',
      to: formattedPhone,
      messageType: 'template',
      content: { templateName, components },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }],
      metadata: { mock: true }
    });

    return { success: true, messageId: whatsappMessageId, mock: true };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const realId = response.data.messages[0].id;

    await WhatsAppMessage.create({
      whatsappMessageId: realId,
      type: 'sent',
      from: settings.phoneNumberId,
      to: formattedPhone,
      messageType: 'template',
      content: { templateName, components },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }]
    });

    return { success: true, messageId: realId };
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    logger.error(`Real WhatsApp Template Send Error: ${JSON.stringify(errorDetails)}`);

    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: settings.phoneNumberId,
      to: formattedPhone,
      messageType: 'template',
      content: { templateName, components },
      status: 'failed',
      statusHistory: [{ status: 'failed', timestamp: new Date() }],
      error: errorDetails
    });

    return { success: false, error: errorDetails };
  }
};

/**
 * Upload local file to WhatsApp media storage
 */
const uploadMedia = async (filePath, fileType = 'application/pdf') => {
  const settings = await getSettings();
  const mock = isMockMode(settings);

  logger.info(`Uploading media file: ${filePath} (Mock: ${mock})`);

  if (mock) {
    const mockMediaId = `media_${Math.random().toString(36).substring(2, 12)}`;
    return { success: true, mediaId: mockMediaId, mock: true };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/media`;
    
    const fileStream = fs.createReadStream(filePath);
    const response = await axios.post(
      url,
      {
        file: fileStream,
        type: fileType,
        messaging_product: 'whatsapp'
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return { success: true, mediaId: response.data.id };
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    logger.error(`WhatsApp Media Upload Error: ${JSON.stringify(errorDetails)}`);
    return { success: false, error: errorDetails };
  }
};

/**
 * Send uploaded document message
 */
const sendDocumentMessage = async (to, mediaId, caption, filename) => {
  const settings = await getSettings();
  const mock = isMockMode(settings);
  const formattedPhone = formatPhoneNumber(to);
  const whatsappMessageId = `wamid.doc.${Math.random().toString(36).substring(2, 15)}`;

  logger.info(`Sending document WhatsApp message to ${formattedPhone} (Media ID: ${mediaId}) (Mock: ${mock})`);

  if (mock) {
    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: 'System (Mock)',
      to: formattedPhone,
      messageType: 'document',
      content: { mediaId, caption, filename },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }],
      metadata: { mock: true }
    });
    return { success: true, messageId: whatsappMessageId, mock: true };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'document',
        document: {
          id: mediaId,
          caption: caption || '',
          filename: filename || 'document.pdf'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const realId = response.data.messages[0].id;

    await WhatsAppMessage.create({
      whatsappMessageId: realId,
      type: 'sent',
      from: settings.phoneNumberId,
      to: formattedPhone,
      messageType: 'document',
      content: { mediaId, caption, filename },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }]
    });

    return { success: true, messageId: realId };
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    logger.error(`WhatsApp Document Send Error: ${JSON.stringify(errorDetails)}`);

    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: settings.phoneNumberId,
      to: formattedPhone,
      messageType: 'document',
      content: { mediaId, caption, filename },
      status: 'failed',
      statusHistory: [{ status: 'failed', timestamp: new Date() }],
      error: errorDetails
    });

    return { success: false, error: errorDetails };
  }
};

/**
 * Send Invoice PDF automatically on WhatsApp
 */
const sendInvoicePdf = async (saleId) => {
  try {
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('items.product');

    if (!sale) {
      logger.error(`Cannot send WhatsApp invoice: Sale ${saleId} not found`);
      return { success: false, error: 'Sale not found' };
    }

    if (!sale.customer || !sale.customer.phone) {
      logger.warn(`Skipping WhatsApp invoice: Sale ${sale.saleNumber} has no farmer phone number`);
      return { success: false, error: 'Customer phone number not available' };
    }

    const fileName = `invoice-${sale.saleNumber}.pdf`;
    const relativePath = `uploads/invoices/${fileName}`;
    const absolutePath = path.resolve(__dirname, '../../', relativePath);

    logger.info(`Generating invoice PDF for Sale ${sale.saleNumber}...`);
    await generateInvoicePDF(sale, absolutePath);

    // Create InvoiceHistory log
    const invoiceLog = await InvoiceHistory.create({
      sale: sale._id,
      customer: sale.customer._id,
      pdfPath: relativePath,
      sentStatus: 'Pending'
    });

    // Upload to WhatsApp
    logger.info(`Uploading invoice PDF to WhatsApp...`);
    const uploadRes = await uploadMedia(absolutePath, 'application/pdf');

    if (!uploadRes.success) {
      invoiceLog.sentStatus = 'Failed';
      invoiceLog.errorMessage = `Media upload failed: ${JSON.stringify(uploadRes.error)}`;
      await invoiceLog.save();

      // Log in system logs
      await NotificationLog.create({
        type: 'invoice',
        recipient: sale.customer.phone,
        referenceId: sale._id,
        referenceModel: 'Sale',
        message: `Failed to upload invoice PDF for ${sale.saleNumber}`,
        status: 'failed',
        error: JSON.stringify(uploadRes.error)
      });

      return { success: false, error: 'Upload failed' };
    }

    invoiceLog.mediaId = uploadRes.mediaId;
    await invoiceLog.save();

    // Send Document message
    const caption = `Thank you for your purchase. Your invoice #${sale.saleNumber} is attached.`;
    logger.info(`Sending invoice document to ${sale.customer.phone}...`);
    const sendRes = await sendDocumentMessage(sale.customer.phone, uploadRes.mediaId, caption, fileName);

    if (sendRes.success) {
      invoiceLog.sentStatus = 'Sent';
      invoiceLog.sentAt = new Date();
      await invoiceLog.save();

      await NotificationLog.create({
        type: 'invoice',
        recipient: sale.customer.phone,
        referenceId: sale._id,
        referenceModel: 'Sale',
        message: caption,
        status: 'success'
      });

      return { success: true, messageId: sendRes.messageId };
    } else {
      invoiceLog.sentStatus = 'Failed';
      invoiceLog.errorMessage = `Document sending failed: ${JSON.stringify(sendRes.error)}`;
      await invoiceLog.save();

      await NotificationLog.create({
        type: 'invoice',
        recipient: sale.customer.phone,
        referenceId: sale._id,
        referenceModel: 'Sale',
        message: `Failed to send invoice PDF for ${sale.saleNumber}`,
        status: 'failed',
        error: JSON.stringify(sendRes.error)
      });

      return { success: false, error: 'Send failed' };
    }
  } catch (err) {
    logger.error(`sendInvoicePdf error: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Send Low Stock Alert to Admin
 */
const sendLowStockAlert = async (product, adminPhone) => {
  try {
    const text = `Low Stock Alert: ${product.name} remaining quantity is ${product.quantity} ${product.unit}(s).`;
    const res = await sendMessage(adminPhone, text);
    
    await NotificationLog.create({
      type: 'low_stock',
      recipient: adminPhone,
      referenceId: product._id,
      referenceModel: 'Product',
      message: text,
      status: res.success ? 'success' : 'failed',
      error: res.success ? null : JSON.stringify(res.error)
    });

    return res;
  } catch (error) {
    logger.error(`sendLowStockAlert error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send Payment Reminder to Farmer
 */
const sendPaymentReminder = async (reminder) => {
  try {
    const customer = reminder.customer;
    if (!customer || !customer.phone) {
      throw new Error('Customer or customer phone number is missing');
    }

    const text = `Reminder: Your pending payment is INR ${reminder.amountDue.toLocaleString()}. Please clear it soon. Thank you!`;
    const res = await sendMessage(customer.phone, text);

    if (res.success) {
      reminder.lastReminderSent = new Date();
      reminder.reminderCount += 1;
      await reminder.save();
    }

    await NotificationLog.create({
      type: 'payment_reminder',
      recipient: customer.phone,
      referenceId: reminder._id,
      referenceModel: 'Reminder',
      message: text,
      status: res.success ? 'success' : 'failed',
      error: res.success ? null : JSON.stringify(res.error)
    });

    return res;
  } catch (error) {
    logger.error(`sendPaymentReminder error: ${error.message}`);
    return { success: false, error: error.message };
  }
};


/**
 * Share Product Catalog Details
 */
const sendProductCatalog = async (to, product) => {
  const settings = await getSettings();
  const mock = isMockMode(settings);
  const formattedPhone = formatPhoneNumber(to);
  const whatsappMessageId = `wamid.cat.${Math.random().toString(36).substring(2, 15)}`;

  const availability = product.quantity > 0 ? 'In Stock' : 'Out of Stock';
  const text = `Product Details:\n🌾 *Name:* ${product.name}\n💰 *Price:* INR ${product.sellingPrice || product.price}\n📦 *Availability:* ${availability}\nℹ️ *Description:* ${product.description || 'No description available.'}`;

  logger.info(`Sharing product ${product.name} to ${formattedPhone} (Mock: ${mock})`);

  if (!product.imageUrl) {
    return await sendMessage(to, text);
  }

  if (mock) {
    await WhatsAppMessage.create({
      whatsappMessageId,
      type: 'sent',
      from: 'System (Mock)',
      to: formattedPhone,
      messageType: 'image',
      content: { imageUrl: product.imageUrl, caption: text },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }],
      metadata: { mock: true }
    });
    return { success: true, messageId: whatsappMessageId, mock: true };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'image',
        image: {
          link: product.imageUrl,
          caption: text
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const realId = response.data.messages[0].id;

    await WhatsAppMessage.create({
      whatsappMessageId: realId,
      type: 'sent',
      from: settings.phoneNumberId,
      to: formattedPhone,
      messageType: 'image',
      content: { imageUrl: product.imageUrl, caption: text },
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }]
    });

    return { success: true, messageId: realId };
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    logger.error(`WhatsApp Image Share Error: ${JSON.stringify(errorDetails)}`);
    return await sendMessage(to, text);
  }
};

/**
 * Format phone number to E.164 without leading + or 00
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

module.exports = {
  getSettings,
  isMockMode,
  sendMessage,
  sendTemplateMessage,
  uploadMedia,
  sendDocumentMessage,
  sendInvoicePdf,
  sendLowStockAlert,
  sendPaymentReminder,
  sendProductCatalog,
  formatPhoneNumber
};
