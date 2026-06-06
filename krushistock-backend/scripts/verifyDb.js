const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const Farmer = require('../src/models/Farmer');
const Product = require('../src/models/Product');
const Stock = require('../src/models/Stock');
const Purchase = require('../src/models/Purchase');
const Sale = require('../src/models/Sale');
const InvoiceHistory = require('../src/models/InvoiceHistory');
const Reminder = require('../src/models/Reminder');
const NotificationLog = require('../src/models/NotificationLog');
const WhatsAppMessage = require('../src/models/WhatsAppMessage');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krushistock';

const verify = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for Verification.');

    console.log('\n--- COLLECTION COUNTS ---');
    const categoriesCount = await Category.countDocuments();
    const suppliersCount = await Supplier.countDocuments();
    const farmersCount = await Farmer.countDocuments();
    const productsCount = await Product.countDocuments();
    const stocksCount = await Stock.countDocuments();
    const purchasesCount = await Purchase.countDocuments();
    const salesCount = await Sale.countDocuments();
    const invoicesCount = await InvoiceHistory.countDocuments();
    const remindersCount = await Reminder.countDocuments();
    const notificationsCount = await NotificationLog.countDocuments();
    const whatsappCount = await WhatsAppMessage.countDocuments();

    console.log(`Categories: ${categoriesCount}`);
    console.log(`Suppliers: ${suppliersCount}`);
    console.log(`Farmers: ${farmersCount}`);
    console.log(`Products: ${productsCount}`);
    console.log(`Stock Items: ${stocksCount}`);
    console.log(`Purchases: ${purchasesCount}`);
    console.log(`Sales: ${salesCount}`);
    console.log(`Invoices: ${invoicesCount}`);
    console.log(`Reminders: ${remindersCount}`);
    console.log(`Notifications: ${notificationsCount}`);
    console.log(`WhatsApp Messages: ${whatsappCount}`);

    console.log('\n--- QUANTITY CONSISTENCY CHECK ---');
    const products = await Product.find({});
    let mismatches = 0;
    
    for (const prod of products) {
      const stock = await Stock.findOne({ product: prod._id });
      if (!stock) {
        console.error(`ERROR: Product "${prod.name}" has no corresponding Stock record.`);
        mismatches++;
        continue;
      }
      
      if (prod.quantity !== stock.quantity) {
        console.error(`MISMATCH: Product "${prod.name}" has quantity ${prod.quantity} but Stock shows ${stock.quantity}`);
        mismatches++;
      }
    }
    
    if (mismatches === 0) {
      console.log('SUCCESS: All Product and Stock quantities match perfectly.');
    } else {
      console.error(`WARNING: Found ${mismatches} mismatches.`);
    }

    console.log('\n--- REFERENCE CHECKS ---');
    // Sample Sale Reference check
    const sampleSale = await Sale.findOne().populate('customer').populate('items.product');
    if (sampleSale) {
      console.log(`Sample Sale: ${sampleSale.saleNumber}`);
      console.log(`  Customer Name: ${sampleSale.customer?.name || 'Null (Failed)'}`);
      console.log(`  First Item Product Name: ${sampleSale.items[0]?.product?.name || 'Null (Failed)'}`);
    } else {
      console.log('No sales found.');
    }

    // Sample Purchase Reference check
    const samplePurchase = await Purchase.findOne().populate('supplier').populate('items.product');
    if (samplePurchase) {
      console.log(`Sample Purchase: ${samplePurchase.purchaseNumber}`);
      console.log(`  Supplier Name: ${samplePurchase.supplier?.name || 'Null (Failed)'}`);
      console.log(`  First Item Product Name: ${samplePurchase.items[0]?.product?.name || 'Null (Failed)'}`);
    } else {
      console.log('No purchases found.');
    }

    console.log('\nVerification complete.');
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

verify();
