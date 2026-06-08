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
  Sparkles,
  Hourglass,
  Bell
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    todaySales: 0,
    lowStockCount: 0,
    stockByCategory: [],
    salesTrend: [],
    recentActivity: [],
    expiryStats: { expiredCount: 0, nearExpiryCount: 0 },
    pendingPayments: { count: 0, amount: 0, overdueCount: 0 },
    reorderValue: { count: 0, value: 0 }
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const response = await getDashboardStats();
      if (response?.success && response?.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial HTTP fetch
    fetchDashboardStats();

    // 2. Establish WebSocket connection
    let ws = null;
    let pollInterval = null;

    const connectWS = () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000/api/v1`;
        let wsUrl = apiBase.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'stats_update') {
              setStats(message.data);
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          console.warn('Dashboard WebSocket closed. Falling back to HTTP polling.');
          startPolling();
        };

        ws.onerror = (err) => {
          console.error('Dashboard WebSocket error:', err);
          ws.close();
        };
      } catch (err) {
        console.error('Error connecting to WS:', err);
        startPolling();
      }
    };

    const startPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          fetchDashboardStats();
        }, 10000); // Poll every 10s as a fallback
      }
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

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

      {/* Live Compact Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Expiry Card */}
        <Link 
          to="/dashboard/expiry-management"
          className="bg-white rounded-xl shadow-soft border border-slate-100 p-5 hover:shadow-soft-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Expiry Tracker</h3>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
              <Hourglass size={15} />
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">{stats.expiryStats?.expiredCount || 0}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Expired Items</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              <span className="text-amber-600 font-bold">{stats.expiryStats?.nearExpiryCount || 0}</span> items near expiry (within 30 days)
            </p>
          </div>
        </Link>

        {/* Pending Payments Card */}
        <Link 
          to="/sales"
          className="bg-white rounded-xl shadow-soft border border-slate-100 p-5 hover:shadow-soft-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Credit Receivables</h3>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <Bell size={15} />
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600">{formatCurrency(stats.pendingPayments?.amount || 0)}</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              <span className="text-amber-600 font-bold">{stats.pendingPayments?.count || 0}</span> credit sales (<span className="text-rose-600 font-bold">{stats.pendingPayments?.overdueCount || 0}</span> overdue)
            </p>
          </div>
        </Link>

        {/* Replenishment Estimation Card */}
        <Link 
          to="/stock/low-stock"
          className="bg-white rounded-xl shadow-soft border border-slate-100 p-5 hover:shadow-soft-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Replenishment Cost</h3>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <ShoppingCart size={15} />
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600">{formatCurrency(stats.reorderValue?.value || 0)}</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Estimated cost for <span className="text-indigo-600 font-bold">{stats.reorderValue?.count || 0}</span> low-stock items
            </p>
          </div>
        </Link>
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
