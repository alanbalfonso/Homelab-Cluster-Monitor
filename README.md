# Homelab Cluster Monitor (HCM)

Sistema completo de monitoreo para cluster de mini PCs con simulación de datos, base de datos SQL y frontend interactivo.

## Características

- **Simulación realista** de 5 mini PCs con patrones de carga diferentes
- **Base de datos PostgreSQL** con esquema optimizado para métricas
- **API REST** completa con Express.js
- **Frontend interactivo** con actualización en tiempo real
- **Docker Compose** para orquestación completa
- **Métricas completas**: CPU, RAM, Disco, Red, Temperatura, Uptime- ✅ **Visualización de base de datos** desde la interfaz web
- ✅ **Inserción manual de datos** para demostración y pruebas
- ✅ **Modo tiempo real** para observar el llenado de la base de datos
- ✅ **Consultas SQL personalizadas** desde la interfaz
## Arquitectura

```
┌─────────────────┐
│   Frontend      │  Puerto 8080 (Nginx)
│   (HTML/CSS/JS) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Backend API   │  Puerto 3000 (Node.js + Express)
│   (REST API)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │  Puerto 5432
│ (Base de Datos) │
└─────────────────┘
         ↑
         │
┌────────┴────────┐
│  Simuladores    │  5 contenedores
│  (Mini PCs)     │  Generan métricas cada 30s
└─────────────────┘
```

## Inicio Rápido

### 1. Construir y levantar todos los servicios

```bash
docker-compose up --build
```

### 2. Acceder al sistema

- **Frontend Principal**: http://localhost:8080
- **Vista de Base de Datos**: http://localhost:8080/database.html
- **API Backend**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### 3. Funcionalidades de la Interfaz de Base de Datos

La interfaz de base de datos (`database.html`) ofrece las siguientes funcionalidades:

#### 📊 Visualización de Datos
- **Ver Nodos**: Muestra todos los nodos del cluster con sus especificaciones
- **Últimas Métricas**: Métricas más recientes de cada nodo
- **Todas las Métricas**: Últimas 100 métricas agregadas
- **Resumen 24h**: Estadísticas agregadas de las últimas 24 horas

#### ⏱️ Modo Tiempo Real
- Activa el botón "🔴 Tiempo Real" para ver cómo se llena la base de datos
- Las métricas se actualizan automáticamente cada 5 segundos
- Muestra el contador total de métricas con resaltado al detectar nuevas entradas
- Las filas nuevas aparecen con animación y color destacado

#### ➕ Inserción Manual de Datos
- Formulario para insertar métricas personalizadas
- Selecciona el nodo (mini-pc-01 a mini-pc-05)
- Ingresa valores de CPU (%), RAM (GB) y Temperatura (°C)
- Confirma la inserción con feedback visual inmediato
- Ideal para demostración y pruebas

#### 🔍 Consultas SQL Personalizadas
- Ejecuta consultas SELECT directamente desde la interfaz
- Visualización de resultados en formato tabla
- Validación de seguridad (solo SELECT permitido)
- Ejemplos incluidos en la interfaz

### 4. Ver logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo simuladores
docker-compose logs -f mini-pc-01 mini-pc-02 mini-pc-03

# Solo backend
docker-compose logs -f backend
```

## Mini PCs Simulados

| Host ID | Nombre | Specs | Patrón de Carga | Ubicación |
|---------|--------|-------|-----------------|-----------|
| `mini-pc-01` | HomeServer-Alpha | 8 cores, 16GB RAM, 512GB | Alta constante | Rack Principal - Nivel 1 |
| `mini-pc-02` | HomeServer-Beta | 8 cores, 16GB RAM, 512GB | Media variable | Rack Principal - Nivel 2 |
| `mini-pc-03` | HomeServer-Gamma | 6 cores, 12GB RAM, 256GB | Baja constante | Escritorio - Zona A |
| `mini-pc-04` | HomeServer-Delta | 4 cores, 8GB RAM, 256GB | Bursts ocasionales | Escritorio - Zona B |
| `mini-pc-05` | HomeServer-Epsilon | 4 cores, 8GB RAM, 128GB | Muy baja (IoT) | Estantería - IoT Hub |

## Endpoints de la API

### Métricas

- `POST /api/metrics` - Enviar métricas de un nodo (usado por simuladores)
- `POST /api/metrics/manual` - Insertar métricas manualmente desde la interfaz
- `GET /api/metrics/latest` - Últimas métricas de todos los nodos
- `GET /api/metrics/history/:host_id` - Historial de un nodo (limit=100)
- `GET /api/metrics/summary` - Resumen de 24h

### Nodos

- `GET /api/nodes` - Lista de todos los nodos del cluster

### Estadísticas

- `GET /api/stats` - Estadísticas generales del cluster

### Consultas

- `POST /api/query` - Ejecutar consulta SQL personalizada (solo SELECT)

### Sistema

- `GET /health` - Health check del sistema

### Ejemplo de uso

```bash
# Obtener últimas métricas
curl http://localhost:3000/api/metrics/latest

# Obtener historial de un nodo
curl http://localhost:3000/api/metrics/history/mini-pc-01?limit=50

# Enviar métricas manualmente
curl -X POST http://localhost:3000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "test-pc",
    "cpu_usage": 45.2,
    "ram_used_gb": 8.5,
    "ram_usage_percent": 53.1,
    "temperature": 52.3,
    "disk_used_gb": 128.5,
    "disk_usage_percent": 25.1,
    "network_in_mbps": 12.5,
    "network_out_mbps": 3.2,
    "uptime_hours": 48
  }'
