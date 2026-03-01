const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';
const HOST_ID = process.env.HOST_ID || 'mini-pc-01';
const INTERVAL = parseInt(process.env.INTERVAL) || 30000; // 30 segundos para visualización en tiempo real

// Configuración de cada mini PC (características específicas)
const PC_PROFILES = {
    'mini-pc-01': {
        name: 'HomeServer-Alpha',
        ram_total: 16,
        disk_total: 512,
        cpu_cores: 8,
        baseTemp: 45,
        baseCpu: 35,
        baseRam: 8,
        workloadPattern: 'high' // Alta carga constante (servidor principal)
    },
    'mini-pc-02': {
        name: 'HomeServer-Beta',
        ram_total: 16,
        disk_total: 512,
        cpu_cores: 8,
        baseTemp: 42,
        baseCpu: 30,
        baseRam: 7,
        workloadPattern: 'medium' // Carga media
    },
    'mini-pc-03': {
        name: 'HomeServer-Gamma',
        ram_total: 12,
        disk_total: 256,
        cpu_cores: 6,
        baseTemp: 40,
        baseCpu: 25,
        baseRam: 5,
        workloadPattern: 'low' // Carga baja (desarrollo)
    },
    'mini-pc-04': {
        name: 'HomeServer-Delta',
        ram_total: 8,
        disk_total: 256,
        cpu_cores: 4,
        baseTemp: 50,
        baseCpu: 45,
        baseRam: 6,
        workloadPattern: 'burst' // Picos de carga ocasionales
    },
    'mini-pc-05': {
        name: 'HomeServer-Epsilon',
        ram_total: 8,
        disk_total: 128,
        cpu_cores: 4,
        baseTemp: 38,
        baseCpu: 20,
        baseRam: 3,
        workloadPattern: 'iot' // Carga muy baja y constante (IoT Hub)
    }
};

// Variables de estado para simular continuidad
let state = {
    uptime: 0,
    disk_used: 0,
    network_baseline: 0,
    last_cpu_spike: 0
};

/**
 * Genera variación realista basada en el patrón de workload
 */
function generateMetrics(profile, iteration) {
    const time = Date.now() / 1000;
    
    // CPU: Varía con patrón sinusoidal + ruido
    let cpu_usage = profile.baseCpu;
    
    switch(profile.workloadPattern) {
        case 'high':
            cpu_usage += Math.sin(time / 300) * 15 + Math.random() * 10;
            break;
        case 'medium':
            cpu_usage += Math.sin(time / 400) * 10 + Math.random() * 8;
            break;
        case 'low':
            cpu_usage += Math.sin(time / 600) * 5 + Math.random() * 5;
            break;
        case 'burst':
            // Picos aleatorios cada ~2 minutos
            if (iteration % 24 === 0) {
                state.last_cpu_spike = 60 + Math.random() * 30;
            }
            cpu_usage += state.last_cpu_spike * Math.exp(-(iteration % 24) / 5) + Math.random() * 5;
            break;
        case 'iot':
            cpu_usage += Math.random() * 3;
            break;
    }
    
    cpu_usage = Math.max(5, Math.min(95, cpu_usage)); // Límites: 5-95%
    
    // RAM: Crece lentamente con el tiempo + variación
    const ram_growth = (iteration * 0.001) % 2; // Crece hasta 2GB, luego resetea (GC)
    const ram_used_gb = profile.baseRam + ram_growth + (Math.random() - 0.5) * 0.5;
    const ram_usage_percent = (ram_used_gb / profile.ram_total) * 100;
    
    // Temperatura: Correlacionada con CPU + variación ambiental
    const temperature = profile.baseTemp + (cpu_usage / 100) * 20 + Math.sin(time / 7200) * 5 + (Math.random() - 0.5) * 2;
    
    // Disco: Crece muy lentamente (logs, cache)
    state.disk_used += Math.random() * 0.001; // +1MB por iteración en promedio
    const disk_used_gb = (profile.disk_total * 0.3) + state.disk_used; // 30% base usado
    const disk_usage_percent = (disk_used_gb / profile.disk_total) * 100;
    
    // Red: Bursts aleatorios
    const network_in_mbps = Math.random() < 0.1 
        ? Math.random() * 100 + 50  // 10% probabilidad de burst
        : Math.random() * 10 + 2;   // Tráfico normal
    
    const network_out_mbps = network_in_mbps * (0.3 + Math.random() * 0.4); // Upload < Download
    
    // Uptime: Incrementa con el tiempo
    state.uptime += INTERVAL / 3600000; // Convertir ms a horas
    
    return {
        host_id: HOST_ID,
        cpu_usage: parseFloat(cpu_usage.toFixed(2)),
        ram_used_gb: parseFloat(ram_used_gb.toFixed(2)),
        ram_usage_percent: parseFloat(ram_usage_percent.toFixed(2)),
        temperature: parseFloat(temperature.toFixed(2)),
        disk_used_gb: parseFloat(disk_used_gb.toFixed(2)),
        disk_usage_percent: parseFloat(disk_usage_percent.toFixed(2)),
        network_in_mbps: parseFloat(network_in_mbps.toFixed(2)),
        network_out_mbps: parseFloat(network_out_mbps.toFixed(2)),
        uptime_hours: parseInt(state.uptime)
    };
}

/**
 * Envía métricas al backend
 */
async function sendMetrics(metrics) {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/metrics`, metrics);
        console.log(`✅ [${HOST_ID}] CPU: ${metrics.cpu_usage}% | RAM: ${metrics.ram_used_gb}GB | TEMP: ${metrics.temperature}°C`);
        return response.data;
    } catch (error) {
        console.error(`❌ [${HOST_ID}] Error enviando métricas:`, error.message);
        // Reintentar después de un tiempo
        return null;
    }
}

/**
 * Ciclo principal del simulador
 */
async function main() {
    const profile = PC_PROFILES[HOST_ID];
    
    if (!profile) {
        console.error(`❌ Perfil no encontrado para ${HOST_ID}`);
        process.exit(1);
    }
    
    console.log(`🖥️  Iniciando simulador: ${HOST_ID} (${profile.name})`);
    console.log(`📊 Perfil: ${profile.cpu_cores} cores, ${profile.ram_total}GB RAM, ${profile.disk_total}GB Disco`);
    console.log(`⚙️  Patrón de carga: ${profile.workloadPattern}`);
    console.log(`🔄 Intervalo: ${INTERVAL}ms\n`);
    
    // Esperar a que el backend esté listo
    let backendReady = false;
    while (!backendReady) {
        try {
            await axios.get(`${BACKEND_URL}/health`);
            backendReady = true;
            console.log(`✅ Backend conectado\n`);
        } catch (error) {
            console.log(`⏳ Esperando backend...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // Inicializar estado
    state.disk_used = 0;
    state.uptime = Math.random() * 100; // Uptime inicial aleatorio
    
    let iteration = 0;
    
    // Bucle principal
    setInterval(async () => {
        iteration++;
        const metrics = generateMetrics(profile, iteration);
        await sendMetrics(metrics);
    }, INTERVAL);
}

// Manejo de señales
process.on('SIGTERM', () => {
    console.log(`\n🛑 [${HOST_ID}] Recibida señal SIGTERM, deteniendo...`);
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log(`\n🛑 [${HOST_ID}] Recibida señal SIGINT, deteniendo...`);
    process.exit(0);
});

// Iniciar
main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
