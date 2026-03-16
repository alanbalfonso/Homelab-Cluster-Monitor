const axios = require('axios');

/**
 * Cliente HTTP para comunicación con el backend
 */
class APIClient {
    constructor(backendUrl) {
        this.baseURL = backendUrl;
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Verificar salud del backend
     */
    async checkHealth() {
        try {
            const response = await this.client.get('/health');
            return response.data;
        } catch (error) {
            throw new Error(`Health check failed: ${error.message}`);
        }
    }

    /**
     * Enviar métricas al backend
     */
    async sendMetrics(metrics) {
        try {
            const response = await this.client.post('/api/metrics', metrics);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${error.response.data.error || error.message}`);
            }
            throw new Error(`Network error: ${error.message}`);
        }
    }

    /**
     * Obtener intervalo global de generación de métricas desde el backend
     */
    async getMetricsInterval() {
        try {
            const response = await this.client.get('/api/settings/metrics-interval');
            return response.data.metrics_interval_ms;
        } catch (error) {
            throw new Error(`No se pudo obtener metrics_interval_ms: ${error.message}`);
        }
    }

    /**
     * Esperar a que el backend esté disponible
     */
    async waitForBackend(maxAttempts = 20, delayMs = 3000) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                await this.checkHealth();
                return true;
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error(`Backend no disponible después de ${maxAttempts} intentos`);
                }
                console.log(`⏳ Esperando backend... (intento ${attempts}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        return false;
    }
}

module.exports = APIClient;
