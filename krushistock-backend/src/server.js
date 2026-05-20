const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { PORT, CLIENT_URL } = require('./config/env');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const stockRoutes = require('./routes/stockRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const saleRoutes = require('./routes/saleRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

connectDB();

// Global Security Middleware
app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitization against NoSQL Injection and XSS
app.use(mongoSanitize());
app.use(xss());

// Request Logging
app.use(morgan('dev'));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api', globalLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KrushiStock API Server',
    version: '1.0.0'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/stock', stockRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/farmers', farmerRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
