const path = require('path');
const Purchase = require('../models/Purchase');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { generatePurchaseInvoicePDF } = require('../utils/pdfGenerator');
const { mutateStock } = require('./stockMovementService');

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
    const mrp = toNumber(item.mrp, product.mrp || 0);
    const gst = toNumber(item.gst);
    const taxableAmount = quantity * purchasePrice;
    const gstValue = taxableAmount * gst / 100;

    return {
      productId: product._id,
      productName: product.name,
      quantity,
      purchasePrice,
      sellingPrice,
      mrp,
      gst,
      batchNumber: item.batchNumber || null,
      expiryDate: item.expiryDate || null,
      manufactureDate: item.manufactureDate || null,
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
    const movementQuantity = item.quantity * direction;
    const productUpdates = direction > 0 ? { purchasePrice: item.purchasePrice, mrp: item.mrp } : null;

    await mutateStock({
      productId: item.productId,
      quantity: movementQuantity,
      type: movementType,
      referenceModel: 'Purchase',
      referenceId: purchase._id,
      referenceNumber: purchase.purchaseNumber,
      note,
      userId,
      productUpdates,
      batchNumber: item.batchNumber || null,
      expiryDate: item.expiryDate || null,
      manufactureDate: item.manufactureDate || null,
      mrp: item.mrp || null,
      purchasePrice: item.purchasePrice || null,
      sellingPrice: item.sellingPrice || null,
      session
    });
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
      price: item.purchasePrice,
      mrp: item.mrp,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      manufactureDate: item.manufactureDate
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

  const oldInvoiceProducts = (existingInvoice
    ? existingInvoice.products
    : existingPurchase.items.map((item) => ({
        productId: item.product,
        productName: 'Previous purchase item',
        quantity: item.quantity,
        purchasePrice: item.price,
        sellingPrice: 0,
        mrp: item.mrp || 0,
        gst: 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        manufactureDate: item.manufactureDate,
        subtotal: item.quantity * item.price
      }))).map(p => ({
        productId: p.productId,
        productName: p.productName || 'Previous purchase item',
        quantity: p.quantity,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice || 0,
        mrp: p.mrp || 0,
        gst: p.gst || 0,
        batchNumber: p.batchNumber,
        expiryDate: p.expiryDate,
        manufactureDate: p.manufactureDate,
        subtotal: p.subtotal
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
        price: item.purchasePrice,
        mrp: item.mrp,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        manufactureDate: item.manufactureDate
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
  const invoiceProducts = (invoice
    ? invoice.products
    : purchase.items.map((item) => ({
        productId: item.product,
        productName: 'Purchase item',
        quantity: item.quantity,
        purchasePrice: item.price,
        sellingPrice: 0,
        gst: 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        manufactureDate: item.manufactureDate,
        subtotal: item.quantity * item.price
      }))).map(p => ({
        productId: p.productId,
        productName: p.productName || 'Purchase item',
        quantity: p.quantity,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice || 0,
        mrp: p.mrp || 0,
        gst: p.gst || 0,
        batchNumber: p.batchNumber,
        expiryDate: p.expiryDate,
        manufactureDate: p.manufactureDate,
        subtotal: p.subtotal
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
