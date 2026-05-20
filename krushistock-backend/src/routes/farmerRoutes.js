const express = require('express');
const router = express.Router();
const {
  getAllFarmers,
  createFarmer,
  getFarmer,
  updateFarmer,
  deleteFarmer
} = require('../controllers/farmerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllFarmers)
  .post(createFarmer);

router.route('/:id')
  .get(getFarmer)
  .put(updateFarmer)
  .delete(deleteFarmer);

module.exports = router;
