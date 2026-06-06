const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const {
  verifyWebhook,
  handleWebhook,
  simulateWebhookEvent,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getMessageLogs,
  retryFailedMessage,
  shareProductCatalog,
  triggerPaymentReminder,
  uploadProductImage,
  sendManualSaleInvoice
} = require('../controllers/whatsAppController');


// Ensure upload directories exist at backend root level
const uploadProdDir = path.resolve(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadProdDir)) {
  fs.mkdirSync(uploadProdDir, { recursive: true });
}
const uploadInvDir = path.resolve(__dirname, '../../uploads/invoices');
if (!fs.existsSync(uploadInvDir)) {
  fs.mkdirSync(uploadInvDir, { recursive: true });
}

// Multer Storage Configuration for Product Images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadProdDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File Filter for Images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed!'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// --- Public Webhook Routes (Meta API Verification and Event Ingestion) ---
router.route('/webhook')
  .get(verifyWebhook)
  .post(handleWebhook);

// Dev simulation route (Public for easy testing)
router.post('/webhook/simulate-receive', simulateWebhookEvent);

// --- Protected Routes (All require JWT authentication) ---
router.use(protect);

// Admin Settings Panel Configuration
router.route('/settings')
  .get(getWhatsAppSettings)
  .put(updateWhatsAppSettings);

// History Dashboard Logs
router.get('/logs', getMessageLogs);
router.post('/logs/:id/retry', retryFailedMessage);

// Catalog Sharing and Image Uploads
router.post('/products/:id/share', shareProductCatalog);
router.post('/products/:id/image', upload.single('image'), uploadProductImage);


// Manual payment reminders
router.post('/reminders/:id/send', triggerPaymentReminder);

// Manual invoice sending
router.post('/sales/:id/send-invoice', sendManualSaleInvoice);

module.exports = router;
