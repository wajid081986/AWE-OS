const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/payment.controller');

router.post('/create-order', requireAuth, createOrder);
router.post('/verify',       requireAuth, verifyPayment);

module.exports = router;
