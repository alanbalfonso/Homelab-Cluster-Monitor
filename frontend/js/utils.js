/**
 * Utility functions for HCM Frontend
 */

/**
 * Format numbers safely
 */
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    return isNaN(num) ? '-' : num.toFixed(decimals);
}

/**
 * Show success message
 */
function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    el.innerHTML = `<div style="color: #22c55e; background: #166534; padding: 10px; border-radius: 4px;">✓ ${message}</div>`;
}

/**
 * Show error message
 */
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.innerHTML = `<div style="color: #ef4444; background: #7f1d1d; padding: 10px; border-radius: 4px;">✗ ${message}</div>`;
}

/**
 * Show loading message
 */
function showLoading(elementId, message = 'Cargando...') {
    const el = document.getElementById(elementId);
    el.innerHTML = `<div class="loading">${message}</div>`;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
    try {
        return new Date(timestamp).toLocaleString();
    } catch {
        return timestamp;
    }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
