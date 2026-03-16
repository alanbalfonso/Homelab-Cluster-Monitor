/**
 * Database Management Page - Main Script
 * Handles node management, metrics visualization, and SQL queries
 */

// State
let realtimeInterval = null;
let realtimeDelay = 5000; // ms (se sincroniza con backend)
let lastMetricCount = 0;
let lastSeenMetricTimestamp = null; // Para resaltar métricas nuevas

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        initializeEventListeners();
        await syncMetricsIntervalFromBackend();
        refreshStats();
        setInterval(refreshStats, 10000); // Auto-refresh stats every 10s
        startRealtimeMode(); // Activar siempre la vista en tiempo real
    })();
});

async function syncMetricsIntervalFromBackend() {
    try {
        const data = await api.settings.getInterval();
        if (data.success && data.metrics_interval_ms) {
            realtimeDelay = parseInt(data.metrics_interval_ms, 10) || realtimeDelay;
            const select = document.getElementById('realtimeIntervalSelect');
            if (select) {
                // Si no existe opción exacta, no pasa nada; se mantiene la seleccionada
                select.value = String(realtimeDelay);
            }
        }
    } catch (error) {
        console.warn('No se pudo sincronizar intervalo de métricas desde backend:', error.message);
    }
}

function initializeEventListeners() {
    // Node management forms
    document.getElementById('addNodeForm').addEventListener('submit', handleAddNode);
    document.getElementById('deleteNodeForm').addEventListener('submit', handleSoftDelete);
}

// ==================== STATISTICS ====================

async function refreshStats() {
    try {
        const data = await api.stats.get();
        
        if (data.success) {
            document.getElementById('totalMetrics').textContent = 
                data.stats.total_metrics_recorded.toLocaleString();
            document.getElementById('totalNodes').textContent = 
                data.stats.active_nodes;
            document.getElementById('deletedNodes').textContent = 
                data.stats.deleted_nodes || '0';
            document.getElementById('lastUpdate').textContent = 
                new Date().toLocaleTimeString();
            
            // Update node selector for deletion
            await loadNodeSelector();
        }
    } catch (error) {
        console.error('Error refreshing stats:', error);
    }
}

// ==================== NODE MANAGEMENT ====================

