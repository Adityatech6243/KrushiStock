import api from './api';

export const getAllPurchases = async (page = 1, limit = 10) => {
  const response = await api.get(`/purchases?page=${page}&limit=${limit}`);
  return response.data;
};

export const createPurchase = async (purchaseData) => {
  const response = await api.post('/purchases', purchaseData);
  return response.data;
};

export const getPurchaseById = async (id) => {
  const response = await api.get(`/purchases/${id}`);
  return response.data;
};

export const getPurchase = getPurchaseById;

export const updatePurchase = async (id, purchaseData) => {
  const response = await api.put(`/purchases/${id}`, purchaseData);
  return response.data;
};

export const deletePurchase = async (id) => {
  const response = await api.delete(`/purchases/${id}`);
  return response.data;
};
