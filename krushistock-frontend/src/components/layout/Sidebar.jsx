import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderTree, 
  Package, 
  Factory, 
  TrendingUp, 
  AlertTriangle, 
  Hourglass, 
  Recycle, 
  Sparkles, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  FileText, 
  Settings, 
  UserSquare2,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/dashboard/recommendations', label: 'AI Recommendations', icon: Sparkles },
      ]
    },
    {
      title: 'Operations',
      items: [
        { path: '/products', label: 'Products', icon: Package },
        { path: '/categories', label: 'Categories', icon: FolderTree },
        { path: '/stock', label: 'Stock Overview', icon: TrendingUp },
        { path: '/stock/low-stock', label: 'Low Stock Alerts', icon: AlertTriangle },
      ]
    },
    {
      title: 'LifeCycle & Waste',
      items: [
        { path: '/dashboard/expiry-management', label: 'Expiry & Waste', icon: Hourglass },
        { path: '/dashboard/waste-analytics', label: 'Waste Analytics', icon: Recycle },
      ]
    },
    {
      title: 'Transactions',
      items: [
        { path: '/sales', label: 'Sales Billing', icon: DollarSign },
        { path: '/purchases', label: 'Purchases Log', icon: ShoppingCart },
      ]
    },
    {
      title: 'Contacts & Reports',
      items: [
        { path: '/farmers', label: 'Farmers Base', icon: Users },
        { path: '/suppliers', label: 'Suppliers Base', icon: Factory },
        { path: '/reports/stock', label: 'Stock Reports', icon: FileText },
        { path: '/reports/sales', label: 'Sales Reports', icon: FileText },
        { path: '/reports/purchase', label: 'Purchase Reports', icon: FileText },
      ]
    },
    {
      title: 'System',
      items: [
        { path: '/users', label: 'Staff Accounts', icon: UserSquare2 },
        { path: '/settings', label: 'Store Settings', icon: Settings },
      ]
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'));
  };

  return (
    <aside className={`bg-slate-50 border-r border-slate-200/80 w-64 h-screen fixed left-0 top-0 overflow-y-auto z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } print:hidden flex flex-col justify-between`}>
      <div className="py-5">
        {/* Brand Header */}
        <div className="px-6 mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-700 tracking-tight">
              KrushiStock
            </h1>
            {/* <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1">
              Cultivating Success
            </span> */}
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="px-3 space-y-5">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <h2 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {group.title}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                          active
                            ? 'bg-primary-600 text-white shadow-sm shadow-primary-200 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        <Icon size={15} className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'}`} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
