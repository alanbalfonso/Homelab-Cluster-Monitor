const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats - Estadísticas generales del cluster
router.get('/', statsController.getStats);

// POST /api/query - Ejecutar consulta SQL personalizada
router.post('/', statsController.executeQuery);

module.exports = router;
