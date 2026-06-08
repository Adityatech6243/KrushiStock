const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (import.meta.env.PROD) {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/api/v1`
      : '/api/v1';
  }
  
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api/v1`;
};

export const API_BASE_URL = getApiBaseUrl();

export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff'
};

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'UPI',
  'Bank Transfer'
];

export const PRODUCT_UNITS = [
  'kg',
  'litre',
  'piece',
  'bag',
  'box'
];

export const LOW_STOCK_THRESHOLD = 10;
