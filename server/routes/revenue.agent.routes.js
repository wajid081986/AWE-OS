'use strict';

const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  getDashboard,
  runSnapshot,
  getHistory,
  getUpsells,
  findUpsells,
  getFailedPayments,
  resolveFailedPayment,
  getAlerts,
  acknowledgeAlertCtrl,
  updateUpsellStatus,
} = require('../controllers/revenue.agent.controller');

const router = express.Router();

// Standard read: 60/min
const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// Heavy AI operations: 10/hour
const snapshotLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Snapshot limit reached. Max 10/hour.', code: 'RATE_LIMITED' },
});

router.use(requireAuth);

router.get('/dashboard',                        readLimiter,      getDashboard);
router.post('/snapshot',                        snapshotLimiter,  runSnapshot);
router.get('/history',                          readLimiter,      getHistory);
router.get('/upsells',                          readLimiter,      getUpsells);
router.post('/upsells/find',                    snapshotLimiter,  findUpsells);
router.patch('/upsells/:id/status',             readLimiter,      updateUpsellStatus);
router.get('/failed-payments',                  readLimiter,      getFailedPayments);
router.patch('/failed-payments/:id/resolve',    readLimiter,      resolveFailedPayment);
router.get('/alerts',                           readLimiter,      getAlerts);
router.patch('/alerts/:id/acknowledge',         readLimiter,      acknowledgeAlertCtrl);

module.exports = router;
