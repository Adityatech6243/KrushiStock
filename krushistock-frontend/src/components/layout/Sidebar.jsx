import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/categories', label: 'Categories', icon: '📂' },
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/suppliers', label: 'Suppliers', icon: '🏭' },
    { path: '/stock', label: 'Stock Overview', icon: '📈' },
    { path: '/stock/low-stock', label: 'Low Stock', icon: '⚠️' },
    { path: '/purchases', label: 'Purchases', icon: '🛒' },
    { path: '/sales', label: 'Sales', icon: '💰' },
    { path: '/farmers', label: 'Farmers', icon: '👨‍🌾' },
    { path: '/reports/stock', label: 'Stock Report', icon: '📑' },
    { path: '/reports/sales', label: 'Sales Report', icon: '📊' },
    { path: '/reports/purchase', label: 'Purchase Report', icon: '📋' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="bg-gray-800 text-white w-64 h-screen fixed left-0 top-0 overflow-y-auto print:hidden">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-green-400 mb-8">KrushiStock</h1>
        <nav>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
