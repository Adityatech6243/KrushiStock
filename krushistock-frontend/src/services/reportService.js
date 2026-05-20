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
