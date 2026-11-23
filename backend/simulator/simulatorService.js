const pool = require('../config/database');
const { PC_PROFILES } = require('./profiles');
const MetricsGenerator = require('./metricsGenerator');

class SimulatorService {
    constructor() {
        this.intervalMs = parseInt(process.env.METRICS_INTERVAL || '5000', 10);
        this.timer = null;
        this.iteration = 0;
        this.generators = new Map();
        this.isRunning = false;

        // Inicializar generadores para cada perfil
        for (const [hostId, profile] of Object.entries(PC_PROFILES)) {
            this.generators.set(hostId, new MetricsGenerator(profile, this.intervalMs));
        }
    }

    /**
     * Iniciar la generación automática de métricas
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log(`Simulador interno iniciado para ${this.generators.size} nodos (Intervalo: ${this.intervalMs} ms)`);

        // Ejecutar primer tick tras breve espera inicial
        setTimeout(() => {
            this.tick();
        }, 1500);
    }

    /**
     * Detener el simulador
     */
    stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        console.log('Simulador interno detenido');
    }

    /**
     * Cambiar el intervalo dinámicamente
     */
    setInterval(newIntervalMs) {
        if (this.intervalMs === newIntervalMs) return;

        this.intervalMs = newIntervalMs;
        for (const generator of this.generators.values()) {
            generator.interval = newIntervalMs;
        }

        console.log(`Intervalo del simulador actualizado a ${newIntervalMs} ms`);

        if (this.isRunning) {
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => this.tick(), this.intervalMs);
        }
    }

    /**
     * Generar e insertar métricas en base de datos
     */
    async tick() {
        if (!this.isRunning) return;

        this.iteration++;

        try {
            // Obtener nodos activos en la base de datos
            const { rows: activeNodes } = await pool.query(
                'SELECT host_id FROM cluster_nodes WHERE deleted_at IS NULL'
            );

            const activeHostIds = new Set(activeNodes.map(n => n.host_id));
            let insertedCount = 0;

            for (const [hostId, generator] of this.generators.entries()) {
                // Solo generar para nodos que existan y estén activos en la BD
                if (!activeHostIds.has(hostId)) continue;

                const m = generator.generate(hostId, this.iteration);

                const query = `
                    INSERT INTO metrics (
                        host_id, cpu_usage, ram_used_gb, ram_usage_percent,
                        temperature, disk_used_gb, disk_usage_percent,
                        network_in_mbps, network_out_mbps, uptime_hours
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `;

                const values = [
                    m.host_id,
                    m.cpu_usage,
                    m.ram_used_gb,
                    m.ram_usage_percent,
                    m.temperature,
                    m.disk_used_gb,
                    m.disk_usage_percent,
                    m.network_in_mbps,
                    m.network_out_mbps,
                    m.uptime_hours
                ];

                await pool.query(query, values);
                insertedCount++;
            }

            // Log limpio y no invasivo cada ciclo
            console.log(`[Simulador] Ingestadas métricas para ${insertedCount} nodos (ciclo #${this.iteration})`);
        } catch (error) {
            console.warn(`[Simulador] Esperando disponibilidad de la BD: ${error.message}`);
        } finally {
            if (this.isRunning) {
                this.timer = setTimeout(() => this.tick(), this.intervalMs);
            }
        }
    }
}

const simulatorInstance = new SimulatorService();

module.exports = simulatorInstance;
