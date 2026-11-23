# Homelab Cluster Monitor (HCM)

Sistema integral de monitoreo para clusters de mini PCs y servidores domésticos. Integra visualización interactiva en tiempo real, API REST modular, almacenamiento relacional en PostgreSQL y un motor de simulación multi-nodo concurrente.

---

## Características

- **Arquitectura Unificada de Alto Rendimiento:** Una única aplicación Node.js/Express (`hcm-app`) que sirve el frontend estático, expone la API REST y ejecuta el motor de telemetría.
- **Simulador Multi-Nodo Concurrente:** Generador en segundo plano que reproduce métricas de hardware de 5 mini PCs con perfiles y patrones de carga diferenciados (alta carga, variable, IoT, ráfagas).
- **Control Dinámico de Frecuencia:** Ajuste en caliente del intervalo de muestreo desde la interfaz web o mediante la API (`/api/settings/metrics-interval`), sin necesidad de reiniciar servicios.
- **Base de Datos PostgreSQL Optimizada:** Esquema relacional con índices por nodo y tiempo, claves foráneas en cascada y vistas materializadas/optimizadas (`latest_metrics` y `metrics_24h_avg`).
- **Dashboard Web en Tiempo Real:** Panel interactivo con refresco configurable, indicadores visuales de umbrales (CPU, RAM, temperatura, disco, red, uptime) y vista modal detallada por nodo.
- **Gestor Web de Base de Datos:** Interfaz dedicada (`/database`) para inspeccionar métricas crudas, ejecutar consultas históricas y administrar nodos (alta, baja lógica con soft delete y restauración).
- **Despliegue Sencillo con Docker Compose:** Entorno completo orquestado en 2 contenedores ligeros con verificación de salud (*healthcheck*) y recarga en caliente (*bind mounts*).
- **Preparado para Producción y Kubernetes:** Manifiestos base en `k8s/`, Helm chart parametrizado en `helm/hcm` y flujos de GitHub Actions para CI/CD.

---

## Arquitectura del Sistema

