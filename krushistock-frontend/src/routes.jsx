import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';
import Layout from './components/layout/Layout';

import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import CategoryList from './pages/categories/CategoryList';
import ProductList from './pages/products/ProductList';
import SupplierList from './pages/suppliers/SupplierList';
import StockOverview from './pages/stock/StockOverview';
import LowStock from './pages/stock/LowStock';
import PurchaseList from './pages/purchases/PurchaseList';
import SalesList from './pages/sales/SalesList';
import FarmerList from './pages/customers/FarmerList';
import StockReport from './pages/reports/StockReport';
import SalesReport from './pages/reports/SalesReport';
import PurchaseReport from './pages/reports/PurchaseReport';
import UserList from './pages/users/UserList';
import Settings from './pages/settings/Settings';

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="categories" element={<CategoryList />} />
        
        <Route path="products" element={<ProductList />} />
        
        <Route path="suppliers" element={<SupplierList />} />
        
        <Route path="stock" element={<StockOverview />} />
        <Route path="stock/low-stock" element={<LowStock />} />
        
        <Route path="purchases" element={<PurchaseList />} />
        
        <Route path="sales" element={<SalesList />} />
        
        <Route path="farmers" element={<FarmerList />} />
        
        <Route path="reports/stock" element={<StockReport />} />
        <Route path="reports/sales" element={<SalesReport />} />
        <Route path="reports/purchase" element={<PurchaseReport />} />
        
        <Route path="users" element={<UserList />} />
        
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
