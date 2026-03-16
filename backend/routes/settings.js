const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET /api/settings/metrics-interval - obtener intervalo global de generación de métricas
router.get('/metrics-interval', settingsController.getMetricsInterval);

// POST /api/settings/metrics-interval - actualizar intervalo global de generación de métricas
router.post('/metrics-interval', settingsController.updateMetricsInterval);

module.exports = router;
