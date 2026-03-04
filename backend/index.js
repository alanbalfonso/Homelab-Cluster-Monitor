const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'homelab_monitor',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
});

// Verificar conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL exitosamente');
        release();
    }
});

// ==================== ENDPOINTS ====================

/**
 * POST /api/metrics - Ingresar métricas de un nodo
 */
app.post('/api/metrics', async (req, res) => {
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
                success: false,
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
        console.log(`📊 Métricas guardadas: ${host_id}`);
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error guardando métricas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/nodes - Obtener todos los nodos del cluster (solo activos)
 */
app.get('/api/nodes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM cluster_nodes 
            WHERE deleted_at IS NULL 
            ORDER BY host_id
        `);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo nodos:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/nodes/all - Obtener TODOS los nodos incluyendo eliminados
 */
app.get('/api/nodes/all', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *, 
                CASE WHEN deleted_at IS NOT NULL THEN 'deleted' ELSE status END as current_status
            FROM cluster_nodes 
            ORDER BY deleted_at NULLS FIRST, host_id
        `);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo todos los nodos:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/nodes - Crear un nuevo nodo
 */
app.post('/api/nodes', async (req, res) => {
    const { host_id, hostname, location, cpu_cores, ram_total_gb, disk_total_gb, os } = req.body;

    if (!host_id || !hostname) {
        return res.status(400).json({ 
            success: false, 
            error: 'host_id y hostname son requeridos' 
        });
    }

    try {
        // Verificar si existe (incluso eliminado)
        const existing = await pool.query(
            'SELECT * FROM cluster_nodes WHERE host_id = $1',
            [host_id]
        );

        if (existing.rows.length > 0) {
            // Si existe pero está eliminado, reactivarlo
            if (existing.rows[0].deleted_at !== null) {
                const result = await pool.query(`
                    UPDATE cluster_nodes 
                    SET hostname = $2, location = $3, cpu_cores = $4, ram_total_gb = $5, 
                        disk_total_gb = $6, os = $7, status = 'active', deleted_at = NULL
                    WHERE host_id = $1
                    RETURNING *
                `, [host_id, hostname, location || 'Homelab', cpu_cores || 4, 
                    ram_total_gb || 8, disk_total_gb || 256, os || 'Ubuntu 22.04']);
                
                console.log(`🔄 Nodo reactivado: ${host_id}`);
                return res.json({ 
                    success: true, 
                    message: 'Nodo reactivado exitosamente',
                    data: result.rows[0] 
                });
            }
            return res.status(400).json({ 
                success: false, 
                error: 'Ya existe un nodo con ese host_id' 
            });
        }

        const result = await pool.query(`
            INSERT INTO cluster_nodes (host_id, hostname, location, cpu_cores, ram_total_gb, disk_total_gb, os)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [host_id, hostname, location || 'Homelab', cpu_cores || 4, 
            ram_total_gb || 8, disk_total_gb || 256, os || 'Ubuntu 22.04']);

        console.log(`✅ Nuevo nodo creado: ${host_id}`);
        res.status(201).json({ 
            success: true, 
            message: 'Nodo creado exitosamente',
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error creando nodo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/nodes/:host_id - Eliminar un nodo (soft delete por defecto)
 */
app.delete('/api/nodes/:host_id', async (req, res) => {
    const { host_id } = req.params;
    const { permanent } = req.query;

    try {
        // Verificar que existe
        const existing = await pool.query(
            'SELECT * FROM cluster_nodes WHERE host_id = $1',
            [host_id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nodo no encontrado' 
            });
        }

        if (permanent === 'true') {
            // Eliminación permanente (también elimina métricas por CASCADE)
            await pool.query('DELETE FROM cluster_nodes WHERE host_id = $1', [host_id]);
            
            console.log(`🗑️ Nodo eliminado permanentemente: ${host_id}`);
            res.json({ 
                success: true, 
                message: `Nodo ${host_id} y sus métricas eliminados permanentemente`,
                deletedNode: existing.rows[0]
            });
        } else {
            // Soft delete
            const result = await pool.query(`
                UPDATE cluster_nodes 
                SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
                WHERE host_id = $1
                RETURNING *
            `, [host_id]);

            console.log(`⚠️ Nodo marcado como eliminado: ${host_id}`);
            res.json({ 
                success: true, 
                message: `Nodo ${host_id} marcado como eliminado`,
                data: result.rows[0]
            });
        }
    } catch (error) {
        console.error('Error eliminando nodo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/nodes/:host_id/restore - Restaurar un nodo eliminado
 */
app.post('/api/nodes/:host_id/restore', async (req, res) => {
    const { host_id } = req.params;

    try {
        const result = await pool.query(`
            UPDATE cluster_nodes 
            SET deleted_at = NULL, status = 'active'
            WHERE host_id = $1 AND deleted_at IS NOT NULL
            RETURNING *
        `, [host_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nodo no encontrado o no está eliminado' 
            });
        }

        console.log(`🔄 Nodo restaurado: ${host_id}`);
        res.json({ 
            success: true, 
            message: `Nodo ${host_id} restaurado exitosamente`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error restaurando nodo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/metrics/latest - Últimas métricas de todos los nodos
 */
app.get('/api/metrics/latest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM latest_metrics ORDER BY host_id
        `);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo últimas métricas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/metrics/history/:host_id - Historial de métricas de un nodo
 */
app.get('/api/metrics/history/:host_id', async (req, res) => {
    const { host_id } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    try {
        const result = await pool.query(`
            SELECT * FROM metrics
            WHERE host_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
        `, [host_id, limit]);

        res.json({
            success: true,
            host_id,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/metrics/summary - Resumen de métricas 24h
 */
app.get('/api/metrics/summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM metrics_24h_avg ORDER BY host_id
        `);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/stats - Estadísticas generales del cluster
 */
app.get('/api/stats', async (req, res) => {
    try {
        const totalNodes = await pool.query(`SELECT COUNT(*) as total FROM cluster_nodes WHERE deleted_at IS NULL`);
        const activeNodes = await pool.query(`SELECT COUNT(*) as active FROM cluster_nodes WHERE status = 'active' AND deleted_at IS NULL`);
        const deletedNodes = await pool.query(`SELECT COUNT(*) as deleted FROM cluster_nodes WHERE deleted_at IS NOT NULL`);
        const totalMetrics = await pool.query(`SELECT COUNT(*) as total FROM metrics`);
        const avgTemp = await pool.query(`
            SELECT AVG(temperature) as avg_temp
            FROM metrics
            WHERE timestamp > NOW() - INTERVAL '1 hour'
        `);
        const avgCpu = await pool.query(`
            SELECT AVG(cpu_usage) as avg_cpu
            FROM metrics
            WHERE timestamp > NOW() - INTERVAL '1 hour'
        `);

        res.json({
            success: true,
            stats: {
                total_nodes: parseInt(totalNodes.rows[0].total),
                active_nodes: parseInt(activeNodes.rows[0].active),
                deleted_nodes: parseInt(deletedNodes.rows[0].deleted),
                total_metrics_recorded: parseInt(totalMetrics.rows[0].total),
                avg_temperature_1h: parseFloat(avgTemp.rows[0].avg_temp || 0).toFixed(2),
                avg_cpu_1h: parseFloat(avgCpu.rows[0].avg_cpu || 0).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/metrics/manual - Insertar métricas manualmente desde la interfaz
 */
app.post('/api/metrics/manual', async (req, res) => {
    const {
        host_id,
        cpu_usage,
        ram_used_gb,
        temperature
    } = req.body;

    if (!host_id) {
        return res.status(400).json({ error: 'host_id es requerido' });
    }

    try {
        // Obtener información del nodo (solo activos)
        const nodeResult = await pool.query(
            'SELECT * FROM cluster_nodes WHERE host_id = $1 AND deleted_at IS NULL',
            [host_id]
        );

        if (nodeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Nodo no encontrado o está eliminado' });
        }

        const node = nodeResult.rows[0];
        
        // Calcular valores derivados
        const ram_usage_percent = (ram_used_gb / node.ram_total_gb) * 100;
        const disk_used_gb = node.disk_total_gb * 0.35; // Valor por defecto
        const disk_usage_percent = 35; // Valor por defecto
        const network_in_mbps = Math.random() * 50;
        const network_out_mbps = Math.random() * 20;
        const uptime_hours = Math.floor(Math.random() * 720) + 1;

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
        console.log(`📊 Métricas manuales guardadas: ${host_id}`);
        res.status(201).json({
            success: true,
            message: 'Métrica insertada correctamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error guardando métricas manuales:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/query - Ejecutar consulta SQL personalizada (solo SELECT)
 */
app.post('/api/query', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query es requerido' });
    }

    // Validar que solo sea SELECT (seguridad básica)
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
        return res.status(403).json({ 
            error: 'Solo se permiten consultas SELECT',
            message: 'Por razones de seguridad, solo puedes ejecutar consultas SELECT'
        });
    }

    // Validar que no contenga comandos peligrosos
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
    if (dangerousKeywords.some(keyword => trimmedQuery.includes(keyword))) {
        return res.status(403).json({ 
            error: 'Consulta no permitida',
            message: 'La consulta contiene comandos no permitidos'
        });
    }

    try {
        const result = await pool.query(query);
        console.log(`✅ Consulta ejecutada: ${query.substring(0, 100)}...`);
        
        res.json({
            success: true,
            rowCount: result.rowCount,
            fields: result.fields ? result.fields.map(f => ({ name: f.name, dataType: f.dataTypeID })) : [],
            data: result.rows
        });
    } catch (error) {
        console.error('Error ejecutando consulta:', error);
        res.status(500).json({ 
            error: 'Error ejecutando consulta',
            message: error.message,
            detail: error.detail || ''
        });
    }
});

/**
 * GET /health - Health check
 */
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HCM Backend Server running on port ${PORT}`);
});
