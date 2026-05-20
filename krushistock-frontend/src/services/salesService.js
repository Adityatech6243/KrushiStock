import api from './api';

export const getAllSales = async (page = 1, limit = 10) => {
  const response = await api.get(`/sales?page=${page}&limit=${limit}`);
  return response.data;
};

export const createSale = async (saleData) => {
  const response = await api.post('/sales', saleData);
  return response.data;
};

export const getSaleById = async (id) => {
  const response = await api.get(`/sales/${id}`);
  return response.data;
};

export const getSale = getSaleById;

export const updateSale = async (id, saleData) => {
  const response = await api.put(`/sales/${id}`, saleData);
  return response.data;
};

export const deleteSale = async (id) => {
  const response = await api.delete(`/sales/${id}`);
  return response.data;
};

