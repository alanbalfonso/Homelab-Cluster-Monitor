const pool = require('../config/database');

/**
 * Obtener estadísticas generales del cluster
 */
const getStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT CASE WHEN deleted_at IS NULL THEN host_id END) as active_nodes,
                COUNT(DISTINCT CASE WHEN deleted_at IS NOT NULL THEN host_id END) as deleted_nodes,
                COUNT(DISTINCT host_id) as total_nodes
            FROM cluster_nodes
        `);

        const metrics = await pool.query(`
            SELECT 
                COUNT(*) as total_metrics_recorded,
                COALESCE(AVG(temperature), 0) as avg_temperature_1h,
                COALESCE(AVG(cpu_usage), 0) as avg_cpu_1h
            FROM metrics 
            WHERE timestamp > NOW() - INTERVAL '1 hour'
        `);

        res.json({
            success: true,
            stats: {
                total_nodes: parseInt(stats.rows[0].total_nodes),
                active_nodes: parseInt(stats.rows[0].active_nodes),
                deleted_nodes: parseInt(stats.rows[0].deleted_nodes),
                total_metrics_recorded: parseInt(metrics.rows[0].total_metrics_recorded),
                avg_temperature_1h: parseFloat(metrics.rows[0].avg_temperature_1h).toFixed(2),
                avg_cpu_1h: parseFloat(metrics.rows[0].avg_cpu_1h).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Ejecutar consulta SQL personalizada (solo SELECT)
 */
const executeQuery = async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query es requerida' });
    }

    // Validar que solo sea SELECT
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
        return res.status(403).json({ 
            success: false,
            error: 'Solo se permiten consultas SELECT por seguridad' 
        });
    }

    // Validar keywords peligrosos
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
    if (dangerousKeywords.some(keyword => trimmedQuery.includes(keyword))) {
        return res.status(403).json({ 
            success: false,
            error: 'La consulta contiene comandos no permitidos' 
        });
    }

    try {
        const result = await pool.query(query);
        res.json({
            success: true,
            rowCount: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error('Error ejecutando consulta:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
};

/**
 * Health check
 */
const healthCheck = async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
};

module.exports = {
    getStats,
    executeQuery,
    healthCheck
};
