// Configuración
const BACKEND_URL = 'http://localhost:3000';
let autoRefreshInterval = null;
let autoRefreshDelay = 5000; // ms
let simulationIntervalMs = null; // Intervalo global de simulación (desde backend)

// Estado global
let currentData = {
    nodes: [],
    latestMetrics: [],
    summary: [],
    stats: {}
};

/**
 * Función auxiliar para formatear números de forma segura
 */
function formatNumber(value, decimals = 1) {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num.toFixed(decimals);
}

/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Homelab Cluster Monitor iniciado');
    refreshData();
    startAutoRefresh();
});

/**
 * Obtener estadísticas generales
 */
async function fetchStats() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/stats`);
        const data = await response.json();
        if (data.success) {
            currentData.stats = data.stats;
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
    }
}

/**
 * Obtener últimas métricas
 */
async function fetchLatestMetrics() {
    try {
        console.log('Intentando conectar a:', `${BACKEND_URL}/api/metrics/latest`);
        const response = await fetch(`${BACKEND_URL}/api/metrics/latest`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        console.log('Respuesta recibida, status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (data.success) {
            currentData.latestMetrics = data.data;
            renderNodes();
        } else {
            throw new Error('La respuesta no fue exitosa');
        }
    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje:', error.message);
        
        let errorMsg = 'Error conectando con el servidor';
        if (error.message.includes('fetch')) {
            errorMsg = 'No se puede conectar al backend. Verifica que esté corriendo en http://localhost:3000';
        } else if (error.message.includes('HTTP error')) {
            errorMsg = `Error del servidor: ${error.message}`;
        }
        
        showError(`${errorMsg}. Abre la consola (F12) para más detalles.`);
    }
}

/**
 * Obtener resumen de 24h
 */
async function fetchSummary() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/metrics/summary`);
        const data = await response.json();
        if (data.success) {
            currentData.summary = data.data;
            renderSummary();
        }
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
    }
}

/**
 * Obtener intervalo global de simulación desde backend
 */
async function fetchSimulationInterval() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/settings/metrics-interval`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && data.metrics_interval_ms) {
            simulationIntervalMs = parseInt(data.metrics_interval_ms, 10);
            updateSimulationIntervalDisplay();
        }
    } catch (error) {
        console.warn('No se pudo obtener el intervalo de simulación global:', error.message);
    }
}

/**
 * Actualizar todos los datos
 */
async function refreshData() {
    console.log('Actualizando datos...');
    await Promise.all([
        fetchStats(),
        fetchLatestMetrics(),
        fetchSummary(),
        fetchSimulationInterval()
    ]);
    updateLastUpdateTime();
}

/**
 * Actualizar estadísticas del header
 */
function updateStatsDisplay() {
    const stats = currentData.stats;
    document.getElementById('activeNodes').textContent = stats.active_nodes || 0;
    document.getElementById('totalMetrics').textContent = stats.total_metrics_recorded || 0;
    document.getElementById('avgCpu').textContent = `${stats.avg_cpu_1h || 0}%`;
    document.getElementById('avgTemp').textContent = `${stats.avg_temperature_1h || 0}°C`;
}

/**
 * Renderizar nodos
 */
function renderNodes() {
    const grid = document.getElementById('nodesGrid');
    
    if (currentData.latestMetrics.length === 0) {
        grid.innerHTML = '<div class="loading">Esperando datos de los nodos...</div>';
        return;
    }
    
    grid.innerHTML = currentData.latestMetrics
        .map(node => createNodeCard(node))
        .join('');
}

/**
 * Crear tarjeta de nodo
 */
function createNodeCard(node) {
    const cpuClass = getProgressClass(node.cpu_usage);
    const ramClass = getProgressClass(node.ram_usage_percent);
    const tempClass = getTempClass(node.temperature);
    const statusClass = getStatusClass(node);
    
    return `
        <div class="node-card" onclick="showNodeDetails('${node.host_id}')">
            <div class="node-header">
                <div class="node-info">
                    <h3>${node.hostname}</h3>
                    <div class="host-id">${node.host_id}</div>
                    <div class="location">${node.location}</div>
                </div>
                <span class="status-badge ${statusClass}">${node.status}</span>
            </div>
            
            <div class="metrics-grid">
                <div class="metric">
                    <div class="metric-label">CPU</div>
                    <div class="metric-value">
                        ${formatNumber(node.cpu_usage)}
                        <span class="metric-unit">%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${cpuClass}" style="width: ${node.cpu_usage}%"></div>
                    </div>
                </div>
                
                <div class="metric">
                    <div class="metric-label">RAM</div>
                    <div class="metric-value">
                        ${formatNumber(node.ram_used_gb)}
                        <span class="metric-unit">GB</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${ramClass}" style="width: ${node.ram_usage_percent}%"></div>
                    </div>
                </div>
                
                <div class="metric">
                    <div class="metric-label">Temperatura</div>
                    <div class="metric-value">
                        ${formatNumber(node.temperature)}
                        <span class="metric-unit">°C</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${tempClass}" style="width: ${Math.min((node.temperature / 80) * 100, 100)}%"></div>
                    </div>
                </div>
                
                <div class="metric">
                    <div class="metric-label">Disco</div>
                    <div class="metric-value">
                        ${formatNumber(node.disk_usage_percent)}
                        <span class="metric-unit">%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getProgressClass(node.disk_usage_percent)}" style="width: ${node.disk_usage_percent}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderizar resumen de 24h
 */
