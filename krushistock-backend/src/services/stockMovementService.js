const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

/**
 * Mutates stock and records a stock movement entry.
 * @param {Object} params
 * @param {String} params.productId - Product ID to mutate stock for
 * @param {Number} params.quantity - Quantity change (can be positive or negative)
 * @param {String} params.type - Movement type ('purchase', 'sale', 'adjustment', 'disposal', 'correction', etc.)
 * @param {String} params.referenceModel - Reference model ('Purchase', 'Sale', 'Adjustment')
 * @param {String} params.referenceId - ID of reference document
 * @param {String} [params.referenceNumber] - Human-readable reference identifier
 * @param {String} [params.note] - Optional description
 * @param {String} [params.userId] - ID of user making the change
 * @param {Object} [params.productUpdates] - Optional fields to set on the Product model
 * @param {Object} [params.session] - Optional Mongoose session
 */
const mutateStock = async ({
  productId,
  quantity,
  type,
  referenceModel,
  referenceId,
  referenceNumber,
  note = '',
  userId = null,
  productUpdates = null,
  batchNumber = null,
  expiryDate = null,
  manufactureDate = null,
  mrp = null,
  sellingPrice = null,
  purchasePrice = null,
  session = null
}) => {
  // 1. Find product to ensure it exists
  const product = await Product.findOne({ _id: productId, deletedAt: null }).session(session);
  if (!product) {
    throw new Error('Product not found or has been deleted');
  }

  // 2. Find or create Stock
  let stock = await Stock.findOne({ product: productId }).session(session);
  if (!stock) {
    const stockDocs = await Stock.create([{
      product: productId,
      quantity: 0,
      lowStockLimit: product.reorderLevel ?? 10,
      batches: []
    }], { session });
    stock = stockDocs[0];
  }

  const previousQuantity = stock.quantity;
  const changeQty = Number(quantity);

  // 3. Perform batch-level stock mutation
  if (batchNumber) {
    const trimmedBatch = String(batchNumber).trim();
    let batch = stock.batches.find(b => b.batchNumber === trimmedBatch);

    if (changeQty > 0) {
      if (batch) {
        batch.quantity += changeQty;
        if (expiryDate) batch.expiryDate = expiryDate;
        if (manufactureDate) batch.manufactureDate = manufactureDate;
        if (mrp) batch.mrp = mrp;
        if (sellingPrice) batch.sellingPrice = sellingPrice;
        if (purchasePrice) batch.purchasePrice = purchasePrice;
      } else {
        stock.batches.push({
          batchNumber: trimmedBatch,
          expiryDate: expiryDate || productUpdates?.expiryDate || product.expiryDate || null,
          manufactureDate: manufactureDate || productUpdates?.manufactureDate || product.manufactureDate || null,
          quantity: changeQty,
          purchasePrice: purchasePrice || productUpdates?.purchasePrice || product.purchasePrice || 0,
          sellingPrice: sellingPrice || productUpdates?.sellingPrice || product.sellingPrice || product.price || 0,
          mrp: mrp || productUpdates?.mrp || product.mrp || 0
        });
      }
    } else if (changeQty < 0) {
      if (!batch) {
        throw new Error(`Insufficient stock: Batch "${trimmedBatch}" not found for product "${product.name}".`);
      }
      if (batch.quantity + changeQty < 0) {
        throw new Error(`Insufficient stock in batch "${trimmedBatch}" for product "${product.name}". Available: ${batch.quantity}, Requested deduction: ${Math.abs(changeQty)}`);
      }
      batch.quantity += changeQty;
    }
  } else {
    // Fallback logic for legacy or seeded transactions without explicit batchNumber
    if (changeQty > 0) {
      const defaultBatchName = (product.batchNumber || 'BATCH-DEFAULT').trim();
      let batch = stock.batches.find(b => b.batchNumber === defaultBatchName);
      if (batch) {
        batch.quantity += changeQty;
      } else {
        stock.batches.push({
          batchNumber: defaultBatchName,
          expiryDate: product.expiryDate || null,
          manufactureDate: product.manufactureDate || null,
          quantity: changeQty,
          purchasePrice: product.purchasePrice || 0,
          sellingPrice: product.sellingPrice || product.price || 0,
          mrp: product.mrp || 0
        });
      }
    } else if (changeQty < 0) {
      // FIFO subtraction
      let remainingToDeduct = Math.abs(changeQty);
      
      // Sort batches by expiryDate ascending (earliest expiry first), with null expiries last
      const availableBatches = stock.batches
        .filter(b => b.quantity > 0)
        .sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });

      const totalAvailable = availableBatches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < remainingToDeduct) {
        throw new Error(`Insufficient stock for product "${product.name}". Total available: ${totalAvailable}, Requested deduction: ${remainingToDeduct}`);
      }

      for (const batch of availableBatches) {
        if (remainingToDeduct <= 0) break;
        const deductAmount = Math.min(batch.quantity, remainingToDeduct);
        batch.quantity -= deductAmount;
        remainingToDeduct -= deductAmount;
      }
      
      if (remainingToDeduct > 0) {
        throw new Error(`FIFO stock deduction error for product "${product.name}".`);
      }
    }
  }

  // 4. Update aggregate stock quantity
  stock.quantity = stock.batches.reduce((sum, b) => sum + b.quantity, 0);
  stock.lastUpdated = new Date();
  await stock.save({ session });

  const newQuantity = stock.quantity;

  // 5. Update Product details
  const productUpdateSet = {
    quantity: stock.quantity,
    ...(productUpdates || {})
  };
  if (changeQty > 0 && batchNumber) {
    productUpdateSet.batchNumber = batchNumber;
    if (expiryDate) productUpdateSet.expiryDate = expiryDate;
    if (manufactureDate) productUpdateSet.manufactureDate = manufactureDate;
  }

  await Product.findOneAndUpdate(
    { _id: productId },
    { $set: productUpdateSet },
    { session }
  );

  // 6. Record StockMovement
  const [movement] = await StockMovement.create([{
    product: productId,
    type,
    quantity: changeQty,
    previousQuantity,
    newQuantity,
    referenceModel,
    referenceId,
    referenceNumber,
    note,
    createdBy: userId
  }], { session });

  return { stock, movement };
};

