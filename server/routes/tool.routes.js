const express     = require('express');
const requireAuth = require('../middleware/auth');
const { getAllTools } = require('../controllers/tool.controller');

const router = express.Router();

router.get('/', requireAuth, getAllTools);

module.exports = router;
