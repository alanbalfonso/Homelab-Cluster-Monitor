const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats - Estadísticas generales del cluster
router.get('/', statsController.getStats);

module.exports = router;
