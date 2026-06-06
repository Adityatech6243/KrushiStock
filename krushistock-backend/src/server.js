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
const inventoryRoutes = require('./routes/inventoryRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const whatsAppRoutes = require('./routes/whatsAppRoutes');
const path = require('path');

const app = express();

connectDB();

// Global Security Middleware
app.use(helmet());
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));
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

// Static assets serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/stock', stockRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/v1/farmers', farmerRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/whatsapp', whatsAppRoutes);

// Register Expiry & Waste inventory routes under requested path and v1 path
app.use('/api/inventory', inventoryRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// Register Recommendation routes
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

app.use(errorHandler);

const { initCronJobs } = require('./config/cron');
initCronJobs();

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
