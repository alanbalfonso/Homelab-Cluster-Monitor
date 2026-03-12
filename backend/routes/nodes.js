const express = require('express');
const router = express.Router();
const nodesController = require('../controllers/nodesController');

// GET /api/nodes - Obtener nodos activos
router.get('/', nodesController.getActiveNodes);

// GET /api/nodes/all - Obtener todos los nodos (incluyendo eliminados)
router.get('/all', nodesController.getAllNodes);

// POST /api/nodes - Crear nuevo nodo
router.post('/', nodesController.createNode);

// DELETE /api/nodes/:host_id - Eliminar nodo (soft delete o permanente)
router.delete('/:host_id', nodesController.deleteNode);

// POST /api/nodes/:host_id/restore - Restaurar nodo eliminado
router.post('/:host_id/restore', nodesController.restoreNode);

module.exports = router;
