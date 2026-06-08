const express = require('express');
const router = express.Router();
const { getJobs, runJobManual, getJobLogs } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getJobs);
router.post('/:jobName/run', runJobManual);
router.get('/logs', getJobLogs);

module.exports = router;
