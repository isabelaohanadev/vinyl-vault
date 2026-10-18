let env;

try {
    env = require('./config/env');
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

const app = require('./app');
const database = require('./config/database');
const logger = require('./utils/logger');

const SHUTDOWN_TIMEOUT_MS = 10000;

const start = async () => {
    try {
        await database.ping();
        logger.info('✅ Conectado ao MySQL');
    } catch (error) {
        logger.error(`❌ Não foi possível conectar ao MySQL em ${env.DB_HOST}:${env.DB_PORT}: ${error.message}`);
        process.exit(1);
    }

    const server = app.listen(env.PORT, () => {
        logger.info(`🎵 Vinyl Vault API rodando na porta ${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = (signal) => {
        logger.info(`${signal} recebido, encerrando...`);

        server.close(async () => {
            await database.close();
            process.exit(0);
        });

        setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
