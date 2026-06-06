const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { MONGO_URI } = require('./src/config/env');
const Farmer = require('./src/models/Farmer');
const Category = require('./src/models/Category');
const Supplier = require('./src/models/Supplier');
const Product = require('./src/models/Product');
const Sale = require('./src/models/Sale');
const Reminder = require('./src/models/Reminder');
const WhatsAppSettings = require('./src/models/WhatsAppSettings');
const WhatsAppMessage = require('./src/models/WhatsAppMessage');
const InvoiceHistory = require('./src/models/InvoiceHistory');
const NotificationLog = require('./src/models/NotificationLog');

const whatsAppService = require('./src/services/whatsAppService');
const logger = require('./src/utils/logger');

const runTest = async () => {
  logger.info('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  logger.info('Database Connected successfully.');

  try {
    // 1. Set up / Ensure WhatsApp settings exist
    logger.info('Setting up default WhatsApp Settings...');
    let settings = await WhatsAppSettings.findOne();
    if (!settings) {
      settings = await WhatsAppSettings.create({
        accessToken: 'YOUR_META_ACCESS_TOKEN_PLACEHOLDER',
        phoneNumberId: 'YOUR_PHONE_NUMBER_ID_PLACEHOLDER',
        businessAccountId: 'YOUR_BUSINESS_ACCOUNT_ID_PLACEHOLDER',
        webhookVerifyToken: 'my_test_verification_token',
        adminPhoneNumber: '919999999999',
        isConfigured: false // This triggers Mock Mode
      });
      logger.info('Default settings created.');
    } else {
      logger.info(`Existing settings found. configured: ${settings.isConfigured}, Mock Mode: ${whatsAppService.isMockMode(settings)}`);
    }

    // 2. Create mock Farmer
    logger.info('Creating mock farmer...');
    let farmer = await Farmer.findOne({ phone: '919876543210' });
    if (!farmer) {
      farmer = await Farmer.create({
        name: 'Ramrao Patil',
        phone: '919876543210',
        village: 'Koregaon',
        district: 'Satara',
        landSize: '5 Acres',
        crops: 'Sugarcane',
        state: 'Maharashtra',
        soilType: 'Black'
      });
      logger.info('Mock farmer created.');
    }

    // 3. Create mock Category & Supplier
    logger.info('Setting up mock category and supplier...');
    let category = await Category.findOne({ name: 'Fertilizers' });
    if (!category) {
      category = await Category.create({ name: 'Fertilizers', description: 'Chemical and organic fertilizers' });
    }
    let supplier = await Supplier.findOne({ name: 'Mahadhan Ltd' });
    if (!supplier) {
      supplier = await Supplier.create({ name: 'Mahadhan Ltd', contactPerson: 'Pravin Maske', phone: '919888877777', email: 'mahadhan@test.com', address: 'Industrial Area, Pune' });
    }

    // 4. Create mock Product
    logger.info('Creating mock product...');
    let product = await Product.findOne({ name: 'Urea Premium' });
    if (!product) {
      product = await Product.create({
        name: 'Urea Premium',
        category: category._id,
        supplier: supplier._id,
        unit: 'bag',
        price: 450,
        reorderLevel: 15,
        description: 'High nitrogen urea bags',
        quantity: 50,
        sellingPrice: 450,
        purchasePrice: 400
      });
      logger.info('Mock product created.');
    }

    // 5. Create mock Sale (Invoice)
    logger.info('Creating mock sale/invoice...');
    const saleData = {
      saleNumber: `SAL-TEST-${Date.now().toString().slice(-4)}`,
      customer: farmer._id,
      farmerId: farmer._id,
      items: [{
        product: product._id,
        quantity: 5,
        price: 450
      }],
      totalAmount: 2250,
      paymentMethod: 'UPI'
    };
    const sale = await Sale.create(saleData);
    logger.info(`Mock sale created: ${sale.saleNumber}`);

    // 6. Test PDF Generation and WhatsApp Invoice sending (Mock mode)
    logger.info('Testing PDF invoice generation and WhatsApp sending (Mock Mode)...');
    const invoiceRes = await whatsAppService.sendInvoicePdf(sale._id);
    logger.info(`Invoice send result: ${JSON.stringify(invoiceRes)}`);

    // Verify generated file exists
    const fileName = `invoice-${sale.saleNumber}.pdf`;
    const invoicePath = path.resolve(__dirname, 'uploads/invoices', fileName);
    if (fs.existsSync(invoicePath)) {
      logger.info(`SUCCESS: Invoice PDF successfully generated at: ${invoicePath}`);
    } else {
      logger.error(`FAILURE: Invoice PDF was not found at: ${invoicePath}`);
    }

    // Verify InvoiceHistory record is created
    const invHistory = await InvoiceHistory.findOne({ sale: sale._id });
    if (invHistory) {
      logger.info(`SUCCESS: Invoice History stored in DB. Status: ${invHistory.sentStatus}`);
    } else {
      logger.error('FAILURE: Invoice History record not found in DB');
    }

    // 7. Test Message log insertions
    const sentMsg = await WhatsAppMessage.findOne({ to: '919876543210', messageType: 'document' });
    if (sentMsg) {
      logger.info(`SUCCESS: Document WhatsAppMessage log saved in DB. Status: ${sentMsg.status}`);
    } else {
      logger.error('FAILURE: WhatsAppMessage log not found in DB');
    }

    // 8. Test Product Catalog sharing
    logger.info('Testing Product Catalog sharing...');
    const catRes = await whatsAppService.sendProductCatalog(farmer.phone, product);
    logger.info(`Catalog share result: ${JSON.stringify(catRes)}`);

    // 9. Test Low Stock alert simulation
    logger.info('Evaluating product stock level alert trigger...');
    product.quantity = 8; // set quantity below reorderLevel (15)
    await product.save();
    
    // Trigger low stock evaluation manually
    const { runLowStockAlerts } = require('./src/config/cron');
    await runLowStockAlerts();
    
    const stockAlertLog = await NotificationLog.findOne({ type: 'low_stock', referenceId: product._id });
    if (stockAlertLog) {
      logger.info(`SUCCESS: Low Stock alert evaluated and NotificationLog recorded: "${stockAlertLog.message}"`);
    } else {
      logger.error('FAILURE: Low stock notification log was not recorded');
    }

    // 10. Test Payment reminder creation and cron run
    logger.info('Testing payment reminders...');
    const reminder = await Reminder.create({
      customer: farmer._id,
      sale: sale._id,
      amountDue: 2250,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday (so it is due)
      paymentStatus: 'Pending'
    });

    const { runPaymentDueReminders } = require('./src/config/cron');
    await runPaymentDueReminders();

    const reminderLog = await NotificationLog.findOne({ type: 'payment_reminder', referenceId: reminder._id });
    if (reminderLog) {
      logger.info(`SUCCESS: Payment reminder notification log found: "${reminderLog.message}"`);
    } else {
      logger.error('FAILURE: Payment reminder notification log was not found');
    }

    logger.info('All tests completed. Cleaning up temporary test records...');
    
    // Clean up test records
    await Sale.deleteOne({ _id: sale._id });
    await Reminder.deleteOne({ _id: reminder._id });
    logger.info('Cleanup complete.');

  } catch (error) {
    logger.error(`Test run encountered an error: ${error.stack}`);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed.');
  }
};

runTest();
