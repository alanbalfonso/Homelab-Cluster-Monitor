const pool = require('../config/database');

/**
 * Obtener todos los nodos activos
 */
const getActiveNodes = async (req, res) => {
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
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Obtener TODOS los nodos incluyendo eliminados
 */
const getAllNodes = async (req, res) => {
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
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Crear un nuevo nodo
 */
const createNode = async (req, res) => {
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
            // Si existe pero está eliminado, restaurarlo
            if (existing.rows[0].deleted_at !== null) {
                const restored = await pool.query(
                    `UPDATE cluster_nodes 
                    SET deleted_at = NULL, status = 'active',
                        hostname = $2, location = $3, cpu_cores = $4, 
                        ram_total_gb = $5, disk_total_gb = $6, os = $7
                    WHERE host_id = $1
                     RETURNING *`,
                    [host_id, hostname, location || 'Homelab', cpu_cores || 4, 
                    ram_total_gb || 8, disk_total_gb || 256, os || 'Ubuntu 22.04']
                );
                console.log(`Nodo restaurado: ${host_id}`);
                return res.json({ 
                    success: true, 
                    message: 'Nodo restaurado exitosamente',
                    restored: true,
                    data: restored.rows[0] 
                });
            }
            
            return res.status(409).json({ 
                success: false, 
                error: 'El nodo ya existe' 
            });
        }

        const result = await pool.query(`
            INSERT INTO cluster_nodes (host_id, hostname, location, cpu_cores, ram_total_gb, disk_total_gb, os)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [host_id, hostname, location || 'Homelab', cpu_cores || 4, 
            ram_total_gb || 8, disk_total_gb || 256, os || 'Ubuntu 22.04']);

        console.log(`Nuevo nodo creado: ${host_id}`);
        res.status(201).json({ 
            success: true, 
            message: 'Nodo creado exitosamente',
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error creando nodo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Eliminar un nodo (soft delete por defecto)
 */
const deleteNode = async (req, res) => {
    const { host_id } = req.params;
    const { permanent } = req.query;

    try {
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
            // Eliminar permanentemente junto con sus métricas
            await pool.query('DELETE FROM metrics WHERE host_id = $1', [host_id]);
            const result = await pool.query(
                'DELETE FROM cluster_nodes WHERE host_id = $1 RETURNING *',
                [host_id]
            );
            console.log(`Nodo eliminado permanentemente: ${host_id}`);
            res.json({ 
                success: true, 
                message: `Nodo ${host_id} y sus métricas eliminados permanentemente`,
                deletedNode: result.rows[0]
            });
        } else {
            // Soft delete
            const result = await pool.query(
                `UPDATE cluster_nodes 
                SET deleted_at = NOW(), status = 'deleted'
                WHERE host_id = $1 
                RETURNING *`,
                [host_id]
            );
            console.log(`Nodo marcado como eliminado: ${host_id}`);
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
};

/**
 * Restaurar un nodo eliminado
 */
const restoreNode = async (req, res) => {
    const { host_id } = req.params;

    try {
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

        if (existing.rows[0].deleted_at === null) {
            return res.status(400).json({ 
                success: false, 
                error: 'El nodo no está eliminado' 
            });
        }

        const result = await pool.query(
            `UPDATE cluster_nodes 
            SET deleted_at = NULL, status = 'active'
            WHERE host_id = $1 
             RETURNING *`,
            [host_id]
        );

        console.log(`Nodo restaurado: ${host_id}`);
        res.json({ 
            success: true, 
            message: `Nodo ${host_id} restaurado exitosamente`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error restaurando nodo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getActiveNodes,
    getAllNodes,
    createNode,
    deleteNode,
    restoreNode
};
