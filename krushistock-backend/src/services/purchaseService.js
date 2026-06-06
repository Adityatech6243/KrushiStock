const path = require('path');
const Purchase = require('../models/Purchase');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { generatePurchaseInvoicePDF } = require('../utils/pdfGenerator');

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const validatePurchaseInput = (purchaseData) => {
  if (!purchaseData.supplier) {
    throw new Error('Supplier is required');
  }
  if (!Array.isArray(purchaseData.items) || purchaseData.items.length === 0) {
    throw new Error('At least one purchase item is required');
  }

  purchaseData.items.forEach((item, index) => {
    if (!item.product) {
      throw new Error(`Product is required for item ${index + 1}`);
    }
    if (toNumber(item.quantity) <= 0) {
      throw new Error(`Quantity must be greater than 0 for item ${index + 1}`);
    }
    if (toNumber(item.price) < 0) {
      throw new Error(`Purchase price cannot be negative for item ${index + 1}`);
    }
  });
};

const buildInvoiceProducts = async (items, session) => {
  const productIds = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds }, deletedAt: null })
    .populate('category', 'name')
    .session(session);

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  return items.map((item, index) => {
    const product = productMap.get(item.product.toString());
    if (!product) {
      throw new Error(`Product not found for item ${index + 1}`);
    }

    const quantity = toNumber(item.quantity);
    const purchasePrice = toNumber(item.price);
    const sellingPrice = toNumber(item.sellingPrice, product.sellingPrice || product.price || 0);
    const gst = toNumber(item.gst);
    const taxableAmount = quantity * purchasePrice;
    const gstValue = taxableAmount * gst / 100;

    return {
      productId: product._id,
      productName: product.name,
      quantity,
      purchasePrice,
      sellingPrice,
      gst,
      subtotal: taxableAmount + gstValue
    };
  });
};

const calculateInvoiceTotals = (products) => {
  const subtotal = products.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const gstAmount = products.reduce((sum, item) => {
    return sum + (item.quantity * item.purchasePrice * item.gst / 100);
  }, 0);

  return {
    subtotal,
    gstAmount,
    totalAmount: subtotal + gstAmount
  };
};

const adjustInventory = async ({ purchase, invoiceProducts, userId, movementType, note, direction = 1, session }) => {
  for (const item of invoiceProducts) {
    const stock = await Stock.findOne({ product: item.productId }).session(session);
    const previousQuantity = stock ? stock.quantity : 0;
    const movementQuantity = item.quantity * direction;
    const newQuantity = previousQuantity + movementQuantity;

    if (newQuantity < 0) {
      throw new Error(`Insufficient stock while adjusting ${item.productName}`);
    }

    if (stock) {
      stock.quantity = newQuantity;
      stock.lastUpdated = new Date();
      await stock.save({ session });
    } else {
      await Stock.create([{
        product: item.productId,
        quantity: newQuantity,
        lowStockLimit: 10
      }], { session });
    }

    await Product.findOneAndUpdate(
      { _id: item.productId },
      {
        $inc: { quantity: movementQuantity },
        ...(direction > 0 ? { $set: { purchasePrice: item.purchasePrice } } : {})
      },
      { session }
    );

    await StockMovement.create([{
      product: item.productId,
      type: movementType,
      quantity: movementQuantity,
      previousQuantity,
      newQuantity,
      referenceModel: 'Purchase',
      referenceId: purchase._id,
      referenceNumber: purchase.purchaseNumber,
      note,
      createdBy: userId
    }], { session });
  }
};

const createPurchasePdf = async (invoice) => {
  const fileName = `purchase-invoice-${invoice.invoiceNumber}.pdf`;
  const relativePath = `uploads/invoices/${fileName}`;
  const absolutePath = path.resolve(__dirname, '../../', relativePath);

  await generatePurchaseInvoicePDF(invoice, absolutePath);
  invoice.pdfPath = relativePath;
  await invoice.save();
  return invoice;
};

