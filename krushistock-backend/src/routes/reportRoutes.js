const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getStockReport,
  getSalesReport,
  getPurchaseReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/stock', getStockReport);
router.get('/sales', getSalesReport);
router.get('/purchases', getPurchaseReport);

module.exports = router;
