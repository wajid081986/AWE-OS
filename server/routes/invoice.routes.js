const express     = require('express');
const requireAuth = require('../middleware/auth');
const {
  getInvoices, getInvoice, createInvoice,
  updateInvoice, deleteInvoice, getInvoiceStats,
} = require('../controllers/invoice.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/stats',  getInvoiceStats);   // ← must be before /:id
router.get('/',       getInvoices);
router.post('/',      createInvoice);
router.get('/:id',    getInvoice);
router.patch('/:id',  updateInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
