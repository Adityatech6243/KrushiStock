import api from './api';

export const getStoreSettings = async () => {
  const response = await api.get('/settings/store');
  return response.data;
};

export const updateStoreSettings = async (settingsData) => {
  const response = await api.put('/settings/store', settingsData);
  return response.data;
};
