const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getStockReport,
  getSalesReport,
  getPurchaseReport,
  exportReport,
  getAdvancedProfitReport,
  getAdvancedSupplierPerformance,
  getAdvancedFarmerCreditLedger,
  getAdvancedTaxGstReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/stock', getStockReport);
router.get('/sales', getSalesReport);
router.get('/purchases', getPurchaseReport);
router.get('/advanced/profit', getAdvancedProfitReport);
router.get('/advanced/supplier-performance', getAdvancedSupplierPerformance);
router.get('/advanced/credit-ledger', getAdvancedFarmerCreditLedger);
router.get('/advanced/tax-gst', getAdvancedTaxGstReport);
router.get('/:type/export', exportReport);

module.exports = router;
