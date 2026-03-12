# Homelab Cluster Monitor (HCM)

Sistema completo de monitoreo para cluster de mini PCs con arquitectura modular, simulación de datos realista, base de datos PostgreSQL y frontend interactivo.

## Características

- **Arquitectura modular** con separación de responsabilidades (MVC, OOP)
- **Simulación realista** de 5 mini PCs con patrones de carga personalizables
- **Base de datos PostgreSQL** con esquema optimizado e índices de rendimiento
- **API REST modular** con Express.js y controladores separados
- **Frontend con JavaScript modular** separado del HTML
- **Docker Compose** para orquestación completa de 8 contenedores
- **Métricas completas**: CPU, RAM, Disco, Red, Temperatura, Uptime
- **Visualización de base de datos** con interfaz web dedicada
- **Gestión CRUD de nodos** con soft delete y restauración
- **Modo tiempo real** para monitoreo continuo
- **Consultas SQL personalizadas** con protección contra inyección
- **Tests de carga con K6** para evaluación de rendimiento
## Arquitectura

El sistema utiliza una arquitectura modular distribuida en contenedores Docker:

```
┌──────────────────────────────────────┐
│           Frontend (Nginx)           │  Puerto 8080
│  ├── HTML (estructura)               │
│  ├── CSS (estilos)                   │
│  └── JavaScript Modular              │
│      ├── api.js (cliente HTTP)       │
│      ├── utils.js (utilidades)       │
│      ├── database.js (lógica BD)     │
│      └── app.js (dashboard)          │
└──────────────┬───────────────────────┘
               │ HTTP/REST
               ↓
┌──────────────────────────────────────┐
│      Backend API (Express.js)        │  Puerto 3000
│  ├── config/                         │
│  │   └── database.js                 │
│  ├── controllers/                    │
│  │   ├── nodesController.js          │
│  │   ├── metricsController.js        │
│  │   └── statsController.js          │
│  ├── routes/                         │
│  │   ├── nodes.js                    │
│  │   ├── metrics.js                  │
│  │   └── stats.js                    │
│  └── index.js (entry point)          │
└──────────────┬───────────────────────┘
               │ PostgreSQL Pool
               ↓
┌──────────────────────────────────────┐
│      PostgreSQL 15 Alpine            │  Puerto 5432
│  ├── cluster_nodes (nodos)           │
│  ├── metrics (métricas)              │
│  ├── latest_metrics (vista)          │
│  └── metrics_24h_avg (vista)         │
└──────────────┬───────────────────────┘
               ↑ Envío de métricas
               │
┌──────────────┴───────────────────────┐
│     Simuladores (5 contenedores)     │
│  ├── config/                         │
│  │   └── profiles.js                 │
│  ├── services/                       │
│  │   ├── metricsGenerator.js (OOP)   │
│  │   └── apiClient.js (HTTP)         │
│  └── index.js (Simulator class)      │
└──────────────────────────────────────┘
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

### 3. Funcionalidades de la Interfaz

#### Dashboard Principal (index.html)
- Tarjetas de estado para cada nodo del cluster
- Visualización en tiempo real con auto-refresh opcional
- Indicadores visuales con código de colores según umbrales
- Vista detallada al hacer clic en cada nodo
- Resumen estadístico de 24 horas

#### Interfaz de Base de Datos (database.html)

**Gestión de Nodos:**
- Agregar nuevos nodos al cluster con especificaciones completas
- Eliminar nodos (soft delete o permanente)
- Restaurar nodos eliminados
- Ver todos los nodos con su estado actual

**Visualización de Métricas:**
- Ver nodos activos con especificaciones
- Últimas métricas de cada nodo con JOIN completo
- Historial de métricas (últimas 100 entradas)
- Resumen agregado de 24 horas por nodo

**Modo Tiempo Real:**
- Actualización automática cada 5 segundos
- Contador de métricas totales con detección de cambios
- Resaltado visual de nuevas entradas
- Animaciones de transición

**Consultas SQL:**
- Ejecutar consultas SELECT personalizadas
- Protección contra inyección SQL
- Visualización de resultados en tabla HTML
- Manejo de valores NULL y tipos de datos especiales

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

### Nodos
- `GET /api/nodes` - Lista de nodos activos
- `GET /api/nodes/all` - Todos los nodos (incluye eliminados)
- `POST /api/nodes` - Crear nuevo nodo o restaurar si existe
- `DELETE /api/nodes/:hostId` - Soft delete de un nodo
- `DELETE /api/nodes/:hostId?permanent=true` - Eliminación permanente
- `POST /api/nodes/:hostId/restore` - Restaurar nodo eliminado

### Métricas
- `POST /api/metrics/batch` - Enviar batch de métricas (simuladores)
- `POST /api/metrics/manual` - Insertar métricas manualmente
- `GET /api/metrics/latest` - Últimas métricas de cada nodo
- `GET /api/metrics/history/:host_id?limit=N` - Historial de un nodo
- `GET /api/metrics/summary` - Resumen de 24 horas agregado

### Estadísticas
- `GET /api/stats` - Estadísticas generales del cluster
- `POST /api/query` - Ejecutar consulta SQL (solo SELECT)
- `GET /api/health` - Health check del sistema

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

## Arquitectura del Código

### Backend (Patrón MVC)

**Capa de Configuración:**
- `config/database.js`: Pool de conexiones PostgreSQL con manejo de errores

**Capa de Controladores:**
- `controllers/nodesController.js`: Lógica de negocio para CRUD de nodos
- `controllers/metricsController.js`: Operaciones de métricas con validaciones
- `controllers/statsController.js`: Estadísticas y queries con protección SQL

**Capa de Rutas:**
- `routes/nodes.js`: Definición de endpoints de nodos
- `routes/metrics.js`: Definición de endpoints de métricas
- `routes/stats.js`: Definición de endpoints de estadísticas

**Punto de Entrada:**
- `index.js`: Configuración de Express, middlewares, y montaje de rutas

### Simulator (Programación Orientada a Objetos)

**Configuración:**
- `config/profiles.js`: Perfiles de hardware y patrones de carga

**Servicios:**
- `services/metricsGenerator.js`: Clase para generar métricas realistas
- `services/apiClient.js`: Clase para comunicación HTTP con backend

**Orquestador:**
- `index.js`: Clase Simulator con ciclo de vida completo

### Frontend (JavaScript Modular)

**Módulos:**
- `js/api.js`: Cliente HTTP reutilizable para todos los endpoints
- `js/utils.js`: Funciones de utilidad (formateo, UI, validación)
- `js/database.js`: Lógica específica de la interfaz de base de datos
- `app.js`: Lógica del dashboard principal

**Vistas:**
- `index.html`: Dashboard principal
- `database.html`: Interfaz de gestión de base de datos

### Indicadores Visuales

- Verde: Valores normales (< 50%)
- Amarillo: Valores medios (50-80%)
- Rojo: Valores altos (> 80%)

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
├── docker-compose.yml              # Orquestación de servicios
├── README.md                       # Documentación principal
├── ARCHITECTURE.md                 # Guía de arquitectura detallada
├── REFACTORING_SUMMARY.md          # Resumen de refactorización
├── DATABASE_GUIDE.md               # Guía de base de datos
│
├── backend/                        # API REST modular
│   ├── config/
│   │   └── database.js             # Configuración de PostgreSQL
│   ├── controllers/
│   │   ├── nodesController.js      # CRUD de nodos
│   │   ├── metricsController.js    # Operaciones de métricas
│   │   └── statsController.js      # Estadísticas y queries
│   ├── routes/
│   │   ├── nodes.js                # Rutas de nodos
│   │   ├── metrics.js              # Rutas de métricas
│   │   └── stats.js                # Rutas de estadísticas
│   ├── index.js                    # Punto de entrada
│   ├── index-monolithic.js.backup  # Backup del código original
│   ├── init.sql                    # Esquema de base de datos
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                       # Interfaz web
│   ├── js/
│   │   ├── api.js                  # Cliente HTTP para backend
│   │   ├── utils.js                # Funciones de utilidad
│   │   └── database.js             # Lógica de database.html
│   ├── index.html                  # Dashboard principal
│   ├── database.html               # Interfaz de gestión de BD
│   ├── app.js                      # Lógica del dashboard
│   ├── styles.css                  # Estilos globales
│   ├── Dockerfile
│   └── nginx.conf
│
├── simulator/                      # Generadores de métricas (OOP)
│   ├── config/
│   │   └── profiles.js             # Perfiles de mini-PCs
│   ├── services/
│   │   ├── metricsGenerator.js     # Clase generadora
│   │   └── apiClient.js            # Cliente HTTP
│   ├── index.js                    # Clase Simulator
│   ├── index-monolithic.js.backup  # Backup del código original
│   ├── package.json
│   └── Dockerfile
│
├── performance/
│   ├── k6-load-test.js             # Script de pruebas de carga
│   └── TESTING_GUIDE.md            # Guía de testing
│
└── infraestructura/
    ├── docker-compose.yml
    ├── main.tf                     # Configuración Terraform
    └── terraform.tfvars
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

## Pruebas de Carga con K6

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

- **Tiempos de respuesta:** Promedio, P95, P99
- **Tasa de éxito/error** de requests
- **Throughput:** Requests por segundo
- **Carga progresiva:** 10→50→100 usuarios virtuales

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

 **[Guía de Pruebas K6](performance/TESTING_GUIDE.md)**

## Documentación Adicional

- **ARCHITECTURE.md**: Guía completa de la arquitectura del sistema
- **REFACTORING_SUMMARY.md**: Resumen del proceso de refactorización
- **DATABASE_GUIDE.md**: Esquema de base de datos y consultas útiles
- **performance/TESTING_GUIDE.md**: Guía de pruebas de rendimiento con K6

## Desarrollo y Mejoras Futuras

**Visualización:**
- Gráficas históricas con Chart.js o D3.js
- Dashboard con métricas en tiempo real vía WebSockets

**Funcionalidad:**
- Sistema de alertas configurable (email/Slack/webhook)
- Exportación de datos en múltiples formatos
- Autenticación y autorización con JWT
- Rate limiting y throttling

**Infraestructura:**
- Tests unitarios y de integración
- CI/CD con GitHub Actions
- Monitoreo con Prometheus y Grafana
- Cache con Redis
- Logs centralizados con ELK stack

## Licencia

MIT License - Libre para uso personal y comercial

---
