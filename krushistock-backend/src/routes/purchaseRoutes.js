const express = require('express');
const router = express.Router();
const {
  getAllPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllPurchases)
  .post(createPurchase);

router.route('/:id')
  .get(getPurchase)
  .put(updatePurchase)
  .delete(deletePurchase);

module.exports = router;
