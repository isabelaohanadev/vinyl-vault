const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');

const connect = () =>
    mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

// Applies the real schema (idempotent) so tests also validate database/schema.sql.
const applySchema = async () => {
    const connection = await connect();
    try {
        await connection.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    } finally {
        await connection.end();
    }
};

const truncateAll = async () => {
    const connection = await connect();
    try {
        const [tables] = await connection.query('SHOW TABLES');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const row of tables) {
            await connection.query(`TRUNCATE TABLE \`${Object.values(row)[0]}\``);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
        await connection.end();
    }
};

module.exports = { applySchema, truncateAll };
