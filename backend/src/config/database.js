const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: env.DB_POOL_SIZE,
    queueLimit: 0,
    enableKeepAlive: true,
    decimalNumbers: true
});

const ping = async () => {
    await pool.query('SELECT 1');
};

const close = () => pool.end();

module.exports = { pool, ping, close };
