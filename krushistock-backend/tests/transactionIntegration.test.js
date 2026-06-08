const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { connectDB, clearCollections, disconnectDB } = require('./testHelper');

const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Supplier = require('../src/models/Supplier');
const Farmer = require('../src/models/Farmer');
const User = require('../src/models/User');
const Stock = require('../src/models/Stock');
const Purchase = require('../src/models/Purchase');
const PurchaseInvoice = require('../src/models/PurchaseInvoice');
const Sale = require('../src/models/Sale');
const Reminder = require('../src/models/Reminder');

const purchaseService = require('../src/services/purchaseService');
const { createSale } = require('../src/controllers/saleController');
const { generateAndPersistInvoice } = require('../src/services/saleInvoiceService');

describe('Transaction Integration Tests', () => {
  let userId;
  let categoryId;
  let productId;
  let supplierId;
  let farmerId;

  before(async () => {
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Create a mock user
    const user = await User.create({
      name: 'Test Administrator',
      username: 'testadmin',
      password: 'password123',
      role: 'admin'
    });
    userId = user._id;

    // Create a category
    const category = await Category.create({ name: 'Seeds' });
    categoryId = category._id;

    // Create a supplier
    const supplier = await Supplier.create({
      name: 'Kisan Seed Supplier',
      phone: '9876543210',
      address: 'Kolhapur, Maharashtra'
    });
    supplierId = supplier._id;

    // Create a product linked to category and supplier
    const product = await Product.create({
      name: 'Hybrid Corn Seeds',
      category: categoryId,
      supplier: supplierId,
      unit: 'bag',
      price: 250,
      purchasePrice: 200,
      sellingPrice: 250,
      mrp: 300,
      reorderLevel: 5
    });
    productId = product._id;

    // Create a farmer (customer)
    const farmer = await Farmer.create({
      name: 'Aditya Patil',
      phone: '7820974939',
      village: 'Hasur Khurd'
    });
    farmerId = farmer._id;
  });

  describe('Purchase Transaction Flow', () => {
    it('should create purchase, purchase invoice, and increment stock successfully', async () => {
      const purchaseData = {
        supplier: supplierId,
        purchaseDate: new Date(),
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        purchaseNumber: 'PUR-TEST-100',
        items: [{
          product: productId,
          quantity: 20,
          price: 205,
          sellingPrice: 260,
          mrp: 310,
          batchNumber: 'BATCH-CORN-1',
          expiryDate: new Date('2027-12-31'),
          manufactureDate: new Date('2026-06-01'),
          gst: 18
        }]
      };

      const result = await purchaseService.createPurchaseWithInvoice({
        purchaseData,
        userId
      });

      assert.ok(result.purchase);
      assert.ok(result.invoice);
      assert.strictEqual(result.purchase.purchaseNumber, 'PUR-TEST-100');
      assert.strictEqual(result.invoice.invoiceNumber, 'PUR-TEST-100');

      // Verify mathematical totals: subtotal = 20 * 205 = 4100. gstAmount = 4100 * 0.18 = 738. total = 4838.
      assert.strictEqual(result.invoice.subtotal, 4100);
      assert.strictEqual(result.invoice.gstAmount, 738);
      assert.strictEqual(result.invoice.totalAmount, 4838);

      // Verify stock increment
      const stock = await Stock.findOne({ product: productId });
      assert.ok(stock);
      assert.strictEqual(stock.quantity, 20);
      assert.strictEqual(stock.batches.length, 1);
      assert.strictEqual(stock.batches[0].batchNumber, 'BATCH-CORN-1');
      assert.strictEqual(stock.batches[0].quantity, 20);
      assert.strictEqual(stock.batches[0].purchasePrice, 205);

      // Verify product updates
      const updatedProduct = await Product.findById(productId);
      assert.strictEqual(updatedProduct.purchasePrice, 205);
      assert.strictEqual(updatedProduct.mrp, 310);
    });
  });

  describe('Sale Transaction Flow', () => {
    beforeEach(async () => {
      // Seed initial stock of 30 units for the product via a pre-existing stock setup
      await Stock.create({
        product: productId,
        quantity: 30,
        batches: [
          {
            batchNumber: 'BATCH-CORN-1',
            quantity: 30,
            expiryDate: new Date('2027-12-31'),
            purchasePrice: 200,
            sellingPrice: 250,
            mrp: 300
          }
        ]
      });
      await Product.findByIdAndUpdate(productId, { quantity: 30 });
    });



    it('should create a sale transaction for walk-in customer and deduct stock', async () => {
      const req = {
        body: {
          customer: '',
          saleDate: new Date(),
          paymentMethod: 'Cash',
          paymentStatus: 'Paid',
          saleNumber: 'SAL-TEST-100',
          items: [{
            product: productId.toString(),
            quantity: 5,
            price: 250,
            batchNumber: 'BATCH-CORN-1'
          }],
          totalAmount: 1250,
          amountPaid: 1250,
          amountDue: 0
        },
        user: { id: userId }
      };

      const res = {
        statusCode: null,
        jsonData: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      const next = (err) => { throw err; };

      await createSale(req, res, next);

      assert.strictEqual(res.statusCode, 201);
      assert.ok(res.jsonData.success);
      assert.ok(res.jsonData.data);

      const sale = res.jsonData.data;
      assert.strictEqual(sale.saleNumber, 'SAL-TEST-100');
      assert.strictEqual(sale.customer, null); // Normalized to null for walk-in

      // Verify stock decrement
      const stock = await Stock.findOne({ product: productId });
      assert.strictEqual(stock.quantity, 25);
      assert.strictEqual(stock.batches[0].quantity, 25);



      const SaleInvoice = require('../src/models/SaleInvoice');
      const saleInvoice = await SaleInvoice.findOne({ sale: sale._id });
      assert.ok(saleInvoice);
      assert.strictEqual(saleInvoice.totalAmount, 1250);
      assert.strictEqual(saleInvoice.customerName, 'Walk-in Customer');
    });

    it('should create a credit/partial sale for registered farmer and trigger a reminder', async () => {
      const req = {
        body: {
          customer: farmerId.toString(),
          saleDate: new Date(),
          paymentMethod: 'UPI',
          paymentStatus: 'Partial',
          saleNumber: 'SAL-TEST-200',
          items: [{
            product: productId.toString(),
            quantity: 10,
            price: 250,
            batchNumber: 'BATCH-CORN-1'
          }],
          totalAmount: 2500,
          amountPaid: 1000,
          amountDue: 1500
        },
        user: { id: userId }
      };

      const res = {
        statusCode: null,
        jsonData: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      const next = (err) => { throw err; };

      await createSale(req, res, next);

      assert.strictEqual(res.statusCode, 201);
      assert.ok(res.jsonData.data);

      const sale = res.jsonData.data;
      assert.strictEqual(sale.paymentStatus, 'Partial');
      assert.strictEqual(sale.amountDue, 1500);

      // Verify reminder is created
      const reminder = await Reminder.findOne({ sale: sale._id });
      assert.ok(reminder);
      assert.strictEqual(reminder.customer.toString(), farmerId.toString());
      assert.strictEqual(reminder.amountDue, 1500);
      assert.strictEqual(reminder.paymentStatus, 'Pending');

      // Verify customer's preferred products has hybrid corn seeds added
      const farmer = await Farmer.findById(farmerId);
      assert.ok(farmer.purchaseHistory.includes(productId));
    });
  });
});
