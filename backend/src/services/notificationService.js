const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Notifications are a side effect: a failure here is logged and never breaks
// the request that triggered it.
const criarNotificacao = async (usuarioId, atorId, tipo, postId = null) => {
    if (!usuarioId || Number(usuarioId) === Number(atorId)) {
        return;
    }

    try {
        await pool.execute('INSERT INTO notificacoes (usuario_id, ator_id, tipo, post_id) VALUES (?, ?, ?, ?)', [usuarioId, atorId, tipo, postId]);
    } catch (error) {
        logger.error('Falha ao criar notificação:', error.message);
    }
};

// Tells every collector who has this record on their wishlist that someone just
// put it up for trade.
const verificarMatchWishlist = async (donoId, nomeDisco) => {
    try {
        const [rows] = await pool.execute(
            'SELECT DISTINCT usuario_id FROM vinis WHERE adquirido = 0 AND TRIM(LOWER(nome)) = TRIM(LOWER(?)) AND usuario_id <> ?',
            [nomeDisco, donoId]
        );

        await Promise.all(rows.map((row) => criarNotificacao(row.usuario_id, donoId, 'match')));
    } catch (error) {
        logger.error('Falha ao verificar match de wishlist:', error.message);
    }
};

module.exports = {
    criarNotificacao,
    verificarMatchWishlist
};
