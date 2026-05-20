const Stock = require('../models/Stock');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ deletedAt: null });

    const stockAgg = await Stock.aggregate([
      {
        $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' }
      },
      { $unwind: '$p' },
      { $match: { 'p.deletedAt': null } },
      {
        $group: {
          _id: null,
          totalStockValue: { $sum: { $multiply: ['$quantity', '$p.price'] } },
          lowStockCount: { $sum: { $cond: [{ $lte: ['$quantity', '$lowStockLimit'] }, 1, 0] } }
        }
      }
    ]);

    const totalStockValue = stockAgg[0]?.totalStockValue || 0;
    const lowStockCount = stockAgg[0]?.lowStockCount || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const salesAgg = await Sale.aggregate([
      { $match: { saleDate: { $gte: today } } },
      { $group: { _id: null, todaySalesAmount: { $sum: '$totalAmount' } } }
    ]);
    const todaySalesAmount = salesAgg[0]?.todaySalesAmount || 0;

    // --- Dynamic Chart Data ---
    // 1. Stock by Category
    const stockByCategory = await Stock.aggregate([
      { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $match: { 'p.deletedAt': null } },
      { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $group: { _id: '$c.name', stock: { $sum: '$quantity' } } },
      { $project: { name: '$_id', stock: 1, _id: 0 } }
    ]);

    // 2. Sales Trend (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    const salesTrendAgg = await Sale.aggregate([
      { $match: { saleDate: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$saleDate' }, year: { $year: '$saleDate' } }, sales: { $sum: '$totalAmount' } } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const salesTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      salesTrend.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        sales: 0
      });
    }

    salesTrendAgg.forEach(item => {
      const trendItem = salesTrend.find(t => t.month === monthNames[item._id.month - 1] && t.year === item._id.year);
      if (trendItem) {
        trendItem.sales = item.sales;
      }
    });

    const finalSalesTrend = salesTrend.map(t => ({ month: t.month, sales: t.sales }));

    // --- Recent Activity ---
    const recentSales = await Sale.find().sort({ createdAt: -1 }).limit(5).populate('customer', 'name');
    const recentPurchases = await Purchase.find().sort({ createdAt: -1 }).limit(5).populate('supplier', 'name');
    const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(5);

    let activities = [];
    recentSales.forEach(s => activities.push({
      id: `s_${s._id}`, type: 'sale', description: `Sale recorded for ${s.customer?.name || 'Walk-in'}`, amount: s.totalAmount, date: s.createdAt
    }));
    recentPurchases.forEach(p => activities.push({
      id: `p_${p._id}`, type: 'purchase', description: `Purchase from ${p.supplier?.name || 'Unknown'}`, amount: p.totalAmount, date: p.createdAt
    }));
    recentProducts.forEach(p => activities.push({
      id: `pr_${p._id}`, type: 'product', description: `New product added: ${p.name}`, date: p.createdAt
    }));

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = activities.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalStock: totalStockValue,
        todaySales: todaySalesAmount,
        lowStockCount,
        stockByCategory,
        salesTrend: finalSalesTrend,
        recentActivity
      }
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
    const { startDate, endDate, category } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    const activeProducts = await Product.find({ deletedAt: null }).select('_id');
    const activeProductIds = activeProducts.map(p => p._id);
    query.product = { $in: activeProductIds };

    if (category) {
      const categoryProducts = await Product.find({ category, deletedAt: null });
      const categoryProductIds = categoryProducts.map(p => p._id);
      query.product = { $in: categoryProductIds };
    }

    const summaryAgg = await Stock.aggregate([
      { $match: query },
      {
        $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' }
      },
      { $unwind: '$p' },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$p.price'] } },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    const summary = summaryAgg[0] || { totalValue: 0, totalQuantity: 0 };
    const totalItemsCount = await Stock.countDocuments(query);

    const stocks = await Stock.find(query)
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' }
      })
      .skip(skip)
      .limit(limit);

    const items = stocks.map(stock => ({
      product: stock.product.name,
      category: stock.product.category?.name,
      openingStock: stock.quantity,
      purchases: 0,
      sales: 0,
      closingStock: stock.quantity,
      value: stock.quantity * (stock.product?.price || 0)
    }));

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total: totalItemsCount,
        page,
        pages: Math.ceil(totalItemsCount / limit)
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

    const sales = await Sale.find(query)
      .populate('customer', 'name')
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit);

    const items = sales.map(sale => ({
      date: sale.saleDate,
      saleNumber: sale.saleNumber,
      customer: sale.customer?.name || 'Walk-in',
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

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name')
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit);

    const items = purchases.map(purchase => ({
      date: purchase.purchaseDate,
      purchaseNumber: purchase.purchaseNumber,
      supplier: purchase.supplier?.name,
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

module.exports = {
  getDashboardStats,
  getStockReport,
  getSalesReport,
  getPurchaseReport
};
