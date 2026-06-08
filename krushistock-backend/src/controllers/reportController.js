const Stock = require('../models/Stock');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Category = require('../models/Category');
const Farmer = require('../models/Farmer');
const Supplier = require('../models/Supplier');
const SaleInvoice = require('../models/SaleInvoice');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { fetchDashboardStatsData } = require('../services/dashboardService');

const getDashboardStats = async (req, res) => {
  try {
    const stats = await fetchDashboardStatsData();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Get dashboard stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getStockReport = async (req, res) => {
  try {
    const { startDate, endDate, category, product } = req.query;
    const isExport = req.query.export === 'true';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // 1. Resolve date range
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    // 2. Build product query
    const productQuery = { deletedAt: null };

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        productQuery.category = category;
      } else {
        const categoryObj = await Category.findOne({ name: { $regex: new RegExp('^' + category + '$', 'i') } });
        if (categoryObj) {
          productQuery.category = categoryObj._id;
        } else {
          // If no matching category, query should match nothing
          productQuery.category = new mongoose.Types.ObjectId();
        }
      }
    }

    if (product) {
      if (mongoose.Types.ObjectId.isValid(product)) {
        productQuery._id = product;
      } else {
        productQuery.name = { $regex: new RegExp(product, 'i') };
      }
    }

    // 3. Count total matching products and fetch products
    const totalItemsCount = await Product.countDocuments(productQuery);

    let productsQueryObj = Product.find(productQuery).populate('category', 'name');
    if (!isExport) {
      productsQueryObj = productsQueryObj.skip(skip).limit(limit);
    }
    const products = await productsQueryObj;

    const productIds = products.map(p => p._id);

    // 4. Aggregate stock movements for the paginated product list
    const movementsAgg = await StockMovement.aggregate([
      {
        $match: {
          product: { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$product',
          openingStock: {
            $sum: {
              $cond: [
                { $lt: ['$createdAt', start] },
                '$quantity',
                0
              ]
            }
          },
          purchases: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', start] },
                    { $lte: ['$createdAt', end] },
                    { $eq: ['$referenceModel', 'Purchase'] }
                  ]
                },
                '$quantity',
                0
              ]
            }
          },
          sales: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', start] },
                    { $lte: ['$createdAt', end] },
                    { $eq: ['$referenceModel', 'Sale'] }
                  ]
                },
                { $abs: '$quantity' },
                0
              ]
            }
          },
          adjustments: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', start] },
                    { $lte: ['$createdAt', end] },
                    { $ne: ['$referenceModel', 'Purchase'] },
                    { $ne: ['$referenceModel', 'Sale'] }
                  ]
                },
                '$quantity',
                0
              ]
            }
          },
          closingStock: {
            $sum: {
              $cond: [
                { $lte: ['$createdAt', end] },
                '$quantity',
                0
              ]
            }
          }
        }
      }
    ]);

    const movementsMap = new Map(movementsAgg.map(item => [item._id.toString(), item]));

    const items = products.map(p => {
      const stats = movementsMap.get(p._id.toString()) || {
        openingStock: 0,
        purchases: 0,
        sales: 0,
        adjustments: 0,
        closingStock: 0
      };

      const productPrice = p.purchasePrice || p.price || 0;

      return {
        product: p.name,
        category: p.category?.name || 'N/A',
        openingStock: Math.max(0, stats.openingStock),
        purchases: Math.max(0, stats.purchases),
        sales: Math.max(0, stats.sales),
        closingStock: Math.max(0, stats.closingStock),
        value: Math.max(0, stats.closingStock) * productPrice
      };
    });

    // 5. Aggregate summary stats (Total asset value and total quantities at endDate)
    // across all matching products (unpaginated)
    const allMatchingProducts = await Product.find(productQuery).select('_id purchasePrice price');
    const allMatchingIds = allMatchingProducts.map(p => p._id);

    const summaryAgg = await StockMovement.aggregate([
      {
        $match: {
          product: { $in: allMatchingIds },
          createdAt: { $lte: end }
        }
      },
      {
        $group: {
          _id: '$product',
          closingStock: { $sum: '$quantity' }
        }
      }
    ]);

    const summaryMap = new Map(summaryAgg.map(item => [item._id.toString(), item.closingStock]));

    let totalQuantity = 0;
    let totalValue = 0;

    for (const p of allMatchingProducts) {
      const closingStock = summaryMap.get(p._id.toString()) || 0;
      const productPrice = p.purchasePrice || p.price || 0;
      totalQuantity += Math.max(0, closingStock);
      totalValue += Math.max(0, closingStock) * productPrice;
    }

    const summary = {
      totalValue,
      totalQuantity
    };

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total: totalItemsCount,
        page,
        pages: isExport ? 1 : Math.ceil(totalItemsCount / limit)
      },
      data: {
        items,
        summary
      }
    });
  } catch (error) {
    logger.error(`Get stock report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, customer } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (customer) {
      // Validate customer is valid ObjectId if necessary, here we assume it's valid or checked before
      query.customer = customer;
    }

    const summaryAgg = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);
    
    const totalTransactions = summaryAgg[0]?.totalTransactions || 0;
    const totalSales = summaryAgg[0]?.totalSales || 0;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const isExport = req.query.export === 'true';
    let queryObj = Sale.find(query)
      .populate('customer', 'name')
      .sort({ saleDate: -1 });

    if (!isExport) {
      queryObj = queryObj.skip(skip).limit(limit);
    }
    const sales = await queryObj;

    const items = sales.map(sale => ({
      date: sale.saleDate,
      saleNumber: sale.saleNumber,
      customer: sale.customer?.name || (sale.populated('customer') ? 'Deleted Farmer' : 'Walk-in'),
      items: sale.items.length,
      quantity: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: sale.totalAmount,
      paymentMethod: sale.paymentMethod
    }));

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total: totalTransactions,
        page,
        pages: Math.ceil(totalTransactions / limit)
      },
      data: {
        items,
        summary: {
          totalSales,
          totalTransactions,
          averageTransaction
        }
      }
    });
  } catch (error) {
    logger.error(`Get sales report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, supplier } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (startDate && endDate) {
      query.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (supplier) {
      query.supplier = supplier;
    }

    const summaryAgg = await Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$totalAmount', 0] }
          }
        }
      }
    ]);

    const totalTransactions = summaryAgg[0]?.totalTransactions || 0;
    const totalPurchases = summaryAgg[0]?.totalPurchases || 0;
    const pendingPayments = summaryAgg[0]?.pendingPayments || 0;

    const isExport = req.query.export === 'true';
    let queryObj = Purchase.find(query)
      .populate('supplier', 'name')
      .sort({ purchaseDate: -1 });

    if (!isExport) {
      queryObj = queryObj.skip(skip).limit(limit);
    }
    const purchases = await queryObj;

    const items = purchases.map(purchase => ({
      date: purchase.purchaseDate,
      purchaseNumber: purchase.purchaseNumber,
      supplier: purchase.supplier?.name || 'Deleted Supplier',
      items: purchase.items.length,
      quantity: purchase.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: purchase.totalAmount,
      paymentStatus: purchase.paymentStatus
    }));

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total: totalTransactions,
        page,
        pages: Math.ceil(totalTransactions / limit)
      },
      data: {
        items,
        summary: {
          totalPurchases,
          totalTransactions,
          pendingPayments
        }
      }
    });
  } catch (error) {
    logger.error(`Get purchase report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const exportReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    let csvContent = '';
    let filename = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'stock') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getStockReport(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate stock report data.');
      }

      const items = resData.data.items || [];
      const headers = ['Product Name', 'Category', 'Opening Stock', 'Purchases (+)', 'Sales (-)', 'Closing Stock', 'Estimated Value (INR)'];
      const rows = items.map(item => [
        item.product,
        item.category,
        item.openingStock,
        item.purchases,
        item.sales,
        item.closingStock,
        item.value
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else if (type === 'sales') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getSalesReport(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate sales report data.');
      }

      const items = resData.data.items || [];
      const headers = ['Date', 'Invoice Code', 'Farmer / Customer', 'Items Count', 'Total Quantity', 'Amount Paid (INR)', 'Payment Method'];
      const rows = items.map(item => [
        new Date(item.date).toLocaleDateString('en-IN'),
        item.saleNumber,
        item.customer,
        item.items,
        item.quantity,
        item.amount,
        item.paymentMethod
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else if (type === 'purchases') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getPurchaseReport(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate purchase report data.');
      }

      const items = resData.data.items || [];
      const headers = ['Date', 'Order ID', 'Supplier Name', 'Line Items', 'Qty Ordered', 'Invoice Total (INR)', 'Payment Status'];
      const rows = items.map(item => [
        new Date(item.date).toLocaleDateString('en-IN'),
        item.purchaseNumber,
        item.supplier,
        item.items,
        item.quantity,
        item.amount,
        item.paymentStatus
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else if (type === 'profit') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getAdvancedProfitReport(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate profit report data.');
      }

      const items = resData.data.items || [];
      const headers = ['Product Name', 'Category', 'Quantity Sold', 'Revenue (INR)', 'COGS (INR)', 'Profit (INR)', 'Margin (%)'];
      const rows = items.map(item => [
        item.productName,
        item.category,
        item.quantitySold,
        item.revenue,
        item.cogs,
        item.profit,
        item.margin.toFixed(2)
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else if (type === 'supplier-performance') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getAdvancedSupplierPerformance(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate supplier performance data.');
      }

      const items = resData.data.items || [];
      const headers = ['Supplier Name', 'Phone', 'GSTIN', 'Orders Count', 'Purchase Volume (INR)', 'Outstanding Liabilities (INR)', 'Last Purchase Date'];
      const rows = items.map(item => [
        item.supplierName,
        item.phone,
        item.gst,
        item.orderCount,
        item.purchaseVolume,
        item.outstandingLiabilities,
        item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString('en-IN') : 'N/A'
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else if (type === 'credit-ledger') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getAdvancedFarmerCreditLedger(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate farmer credit ledger data.');
      }

      const items = resData.data.items || [];
      const headers = ['Farmer Name', 'Phone', 'Village', 'Total Purchases (INR)', 'Amount Paid (INR)', 'Outstanding Credit (INR)', 'Overdue Amount (INR)', 'Overdue Count', 'Last Sale Date'];
      const rows = items.map(item => [
        item.farmerName,
        item.phone,
        item.village,
        item.totalPurchases,
        item.amountPaid,
        item.amountDue,
        item.overdueAmount,
        item.overdueCount,
        item.lastSaleDate ? new Date(item.lastSaleDate).toLocaleDateString('en-IN') : 'N/A'
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else if (type === 'tax-gst') {
      const mockReq = { query: { ...req.query, export: 'true' } };
      let resData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { resData = data; }
      };
      await getAdvancedTaxGstReport(mockReq, mockRes);

      if (!resData || !resData.success) {
        throw new Error('Failed to generate tax/GST report data.');
      }

      const items = resData.data.items || [];
      const headers = ['Month', 'GST Collected (Sales) (INR)', 'GST Paid (Purchases) (INR)', 'Net Tax Liability (INR)'];
      const rows = items.map(item => [
        item.month,
        item.gstCollected,
        item.gstPaid,
        item.netLiability
      ]);

      csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

    } else {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    logger.error(`Export report error: ${error.message}`);
    next(error);
  }
};

const getAdvancedProfitReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    // Populate category so we can group by category name
    const sales = await Sale.find(query).populate({
      path: 'items.product',
      select: 'name purchasePrice price category',
      populate: { path: 'category', select: 'name' }
    });

    const stocks = await Stock.find().select('product batches');
    const batchMap = {};
    stocks.forEach(s => {
      const pId = s.product.toString();
      batchMap[pId] = {};
      (s.batches || []).forEach(b => {
        if (b.batchNumber) {
          batchMap[pId][b.batchNumber] = b.purchasePrice;
        }
      });
    });

    let totalRevenue = 0;
    let totalCOGS = 0;

    const productStats = {};
    const categoryStats = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        if (!item.product) continue;
        const qty = item.quantity || 0;
        const salePrice = item.price || 0;
        const revenue = qty * salePrice;

        const pId = item.product._id.toString();
        const pName = item.product.name;
        const catName = item.product.category?.name || 'Uncategorized';

        // Retrieve purchase price from batch or product base
        const costPrice = (item.batchNumber && batchMap[pId] && batchMap[pId][item.batchNumber] !== undefined)
          ? batchMap[pId][item.batchNumber]
          : (item.product.purchasePrice || 0);

        const cogs = qty * costPrice;
        const profit = revenue - cogs;

        totalRevenue += revenue;
        totalCOGS += cogs;

        // Group by product
        if (!productStats[pId]) {
          productStats[pId] = {
            productId: pId,
            productName: pName,
            category: catName,
            quantitySold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
            margin: 0
          };
        }
        const pStat = productStats[pId];
        pStat.quantitySold += qty;
        pStat.revenue += revenue;
        pStat.cogs += cogs;
        pStat.profit += profit;

        // Group by category
        if (!categoryStats[catName]) {
          categoryStats[catName] = {
            categoryName: catName,
            revenue: 0,
            cogs: 0,
            profit: 0,
            margin: 0
          };
        }
        const cStat = categoryStats[catName];
        cStat.revenue += revenue;
        cStat.cogs += cogs;
        cStat.profit += profit;
      }
    }

    // Convert stats to arrays and compute margins
    const items = Object.values(productStats).map(p => {
      p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
      return p;
    }).sort((a, b) => b.revenue - a.revenue); // sort by revenue descending

    const categoriesList = Object.values(categoryStats).map(c => {
      c.margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
      return c;
    }).sort((a, b) => b.revenue - a.revenue);

    const totalProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCOGS,
          totalProfit,
          profitMargin
        },
        items,
        categories: categoriesList
      }
    });
  } catch (error) {
    logger.error(`Get profit report error: ${error.message}`);
    next(error);
  }
};

const getAdvancedSupplierPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.purchaseDate.$lte = end;
      }
    }

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name phone address gst')
      .populate('items.product', 'name');

    const supplierStats = {};

    for (const pur of purchases) {
      if (!pur.supplier) continue;
      const sId = pur.supplier._id.toString();
      const sName = pur.supplier.name;

      if (!supplierStats[sId]) {
        supplierStats[sId] = {
          supplierId: sId,
          supplierName: sName,
          phone: pur.supplier.phone || 'N/A',
          address: pur.supplier.address || 'N/A',
          gst: pur.supplier.gst || 'N/A',
          orderCount: 0,
          purchaseVolume: 0,
          outstandingLiabilities: 0,
          suppliedProducts: new Set(),
          lastPurchaseDate: null
        };
      }

      const stats = supplierStats[sId];
      stats.orderCount += 1;
      stats.purchaseVolume += pur.totalAmount || 0;

      // Outstanding Liability estimate
      if (pur.paymentStatus === 'Pending') {
        stats.outstandingLiabilities += pur.totalAmount || 0;
      } else if (pur.paymentStatus === 'Partial') {
        stats.outstandingLiabilities += (pur.totalAmount || 0) * 0.5;
      }

      (pur.items || []).forEach(item => {
        if (item.product?.name) {
          stats.suppliedProducts.add(item.product.name);
        }
      });

      if (!stats.lastPurchaseDate || pur.purchaseDate > stats.lastPurchaseDate) {
        stats.lastPurchaseDate = pur.purchaseDate;
      }
    }

    const items = Object.values(supplierStats).map(s => ({
      ...s,
      suppliedProducts: Array.from(s.suppliedProducts)
    })).sort((a, b) => b.purchaseVolume - a.purchaseVolume);

    const totalPurchaseVolume = items.reduce((sum, s) => sum + s.purchaseVolume, 0);
    const totalOutstanding = items.reduce((sum, s) => sum + s.outstandingLiabilities, 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSuppliers: items.length,
          totalPurchaseVolume,
          totalOutstanding
        },
        items
      }
    });
  } catch (error) {
    logger.error(`Get supplier performance error: ${error.message}`);
    next(error);
  }
};

const getAdvancedFarmerCreditLedger = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    const sales = await Sale.find(query).populate('customer', 'name phone village');
    const farmerStats = {};
    const today = new Date();

    for (const sale of sales) {
      if (!sale.customer) continue;
      const fId = sale.customer._id.toString();
      const fName = sale.customer.name;

      if (!farmerStats[fId]) {
        farmerStats[fId] = {
          farmerId: fId,
          farmerName: fName,
          phone: sale.customer.phone || 'N/A',
          village: sale.customer.village || 'N/A',
          totalPurchases: 0,
          amountPaid: 0,
          amountDue: 0,
          overdueAmount: 0,
          overdueCount: 0,
          lastSaleDate: null
        };
      }

      const stats = farmerStats[fId];
      stats.totalPurchases += sale.totalAmount || 0;
      stats.amountPaid += sale.amountPaid || 0;
      stats.amountDue += sale.amountDue || 0;

      // Overdue credit invoices check
      if (sale.paymentStatus !== 'Paid' && sale.dueDate && sale.dueDate < today && sale.amountDue > 0) {
        stats.overdueAmount += sale.amountDue;
        stats.overdueCount += 1;
      }

      if (!stats.lastSaleDate || sale.saleDate > stats.lastSaleDate) {
        stats.lastSaleDate = sale.saleDate;
      }
    }

    let items = Object.values(farmerStats);

    if (status === 'overdue') {
      items = items.filter(s => s.overdueAmount > 0);
    } else if (status === 'active') {
      items = items.filter(s => s.amountDue > 0);
    }

    items.sort((a, b) => b.amountDue - a.amountDue); // sort by balance due descending

    const totalOutstandingCredit = items.reduce((sum, s) => sum + s.amountDue, 0);
    const totalOverdueAmount = items.reduce((sum, s) => sum + s.overdueAmount, 0);
    const farmersWithBalance = items.filter(s => s.amountDue > 0).length;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOutstandingCredit,
          totalOverdueAmount,
          farmersWithBalance
        },
        items
      }
    });
  } catch (error) {
    logger.error(`Get farmer credit ledger error: ${error.message}`);
    next(error);
  }
};

const getAdvancedTaxGstReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const saleQuery = { status: 'Active' };
    const purchaseQuery = { status: 'Active' };

    if (startDate || endDate) {
      saleQuery.saleDate = {};
      purchaseQuery.purchaseDate = {};
      if (startDate) {
        saleQuery.saleDate.$gte = new Date(startDate);
        purchaseQuery.purchaseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        saleQuery.saleDate.$lte = end;
        purchaseQuery.purchaseDate.$lte = end;
      }
    }

    const saleInvoices = await SaleInvoice.find(saleQuery);
    const purchaseInvoices = await PurchaseInvoice.find(purchaseQuery);

    let totalGstCollected = 0;
    let totalGstPaid = 0;

    const monthlyBreakdown = {};

    const getMonthKey = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    for (const inv of saleInvoices) {
      const gst = inv.gstAmount || 0;
      totalGstCollected += gst;

      const mKey = getMonthKey(inv.saleDate);
      if (!monthlyBreakdown[mKey]) {
        monthlyBreakdown[mKey] = { month: mKey, gstCollected: 0, gstPaid: 0, netLiability: 0 };
      }
      monthlyBreakdown[mKey].gstCollected += gst;
    }

    for (const inv of purchaseInvoices) {
      const gst = inv.gstAmount || 0;
      totalGstPaid += gst;

      const mKey = getMonthKey(inv.purchaseDate);
      if (!monthlyBreakdown[mKey]) {
        monthlyBreakdown[mKey] = { month: mKey, gstCollected: 0, gstPaid: 0, netLiability: 0 };
      }
      monthlyBreakdown[mKey].gstPaid += gst;
    }

    const breakdown = Object.values(monthlyBreakdown).map(item => {
      item.netLiability = item.gstCollected - item.gstPaid;
      return item;
    }).sort((a, b) => b.month.localeCompare(a.month));

    const netTaxLiability = totalGstCollected - totalGstPaid;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalGstCollected,
          totalGstPaid,
          netTaxLiability
        },
        items: breakdown
      }
    });
  } catch (error) {
    logger.error(`Get tax/GST report error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getStockReport,
  getSalesReport,
  getPurchaseReport,
  exportReport,
  getAdvancedProfitReport,
  getAdvancedSupplierPerformance,
  getAdvancedFarmerCreditLedger,
  getAdvancedTaxGstReport
};
