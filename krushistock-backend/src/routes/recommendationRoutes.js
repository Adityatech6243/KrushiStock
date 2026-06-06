const express = require('express');
const router = express.Router();
const {
  getFarmerRecommendations,
  getTrendingRecommendations,
  getSeasonalRecommendations,
  getCropRecommendations
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.get('/farmer/:farmerId', getFarmerRecommendations);
router.get('/trending', getTrendingRecommendations);
router.get('/seasonal', getSeasonalRecommendations);
router.get('/crop/:cropName', getCropRecommendations);

module.exports = router;