function renderSummary() {
    const grid = document.getElementById('summaryGrid');
    
    if (currentData.summary.length === 0) {
        grid.innerHTML = '<div>No hay datos suficientes para mostrar resumen de 24h</div>';
        return;
    }
    
    grid.innerHTML = currentData.summary
        .map(node => `
            <div class="summary-card">
                <h4>${node.hostname}</h4>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <strong>CPU Promedio:</strong>
                        <span>${formatNumber(node.avg_cpu)}%</span>
                    </div>
                    <div class="summary-stat">
                        <strong>RAM Promedio:</strong>
                        <span>${formatNumber(node.avg_ram)}%</span>
                    </div>
                    <div class="summary-stat">
                        <strong>Temp Promedio:</strong>
                        <span>${formatNumber(node.avg_temp)}°C</span>
                    </div>
                    <div class="summary-stat">
                        <strong>Temp Máxima:</strong>
                        <span>${formatNumber(node.max_temp)}°C</span>
                    </div>
                    <div class="summary-stat">
                        <strong>Temp Mínima:</strong>
                        <span>${formatNumber(node.min_temp)}°C</span>
                    </div>
                    <div class="summary-stat">
                        <strong>Muestras:</strong>
                        <span>${node.samples || 0}</span>
                    </div>
                </div>
            </div>
        `)
        .join('');
}

/**
 * Mostrar detalles de un nodo
 */
async function showNodeDetails(hostId) {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    // Obtener historial
    try {
        const response = await fetch(`${BACKEND_URL}/api/metrics/history/${hostId}?limit=20`);
        const data = await response.json();
        
        if (data.success) {
            const node = currentData.latestMetrics.find(n => n.host_id === hostId);
            modalTitle.textContent = `Detalles: ${node.hostname}`;
            
            modalBody.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h3>Información General</h3>
                    <p><strong>Host ID:</strong> ${node.host_id}</p>
                    <p><strong>Ubicación:</strong> ${node.location}</p>
                    <p><strong>CPU Cores:</strong> ${node.cpu_cores}</p>
                    <p><strong>RAM Total:</strong> ${node.ram_total_gb} GB</p>
                    <p><strong>Uptime:</strong> ${node.uptime_hours} horas</p>
                </div>
                
                <h3>Últimas 20 Métricas</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f7fafc; text-align: left;">
                                <th style="padding: 8px;">Tiempo</th>
                                <th style="padding: 8px;">CPU %</th>
                                <th style="padding: 8px;">RAM GB</th>
                                <th style="padding: 8px;">Temp °C</th>
                                <th style="padding: 8px;">Red In</th>
                                <th style="padding: 8px;">Red Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(m => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px;">${new Date(m.timestamp).toLocaleTimeString()}</td>
                                    <td style="padding: 8px;">${formatNumber(m.cpu_usage)}</td>
                                    <td style="padding: 8px;">${formatNumber(m.ram_used_gb)}</td>
                                    <td style="padding: 8px;">${formatNumber(m.temperature)}</td>
                                    <td style="padding: 8px;">${formatNumber(m.network_in_mbps)} Mbps</td>
                                    <td style="padding: 8px;">${formatNumber(m.network_out_mbps)} Mbps</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        alert('Error obteniendo detalles del nodo');
    }
}

/**
 * Cerrar modal
 */
function closeModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

/**
 * Toggle auto-refresh
 */
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(refreshData, autoRefreshDelay);
}

function changeAutoRefreshInterval(value) {
    const newDelay = parseInt(value, 10);
    if (!newDelay || newDelay <= 0) return;
    autoRefreshDelay = newDelay;

    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(refreshData, autoRefreshDelay);
    }
}

/**
 * Actualizar tiempo de última actualización
 */
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

/**
 * Actualizar indicador de intervalo de simulación global
 */
function updateSimulationIntervalDisplay() {
    const el = document.getElementById('simulationInterval');
    if (!el || !simulationIntervalMs) return;
    const seconds = Math.round(simulationIntervalMs / 1000);
    el.textContent = `${seconds}s`;
}

/**
 * Obtener clase de progreso según porcentaje
 */
function getProgressClass(value) {
    if (value < 50) return 'progress-low';
    if (value < 80) return 'progress-medium';
    return 'progress-high';
}

/**
 * Obtener clase de temperatura
 */
function getTempClass(temp) {
    if (temp < 50) return 'progress-low';
    if (temp < 65) return 'progress-medium';
    return 'progress-high';
}

/**
 * Obtener clase de estado
 */
function getStatusClass(node) {
    if (node.cpu_usage > 90 || node.temperature > 75) return 'status-critical';
    if (node.cpu_usage > 70 || node.temperature > 60) return 'status-warning';
    return 'status-active';
}

/**
 * Mostrar error
 */
function showError(message) {
    const grid = document.getElementById('nodesGrid');
    grid.innerHTML = `<div class="loading" style="color: #f56565;">${message}</div>`;
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('detailsModal');
    if (event.target === modal) {
        closeModal();
    }
}
