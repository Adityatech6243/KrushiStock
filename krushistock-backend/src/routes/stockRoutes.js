const express = require('express');
const router = express.Router();
const {
  getAllStock,
  getLowStock,
  updateStock,
  getMovements,
  recordAdjustment
} = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/overview', getAllStock);
router.get('/low-stock', getLowStock);
router.put('/update', updateStock);
router.get('/movements', getMovements);
router.post('/adjustments', recordAdjustment);

module.exports = router;
