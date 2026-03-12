const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// POST /api/metrics - Insertar métricas desde simuladores
router.post('/', metricsController.insertMetrics);

// POST /api/metrics/manual - Insertar métricas manualmente
router.post('/manual', metricsController.insertManualMetrics);

// GET /api/metrics/latest - Últimas métricas de todos los nodos
router.get('/latest', metricsController.getLatestMetrics);

// GET /api/metrics/history/:host_id - Historial de un nodo
router.get('/history/:host_id', metricsController.getNodeHistory);

// GET /api/metrics/summary - Resumen 24h
router.get('/summary', metricsController.getSummary);

module.exports = router;
