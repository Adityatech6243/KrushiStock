import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../../services/reportService';
import StockChart from '../../components/charts/StockChart';
import SalesChart from '../../components/charts/SalesChart';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatNumber } from '../../utils/helpers';

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
      // Optional: Handle error UI here
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: formatNumber(stats.totalProducts),
      icon: '📦',
      color: 'bg-blue-500',
      link: '/products'
    },
    {
      title: 'Total Stock Value',
      value: formatCurrency(stats.totalStock),
      icon: '💰',
      color: 'bg-green-500',
      link: '/stock'
    },
    {
      title: 'Today Sales',
      value: formatCurrency(stats.todaySales),
      icon: '📊',
      color: 'bg-purple-500',
      link: '/sales'
    },
    {
      title: 'Low Stock Items',
      value: formatNumber(stats.lowStockCount),
      icon: '⚠️',
      color: 'bg-red-500',
      link: '/stock/low-stock'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Welcome to KrushiStock Inventory Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} text-white text-3xl p-3 rounded-lg`}>
                {card.icon}
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <StockChart data={stats.stockByCategory} />
        <SalesChart data={stats.salesTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/sales/new"
              className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-green-700">➕ New Sale</span>
            </Link>
            <Link
              to="/purchases/add"
              className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-blue-700">🛒 Add Purchase</span>
            </Link>
            <Link
              to="/products/add"
              className="block p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-purple-700">📦 Add Product</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">{activity.description}</span>
                  <span className="text-xs text-gray-500">{new Date(activity.date).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
