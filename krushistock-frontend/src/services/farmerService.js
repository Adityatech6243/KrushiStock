import api from './api';

export const getAllFarmers = async (page = 1, limit = 10) => {
  const response = await api.get(`/farmers?page=${page}&limit=${limit}`);
  return response.data;
};

export const createFarmer = async (farmerData) => {
  const response = await api.post('/farmers', farmerData);
  return response.data;
};

export const getFarmerById = async (id) => {
  const response = await api.get(`/farmers/${id}`);
  return response.data;
};

export const getFarmer = getFarmerById;

export const updateFarmer = async (id, farmerData) => {
  const response = await api.put(`/farmers/${id}`, farmerData);
  return response.data;
};

export const deleteFarmer = async (id) => {
  const response = await api.delete(`/farmers/${id}`);
  return response.data;
};
