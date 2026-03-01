## 🔌 Cómo Conectar a la Base de Datos

### Credenciales de Conexión

```
Host:     localhost
Puerto:   5432
Database: homelab_monitor
Usuario:  admin
Password: admin123
```

### Opción 1: Desde la Terminal (psql)

```bash
# Conectar al contenedor de PostgreSQL
docker exec -it hcm-postgres psql -U admin -d homelab_monitor

# Comandos útiles dentro de psql:
\dt                    # Listar tablas
\d+ cluster_nodes      # Describir tabla cluster_nodes
\d+ metrics            # Describir tabla metrics

# Ver nodos del cluster
SELECT * FROM cluster_nodes;

# Ver últimas métricas
SELECT * FROM latest_metrics;

# Contar métricas totales
SELECT COUNT(*) FROM metrics;

# Ver últimas 10 métricas
SELECT 
    host_id, 
    cpu_usage, 
    ram_used_gb, 
    temperature, 
    timestamp 
FROM metrics 
ORDER BY timestamp DESC 
LIMIT 10;

# Promedios por nodo
SELECT 
    host_id,
    AVG(cpu_usage) as avg_cpu,
    AVG(temperature) as avg_temp,
    COUNT(*) as total_samples
FROM metrics
GROUP BY host_id;

# Salir
\q
```

### Opción 2: DBeaver (Cliente SQL GUI)

1. Descargar: https://dbeaver.io/download/
2. Instalar y abrir DBeaver
3. Click en "Nueva Conexión" → Seleccionar "PostgreSQL"
4. Ingresar credenciales:
   - Host: localhost
   - Port: 5432
   - Database: homelab_monitor
   - Username: admin
   - Password: admin123
5. Test Connection → Finish

### Opción 3: pgAdmin (Cliente PostgreSQL oficial)

1. Descargar: https://www.pgadmin.org/download/windows/
2. Instalar y abrir pgAdmin
3. Click derecho en "Servers" → "Register" → "Server"
4. Tab General:
   - Name: HCM Database
5. Tab Connection:
   - Host: localhost
   - Port: 5432
   - Database: homelab_monitor
   - Username: admin
   - Password: admin123
6. Save

### Opción 4: VS Code Extension

1. Instalar extensión "PostgreSQL" de Chris Kolkman
2. Click en ícono de PostgreSQL en sidebar
3. Add Connection:
   - Hostname: localhost
   - User: admin
   - Password: admin123
   - Port: 5432
   - Database: homelab_monitor

### Opción 5: Desde el Backend (API)

```bash
# Ver nodos
curl http://localhost:3000/api/nodes

# Ver últimas métricas
curl http://localhost:3000/api/metrics/latest

# Ver historial de un nodo
curl http://localhost:3000/api/metrics/history/mini-pc-01?limit=50

# Ver resumen de 24h
curl http://localhost:3000/api/metrics/summary

# Ver estadísticas generales
curl http://localhost:3000/api/stats
```

### Consultas SQL Útiles

```sql
-- Ver todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Estructura de la tabla metrics
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'metrics';

-- Métricas de las últimas 24 horas
SELECT 
    m.host_id,
    cn.hostname,
    COUNT(*) as samples,
    AVG(m.cpu_usage) as avg_cpu,
    MAX(m.cpu_usage) as max_cpu,
    AVG(m.temperature) as avg_temp,
    MAX(m.temperature) as max_temp
FROM metrics m
JOIN cluster_nodes cn ON m.host_id = cn.host_id
WHERE m.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY m.host_id, cn.hostname
ORDER BY m.host_id;

-- Top 5 métricas con mayor CPU
SELECT 
    host_id, 
    cpu_usage, 
    temperature, 
    timestamp
FROM metrics
ORDER BY cpu_usage DESC
LIMIT 5;

-- Tendencia de temperatura por hora
SELECT 
    host_id,
    DATE_TRUNC('hour', timestamp) as hour,
    AVG(temperature) as avg_temp,
    MAX(temperature) as max_temp,
    MIN(temperature) as min_temp
FROM metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY host_id, DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC, host_id;

-- Nodos con mayor carga promedio
SELECT 
    cn.hostname,
    cn.location,
    AVG(m.cpu_usage) as avg_cpu,
    AVG(m.ram_usage_percent) as avg_ram,
    AVG(m.temperature) as avg_temp
FROM metrics m
JOIN cluster_nodes cn ON m.host_id = cn.host_id
WHERE m.timestamp > NOW() - INTERVAL '1 hour'
GROUP BY cn.hostname, cn.location
ORDER BY avg_cpu DESC;
```

### Script PowerShell para Monitoreo Rápido

```powershell
# Guardar como monitor.ps1
while ($true) {
    Clear-Host
    Write-Host "=== HCM Database Monitor ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Total de métricas
    $total = docker exec hcm-postgres psql -U admin -d homelab_monitor -t -c "SELECT COUNT(*) FROM metrics;"
    Write-Host "Total métricas: $total" -ForegroundColor Green
    
    # Últimas métricas
    docker exec hcm-postgres psql -U admin -d homelab_monitor -c "SELECT host_id, cpu_usage, temperature, timestamp FROM metrics ORDER BY timestamp DESC LIMIT 5;"
    
    Write-Host "`nActualizando en 5 segundos... (Ctrl+C para salir)" -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
```

## 📊 Exportar Datos

```sql
-- Exportar a CSV (desde psql)
\copy (SELECT * FROM metrics WHERE timestamp > NOW() - INTERVAL '24 hours') TO 'C:/temp/metrics_24h.csv' WITH CSV HEADER;

-- Exportar resumen
\copy (SELECT * FROM metrics_24h_avg) TO 'C:/temp/summary.csv' WITH CSV HEADER;
```
