import api from './api';

export const getStockOverview = async (page = 1, limit = 10) => {
  const response = await api.get(`/stock/overview?page=${page}&limit=${limit}`);
  return response.data;
};

export const getLowStockProducts = async (page = 1, limit = 10) => {
  const response = await api.get(`/stock/low-stock?page=${page}&limit=${limit}`);
  return response.data;
};

