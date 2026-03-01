-- Creación de la base de datos del Homelab Cluster Monitor
CREATE TABLE IF NOT EXISTS cluster_nodes (
    id SERIAL PRIMARY KEY,
    host_id VARCHAR(50) UNIQUE NOT NULL,
    hostname VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    cpu_cores INTEGER,
    ram_total_gb INTEGER,
    disk_total_gb INTEGER,
    os VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    host_id VARCHAR(50) NOT NULL,
    cpu_usage DECIMAL(5,2),
    ram_used_gb DECIMAL(6,2),
    ram_usage_percent DECIMAL(5,2),
    temperature DECIMAL(5,2),
    disk_used_gb DECIMAL(8,2),
    disk_usage_percent DECIMAL(5,2),
    network_in_mbps DECIMAL(8,2),
    network_out_mbps DECIMAL(8,2),
    uptime_hours INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES cluster_nodes(host_id) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_host_timestamp ON metrics(host_id, timestamp DESC);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);

-- Insertar nodos del cluster homelab
INSERT INTO cluster_nodes (host_id, hostname, location, cpu_cores, ram_total_gb, disk_total_gb, os) VALUES
    ('mini-pc-01', 'HomeServer-Alpha', 'Rack Principal - Nivel 1', 8, 16, 512, 'Ubuntu 22.04 LTS'),
    ('mini-pc-02', 'HomeServer-Beta', 'Rack Principal - Nivel 2', 8, 16, 512, 'Ubuntu 22.04 LTS'),
    ('mini-pc-03', 'HomeServer-Gamma', 'Escritorio - Zona A', 6, 12, 256, 'Debian 12'),
    ('mini-pc-04', 'HomeServer-Delta', 'Escritorio - Zona B', 4, 8, 256, 'Ubuntu 22.04 LTS'),
    ('mini-pc-05', 'HomeServer-Epsilon', 'Estantería - IoT Hub', 4, 8, 128, 'Raspberry Pi OS')
ON CONFLICT (host_id) DO NOTHING;

-- Vista para obtener últimas métricas por nodo
CREATE OR REPLACE VIEW latest_metrics AS
SELECT DISTINCT ON (m.host_id)
    m.id,
    m.host_id,
    cn.hostname,
    cn.location,
    cn.cpu_cores,
    cn.ram_total_gb,
    m.cpu_usage,
    m.ram_used_gb,
    m.ram_usage_percent,
    m.temperature,
    m.disk_used_gb,
    m.disk_usage_percent,
    m.network_in_mbps,
    m.network_out_mbps,
    m.uptime_hours,
    m.timestamp,
    cn.status
FROM metrics m
JOIN cluster_nodes cn ON m.host_id = cn.host_id
ORDER BY m.host_id, m.timestamp DESC;

-- Vista para promedios de las últimas 24 horas
CREATE OR REPLACE VIEW metrics_24h_avg AS
SELECT
    m.host_id,
    cn.hostname,
    AVG(m.cpu_usage) as avg_cpu,
    AVG(m.ram_usage_percent) as avg_ram,
    AVG(m.temperature) as avg_temp,
    MAX(m.temperature) as max_temp,
    MIN(m.temperature) as min_temp,
    COUNT(*) as samples
FROM metrics m
JOIN cluster_nodes cn ON m.host_id = cn.host_id
WHERE m.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY m.host_id, cn.hostname;
