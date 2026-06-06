const express = require('express');
const router = express.Router();
const {
  getNearExpiry,
  getExpired,
  getDeadStock,
  getWasteAnalytics,
  updateStockStatus
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes under inventory management
router.use(protect);

router.get('/near-expiry', getNearExpiry);
router.get('/expired', getExpired);
router.get('/dead-stock', getDeadStock);
router.get('/waste-analytics', getWasteAnalytics);
router.put('/update-stock-status', updateStockStatus);

module.exports = router;
