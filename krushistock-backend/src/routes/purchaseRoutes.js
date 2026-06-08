const express = require('express');
const router = express.Router();
const {
  getAllPurchases,
  getPurchase,
  getPurchaseHistory,
  getPurchaseInvoiceByNumber,
  createPurchase,
  updatePurchase,
  deletePurchase
} = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllPurchases)
  .post(createPurchase);

router.get('/history', getPurchaseHistory);
router.get('/invoice/:invoiceNumber', getPurchaseInvoiceByNumber);

router.route('/:id')
  .get(getPurchase)
  .put(updatePurchase)
  .delete(authorize('admin'), deletePurchase);

module.exports = router;
