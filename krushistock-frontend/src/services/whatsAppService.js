import api from './api';

export const sendManualInvoice = async (saleId) => {
  const response = await api.post(`/whatsapp/sales/${saleId}/send-invoice`);
  return response.data;
};
