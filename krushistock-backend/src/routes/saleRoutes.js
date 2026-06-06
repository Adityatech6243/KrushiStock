const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  getSaleInvoice,
  printSaleInvoiceById
} = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllSales)
  .post(createSale);

router.get('/invoice/:id/print', printSaleInvoiceById);
router.get('/invoice/:id', getSaleInvoice);

router.route('/:id')
  .get(getSale)
  .put(updateSale)
  .delete(deleteSale);

module.exports = router;
