const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const InvoiceHistory = require('../models/InvoiceHistory');

const INVOICE_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/invoices');

const getSafeInvoiceFileName = (saleNumber) => {
  const safeSaleNumber = String(saleNumber || 'invoice').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `invoice-${safeSaleNumber}.pdf`;
};

const findSaleForInvoice = async ({ id, invoiceNumber }) => {
  const query = invoiceNumber
    ? { saleNumber: invoiceNumber }
    : mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : id
        ? { saleNumber: id }
        : null;

  if (!query) {
    const error = new Error('Invalid invoice id');
    error.statusCode = 400;
    throw error;
  }

  const sale = await Sale.findOne(query)
    .populate('customer', 'name phone village')
    .populate('items.product', 'name unit batchNumber expiryDate hsn hsnCode')
    .populate('createdBy', 'name role');

  if (!sale) {
    const error = new Error('Sale invoice not found');
    error.statusCode = 404;
    throw error;
  }

  return sale;
};

const canDownloadInvoice = (sale, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!sale.createdBy) return true;
  return sale.createdBy._id
    ? sale.createdBy._id.toString() === user._id.toString()
    : sale.createdBy.toString() === user._id.toString();
};

const buildSaleInvoicePayload = async (sale) => {
  const StoreSettings = require('../models/StoreSettings');
  let settings;
  try {
    settings = await StoreSettings.findOne();
  } catch (err) {
    console.error('Error fetching StoreSettings for invoice payload:', err);
  }

  const items = (sale.items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.price) || 0;
    const gstRate = Number(item.gst || item.taxRate || 0);
    const subtotal = quantity * unitPrice;
    const gstAmount = subtotal * gstRate / 100;

    return {
      _id: item._id,
      product: item.product,
      productName: item.product?.name || 'Unknown Product',
      unit: item.product?.unit || '',
      hsn: item.hsn || item.product?.hsn || item.product?.hsnCode || '-',
      batchNumber: item.batchNumber || item.product?.batchNumber || '-',
      expiryDate: item.expiryDate || item.product?.expiryDate || null,
      quantity,
      unitPrice,
      gstRate,
      gstAmount,
      rateWithGst: quantity ? (subtotal + gstAmount) / quantity : unitPrice,
      total: subtotal + gstAmount
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const gstAmount = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const discount = Number(sale.discount || sale.discountAmount || 0);
  const grandTotal = Number(sale.totalAmount || subtotal + gstAmount - discount);
  const invoiceDate = sale.saleDate || sale.createdAt || new Date();

  return {
    _id: sale._id,
    invoiceNumber: sale.saleNumber,
    saleNumber: sale.saleNumber,
    status: sale.status || 'Paid',
    paymentMethod: sale.paymentMethod || 'Cash',
    saleDate: invoiceDate,
    createdAt: sale.createdAt,
    business: {
      name: settings?.organizationName || process.env.STORE_NAME || 'Mahalaxmi Sheti Seva Kendra Hasur Khurd',
      tagline: 'Agriculture Stock & Billing Solutions',
      email: settings?.email || process.env.STORE_EMAIL || 'mahalxmiShetiSevaKendra@gmail.com',
      phone: settings?.phone || process.env.STORE_PHONE || '7820974939',
      gst: settings?.gst || process.env.STORE_GST || '27XXXXX1234X1ZX',
      address: settings?.address || process.env.STORE_ADDRESS || 'Hasur Khurd, Tal. Kagal, Dist. Kolhapur, Maharashtra - 416218'
    },
    customer: sale.customer ? {
      _id: sale.customer._id,
      name: sale.customer.name || 'Walk-in Customer',
      phone: sale.customer.phone || '',
      village: sale.customer.village || '',
      district: sale.customer.district || ''
    } : {
      name: 'Walk-in Customer',
      phone: '',
      village: ''
    },
    items,
    totals: {
      subtotal,
      gstAmount,
      discount,
      grandTotal
    },
    footer: {
      note: `Thank you for choosing ${settings?.organizationName || 'Mahalaxmi Sheti Seva Kendra'}.`,
      support: settings?.email || process.env.STORE_EMAIL || 'info@krushistock.com',
      terms: 'Goods once sold are subject to store return policy. Please retain this invoice for warranty and service support.'
    }
  };
};

const ensureSaleInvoicePdf = async (sale) => {
  if (!sale.items || sale.items.length === 0) {
    const error = new Error('Cannot generate invoice for sale with no items');
    error.statusCode = 400;
    throw error;
  }

  if (!fs.existsSync(INVOICE_UPLOAD_DIR)) {
    fs.mkdirSync(INVOICE_UPLOAD_DIR, { recursive: true });
  }

  const fileName = getSafeInvoiceFileName(sale.saleNumber);
  const filePath = path.join(INVOICE_UPLOAD_DIR, fileName);

  await generateInvoicePDF(sale, filePath);

  return {
    fileName,
    filePath
  };
};

const generateAndPersistInvoice = async (sale) => {
  // 1. Ensure the PDF is generated and saved on disk
  const { fileName, filePath } = await ensureSaleInvoicePdf(sale);
  
  // 2. Check if an InvoiceHistory record already exists for this sale
  let invoiceLog = await InvoiceHistory.findOne({ sale: sale._id });
  
  const relativePath = `uploads/invoices/${fileName}`;
  
  if (!invoiceLog) {
    const customerId = sale.customer?._id || sale.customer || null;
    invoiceLog = await InvoiceHistory.create({
      sale: sale._id,
      customer: customerId,
      pdfPath: relativePath,
      sentStatus: 'Pending'
    });
  }

  // 3. Create or update the SaleInvoice document
  const SaleInvoice = require('../models/SaleInvoice');
  const items = sale.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  const totalAmount = sale.totalAmount || subtotal;

  const invoiceProducts = items.map(item => ({
    productId: item.product?._id || item.product,
    productName: item.product?.name || 'Unknown Product',
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    batchNumber: item.batchNumber || null,
    subtotal: (Number(item.quantity) || 0) * (Number(item.price) || 0)
  }));

  const customerId = sale.customer?._id || sale.customer || null;
  const customerName = sale.customer?.name || (sale.customerName ? sale.customerName : 'Walk-in Customer');

  let saleInvoice = await SaleInvoice.findOne({ sale: sale._id });
  if (saleInvoice) {
    saleInvoice.invoiceNumber = sale.saleNumber;
    saleInvoice.customer = customerId;
    saleInvoice.customerName = customerName;
    saleInvoice.saleDate = sale.saleDate || sale.createdAt || new Date();
    saleInvoice.products = invoiceProducts;
    saleInvoice.subtotal = subtotal;
    saleInvoice.totalAmount = totalAmount;
    saleInvoice.paymentMethod = sale.paymentMethod || 'Cash';
    saleInvoice.paymentStatus = sale.paymentStatus || 'Paid';
    saleInvoice.pdfPath = relativePath;
    await saleInvoice.save();
  } else {
    saleInvoice = await SaleInvoice.create({
      invoiceNumber: sale.saleNumber,
      sale: sale._id,
      customer: customerId,
      customerName,
      saleDate: sale.saleDate || sale.createdAt || new Date(),
      products: invoiceProducts,
      subtotal,
      gstAmount: 0,
      totalAmount,
      paymentMethod: sale.paymentMethod || 'Cash',
      paymentStatus: sale.paymentStatus || 'Paid',
      pdfPath: relativePath,
      status: 'Active'
    });
  }
  
  return {
    invoiceLog,
    saleInvoice,
    fileName,
    filePath,
    relativePath
  };
};

module.exports = {
  findSaleForInvoice,
  canDownloadInvoice,
  buildSaleInvoicePayload,
  ensureSaleInvoicePdf,
  generateAndPersistInvoice
};