const createPurchaseWithInvoice = async ({ purchaseData, userId, session }) => {
  validatePurchaseInput(purchaseData);

  const supplier = await Supplier.findOne({ _id: purchaseData.supplier, deletedAt: null }).session(session);
  if (!supplier) {
    throw new Error('Supplier not found');
  }

  const invoiceProducts = await buildInvoiceProducts(purchaseData.items, session);
  const totals = calculateInvoiceTotals(invoiceProducts);

  const [purchase] = await Purchase.create([{
    ...purchaseData,
    items: invoiceProducts.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.purchasePrice
    })),
    totalAmount: totals.totalAmount,
    createdBy: userId
  }], { session });

  const existingInvoice = await PurchaseInvoice.findOne({ invoiceNumber: purchase.purchaseNumber }).session(session);
  if (existingInvoice) {
    throw new Error(`Invoice ${purchase.purchaseNumber} already exists`);
  }

  await adjustInventory({
    purchase,
    invoiceProducts,
    userId,
    movementType: 'purchase',
    note: 'Purchase stock received',
    direction: 1,
    session
  });

  const [invoice] = await PurchaseInvoice.create([{
    invoiceNumber: purchase.purchaseNumber,
    purchase: purchase._id,
    supplierId: supplier._id,
    supplierName: supplier.name,
    purchaseDate: purchase.purchaseDate,
    products: invoiceProducts,
    subtotal: totals.subtotal,
    gstAmount: totals.gstAmount,
    totalAmount: totals.totalAmount,
    paymentMethod: purchase.paymentMethod,
    paymentStatus: purchase.paymentStatus,
    notes: purchaseData.notes || '',
    createdBy: userId
  }], { session });

  return { purchase, invoice };
};

const updatePurchaseWithInvoice = async ({ purchaseId, purchaseData, userId, session }) => {
  validatePurchaseInput(purchaseData);

  const existingPurchase = await Purchase.findById(purchaseId).session(session);
  if (!existingPurchase) {
    throw new Error('Purchase not found');
  }

  const existingInvoice = await PurchaseInvoice.findOne({ purchase: existingPurchase._id }).session(session);
  const oldInvoiceProducts = existingInvoice
    ? existingInvoice.products
    : existingPurchase.items.map((item) => ({
        productId: item.product,
        productName: 'Previous purchase item',
        quantity: item.quantity,
        purchasePrice: item.price,
        sellingPrice: 0,
        gst: 0,
        subtotal: item.quantity * item.price
      }));

  await adjustInventory({
    purchase: existingPurchase,
    invoiceProducts: oldInvoiceProducts,
    userId,
    movementType: 'purchase_update_reversal',
    note: 'Reverted purchase before update',
    direction: -1,
    session
  });

  const supplier = await Supplier.findOne({ _id: purchaseData.supplier, deletedAt: null }).session(session);
  if (!supplier) {
    throw new Error('Supplier not found');
  }

  const invoiceProducts = await buildInvoiceProducts(purchaseData.items, session);
  const totals = calculateInvoiceTotals(invoiceProducts);

  const purchase = await Purchase.findByIdAndUpdate(
    purchaseId,
    {
      ...purchaseData,
      items: invoiceProducts.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.purchasePrice
      })),
      totalAmount: totals.totalAmount
    },
    { new: true, runValidators: true, session }
  );

  await adjustInventory({
    purchase,
    invoiceProducts,
    userId,
    movementType: 'purchase_update',
    note: 'Applied updated purchase stock',
    direction: 1,
    session
  });

  const invoiceUpdate = {
    invoiceNumber: purchase.purchaseNumber,
    purchase: purchase._id,
    supplierId: supplier._id,
    supplierName: supplier.name,
    purchaseDate: purchase.purchaseDate,
    products: invoiceProducts,
    subtotal: totals.subtotal,
    gstAmount: totals.gstAmount,
    totalAmount: totals.totalAmount,
    paymentMethod: purchase.paymentMethod,
    paymentStatus: purchase.paymentStatus,
    notes: purchaseData.notes || '',
    status: 'Active',
    cancelledAt: null,
    updatedAt: new Date()
  };

  const invoice = await PurchaseInvoice.findOneAndUpdate(
    { purchase: purchase._id },
    invoiceUpdate,
    { new: true, upsert: true, runValidators: true, session }
  );

  return { purchase, invoice };
};

const deletePurchaseWithInvoice = async ({ purchaseId, userId, session }) => {
  const purchase = await Purchase.findById(purchaseId).session(session);
  if (!purchase) {
    throw new Error('Purchase not found');
  }

  const invoice = await PurchaseInvoice.findOne({ purchase: purchase._id }).session(session);
  const invoiceProducts = invoice
    ? invoice.products
    : purchase.items.map((item) => ({
        productId: item.product,
        productName: 'Purchase item',
        quantity: item.quantity,
        purchasePrice: item.price,
        sellingPrice: 0,
        gst: 0,
        subtotal: item.quantity * item.price
      }));

  await adjustInventory({
    purchase,
    invoiceProducts,
    userId,
    movementType: 'purchase_delete',
    note: 'Purchase deleted and stock reverted',
    direction: -1,
    session
  });

  if (invoice) {
    invoice.status = 'Cancelled';
    invoice.cancelledAt = new Date();
    await invoice.save({ session });
  }

  await purchase.deleteOne({ session });
  return { purchase, invoice };
};

module.exports = {
  createPurchaseWithInvoice,
  updatePurchaseWithInvoice,
  deletePurchaseWithInvoice,
  createPurchasePdf
};
