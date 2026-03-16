/**
 * API Client for HCM Backend
 */
const API_URL = 'http://localhost:3000/api';

const api = {
    /**
     * GET request
     */
    async get(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * POST request
     */
    async post(endpoint, data) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return await response.json();
    },

    /**
     * DELETE request
     */
    async delete(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return await response.json();
    },

    // Endpoints específicos
    stats: {
        get: () => api.get('/stats')
    },
    
    nodes: {
        getActive: () => api.get('/nodes'),
        getAll: () => api.get('/nodes/all'),
        create: (data) => api.post('/nodes', data),
        delete: (hostId, permanent = false) => 
            api.delete(`/nodes/${hostId}${permanent ? '?permanent=true' : ''}`),
        restore: (hostId) => api.post(`/nodes/${hostId}/restore`, {})
    },
    
    metrics: {
        getLatest: () => api.get('/metrics/latest'),
        getHistory: (hostId, limit = 100) => 
            api.get(`/metrics/history/${hostId}?limit=${limit}`),
        getSummary: () => api.get('/metrics/summary'),
        insertManual: (data) => api.post('/metrics/manual', data)
    },
    
    settings: {
        getInterval: () => api.get('/settings/metrics-interval'),
        setInterval: (ms) => api.post('/settings/metrics-interval', { metrics_interval_ms: ms })
    },

    query: {
        execute: (query) => api.post('/query', { query })
    }
};
