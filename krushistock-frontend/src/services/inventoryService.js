import api from './api';

export const getNearExpiryProducts = async (page = 1, limit = 10, search = '', category = '') => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) queryParams.append('search', search);
  if (category) queryParams.append('category', category);

  const response = await api.get(`/inventory/near-expiry?${queryParams.toString()}`);
  return response.data;
};

export const getExpiredProducts = async (page = 1, limit = 10, search = '', category = '') => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) queryParams.append('search', search);
  if (category) queryParams.append('category', category);

  const response = await api.get(`/inventory/expired?${queryParams.toString()}`);
  return response.data;
};

export const getDeadStockProducts = async (page = 1, limit = 10, search = '', category = '') => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) queryParams.append('search', search);
  if (category) queryParams.append('category', category);

  const response = await api.get(`/inventory/dead-stock?${queryParams.toString()}`);
  return response.data;
};

export const getWasteAnalytics = async () => {
  const response = await api.get('/inventory/waste-analytics');
  return response.data;
};

export const updateStockStatuses = async () => {
  const response = await api.put('/inventory/update-stock-status');
  return response.data;
};
