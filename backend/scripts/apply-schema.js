/*
 * Applies database/schema.sql to the database configured in the environment.
 *
 *   npm run db:schema
 *
 * The schema is idempotent (CREATE TABLE IF NOT EXISTS), so it is safe to run again.
 * It exists so that a managed MySQL (Aiven, TiDB Cloud...) can be prepared without a
 * `mysql` client: it uses the same DB_* and DB_SSL settings as the API.
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { config } = require('../src/config/database');

const SCHEMA = path.join(__dirname, '..', '..', 'database', 'schema.sql');

async function main() {
    const sql = fs.readFileSync(SCHEMA, 'utf8');

    console.log(`Aplicando o schema em ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}${env.DB_SSL ? ' (SSL)' : ''}...`);

    // multipleStatements only on this one-off connection, never on the API's pool.
    const connection = await mysql.createConnection({ ...config, multipleStatements: true });

    try {
        await connection.query(sql);

        const [tables] = await connection.query('SHOW TABLES');
        console.log(`Pronto: ${tables.length} tabelas no banco.`);
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error(`Não foi possível aplicar o schema: ${error.message}`);
    process.exit(1);
});
