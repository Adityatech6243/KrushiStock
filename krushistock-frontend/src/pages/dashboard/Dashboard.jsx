import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../../services/reportService';
import StockChart from '../../components/charts/StockChart';
import SalesChart from '../../components/charts/SalesChart';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import { 
  Package, 
  DollarSign, 
  BarChart3, 
  AlertTriangle, 
  Plus, 
  ShoppingCart, 
  ArrowRight,
  TrendingUp,
  Activity,
  Sparkles
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    todaySales: 0,
    lowStockCount: 0,
    stockByCategory: [],
    salesTrend: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: formatNumber(stats.totalProducts),
      icon: Package,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      link: '/products'
    },
    {
      title: 'Total Stock Value',
      value: formatCurrency(stats.totalStock),
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      link: '/stock'
    },
    {
      title: 'Today Sales',
      value: formatCurrency(stats.todaySales),
      icon: BarChart3,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      link: '/sales'
    },
    {
      title: 'Low Stock Items',
      value: formatNumber(stats.lowStockCount),
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      link: '/stock/low-stock'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">System Dashboard</h1>
          <p className="text-slate-500 text-xs md:text-sm">Real-time agricultural inventory, sales analytics, and stock alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs font-semibold text-slate-400">Refreshing...</span>
          )}
          <Link
            to="/dashboard/recommendations"
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors"
          >
            <Sparkles size={14} /> AI Recommendation Catalog
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link
              key={index}
              to={card.link}
              className="bg-white rounded-xl shadow-soft border border-slate-100 p-5 hover:shadow-soft-md transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between"
            >
              <div className="space-y-1">
                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{card.title}</h3>
                <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <Icon size={18} className="stroke-[2.5]" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockChart data={stats.stockByCategory} />
        <SalesChart data={stats.salesTrend} />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-600" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/sales"
                className="flex items-center justify-between p-3.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-200/80 transition-colors">
                    <Plus size={16} />
                  </span>
                  <span className="text-xs font-bold text-emerald-800">Record New Sale</span>
                </div>
                <ArrowRight size={14} className="text-emerald-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/purchases"
                className="flex items-center justify-between p-3.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-200/80 transition-colors">
                    <ShoppingCart size={16} />
                  </span>
                  <span className="text-xs font-bold text-blue-800">Log Purchase Batch</span>
                </div>
                <ArrowRight size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/products"
                className="flex items-center justify-between p-3.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:bg-purple-200/80 transition-colors">
                    <Package size={16} />
                  </span>
                  <span className="text-xs font-bold text-purple-800">Register New Product</span>
                </div>
                <ArrowRight size={14} className="text-purple-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id || activity._id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-start gap-2.5">
                    <span className="h-2 w-2 mt-1.5 rounded-full bg-slate-300"></span>
                    <span className="text-xs font-semibold text-slate-600">{activity.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium ml-4">{new Date(activity.date).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <span className="text-3xl text-slate-300">⏳</span>
                <p className="text-xs text-slate-400 font-medium mt-2">No recent activity logged in the system.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
