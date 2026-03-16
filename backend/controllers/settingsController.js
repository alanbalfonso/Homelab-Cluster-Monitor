let metricsIntervalMs = parseInt(process.env.METRICS_INTERVAL || '5000', 10);

const MIN_INTERVAL_MS = 5000;
const MAX_INTERVAL_MS = 30000;

function clampInterval(value) {
    const v = parseInt(value, 10);
    if (isNaN(v)) return null;
    if (v < MIN_INTERVAL_MS) return MIN_INTERVAL_MS;
    if (v > MAX_INTERVAL_MS) return MAX_INTERVAL_MS;
    return v;
}

const getMetricsInterval = (req, res) => {
    res.json({
        success: true,
        metrics_interval_ms: metricsIntervalMs,
        min_ms: MIN_INTERVAL_MS,
        max_ms: MAX_INTERVAL_MS
    });
};

const updateMetricsInterval = (req, res) => {
    const { metrics_interval_ms } = req.body || {};
    const clamped = clampInterval(metrics_interval_ms);

    if (clamped === null) {
        return res.status(400).json({
            success: false,
            error: 'metrics_interval_ms debe ser un número entre 5000 y 30000 milisegundos'
        });
    }

    metricsIntervalMs = clamped;
    console.log(`⚙️  Intervalo de métricas actualizado a ${metricsIntervalMs} ms (global)`);

    res.json({
        success: true,
        metrics_interval_ms: metricsIntervalMs
    });
};

module.exports = {
    getMetricsInterval,
    updateMetricsInterval,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS
};
