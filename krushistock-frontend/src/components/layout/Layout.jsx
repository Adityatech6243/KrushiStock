import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  const location = useLocation();
  const path = location.pathname;

  const getBackgroundClass = () => {
    if (path.startsWith('/products') || path.startsWith('/categories') || path.startsWith('/stock')) return 'bg-products';
    if (path.startsWith('/sales') || path.startsWith('/purchases') || path.startsWith('/reports')) return 'bg-finance';
    if (path.startsWith('/farmers') || path.startsWith('/suppliers') || path.startsWith('/users')) return 'bg-people';
    return 'bg-dashboard'; // Default
  };

  return (
    <div className={`flex min-h-screen ${getBackgroundClass()} transition-all duration-500 print:bg-white`}>
      <Sidebar />
      <div className="flex-1 ml-64 print:ml-0 bg-white/40 print:bg-white backdrop-blur-sm min-h-screen flex flex-col">
        <Header />
        <main className="p-6 flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
