const Stock = require('../models/Stock');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const Supplier = require('../models/Supplier');

const fetchDashboardStatsData = async () => {
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
        totalStockValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$p.purchasePrice', '$p.price'] }] } },
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
  const stockByCategory = await Stock.aggregate([
    { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' } },
    { $unwind: '$p' },
    { $match: { 'p.deletedAt': null } },
    { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } },
    { $unwind: '$c' },
    { $group: { _id: '$c.name', stock: { $sum: '$quantity' } } },
    { $project: { name: '$_id', stock: 1, _id: 0 } }
  ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

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
    id: `p_${p._id}`, type: 'purchase', description: `Purchase from ${p.supplier?.name || 'Deleted Supplier'}`, amount: p.totalAmount, date: p.createdAt
  }));
  recentProducts.forEach(p => activities.push({
    id: `pr_${p._id}`, type: 'product', description: `New product added: ${p.name}`, date: p.createdAt
  }));

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentActivity = activities.slice(0, 5);

  // --- New Live Feeling Compact Stats ---
  const expiredCount = await Product.countDocuments({ deletedAt: null, stockStatus: 'Expired' });
  const nearExpiryCount = await Product.countDocuments({ deletedAt: null, stockStatus: 'Near Expiry' });

  const pendingSales = await Sale.find({ paymentStatus: { $in: ['Pending', 'Partial'] } });
  const pendingPaymentsCount = pendingSales.length;
  const pendingPaymentsAmount = pendingSales.reduce((sum, s) => sum + (s.amountDue || 0), 0);
  const now = new Date();
  const overduePaymentsCount = pendingSales.filter(s => s.dueDate && new Date(s.dueDate) < now).length;

  const reorderAgg = await Stock.aggregate([
    {
      $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' }
    },
    { $unwind: '$p' },
    { $match: { 'p.deletedAt': null } },
    {
      $project: {
        quantity: 1,
        reorderLevel: { $ifNull: ['$lowStockLimit', '$p.reorderLevel'] },
        purchasePrice: { $ifNull: ['$p.purchasePrice', '$p.price'] }
      }
    },
    {
      $match: {
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
      }
    },
    {
      $group: {
        _id: null,
        totalReorderCost: { $sum: { $multiply: [ { $subtract: ['$reorderLevel', '$quantity'] }, '$purchasePrice' ] } },
        reorderItemsCount: { $sum: 1 }
      }
    }
  ]);

  return {
    totalProducts,
    totalStock: totalStockValue,
    todaySales: todaySalesAmount,
    lowStockCount,
    stockByCategory,
    salesTrend: finalSalesTrend,
    recentActivity,
    expiryStats: {
      expiredCount,
      nearExpiryCount
    },
    pendingPayments: {
      count: pendingPaymentsCount,
      amount: pendingPaymentsAmount,
      overdueCount: overduePaymentsCount
    },
    reorderValue: {
      count: reorderAgg[0]?.reorderItemsCount || 0,
      value: reorderAgg[0]?.totalReorderCost || 0
    }
  };
};

module.exports = { fetchDashboardStatsData };
