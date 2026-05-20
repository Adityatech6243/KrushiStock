const express = require('express');
const router = express.Router();
const {
  getAllStock,
  getLowStock,
  updateStock
} = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/overview', getAllStock);
router.get('/low-stock', getLowStock);
router.put('/update', updateStock);

module.exports = router;
