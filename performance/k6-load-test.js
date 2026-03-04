import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time');

// Configuración de las pruebas
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Rampa: 0 a 10 usuarios en 30s
        { duration: '1m', target: 10 },   // Mantener 10 usuarios por 1 minuto
        { duration: '30s', target: 20 },  // Aumentar a 20 usuarios en 30s
        { duration: '1m', target: 20 },   // Mantener 20 usuarios por 1 minuto
        { duration: '30s', target: 50 },  // Pico: 50 usuarios en 30s
        { duration: '1m', target: 50 },   // Mantener pico por 1 minuto
        { duration: '30s', target: 0 },   // Rampa hacia abajo
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% de requests bajo 500ms
        http_req_failed: ['rate<0.05'],   // Menos de 5% de errores
        errors: ['rate<0.1'],             // Menos de 10% de errores
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // Test 1: Obtener estadísticas
    let res1 = http.get(`${BASE_URL}/api/stats`);
    check(res1, {
        'stats status 200': (r) => r.status === 200,
        'stats tiene datos': (r) => JSON.parse(r.body).success === true,
        'stats responde rápido': (r) => r.timings.duration < 500,
    });
    errorRate.add(res1.status !== 200);
    responseTimeTrend.add(res1.timings.duration);

    sleep(1);

    // Test 2: Obtener nodos
    let res2 = http.get(`${BASE_URL}/api/nodes`);
    check(res2, {
        'nodes status 200': (r) => r.status === 200,
        'nodes tiene datos': (r) => JSON.parse(r.body).success === true,
    });
    errorRate.add(res2.status !== 200);
    responseTimeTrend.add(res2.timings.duration);

    sleep(1);

    // Test 3: Últimas métricas
    let res3 = http.get(`${BASE_URL}/api/metrics/latest`);
    check(res3, {
        'latest metrics status 200': (r) => r.status === 200,
        'latest metrics tiene datos': (r) => JSON.parse(r.body).count > 0,
    });
    errorRate.add(res3.status !== 200);
    responseTimeTrend.add(res3.timings.duration);

    sleep(1);

    // Test 4: Resumen de 24h
    let res4 = http.get(`${BASE_URL}/api/metrics/summary`);
    check(res4, {
        'summary status 200': (r) => r.status === 200,
        'summary tiene datos': (r) => JSON.parse(r.body).success === true,
    });
    errorRate.add(res4.status !== 200);
    responseTimeTrend.add(res4.timings.duration);

    sleep(2);
}

// Función de resumen al finalizar
export function handleSummary(data) {
    return {
        'performance/k6-results.json': JSON.stringify(data, null, 2),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
}

function textSummary(data, options) {
    return `
═══════════════════════════════════════════════════════════
    REPORTE DE PRUEBAS DE CARGA - HCM
═══════════════════════════════════════════════════════════

    RESUMEN GENERAL
    Usuarios virtuales máx: ${data.metrics.vus_max.values.max}
    Requests totales: ${data.metrics.http_reqs.values.count}
    Duración total: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s

    TIEMPOS DE RESPUESTA
    Promedio: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
    Mínimo: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
    Máximo: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
    P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
    P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

    TASA DE ÉXITO
    Requests exitosos: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
    Requests fallidos: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
    Tasa de errores: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

    THROUGHPUT
    Requests/seg: ${data.metrics.http_reqs.values.rate.toFixed(2)}
    Data recibida: ${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB
    Data enviada: ${(data.metrics.data_sent.values.count / 1024).toFixed(2)} KB

═══════════════════════════════════════════════════════════
`;
}