/**
 * Retrieve paginated stock movements with optional filtering
 */
const getStockMovements = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = { ...filters };

  const total = await StockMovement.countDocuments(query);
  const movements = await StockMovement.find(query)
    .populate('product', 'name unit')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    data: movements,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Record stock movement for a sale item.
 */
const recordSaleMovement = async ({
  sale,
  item,
  direction,
  movementType = 'sale',
  note = 'Sale stock issued',
  userId = null,
  session = null
}) => {
  const itemQuantity = Number(item.quantity);
  const movementQuantity = itemQuantity * direction;

  return await mutateStock({
    productId: item.product,
    quantity: movementQuantity,
    type: movementType,
    referenceModel: 'Sale',
    referenceId: sale._id,
    referenceNumber: sale.saleNumber,
    note,
    userId,
    batchNumber: item.batchNumber || null,
    session
  });
};

/**
 * Record manual, disposal, or correction stock adjustments.
 */
const recordAdjustmentMovement = async ({
  productId,
  quantity,
  type,
  note = 'Manual adjustment',
  userId = null,
  session = null
}) => {
  const numericQuantity = Number(quantity);
  if (isNaN(numericQuantity)) {
    throw new Error('Quantity must be a valid number');
  }

  if (!['adjustment', 'disposal', 'correction'].includes(type)) {
    throw new Error('Type must be adjustment, disposal, or correction');
  }

  const referenceId = new mongoose.Types.ObjectId();
  
  return await mutateStock({
    productId,
    quantity: numericQuantity,
    type,
    referenceModel: 'Adjustment',
    referenceId,
    referenceNumber: `ADJ-${Date.now()}`,
    note,
    userId,
    session
  });
};

module.exports = {
  mutateStock,
  getStockMovements,
  recordSaleMovement,
  recordAdjustmentMovement
};