```

## Base de Datos

### Tablas

1. **`cluster_nodes`** - Información de los nodos del cluster
   - `host_id`, `hostname`, `location`, `cpu_cores`, `ram_total_gb`, etc.

2. **`metrics`** - Métricas recolectadas
   - Todas las métricas por timestamp
   - Índices optimizados para consultas por tiempo

### Vistas

1. **`latest_metrics`** - Últimas métricas de cada nodo
2. **`metrics_24h_avg`** - Promedios de las últimas 24 horas

### Conectar directamente a PostgreSQL

```bash
docker exec -it hcm-postgres psql -U admin -d homelab_monitor

# Consultas de ejemplo
SELECT * FROM cluster_nodes;
SELECT * FROM latest_metrics;
SELECT * FROM metrics_24h_avg;
SELECT COUNT(*) FROM metrics;
```

## Frontend

El frontend ofrece:

- **Dashboard en tiempo real** con tarjetas de cada nodo
- **Auto-refresh** opcional cada 5 segundos
- **Vista detallada** con historial de cada nodo (click en tarjeta)
- **Resumen de 24h** con promedios y estadísticas
- **Indicadores visuales** con barras de progreso colorizadas
- **Diseño responsive** para móviles y tablets

### Características visuales

- 🟢 Verde: Valores normales (< 50%)
- 🟡 Amarillo: Valores medios (50-80%)
- 🔴 Rojo: Valores altos (> 80%)

## Comandos Útiles

```bash
# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (limpia la BD)
docker-compose down -v

# Reconstruir un servicio específico
docker-compose up --build backend

# Ver estadísticas de recursos
docker stats

# Entrar al contenedor del backend
docker exec -it hcm-backend sh

# Reiniciar un simulador
docker-compose restart mini-pc-01
```

## Estructura del Proyecto

```
HCM/
├── docker-compose.yml       # Orquestación de servicios
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── index.js            # API REST
│   └── init.sql            # Esquema de base de datos
├── frontend/
│   ├── Dockerfile
│   ├── index.html          # UI principal
│   ├── styles.css          # Estilos
│   └── app.js              # Lógica del frontend
└── simulator/
    ├── Dockerfile
    ├── package.json
    └── index.js            # Simulador de mini PCs
```

## Configuración

### Variables de entorno del simulador

- `BACKEND_URL`: URL del backend (default: http://backend:3000)
- `HOST_ID`: Identificador del mini PC (mini-pc-01 a mini-pc-05)
- `INTERVAL`: Intervalo de envío de métricas en ms (default: 5000)

### Variables de entorno del backend

- `DB_HOST`: Host de PostgreSQL (default: postgres)
- `DB_PORT`: Puerto de PostgreSQL (default: 5432)
- `DB_NAME`: Nombre de la base de datos (default: homelab_monitor)
- `DB_USER`: Usuario de PostgreSQL (default: admin)
- `DB_PASSWORD`: Contraseña de PostgreSQL (default: admin123)
- `PORT`: Puerto del backend (default: 3000)

## Troubleshooting

### El frontend no muestra datos

1. Verifica que el backend esté corriendo: `docker-compose logs backend`
2. Verifica conectividad: `curl http://localhost:3000/health`
3. Revisa la consola del navegador (F12)

### La base de datos no inicia

1. Verifica logs: `docker-compose logs postgres`
2. Elimina el volumen y reinicia: `docker-compose down -v && docker-compose up`

### Los simuladores no envían datos

1. Verifica que el backend esté listo antes de los simuladores
2. Revisa logs: `docker-compose logs mini-pc-01`
3. Verifica red: `docker network inspect hcm_hcm-network`

## 🧪 Pruebas de Carga con K6

El proyecto incluye pruebas de carga para evaluar el rendimiento del backend API.

### Instalación de K6

```powershell
# Con Chocolatey (Windows)
choco install k6 -y

# Verificar instalación
k6 version
```

### Ejecutar Pruebas

```powershell
# 1. Asegúrate de que los servicios estén corriendo
docker-compose up -d

# 2. Ejecutar pruebas de carga
k6 run performance/k6-load-test.js
```

### Métricas Medidas

- ⏱️ **Tiempos de respuesta:** Promedio, P95, P99
- ✅ **Tasa de éxito/error** de requests
- 🔥 **Throughput:** Requests por segundo
- 👥 **Carga progresiva:** 10→50→100 usuarios virtuales

### Perfil de Carga

| Fase | Duración | Usuarios | Descripción |
|------|----------|----------|-------------|
| Ramp-up | 30s | 0→10 | Calentamiento |
| Sostenido | 1m | 10 | Carga ligera |
| Incremento | 30s | 10→20 | Aumento gradual |
| Sostenido | 1m | 20 | Carga media |
| Pico | 30s | 20→50 | Máxima carga |
| Sostenido | 1m | 50 | Estrés sostenido |
| Ramp-down | 30s | 50→0 | Enfriamiento |

**Duración total:** ~5 minutos

### Resultados

Los resultados se guardan en:
- **Consola:** Reporte detallado en tiempo real
- **JSON:** `performance/k6-results.json`

### Documentación Completa

📖 **[Guía de Pruebas K6](performance/TESTING_GUIDE.md)**

## Próximas Mejoras

- [ ] Gráficas con Chart.js para visualización histórica
- [ ] Alertas por email/Slack cuando métricas excedan umbrales
- [ ] Exportar datos a CSV/JSON
- [ ] Autenticación y usuarios
- [ ] Panel de administración para agregar/eliminar nodos
- [ ] WebSockets para actualizaciones en tiempo real sin polling

## Licencia

MIT License - Libre para uso personal y comercial

---
