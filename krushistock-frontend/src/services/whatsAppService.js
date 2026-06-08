import api from './api';

export const sendManualInvoice = async (saleId) => {
  const response = await api.post(`/whatsapp/sales/${saleId}/send-invoice`);
  return response.data;
};

export const getWhatsAppSettings = async () => {
  const response = await api.get('/whatsapp/settings');
  return response.data;
};

export const updateWhatsAppSettings = async (settingsData) => {
  const response = await api.put('/whatsapp/settings', settingsData);
  return response.data;
};
