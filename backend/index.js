const express = require('express');
const cors = require('cors');
const nodesRoutes = require('./routes/nodes');
const metricsRoutes = require('./routes/metrics');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');
const { healthCheck } = require('./controllers/statsController');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/nodes', nodesRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'HCM Backend API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            nodes: '/api/nodes',
            metrics: '/api/metrics',
            stats: '/api/stats',
            settings: '/api/settings',
            health: '/health',
            apiHealth: '/api/health'
        }
    });
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
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════╗
║   HCM Backend Server v2.0            ║
║   Running on port ${PORT}            ║
║   API: http://localhost:${PORT}      ║
╚══════════════════════════════════════╝
    `);
});

module.exports = app;
