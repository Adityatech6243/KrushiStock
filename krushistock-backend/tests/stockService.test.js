const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { connectDB, clearCollections, disconnectDB } = require('./testHelper');

const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Stock = require('../src/models/Stock');
const StockMovement = require('../src/models/StockMovement');

const stockService = require('../src/services/stockService');
const stockMovementService = require('../src/services/stockMovementService');

describe('Stock Services Unit Tests', () => {
  let categoryId;
  let productId;

  before(async () => {
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearCollections();
    
    // Create base category and product for testing
    const category = await Category.create({ name: 'Fertilizers' });
    categoryId = category._id;

    const product = await Product.create({
      name: 'Urea Fertilizer',
      category: categoryId,
      unit: 'kg',
      price: 50,
      purchasePrice: 40,
      sellingPrice: 50,
      mrp: 60,
      reorderLevel: 10
    });
    productId = product._id;
  });

  describe('stockService Unit Tests', () => {
    it('should return 0 quantity for non-existent stock', async () => {
      const quantity = await stockService.getStockQuantity(productId);
      assert.strictEqual(quantity, 0);
    });

    it('should return correct quantity for existing stock', async () => {
      await Stock.create({
        product: productId,
        quantity: 15,
        batches: [{ batchNumber: 'B1', quantity: 15 }]
      });

      const quantity = await stockService.getStockQuantity(productId);
      assert.strictEqual(quantity, 15);
    });

    it('should return an empty map if no product IDs are provided', async () => {
      const stockMap = await stockService.getStockMap([]);
      assert.ok(stockMap instanceof Map);
      assert.strictEqual(stockMap.size, 0);
    });

    it('should return a populated stock map for provided products', async () => {
      await Stock.create({
        product: productId,
        quantity: 25,
        batches: [{ batchNumber: 'B1', quantity: 25 }]
      });

      const stockMap = await stockService.getStockMap([productId]);
      assert.ok(stockMap.has(productId.toString()));
      assert.strictEqual(stockMap.get(productId.toString()).quantity, 25);
      assert.strictEqual(stockMap.get(productId.toString()).batches.length, 1);
      assert.strictEqual(stockMap.get(productId.toString()).batches[0].batchNumber, 'B1');
    });
  });

  describe('stockMovementService Unit Tests', () => {
    it('should increment stock by creating a new batch', async () => {
      const result = await stockMovementService.mutateStock({
        productId,
        quantity: 50,
        type: 'purchase',
        referenceModel: 'Purchase',
        referenceId: new mongoose.Types.ObjectId(),
        referenceNumber: 'PUR-001',
        batchNumber: 'BATCH-2026',
        expiryDate: new Date('2027-01-01'),
        manufactureDate: new Date('2026-01-01'),
        mrp: 65,
        purchasePrice: 42,
        sellingPrice: 55
      });

      assert.strictEqual(result.stock.quantity, 50);
      assert.strictEqual(result.stock.batches.length, 1);
      assert.strictEqual(result.stock.batches[0].batchNumber, 'BATCH-2026');
      assert.strictEqual(result.stock.batches[0].quantity, 50);
      assert.strictEqual(result.stock.batches[0].mrp, 65);

      // Verify Product fields are updated
      const updatedProduct = await Product.findById(productId);
      assert.strictEqual(updatedProduct.batchNumber, 'BATCH-2026');

      // Verify StockMovement entry
      const movement = await StockMovement.findOne({ product: productId });
      assert.ok(movement);
      assert.strictEqual(movement.quantity, 50);
      assert.strictEqual(movement.type, 'purchase');
    });

    it('should increment stock for an existing batch', async () => {
      // Setup initial stock
      await Stock.create({
        product: productId,
        quantity: 10,
        batches: [{ batchNumber: 'BATCH-2026', quantity: 10, mrp: 60 }]
      });

      await stockMovementService.mutateStock({
        productId,
        quantity: 15,
        type: 'purchase',
        referenceModel: 'Purchase',
        referenceId: new mongoose.Types.ObjectId(),
        referenceNumber: 'PUR-002',
        batchNumber: 'BATCH-2026',
        mrp: 60
      });

      const updatedStock = await Stock.findOne({ product: productId });
      assert.strictEqual(updatedStock.quantity, 25);
      assert.strictEqual(updatedStock.batches.length, 1);
      assert.strictEqual(updatedStock.batches[0].quantity, 25);
    });

    it('should deduct stock from a specific batch', async () => {
      // Setup initial stock
      await Stock.create({
        product: productId,
        quantity: 30,
        batches: [
          { batchNumber: 'BATCH-A', quantity: 10 },
          { batchNumber: 'BATCH-B', quantity: 20 }
        ]
      });

      await stockMovementService.mutateStock({
        productId,
        quantity: -5,
        type: 'sale',
        referenceModel: 'Sale',
        referenceId: new mongoose.Types.ObjectId(),
        referenceNumber: 'SAL-001',
        batchNumber: 'BATCH-B'
      });

      const updatedStock = await Stock.findOne({ product: productId });
      assert.strictEqual(updatedStock.quantity, 25);
      assert.strictEqual(updatedStock.batches.find(b => b.batchNumber === 'BATCH-A').quantity, 10);
      assert.strictEqual(updatedStock.batches.find(b => b.batchNumber === 'BATCH-B').quantity, 15);
    });

    it('should throw an error when deducting from a non-existent batch', async () => {
      await Stock.create({
        product: productId,
        quantity: 10,
        batches: [{ batchNumber: 'BATCH-A', quantity: 10 }]
      });

      await assert.rejects(
        stockMovementService.mutateStock({
          productId,
          quantity: -5,
          type: 'sale',
          referenceModel: 'Sale',
          referenceId: new mongoose.Types.ObjectId(),
          referenceNumber: 'SAL-001',
          batchNumber: 'BATCH-B' // Non-existent
        }),
        /Batch "BATCH-B" not found/
      );
    });

    it('should throw an error when batch has insufficient quantity', async () => {
      await Stock.create({
        product: productId,
        quantity: 10,
        batches: [{ batchNumber: 'BATCH-A', quantity: 10 }]
      });

      await assert.rejects(
        stockMovementService.mutateStock({
          productId,
          quantity: -12,
          type: 'sale',
          referenceModel: 'Sale',
          referenceId: new mongoose.Types.ObjectId(),
          referenceNumber: 'SAL-001',
          batchNumber: 'BATCH-A'
        }),
        /Insufficient stock in batch/
      );
    });

    it('should automatically fall back to FIFO subtraction when no batch is specified', async () => {
      const now = new Date();
      const expiryB1 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const expiryB2 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const expiryB3 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      await Stock.create({
        product: productId,
        quantity: 35,
        batches: [
          { batchNumber: 'B1', quantity: 10, expiryDate: expiryB1 },
          { batchNumber: 'B2', quantity: 15, expiryDate: expiryB2 },
          { batchNumber: 'B3', quantity: 10, expiryDate: expiryB3 }
        ]
      });

      await stockMovementService.mutateStock({
        productId,
        quantity: -15,
        type: 'sale',
        referenceModel: 'Sale',
        referenceId: new mongoose.Types.ObjectId(),
        referenceNumber: 'SAL-FIFO'
      });

      const updatedStock = await Stock.findOne({ product: productId });
      assert.strictEqual(updatedStock.quantity, 20);
      assert.strictEqual(updatedStock.batches.find(b => b.batchNumber === 'B3').quantity, 0);
      assert.strictEqual(updatedStock.batches.find(b => b.batchNumber === 'B1').quantity, 5);
      assert.strictEqual(updatedStock.batches.find(b => b.batchNumber === 'B2').quantity, 15);
    });
  });
});
