import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUserInfo } from '../../utils/auth';
import { motion } from 'framer-motion';
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
  X,
  Sprout
} from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08, // Stagger delay (load one by one, slow!)
      type: 'spring',
      stiffness: 90,
      damping: 14,
    }
  })
};

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const userInfo = getUserInfo();
  const isAdmin = userInfo?.role === 'admin';

  const [isLargeScreen, setIsLargeScreen] = React.useState(window.innerWidth >= 1024);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const animateState = (isLargeScreen || isOpen) ? 'visible' : 'hidden';

  let globalAnimIndex = 0;

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
        { path: '/reports/advanced', label: 'Advanced Reports', icon: Sparkles },
      ]
    },
    {
      title: 'System',
      items: [
        { path: '/users', label: 'Staff Accounts', icon: UserSquare2, isAdminOnly: true },
        { path: '/settings', label: 'Store Settings', icon: Settings, isAdminOnly: true },
        { path: '/settings/jobs', label: 'Background Jobs', icon: Settings, isAdminOnly: true },
      ]
    }
  ];

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.isAdminOnly || isAdmin)
  })).filter(group => group.items.length > 0);

  const isActive = (path) => {
    if (location.pathname === path) return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path + '/')) {
      const hasExactMatchOther = filteredGroups.some(group => 
        group.items.some(item => item.path !== path && location.pathname === item.path)
      );
      return !hasExactMatchOther;
    }
    return false;
  };

  return (
    <aside className={`fixed z-40 transition-all duration-300 ease-out 
      /* Mobile styles: centered floating card sliding from left */
      w-[90%] max-w-sm h-fit max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-100/70 p-5 overflow-y-auto flex flex-col justify-between
      top-1/2 left-1/2 -translate-y-1/2
      ${isOpen ? 'translate-x-[-50%] opacity-100 scale-100 pointer-events-auto' : 'translate-x-[-150%] opacity-0 scale-95 pointer-events-none'}
      
      /* Desktop styles: left static panel */
      lg:fixed lg:left-0 lg:top-0 lg:translate-x-0 lg:translate-y-0 lg:scale-100 lg:opacity-100 lg:pointer-events-auto 
      lg:w-64 lg:h-screen lg:rounded-none lg:shadow-none lg:border-r lg:border-slate-200/80 lg:bg-slate-50 lg:p-0 lg:max-h-none lg:overflow-y-auto
      print:hidden`}>
      
      {/* Watermark logo on mobile */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none lg:hidden">
        <Sprout size={180} className="text-primary-800" />
      </div>

      <div className="lg:py-5 relative z-10">
        {/* Brand Header */}
        <div className="px-6 mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-700 tracking-tight">
              KrushiStock
            </h1>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-full bg-primary-50 hover:bg-primary-100 text-primary-600 hover:text-primary-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
 
        {/* Navigation list */}
        <motion.nav 
          initial="hidden"
          animate={animateState}
          className="px-3 space-y-4 lg:space-y-5"
        >
          {filteredGroups.map((group, groupIdx) => {
            const headingIndex = globalAnimIndex++;
            return (
              <div key={groupIdx}>
                {groupIdx > 0 && <div className="border-t border-slate-100 my-3 lg:hidden" />}
                <div className="space-y-1">
                  <motion.h2 
                    custom={headingIndex}
                    variants={itemVariants}
                    className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
                  >
                    {group.title}
                  </motion.h2>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      const itemIndex = globalAnimIndex++;
                      return (
                        <motion.li 
                          key={item.path}
                          custom={itemIndex}
                          variants={itemVariants}
                        >
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
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </motion.nav>
      </div>
    </aside>
  );
};

export default Sidebar;
