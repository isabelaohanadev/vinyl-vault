const mysql = require('mysql2/promise');
const env = require('./env');

// Some dashboards flatten a multi-line PEM into one line with literal "\n" sequences.
const sslOptions = () => ({
    minVersion: 'TLSv1.2',
    ca: env.DB_SSL_CA ? env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined
});

const config = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    ssl: env.DB_SSL ? sslOptions() : undefined,
    decimalNumbers: true,
    // Return DATE columns as 'YYYY-MM-DD' strings instead of timezone-shifted Dates.
    dateStrings: ['DATE'],
    // TIMESTAMPs are read and written as UTC (see the session time_zone below).
    timezone: 'Z'
};

const pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: env.DB_POOL_SIZE,
    queueLimit: 0,
    enableKeepAlive: true
});

// Pin every session to UTC. Without this, a MySQL server in another zone than the
// UTC the driver assumes would shift every timestamp (posts shown "in 3 hours").
pool.pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
});

const ping = async () => {
    await pool.query('SELECT 1');
};

const close = () => pool.end();

module.exports = { pool, config, ping, close };
