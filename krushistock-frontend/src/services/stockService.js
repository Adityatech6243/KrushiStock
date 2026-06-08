import api from './api';

export const getStockOverview = async (page = 1, limit = 10) => {
  const response = await api.get(`/stock/overview?page=${page}&limit=${limit}`);
  return response.data;
};

export const getLowStockProducts = async (page = 1, limit = 10) => {
  const response = await api.get(`/stock/low-stock?page=${page}&limit=${limit}`);
  return response.data;
};

export const updateStock = async (productId, quantity, operation = 'set') => {
  const response = await api.put('/stock/update', { productId, quantity, operation });
  return response.data;
};

export const getStockMovements = async (page = 1, limit = 10, productId = '', type = '') => {
  let url = `/stock/movements?page=${page}&limit=${limit}`;
  if (productId) url += `&productId=${productId}`;
  if (type) url += `&type=${type}`;
  const response = await api.get(url);
  return response.data;
};

export const recordStockAdjustment = async (productId, quantity, type, note) => {
  const response = await api.post('/stock/adjustments', { productId, quantity, type, note });
  return response.data;
};
