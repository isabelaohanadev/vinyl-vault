const { HttpError } = require('../utils/httpError');
const logger = require('../utils/logger');

const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
};

// Express 5 forwards rejected promises from async handlers here, so controllers
// do not need try/catch blocks.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (err instanceof HttpError) {
        const body = { error: err.message };
        if (err.details) {
            body.details = err.details;
        }
        return res.status(err.status).json(body);
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Corpo da requisição grande demais.' });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido.' });
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Este registro já existe.' });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'Referência a um registro que não existe.' });
    }

    logger.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
};

module.exports = { notFoundHandler, errorHandler };
