const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
const User = require('../src/models/User');

const farmersMock = require('../mock-data/farmers');
const suppliersMock = require('../mock-data/suppliers');
const productsMock = require('../mock-data/products');
const factory = require('../factories/dataFactory');

const seedDatabase = async (options = { clearExisting: true }) => {
  try {
    console.log('Starting Database Seeder...');

    // 1. Get or Create Admin User
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('No admin user found. Creating default admin...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);
      adminUser = await User.create({
        name: 'Admin User',
        username: 'admin',
        email: 'adityapatil4703@gmail.com',
        password: hashedPassword,
        phone: '7820974939',
        role: 'admin'
      });
      console.log('Default admin created (username: admin, password: Admin@123)');
    }

    const creatorId = adminUser._id;

    // 2. Clear Existing Collections if requested
    if (options.clearExisting) {
      console.log('Clearing existing collection data...');
      await Category.deleteMany({});
      await Supplier.deleteMany({});
      await Farmer.deleteMany({});
      await Product.deleteMany({});
      await Stock.deleteMany({});
      await Purchase.deleteMany({});
      await Sale.deleteMany({});
      await InvoiceHistory.deleteMany({});
      await Reminder.deleteMany({});
      await NotificationLog.deleteMany({});
      await WhatsAppMessage.deleteMany({});
      console.log('Collections cleared successfully.');
    }

    // 3. Seed Categories
    console.log('Seeding Categories...');
    const categoryNames = ['Seeds', 'Fertilizers', 'Pesticides', 'Insecticides', 'Farming Tools'];
    const categoryDocs = [];
    for (const name of categoryNames) {
      const cat = await Category.create({
        name,
        description: `High-quality farming inputs related to ${name.toLowerCase()}`,
        createdBy: creatorId,
        updatedBy: creatorId
      });
      categoryDocs.push(cat);
    }
    console.log(`Seeded ${categoryDocs.length} Categories.`);

    // 4. Seed Suppliers
    console.log('Seeding Suppliers...');
    const supplierDocs = [];
    for (const sup of suppliersMock) {
      const doc = await Supplier.create({
        ...sup,
        createdBy: creatorId,
        updatedBy: creatorId
      });
      supplierDocs.push(doc);
    }
    console.log(`Seeded ${supplierDocs.length} Suppliers.`);

    // 5. Seed Farmers
    console.log('Seeding Farmers (Kagal Taluka, Kolhapur)...');
    const farmerDocs = [];
    for (const farmer of farmersMock) {
      const doc = await Farmer.create({
        ...farmer,
        createdBy: creatorId,
        updatedBy: creatorId
      });
      farmerDocs.push(doc);
    }
    console.log(`Seeded ${farmerDocs.length} Farmers.`);

    // 6. Seed Products
    console.log('Seeding Products...');
    const productDocs = [];
    const productMap = {}; // Maps product name to document
    
    for (const prodTemplate of productsMock) {
      const category = categoryDocs.find(c => c.name === prodTemplate.categoryName);
      const supplier = supplierDocs.find(s => s.name === prodTemplate.supplierName);

      if (!category || !supplier) {
        console.warn(`Category ${prodTemplate.categoryName} or Supplier ${prodTemplate.supplierName} not found for product ${prodTemplate.name}`);
        continue;
      }

      // We initialize quantity to 0 because we will compute and seed it from transaction math
      const product = await Product.create({
        name: prodTemplate.name,
        category: category._id,
        supplier: supplier._id,
        unit: prodTemplate.unit,
        price: prodTemplate.price,
        purchasePrice: prodTemplate.purchasePrice,
        sellingPrice: prodTemplate.sellingPrice,
        reorderLevel: prodTemplate.reorderLevel,
        description: prodTemplate.description,
        batchNumber: prodTemplate.batchNumber,
        manufactureDate: new Date('2024-12-01'),
        expiryDate: new Date('2027-12-01'), // Long expiry to test Fresh status
        supplierName: supplier.name,
        quantity: 0,
        stockStatus: prodTemplate.stockStatus,
        createdBy: creatorId,
        updatedBy: creatorId
      });

      productDocs.push(product);
      productMap[product.name] = product;
    }
    console.log(`Seeded ${productDocs.length} Products.`);

    // 7. Generate Chronological Transactions (Jan 2025 to May 2026)
    console.log('Generating sales and purchase transaction logs...');
    const purchases = [];
    const sales = [];
    
    let purchaseCounter = 1;
    let saleCounter = 1;

    // Track total quantities sold and purchased for mathematical consistency
    const totalSold = {};
    const totalPurchased = {};
    productDocs.forEach(p => {
      totalSold[p._id.toString()] = 0;
      totalPurchased[p._id.toString()] = 0;
    });

    const startYear = 2025;
    const endYear = 2026;
    const endMonth = 4; // May (0-indexed is 4)

    for (let year = startYear; year <= endYear; year++) {
      const startM = (year === 2025) ? 0 : 0;
      const endM = (year === 2026) ? endMonth : 11;

      for (let month = startM; month <= endM; month++) {
        const monthDateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        // 7a. Seed Purchases for this month (3 purchases per month)
        for (let pIndex = 0; pIndex < 3; pIndex++) {
          const randomSupplier = supplierDocs[Math.floor(Math.random() * supplierDocs.length)];
          const supplierProducts = productDocs.filter(prod => prod.supplier.toString() === randomSupplier._id.toString());
          
          if (supplierProducts.length === 0) continue;

          const date = factory.getRandomDateInMonth(year, month);
          const purData = factory.generatePurchase(purchaseCounter++, randomSupplier, supplierProducts, date);
          
          // Track quantities
          purData.items.forEach(item => {
            totalPurchased[item.product.toString()] += item.quantity;
          });

          purchases.push(purData);
        }

        // 7b. Seed Sales for this month (6 sales per month)
        for (let sIndex = 0; sIndex < 6; sIndex++) {
          const randomFarmer = farmerDocs[Math.floor(Math.random() * farmerDocs.length)];
          const date = factory.getRandomDateInMonth(year, month);
          const saleData = factory.generateSale(saleCounter++, randomFarmer, productDocs, date);
          
          // Track quantities
          saleData.items.forEach(item => {
            totalSold[item.product.toString()] += item.quantity;
          });

          sales.push(saleData);
        }
      }
    }

    console.log(`Generated ${purchases.length} Purchase documents.`);
    console.log(`Generated ${sales.length} Sale documents.`);

    // 8. Calculate Initial Stock to guarantee final stock is positive and realistic
    console.log('Calculating consistent inventory and stock documents...');
    
    // We want some products to be low stock and some to be normal
    // Let's decide a target final stock for each product
    const stockDocs = [];
    for (const product of productDocs) {
      const pId = product._id.toString();
      const sold = totalSold[pId] || 0;
      const purchased = totalPurchased[pId] || 0;

      // We want to set a target final quantity.
      // We can make one of the products very low stock to trigger low-stock alerts
      let targetFinalQty = 25; // Default normal quantity
      
      // Let's make some items near reorder limits or low stock
      if (product.name.includes('Confidor') || product.name.includes('Sickle')) {
        targetFinalQty = Math.floor(Math.random() * 4) + 1; // 1-4 units (Low Stock!)
      } else if (product.name.includes('Urea')) {
        targetFinalQty = Math.floor(Math.random() * 30) + 40; // 40-70 bags
      } else if (product.name.includes('Buds')) {
        targetFinalQty = 500; // Sugarcane buds
      } else {
        targetFinalQty = Math.floor(Math.random() * 20) + 15; // 15-35 units
      }

      // Mathematically: Initial Stock = Final Stock + Sold - Purchased
      let initialStock = targetFinalQty + sold - purchased;

      // If initial stock is negative, it means we purchased less than we sold.
      // We must raise initial stock to at least 10, meaning final stock will be adjusted higher.
      if (initialStock < 10) {
        const adjustment = 10 - initialStock;
        initialStock = 10;
        targetFinalQty += adjustment;
      }

      // Update the Product document's quantity in the database
      product.quantity = targetFinalQty;
      
      // Let's determine lastSoldDate: find the latest sale date for this product
      const productSales = sales.filter(s => s.items.some(item => item.product.toString() === pId));
      if (productSales.length > 0) {
        const sortedSales = productSales.sort((a, b) => b.saleDate - a.saleDate);
        product.lastSoldDate = sortedSales[0].saleDate;
      }

      // Determine stock status: Let some products be expired or near expiry for reports
      if (product.name.includes('Chlorpyrifos')) {
        product.stockStatus = 'Near Expiry';
        product.expiryDate = new Date('2026-06-30'); // Next month
      } else if (product.name.includes('Chilli Seed')) {
        product.stockStatus = 'Expired';
        product.expiryDate = new Date('2026-03-01'); // Already expired
      } else if (product.name.includes('Gold')) {
        product.stockStatus = 'Dead Stock'; // Cotton seeds from last year not sold
      } else {
        product.stockStatus = 'Fresh';
      }

      await product.save();

      // Create Stock document
      const stockDoc = await Stock.create({
        product: product._id,
        quantity: targetFinalQty,
        lowStockLimit: product.reorderLevel || 10,
        lastUpdated: new Date()
      });
      stockDocs.push(stockDoc);
    }
    console.log(`Seeded ${stockDocs.length} Stock inventory documents.`);

    // 9. Bulk Insert Purchases and Sales
    console.log('Bulk inserting purchases and sales into MongoDB...');
    const insertedPurchases = await Purchase.insertMany(purchases);
    const insertedSales = await Sale.insertMany(sales);
    console.log(`Successfully seeded ${insertedPurchases.length} purchases and ${insertedSales.length} sales.`);

    // 10. Seed Invoice Histories and Reminders
    console.log('Generating Invoices and Payment Reminders...');
    const invoiceDocs = [];
    const reminderDocs = [];

    for (const sale of insertedSales) {
      const farmer = farmerDocs.find(f => f._id.toString() === sale.customer.toString());
      if (!farmer) continue;

      // Seed Invoice history
      const invData = factory.generateInvoiceHistory(sale, farmer);
      invoiceDocs.push(invData);

      // Seed Reminder for high value or pending transactions (approx 20% of sales)
      if (sale.totalAmount > 1500 && Math.random() < 0.25) {
        const remData = factory.generateReminder(sale, farmer);
        reminderDocs.push(remData);
      }
    }

    const insertedInvoices = await InvoiceHistory.insertMany(invoiceDocs);
    const insertedReminders = await Reminder.insertMany(reminderDocs);
    console.log(`Seeded ${insertedInvoices.length} Invoice history entries.`);
    console.log(`Seeded ${insertedReminders.length} Payment Reminders.`);

    // 11. Seed Notification Logs
    console.log('Seeding Notification Logs...');
    const notificationLogs = [];

    // Add low stock logs for the low stock products
    const lowStockProducts = productDocs.filter(p => p.quantity <= p.reorderLevel);
    lowStockProducts.forEach(p => {
      notificationLogs.push(
        factory.generateNotificationLog(
          'low_stock',
          'Admin',
          p._id,
          'Product',
          `Alert: Product "${p.name}" has reached low stock level. Current quantity: ${p.quantity}`,
          true,
          new Date()
        )
      );
    });

    // Add some invoice and payment reminders logs
    insertedReminders.slice(0, 5).forEach(rem => {
      const farmer = farmerDocs.find(f => f._id.toString() === rem.customer.toString());
      notificationLogs.push(
        factory.generateNotificationLog(
          'payment_reminder',
          farmer.phone,
          rem._id,
          'Reminder',
          `Payment Reminder: Dear ${farmer.name}, an amount of Rs. ${rem.amountDue} is outstanding for invoice ${rem.dueDate.toLocaleDateString()}. Please clear at your earliest.`,
          Math.random() > 0.1, // 90% success rate
          new Date(rem.createdAt.getTime() + 10 * 86400000)
        )
      );
    });

    const insertedLogs = await NotificationLog.insertMany(notificationLogs);
    console.log(`Seeded ${insertedLogs.length} Notification logs.`);

    // 12. Seed WhatsApp Message Simulative Logs
    console.log('Seeding WhatsApp message logs...');
    const whatsAppLogs = [];
    
    // Generate a set of realistic message exchanges for the last 5 farmers
    const testFarmers = farmerDocs.slice(0, 5);
    const textQueries = [
      "Hello KrushiStock, do you have Bayer Confidor in stock?",
      "Can I get IFFCO Urea delivered to Hamidwada?",
      "Send me the invoice for my last purchase of wheat seed.",
      "What is the price of DAP fertilizer today?",
      "Is organic Neem oil available in 1 litre bottles?"
    ];

    testFarmers.forEach((farmer, idx) => {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (idx * 2) - 1);
      
      // Incoming Farmer query
      whatsAppLogs.push(
        factory.generateWhatsAppMessage(
          farmer.phone,
          'received',
          'text',
          { text: textQueries[idx % textQueries.length] },
          'received',
          new Date(baseDate.getTime() - 3600000) // 1 hour ago
        )
      );

      // Outgoing automated/manual response
      whatsAppLogs.push(
        factory.generateWhatsAppMessage(
          farmer.phone,
          'sent',
          'text',
          { text: `Hello ${farmer.name}, thank you for contacting KrushiStock. Yes, we have that available. You can visit the store or we can arrange delivery.` },
          'read',
          baseDate
        )
      );
    });

    const insertedWAMessages = await WhatsAppMessage.insertMany(whatsAppLogs);
    console.log(`Seeded ${insertedWAMessages.length} WhatsApp Message logs.`);

    console.log('--------------------------------------------------');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
};

module.exports = { seedDatabase };
