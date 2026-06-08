const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  getSaleInvoice,
  printSaleInvoiceById,
  updateSalePaymentStatus,
  getSaleInvoicePDF,
  sendInvoiceWhatsApp,
  triggerSalePaymentReminder
} = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllSales)
  .post(createSale);

router.get('/invoice/:id/print', printSaleInvoiceById);
router.get('/invoice/:id', getSaleInvoice);

router.get('/:id/invoice', getSaleInvoicePDF);
router.post('/:id/send-invoice', sendInvoiceWhatsApp);
router.post('/:id/reminder', triggerSalePaymentReminder);

router.put('/:id/payment', updateSalePaymentStatus);

router.route('/:id')
  .get(getSale)
  .put(updateSale)
  .delete(authorize('admin'), deleteSale);

module.exports = router;
