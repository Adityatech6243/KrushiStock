import api from './api';

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const forgotPassword = async (emailOrUsername) => {
  const response = await api.post('/auth/forgot-password', { emailOrUsername });
  return response.data;
};

export const verifyOTP = async (emailOrUsername, otp) => {
  const response = await api.post('/auth/verify-otp', { emailOrUsername, otp });
  return response.data;
};

export const resetPassword = async (resetToken, newPassword) => {
  const response = await api.post('/auth/reset-password', { resetToken, newPassword });
  return response.data;
};
