const { Pool } = require('pg');

// Configuración de PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'homelab_monitor',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error conectando a PostgreSQL:', err.stack);
    } else {
        console.log('Conectado a PostgreSQL exitosamente');
        release();
    }
});

// Manejar errores de pool
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;
