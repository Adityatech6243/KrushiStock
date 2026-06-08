import React, { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import Loader from '../common/Loader';

const Layout = () => {
  const location = useLocation();
  const path = location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getBackgroundClass = () => {
    if (path.startsWith('/products') || path.startsWith('/categories') || path.startsWith('/stock')) return 'bg-products';
    if (path.startsWith('/sales') || path.startsWith('/purchases') || path.startsWith('/reports')) return 'bg-finance';
    if (path.startsWith('/farmers') || path.startsWith('/suppliers') || path.startsWith('/users')) return 'bg-people';
    return 'bg-dashboard'; // Default
  };

  return (
    <div className={`flex min-h-screen ${getBackgroundClass()} transition-all duration-500 print:bg-white`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Sidebar mobile overlay backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-64 print:ml-0 min-h-screen flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-4 md:p-6 flex-1 max-w-7xl w-full mx-auto">
          <Suspense fallback={<Loader size="lg" />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
