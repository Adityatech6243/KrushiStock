const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all settings routes
router.use(protect);

router.route('/')
  .get(getSettings)
  .post(authorize('admin'), updateSettings)
  .put(authorize('admin'), updateSettings);

router.route('/store')
  .get(getSettings)
  .put(authorize('admin'), updateSettings);

module.exports = router;
