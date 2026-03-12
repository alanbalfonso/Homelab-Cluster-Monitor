const { getProfile, hasProfile } = require('./config/profiles');
const MetricsGenerator = require('./services/metricsGenerator');
const APIClient = require('./services/apiClient');

// Configuración desde variables de entorno
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';
const HOST_ID = process.env.HOST_ID || 'mini-pc-01';
const INTERVAL = parseInt(process.env.INTERVAL) || 30000;

/**
 * Clase principal del simulador
 */
class Simulator {
    constructor(hostId, backendUrl, interval) {
        this.hostId = hostId;
        this.interval = interval;
        this.profile = getProfile(hostId);
        this.apiClient = new APIClient(backendUrl);
        this.metricsGenerator = null;
        this.intervalId = null;
        this.iteration = 0;
    }

    /**
     * Inicializar simulador
     */
    async initialize() {
        // Validar perfil
        if (!this.profile) {
            throw new Error(`Perfil no encontrado para ${this.hostId}`);
        }

        console.log(`
╔════════════════════════════════════════╗
║  Homelab Cluster Monitor - Simulator  ║
╚════════════════════════════════════════╝

Host ID: ${this.hostId}
Nombre: ${this.profile.name}
Perfil: ${this.profile.cpu_cores} cores, ${this.profile.ram_total}GB RAM, ${this.profile.disk_total}GB Disco
Patrón: ${this.profile.workloadPattern}
Intervalo: ${this.interval}ms
Backend: ${this.apiClient.baseURL}
        `);

        // Esperar backend
        console.log('Esperando a que el backend esté listo...');
        await this.apiClient.waitForBackend();
        console.log('Backend conectado\n');

        // Inicializar generador de métricas
        this.metricsGenerator = new MetricsGenerator(this.profile, this.interval);
    }

    /**
     * Enviar una métrica
     */
    async sendMetric() {
        try {
            this.iteration++;
            const metrics = this.metricsGenerator.generate(this.hostId, this.iteration);
            await this.apiClient.sendMetrics(metrics);
            
            console.log(
                `✓ [${this.hostId}] ` +
                `CPU: ${metrics.cpu_usage}% | ` +
                `RAM: ${metrics.ram_used_gb}GB | ` +
                `TEMP: ${metrics.temperature}°C`
            );
        } catch (error) {
            console.error(`✗ [${this.hostId}] Error: ${error.message}`);
        }
    }

    /**
     * Iniciar bucle de envío
     */
    start() {
        console.log(`Iniciando envío de métricas cada ${this.interval / 1000}s...\n`);
        
        // Enviar primera métrica inmediatamente
        this.sendMetric();
        
        // Configurar intervalo
        this.intervalId = setInterval(() => {
            this.sendMetric();
        }, this.interval);
    }

    /**
     * Detener simulador
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log(`\n[${this.hostId}] Simulador detenido`);
    }
}

/**
 * Función principal
 */
async function main() {
    // Validar configuración
    if (!hasProfile(HOST_ID)) {
        console.error(`Error: Perfil no encontrado para ${HOST_ID}`);
        console.error(`Perfiles disponibles: mini-pc-01, mini-pc-02, mini-pc-03, mini-pc-04, mini-pc-05`);
        process.exit(1);
    }

    // Crear e inicializar simulador
    const simulator = new Simulator(HOST_ID, BACKEND_URL, INTERVAL);
    
    try {
        await simulator.initialize();
        simulator.start();
    } catch (error) {
        console.error(`Error fatal: ${error.message}`);
        process.exit(1);
    }

    // Manejo de señales para cierre graceful
    const shutdown = () => {
        simulator.stop();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

// Ejecutar
if (require.main === module) {
    main().catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

module.exports = Simulator;