async function loadNodeSelector() {
    try {
        const data = await api.nodes.getActive();
        
        if (data.success) {
            const select = document.getElementById('deleteNodeSelect');
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Seleccionar --</option>';
            
            data.data.forEach(node => {
                const option = document.createElement('option');
                option.value = node.host_id;
                option.textContent = `${node.host_id} (${node.hostname})`;
                select.appendChild(option);
            });
            
            if (currentValue) select.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading nodes:', error);
    }
}

async function handleAddNode(e) {
    e.preventDefault();
    const resultDiv = document.getElementById('addNodeResult');
    resultDiv.innerHTML = '<div style="color: #3b82f6;">Agregando nodo...</div>';
    
    const nodeData = {
        host_id: document.getElementById('newHostId').value.trim(),
        hostname: document.getElementById('newHostname').value.trim(),
        location: document.getElementById('newLocation').value.trim() || 'Homelab',
        cpu_cores: parseInt(document.getElementById('newCpuCores').value) || 4,
        ram_total_gb: parseInt(document.getElementById('newRam').value) || 8,
        disk_total_gb: parseInt(document.getElementById('newDisk').value) || 256,
        os: document.getElementById('newOs').value
    };
    
    try {
        const data = await api.nodes.create(nodeData);
        
        if (data.success) {
            const action = data.restored ? 'restaurado' : 'agregado';
            showSuccess('addNodeResult', `Nodo "${nodeData.host_id}" ${action} exitosamente`);
            document.getElementById('addNodeForm').reset();
            await refreshStats();
        }
    } catch (error) {
        showError('addNodeResult', `Error: ${error.message}`);
    }
}

async function handleSoftDelete(e) {
    e.preventDefault();
    const hostId = document.getElementById('deleteNodeSelect').value;
    if (!hostId) {
        alert('Selecciona un nodo');
        return;
    }
    
    if (!confirm(`¿Estás seguro de hacer soft delete del nodo "${hostId}"?\n\nEl nodo se marcará como eliminado pero sus métricas se conservarán.`)) {
        return;
    }
    
    await deleteNode(hostId, false);
}

async function permanentDelete() {
    const hostId = document.getElementById('deleteNodeSelect').value;
    if (!hostId) {
        alert('Selecciona un nodo');
        return;
    }
    
    if (!confirm(`ADVERTENCIA: Eliminar permanentemente "${hostId}"?\n\nEsta acción NO se puede deshacer.\nSe eliminarán el nodo Y TODAS sus métricas.`)) {
        return;
    }
    
    await deleteNode(hostId, true);
}

async function deleteNode(hostId, permanent) {
    const resultDiv = document.getElementById('deleteNodeResult');
    resultDiv.innerHTML = '<div style="color: #f59e0b;">Eliminando nodo...</div>';
    
    try {
        const data = await api.nodes.delete(hostId, permanent);
        
        if (data.success) {
            const tipo = permanent ? 'eliminado permanentemente' : 'marcado como eliminado (soft delete)';
            showSuccess('deleteNodeResult', `Nodo "${hostId}" ${tipo}`);
            document.getElementById('deleteNodeSelect').value = '';
            await refreshStats();
        }
    } catch (error) {
        showError('deleteNodeResult', `Error: ${error.message}`);
    }
}

async function loadAllNodesWithStatus() {
    document.getElementById('sectionTitle').textContent = 'Todos los Nodos (Incluyendo Eliminados)';
    showLoading('results');
    
    try {
        const data = await api.nodes.getAll();
        
        if (data.success) {
            const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Host ID</th>
                            <th>Hostname</th>
                            <th>Ubicación</th>
                            <th>CPU</th>
                            <th>RAM</th>
                            <th>Disco</th>
                            <th>OS</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(node => createNodeRow(node)).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('results').innerHTML = html;
        }
    } catch (error) {
        showError('results', error.message);
    }
}

function createNodeRow(node) {
    const isDeleted = node.deleted_at !== null;
    const status = isDeleted 
        ? '<span style="color: #ef4444;">Eliminado</span>' 
        : '<span style="color: #22c55e;">Activo</span>';
    const action = isDeleted 
        ? `<button onclick="restoreNode('${node.host_id}')" style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Restaurar</button>`
        : `<button onclick="softDeleteFromTable('${node.host_id}')" style="padding: 4px 8px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Eliminar</button>`;
    
    return `
        <tr style="${isDeleted ? 'opacity: 0.6; background: #1a1a2e;' : ''}">
            <td><strong>${node.host_id}</strong></td>
            <td>${node.hostname}</td>
            <td>${node.location}</td>
            <td>${node.cpu_cores}</td>
            <td>${node.ram_total_gb} GB</td>
            <td>${node.disk_total_gb} GB</td>
            <td>${node.os}</td>
            <td>${status}</td>
            <td>${action}</td>
        </tr>
    `;
}

async function restoreNode(hostId) {
    if (!confirm(`¿Restaurar el nodo "${hostId}"?`)) return;
    
    try {
        const data = await api.nodes.restore(hostId);
        
        if (data.success) {
            alert(`Nodo "${hostId}" restaurado exitosamente`);
            await loadAllNodesWithStatus();
            await refreshStats();
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function softDeleteFromTable(hostId) {
    if (!confirm(`¿Marcar "${hostId}" como eliminado (soft delete)?`)) return;
    await deleteNode(hostId, false);
    await loadAllNodesWithStatus();
}

// ==================== METRICS VISUALIZATION ====================

async function loadNodes() {
    document.getElementById('sectionTitle').textContent = 'Nodos del Cluster';
    showLoading('results');
    
    try {
        const data = await api.nodes.getActive();
        
        if (data.success) {
            const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Host ID</th>
                            <th>Hostname</th>
                            <th>Ubicación</th>
                            <th>CPU Cores</th>
                            <th>RAM (GB)</th>
                            <th>Disco (GB)</th>
                            <th>OS</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(node => `
                            <tr>
                                <td><strong>${node.host_id}</strong></td>
                                <td>${node.hostname}</td>
                                <td>${node.location}</td>
                                <td>${node.cpu_cores}</td>
                                <td>${node.ram_total_gb}</td>
                                <td>${node.disk_total_gb}</td>
                                <td>${node.os}</td>
                                <td><span style="color: #22c55e;">●</span> ${node.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('results').innerHTML = html;
        }
    } catch (error) {
        showError('results', error.message);
    }
}

async function loadLatestMetrics() {
    document.getElementById('sectionTitle').textContent = 'Últimas Métricas por Nodo';
    showLoading('results');
    
    try {
        const data = await api.metrics.getLatest();
        
        if (data.success) {
            const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Host</th>
                            <th>CPU %</th>
                            <th>RAM GB</th>
                            <th>RAM %</th>
                            <th>Temp °C</th>
                            <th>Disco %</th>
                            <th>Red IN</th>
                            <th>Red OUT</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(m => `
                            <tr>
                                <td><strong>${m.host_id}</strong></td>
                                <td>${formatNumber(m.cpu_usage)}</td>
                                <td>${formatNumber(m.ram_used_gb)}</td>
                                <td>${formatNumber(m.ram_usage_percent)}</td>
                                <td>${formatNumber(m.temperature)}</td>
                                <td>${formatNumber(m.disk_usage_percent)}</td>
                                <td>${formatNumber(m.network_in_mbps)} Mbps</td>
                                <td>${formatNumber(m.network_out_mbps)} Mbps</td>
                                <td>${formatTimestamp(m.timestamp)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('results').innerHTML = html;
        }
    } catch (error) {
        showError('results', error.message);
    }
}

async function loadAllMetrics() {
    document.getElementById('sectionTitle').textContent = 'Todas las Métricas (últimas 100)';
    showLoading('results');
    
    try {
        // Get all nodes first
        const nodesData = await api.nodes.getActive();
        const hostIds = nodesData.data.map(n => n.host_id);
        
        // Fetch history for each node
        const promises = hostIds.map(id => api.metrics.getHistory(id, 20));
        const results = await Promise.all(promises);
        
        // Flatten and sort
        const allMetrics = results.flatMap(r => r.data);
        allMetrics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let maxTimestampMs = lastSeenMetricTimestamp || 0;
        const rowsHtml = allMetrics.slice(0, 100).map(m => {
            const tsMs = new Date(m.timestamp).getTime();
            const isNew = !lastSeenMetricTimestamp || (tsMs && tsMs > lastSeenMetricTimestamp);
            if (tsMs && tsMs > maxTimestampMs) {
                maxTimestampMs = tsMs;
            }

            const rowClass = isNew ? 'new-metric' : '';

            return `
                        <tr class="${rowClass}">
                            <td><strong>${m.host_id}</strong></td>
                            <td>${formatNumber(m.cpu_usage)}</td>
                            <td>${formatNumber(m.ram_used_gb)}</td>
                            <td>${formatNumber(m.temperature)}</td>
                            <td>${formatNumber(m.disk_usage_percent)}</td>
                            <td>${formatTimestamp(m.timestamp)}</td>
                        </tr>
                    `;
        }).join('');

        lastSeenMetricTimestamp = maxTimestampMs || lastSeenMetricTimestamp;

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Host</th>
                        <th>CPU %</th>
                        <th>RAM GB</th>
                        <th>Temp °C</th>
                        <th>Disco %</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;
        document.getElementById('results').innerHTML = html;
    } catch (error) {
        showError('results', error.message);
    }
}

async function loadSummary() {
    document.getElementById('sectionTitle').textContent = 'Resumen de 24 Horas';
    showLoading('results');
    
    try {
        const data = await api.metrics.getSummary();
        
        if (data.success) {
            const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Host</th>
                            <th>CPU Avg</th>
                            <th>RAM Avg</th>
                            <th>Temp Avg</th>
                            <th>Temp Max</th>
                            <th>Temp Min</th>
                            <th>Muestras</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(s => `
                            <tr>
                                <td><strong>${s.hostname}</strong></td>
                                <td>${formatNumber(s.avg_cpu)}%</td>
                                <td>${formatNumber(s.avg_ram)}%</td>
                                <td>${formatNumber(s.avg_temp)}°C</td>
                                <td>${formatNumber(s.max_temp)}°C</td>
                                <td>${formatNumber(s.min_temp)}°C</td>
                                <td>${s.samples}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('results').innerHTML = html;
        }
    } catch (error) {
        showError('results', error.message);
    }
}

// ==================== REALTIME MODE ====================

async function startRealtimeMode() {
    document.getElementById('sectionTitle').textContent = 'Vista en Tiempo Real - Nuevas Métricas';

    // Reiniciar intervalo si ya estaba activo
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
    
    try {
        const data = await api.stats.get();
        if (data.success) {
            lastMetricCount = parseInt(data.stats.total_metrics_recorded);
        }
    } catch (error) {
        console.error('Error:', error);
    }

    document.getElementById('results').innerHTML = `
        <div style="background: #166534; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px; border: 1px solid #22c55e;">
            <h3 style="color: #86efac; margin-bottom: 10px;">Modo Tiempo Real Activado</h3>
            <p style="color: #e2e8f0; font-size: 14px;">Las métricas se actualizarán automáticamente según la frecuencia seleccionada</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Total de métricas: <strong id="totalCount">${lastMetricCount}</strong></p>
        </div>
        <div id="realtimeMetrics"></div>
    `;
    
    loadRealtimeMetrics();
    realtimeInterval = setInterval(loadRealtimeMetrics, realtimeDelay);
}

function changeRealtimeInterval(value) {
    const newDelay = parseInt(value, 10);
    if (!newDelay || newDelay <= 0) return;
    realtimeDelay = newDelay;

    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = setInterval(loadRealtimeMetrics, realtimeDelay);
    }

    // Actualizar también el intervalo global de generación de métricas en el backend
    api.settings.setInterval(realtimeDelay).catch(err => {
        console.error('Error actualizando metrics_interval_ms en backend:', err.message);
    });
}

async function loadRealtimeMetrics() {
    try {
        const data = await api.metrics.getLatest();
        
        if (data.success) {
            let maxTimestampMs = lastSeenMetricTimestamp || 0;
            const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Host</th>
                            <th>CPU %</th>
                            <th>RAM GB</th>
                            <th>Temp °C</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(m => {
                            const tsMs = new Date(m.timestamp).getTime();
                            const isNew = !lastSeenMetricTimestamp || (tsMs && tsMs > lastSeenMetricTimestamp);
                            if (tsMs && tsMs > maxTimestampMs) {
                                maxTimestampMs = tsMs;
                            }
                            const rowClass = isNew ? 'new-metric' : '';
                            return `
                            <tr class="${rowClass}">
                                <td><strong>${m.host_id}</strong></td>
                                <td>${formatNumber(m.cpu_usage)}</td>
                                <td>${formatNumber(m.ram_used_gb)}</td>
                                <td>${formatNumber(m.temperature)}</td>
                                <td>${formatTimestamp(m.timestamp)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('realtimeMetrics').innerHTML = html;

            lastSeenMetricTimestamp = maxTimestampMs || lastSeenMetricTimestamp;
        }
    } catch (error) {
        console.error('Error loading realtime metrics:', error);
    }
}
