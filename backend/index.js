const path = require('path');
const express = require('express');
const cors = require('cors');
const nodesRoutes = require('./routes/nodes');
const metricsRoutes = require('./routes/metrics');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');
const { healthCheck } = require('./controllers/statsController');
const simulatorService = require('./simulator/simulatorService');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Ruta al frontend (estáticos)
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Rutas de API REST
app.use('/api/nodes', nodesRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Endpoint de información de la API
app.get('/api', (req, res) => {
    res.json({
        name: 'HCM Unified App (API & Dashboard)',
        version: '2.0.0',
        status: 'running',
        simulator_enabled: process.env.ENABLE_SIMULATOR !== 'false',
        endpoints: {
            dashboard: '/',
            databaseView: '/database',
            nodes: '/api/nodes',
            metrics: '/api/metrics',
            stats: '/api/stats',
            settings: '/api/settings',
            health: '/health',
            apiHealth: '/api/health'
        }
    });
});

// Ruta amigable para la gestión de base de datos
app.get('/database', (req, res) => {
    res.sendFile(path.join(frontendPath, 'database.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'Endpoint de API no encontrado'
        });
    }
    // Servir index.html para rutas no encontradas del frontend
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   HCM Unified Server v2.0                    ║
║   Puerto:    ${PORT}                            ║
║   Dashboard: http://localhost:${PORT}         ║
║   Database:  http://localhost:${PORT}/database ║
║   API:       http://localhost:${PORT}/api      ║
╚══════════════════════════════════════════════╝
    `);

    // Iniciar simulador integrado si está activado
    const enableSimulator = process.env.ENABLE_SIMULATOR !== 'false';
    if (enableSimulator) {
        simulatorService.start();
    } else {
        console.log('Simulador deshabilitado (modo agente real)');
    }
});

module.exports = app;
