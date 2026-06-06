import api from './api';

export const getFarmerRecommendations = async (farmerId) => {
  const response = await api.get(`/recommendations/farmer/${farmerId}`);
  return response.data;
};

export const getTrendingRecommendations = async () => {
  const response = await api.get('/recommendations/trending');
  return response.data;
};

export const getSeasonalRecommendations = async (season = '') => {
  const url = season ? `/recommendations/seasonal?season=${season}` : '/recommendations/seasonal';
  const response = await api.get(url);
  return response.data;
};

export const getCropRecommendations = async (cropName) => {
  const response = await api.get(`/recommendations/crop/${cropName}`);
  return response.data;
};
