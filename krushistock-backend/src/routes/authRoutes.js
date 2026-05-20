const express = require('express');
const router = express.Router();
const { login, getCurrentUser, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getCurrentUser);
router.post('/logout', (req, res) => res.status(200).json({ success: true, message: 'Logged out successfully' }));

module.exports = router;
