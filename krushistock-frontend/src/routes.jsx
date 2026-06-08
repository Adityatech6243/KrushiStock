import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, getUserInfo } from './utils/auth';
import Layout from './components/layout/Layout';
import Loader from './components/common/Loader';

// Lazy loaded page components
const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const CategoryList = lazy(() => import('./pages/categories/CategoryList'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const SupplierList = lazy(() => import('./pages/suppliers/SupplierList'));
const StockOverview = lazy(() => import('./pages/stock/StockOverview'));
const LowStock = lazy(() => import('./pages/stock/LowStock'));
const PurchaseList = lazy(() => import('./pages/purchases/PurchaseList'));
const SalesList = lazy(() => import('./pages/sales/SalesList'));
const FarmerList = lazy(() => import('./pages/customers/FarmerList'));
const StockReport = lazy(() => import('./pages/reports/StockReport'));
const SalesReport = lazy(() => import('./pages/reports/SalesReport'));
const PurchaseReport = lazy(() => import('./pages/reports/PurchaseReport'));
const AdvancedReports = lazy(() => import('./pages/reports/AdvancedReports'));
const BackgroundJobs = lazy(() => import('./pages/settings/BackgroundJobs'));
const NotificationInbox = lazy(() => import('./pages/notifications/NotificationInbox'));
const UserList = lazy(() => import('./pages/users/UserList'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const ExpiryManagement = lazy(() => import('./pages/dashboard/ExpiryManagement'));
const WasteAnalytics = lazy(() => import('./pages/dashboard/WasteAnalytics'));
const RecommendationsDashboard = lazy(() => import('./pages/dashboard/RecommendationsDashboard'));
const FarmerRecommendations = lazy(() => import('./pages/dashboard/FarmerRecommendations'));

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const userInfo = getUserInfo();
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  if (userInfo?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader fullScreen={true} />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/expiry-management" element={<ExpiryManagement />} />
          <Route path="dashboard/waste-analytics" element={<WasteAnalytics />} />
          <Route path="dashboard/recommendations" element={<RecommendationsDashboard />} />
          <Route path="dashboard/farmers/:id/recommendations" element={<FarmerRecommendations />} />
          
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
          <Route path="reports/advanced" element={<AdvancedReports />} />
          
          <Route path="notifications" element={<NotificationInbox />} />
          
          <Route path="users" element={<AdminRoute><UserList /></AdminRoute>} />
          
          <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
          <Route path="settings/jobs" element={<AdminRoute><BackgroundJobs /></AdminRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
