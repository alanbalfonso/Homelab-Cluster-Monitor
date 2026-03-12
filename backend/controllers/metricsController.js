const pool = require('../config/database');

/**
 * Insertar métricas desde simuladores
 */
const insertMetrics = async (req, res) => {
    const {
        host_id,
        cpu_usage,
        ram_used_gb,
        ram_usage_percent,
        temperature,
        disk_used_gb,
        disk_usage_percent,
        network_in_mbps,
        network_out_mbps,
        uptime_hours
    } = req.body;

    if (!host_id) {
        return res.status(400).json({ error: 'host_id es requerido' });
    }

    try {
        // Verificar que el nodo existe y no está eliminado
        const nodeCheck = await pool.query(
            'SELECT * FROM cluster_nodes WHERE host_id = $1 AND deleted_at IS NULL',
            [host_id]
        );

        if (nodeCheck.rows.length === 0) {
            return res.status(404).json({ 
                error: `Nodo ${host_id} no encontrado o está eliminado` 
            });
        }

        const query = `
            INSERT INTO metrics (
                host_id, cpu_usage, ram_used_gb, ram_usage_percent,
                temperature, disk_used_gb, disk_usage_percent,
                network_in_mbps, network_out_mbps, uptime_hours
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        const values = [
            host_id,
            cpu_usage,
            ram_used_gb,
            ram_usage_percent,
            temperature,
            disk_used_gb,
            disk_usage_percent,
            network_in_mbps,
            network_out_mbps,
            uptime_hours
        ];

        const result = await pool.query(query, values);
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error guardando métricas:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Insertar métricas manualmente desde la interfaz
 */
const insertManualMetrics = async (req, res) => {
    const { host_id, cpu_usage, ram_used_gb, temperature } = req.body;

    if (!host_id) {
        return res.status(400).json({ error: 'host_id es requerido' });
    }

    try {
        // Verificar que el nodo existe y no está eliminado
        const nodeCheck = await pool.query(
            'SELECT * FROM cluster_nodes WHERE host_id = $1 AND deleted_at IS NULL',
            [host_id]
        );

        if (nodeCheck.rows.length === 0) {
            return res.status(404).json({ 
                error: `Nodo ${host_id} no encontrado o está eliminado` 
            });
        }

        const node = nodeCheck.rows[0];

        // Calcular valores derivados
        const ram_usage_percent = (ram_used_gb / node.ram_total_gb) * 100;
        const disk_used_gb = node.disk_total_gb * 0.5; // Valor por defecto
        const disk_usage_percent = 50;
        const network_in_mbps = Math.random() * 10;
        const network_out_mbps = Math.random() * 5;
        const uptime_hours = Math.floor(Math.random() * 1000);

        const query = `
            INSERT INTO metrics (
                host_id, cpu_usage, ram_used_gb, ram_usage_percent,
                temperature, disk_used_gb, disk_usage_percent,
                network_in_mbps, network_out_mbps, uptime_hours
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        const values = [
            host_id,
            cpu_usage,
            ram_used_gb,
            ram_usage_percent,
            temperature,
            disk_used_gb,
            disk_usage_percent,
            network_in_mbps,
            network_out_mbps,
            uptime_hours
        ];

        const result = await pool.query(query, values);
        console.log(`Métrica manual insertada: ${host_id}`);
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error insertando métrica manual:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener últimas métricas de todos los nodos
 */
const getLatestMetrics = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM latest_metrics ORDER BY host_id');
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener historial de métricas de un nodo
 */
const getNodeHistory = async (req, res) => {
    const { host_id } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    try {
        const result = await pool.query(
            `SELECT * FROM metrics 
            WHERE host_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2`,
            [host_id, limit]
        );
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener resumen de métricas 24h
 */
const getSummary = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM metrics_24h_avg ORDER BY host_id');
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    insertMetrics,
    insertManualMetrics,
    getLatestMetrics,
    getNodeHistory,
    getSummary
};
