const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
} = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllSales)
  .post(createSale);

router.route('/:id')
  .get(getSale)
  .put(updateSale)
  .delete(deleteSale);

module.exports = router;
