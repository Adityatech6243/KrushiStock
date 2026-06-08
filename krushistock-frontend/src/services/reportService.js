import api from './api';

export const getDashboardStats = async () => {
  const response = await api.get('/reports/dashboard-stats');
  return response.data;
};

export const getStockReport = async (filters) => {
  const response = await api.get('/reports/stock', { params: filters });
  return response.data;
};

export const getSalesReport = async (filters) => {
  const response = await api.get('/reports/sales', { params: filters });
  return response.data;
};

export const getPurchaseReport = async (filters) => {
  const response = await api.get('/reports/purchases', { params: filters });
  return response.data;
};

export const exportReport = async (type, filters) => {
  const response = await api.get(`/reports/${type}/export`, {
    params: { ...filters, format: 'csv' },
    responseType: 'blob'
  });
  return response.data;
};

export const getAdvancedProfitReport = async (filters) => {
  const response = await api.get('/reports/advanced/profit', { params: filters });
  return response.data;
};

export const getAdvancedSupplierPerformance = async (filters) => {
  const response = await api.get('/reports/advanced/supplier-performance', { params: filters });
  return response.data;
};

export const getAdvancedFarmerCreditLedger = async (filters) => {
  const response = await api.get('/reports/advanced/credit-ledger', { params: filters });
  return response.data;
};

export const getAdvancedTaxGstReport = async (filters) => {
  const response = await api.get('/reports/advanced/tax-gst', { params: filters });
  return response.data;
};