El sistema opera bajo un modelo de 2 contenedores interconectados mediante una red puente dedicada (`hcm-network`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                      hcm-app (Node.js / Express)                       │
│                                                   Puertos: 3000 / 8080 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Frontend Web Estático                        │  │
│  │  • index.html (Dashboard en tiempo real)                         │  │
│  │  • database.html (Gestor de BD y Nodos)                          │  │
│  │  • styles.css & app.js (Renderizado reactivo y clientes HTTP)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                          API REST                                │  │
│  │  • /api/nodes     • /api/metrics     • /api/stats                │  │
│  │  • /api/settings  • /health          • /api                      │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│  ┌─────────────────────────────────▼────────────────────────────────┐  │
│  │               Motor de Simulación Integrado (Background)         │  │
│  │  • Generación concurrente para mini-pc-01 .. mini-pc-05          │  │
│  │  • Ajuste en caliente de frecuencia de muestreo                  │  │
│  │  • Control vía flag: ENABLE_SIMULATOR=true|false                 │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ Pool pg (Puerto 5432)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        hcm-postgres (PostgreSQL 15)                    │
│                                                            Puerto 5432 │
│  • cluster_nodes   : Catálogo de nodos físicos/simulados               │
│  • metrics         : Serie temporal de telemetría de hardware          │
│  • latest_metrics  : Vista con el último registro por nodo activo      │
│  • metrics_24h_avg : Vista de promedios agregados de 24 horas          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Inicio Rápido

### Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose instalados y en ejecución.

### 1. Clonar y configurar variables de entorno

```bash
cp .env.example .env
```

### 2. Construir y levantar el cluster

```bash
docker compose up --build -d
```

### 3. Acceder al sistema

| Servicio | URL | Descripción |
|---|---|---|
| **Dashboard Principal** | [http://localhost:3000](http://localhost:3000) o [http://localhost:8080](http://localhost:8080) | Panel de telemetría en tiempo real |
| **Gestor de Base de Datos** | [http://localhost:3000/database](http://localhost:3000/database) | Administración CRUD de nodos y consultas |
| **API REST Metadata** | [http://localhost:3000/api](http://localhost:3000/api) | Resumen de endpoints disponibles |
| **Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | Estado del servidor y conectividad a BD |

---

## Perfiles de Mini PCs Simulados

El simulador emula 5 perfiles con comportamientos de hardware realistas:

| Host ID | Nombre | Especificaciones | Patrón de Carga | Ubicación |
|---|---|---|---|---|
| `mini-pc-01` | HomeServer-Alpha | 8 cores, 16 GB RAM, 512 GB Disco | Alta carga sostenida | Rack Principal - Nivel 1 |
| `mini-pc-02` | HomeServer-Beta | 8 cores, 16 GB RAM, 512 GB Disco | Carga media oscilante | Rack Principal - Nivel 2 |
| `mini-pc-03` | HomeServer-Gamma | 6 cores, 12 GB RAM, 256 GB Disco | Baja carga constante | Escritorio - Zona A |
| `mini-pc-04` | HomeServer-Delta | 4 cores, 8 GB RAM, 256 GB Disco | Picos y ráfagas periódicas | Escritorio - Zona B |
| `mini-pc-05` | HomeServer-Epsilon | 4 cores, 8 GB RAM, 128 GB Disco | Carga muy reducida (IoT Hub) | Estantería - IoT Hub |

> **Modo Agente Real:** Si se conecta a mini-PCs reales mediante agentes que envíen métricas a `POST /api/metrics`, el simulador puede desactivarse configurando `ENABLE_SIMULATOR=false` en el archivo `.env`.

---

## Endpoints de la API REST

### Nodos del Cluster (`/api/nodes`)

- `GET /api/nodes` - Lista de nodos activos (excluye eliminados lógicamente).
- `GET /api/nodes/all` - Lista de todos los nodos, incluyendo eliminados.
- `POST /api/nodes` - Registra un nuevo nodo o restaura uno previo con el mismo `host_id`.
- `DELETE /api/nodes/:hostId` - Eliminación lógica (*soft delete*) de un nodo.
- `DELETE /api/nodes/:hostId?permanent=true` - Eliminación física permanente de la base de datos.
- `POST /api/nodes/:hostId/restore` - Restaura un nodo previamente eliminado.

### Métricas de Telemetría (`/api/metrics`)

- `GET /api/metrics/latest` - Última medición registrada de cada nodo activo.
- `GET /api/metrics/history/:host_id?limit=50` - Historial cronológico de un nodo específico.
- `GET /api/metrics/summary` - Resumen estadístico de las últimas 24 horas (promedios de CPU, RAM, temperatura).
- `POST /api/metrics` - Endpoint para ingesta de métricas desde agentes externos o simuladores.
- `POST /api/metrics/manual` - Registro manual de telemetría desde la interfaz web.

### Configuración del Sistema (`/api/settings`)

- `GET /api/settings/metrics-interval` - Obtiene el intervalo de muestreo actual y los límites permitidos.
- `POST /api/settings/metrics-interval` - Actualiza dinámicamente la frecuencia del simulador (entre 2000 ms y 60000 ms).

### Estadísticas y Salud (`/api/stats` y `/health`)

- `GET /api/stats` - Conteo de nodos activos/eliminados, total de métricas registradas y promedios de la última hora.
- `GET /health` - Verificación de disponibilidad de la API y de la conexión con PostgreSQL.

---

## Gestión de Base de Datos (PostgreSQL)

### Tablas Principales

1. **`cluster_nodes`**: Catálogo de nodos registrados con `host_id`, `hostname`, `location`, capacidad de hardware (`cpu_cores`, `ram_total_gb`, `disk_total_gb`), sistema operativo y marcas de tiempo (`created_at`, `deleted_at`).
2. **`metrics`**: Registro temporal con `cpu_usage`, `ram_used_gb`, `ram_usage_percent`, `temperature`, `disk_used_gb`, `disk_usage_percent`, `network_in_mbps`, `network_out_mbps`, `uptime_hours` y `timestamp`. Incluye índices optimizados en `(host_id, timestamp DESC)` y `(timestamp DESC)`.

### Vistas Optimizadas

1. **`latest_metrics`**: Utiliza `DISTINCT ON (host_id)` para devolver de forma inmediata el estado más reciente de cada nodo activo con datos desnormalizados.
2. **`metrics_24h_avg`**: Calcula promedios agregados (`avg_cpu`, `avg_ram`, `avg_temp`, `min_temp`, `max_temp`) de las últimas 24 horas por nodo.

### Acceso Directo por Consola (CLI)

```bash
docker exec -it hcm-postgres psql -U admin -d homelab_monitor
```

Consultas útiles:

```sql
-- Último estado de cada nodo
SELECT host_id, hostname, cpu_usage, ram_usage_percent, temperature FROM latest_metrics;

-- Promedios de las últimas 24 horas
SELECT * FROM metrics_24h_avg;

-- Total de muestras almacenadas
SELECT COUNT(*) FROM metrics;
```

---

## Operación y Comandos Habituales

```bash
# Ver logs unificados de la aplicación en tiempo real
docker compose logs -f hcm-app

# Ver logs de la base de datos
docker compose logs -f postgres

# Detener los servicios preservando los datos
docker compose down

# Detener los servicios y reiniciar la base de datos desde cero
docker compose down -v

# Reconstruir la imagen de la aplicación tras cambios en código
docker compose up --build -d hcm-app

# Acceder a la terminal del contenedor de la aplicación
docker exec -it hcm-app sh
```

---

## Estructura del Proyecto

```
HCM/
├── docker-compose.yml              # Definición de servicios (hcm-app + postgres)
├── Dockerfile                      # Imagen unificada de la aplicación (Node 18 Alpine)
├── .env.example                    # Plantilla de variables de entorno
├── README.md                       # Documentación principal
│
├── backend/                        # Servidor Express y motor de telemetría
│   ├── config/
│   │   └── database.js             # Pool de conexiones a PostgreSQL
│   ├── controllers/
│   │   ├── nodesController.js      # CRUD de nodos
│   │   ├── metricsController.js    # Ingesta y consultas de métricas
│   │   ├── settingsController.js   # Gestión de intervalos y configuración
│   │   └── statsController.js      # Métricas globales y healthcheck
│   ├── routes/
│   │   ├── nodes.js                # Rutas /api/nodes
│   │   ├── metrics.js              # Rutas /api/metrics
│   │   ├── settings.js             # Rutas /api/settings
│   │   └── stats.js                # Rutas /api/stats
│   ├── simulator/                  # Motor de simulación integrado
│   │   ├── profiles.js             # Definición de hardware de los mini-PCs
│   │   ├── metricsGenerator.js     # Algoritmo generador de métricas
│   │   └── simulatorService.js     # Servicio de ejecución y temporizado
│   ├── index.js                    # Punto de entrada de la aplicación
│   ├── init.sql                    # Script de inicialización de PostgreSQL
│   └── package.json
│
├── frontend/                       # Interfaz de usuario (Single Page Application)
│   ├── index.html                  # Dashboard principal
│   ├── database.html               # Gestor web de base de datos
│   ├── styles.css                  # Estilos visuales del sistema
│   ├── app.js                      # Lógica del dashboard
│   └── js/
│       ├── api.js                  # Cliente HTTP para la API REST
│       ├── database.js             # Lógica de la pantalla de base de datos
│       └── utils.js                # Funciones auxiliares y formateadores
│
├── k8s/                            # Manifiestos para Kubernetes (EKS / Minikube)
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── postgres-*.yaml
│
├── helm/                           # Chart de despliegue con Helm
│   └── hcm/
│
└── .github/workflows/              # Flujos automatizados de CI/CD
    ├── ci.yml                      # Linter y validación de Docker build
    └── cd.yml                      # Publicación en Docker Hub y despliegue EKS
```

---

## Variables de Entorno

Configurables en el archivo `.env`:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP principal de la aplicación |
| `NODE_ENV` | `development` | Entorno de ejecución (`development` / `production`) |
| `DB_HOST` | `postgres` | Host o nombre del servicio de PostgreSQL |
| `DB_PORT` | `5432` | Puerto del motor de base de datos |
| `DB_NAME` | `homelab_monitor` | Nombre de la base de datos |
| `DB_USER` | `admin` | Usuario administrador de PostgreSQL |
| `DB_PASSWORD` | `admin123` | Contraseña de PostgreSQL |
| `ENABLE_SIMULATOR` | `true` | Habilita o deshabilita el motor interno de simulación |
| `METRICS_INTERVAL` | `5000` | Intervalo base de muestreo del simulador (en milisegundos) |
| `FRONTEND_PATH` | `/app/frontend` | Ruta en disco desde donde se sirven los archivos web |

---

## Despliegue en Kubernetes y Helm

### Manifiestos Nativos (k8s)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

### Despliegue con Helm

```bash
# Entorno de desarrollo
helm upgrade --install hcm helm/hcm -f helm/hcm/values-dev.yaml -n homelab-cluster-monitor --create-namespace

# Entorno de producción
helm upgrade --install hcm helm/hcm -f helm/hcm/values-prod.yaml -n homelab-cluster-monitor --create-namespace
```

---

## Licencia

MIT License - Libre para uso personal, educativo y comercial.
