require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  if (!process.env.MONGO_URI) {
    throw new Error('FATAL ERROR: MONGO_URI is not defined in production environment variables.');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in production environment variables.');
  }
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krushistock',
  JWT_SECRET: process.env.JWT_SECRET || 'krushistock_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  Network_URL : process.env.Network_URL || 'http://10.184.63.251:5173'
};
