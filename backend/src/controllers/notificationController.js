const { pool } = require('../config/database');
const { notFound } = require('../utils/httpError');

const getNotificacoes = async (req, res) => {
    const { limite } = req.valid.query;

    // limite is an integer validated by zod, safe to inline.
    const [rows] = await pool.execute(
        `SELECT n.id, n.usuario_id, n.ator_id, n.tipo, n.post_id, n.lida, n.criado_em,
                u.username AS ator_username, u.nome_completo AS ator_nome_completo, u.foto_perfil AS ator_foto_perfil
         FROM notificacoes n
         JOIN usuarios u ON n.ator_id = u.id
         WHERE n.usuario_id = ?
         ORDER BY n.criado_em DESC, n.id DESC
         LIMIT ${limite}`,
        [req.user.id]
    );

    res.status(200).json(
        rows.map((row) => ({
            id: row.id,
            tipo: row.tipo,
            post_id: row.post_id,
            lida: Boolean(row.lida),
            criado_em: row.criado_em,
            ator: {
                id: row.ator_id,
                username: row.ator_username,
                nome_completo: row.ator_nome_completo,
                foto_perfil: row.ator_foto_perfil ?? null
            }
        }))
    );
};

const getNaoLidas = async (req, res) => {
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM notificacoes WHERE usuario_id = ? AND lida = 0', [req.user.id]);

    res.status(200).json({ total: Number(total) });
};

// Scoped to the authenticated user, so nobody can mark somebody else's notifications.
const marcarComoLida = async (req, res) => {
    const [result] = await pool.execute('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?', [req.valid.params.id, req.user.id]);

    if (result.affectedRows === 0) {
        throw notFound('Notificação não encontrada.');
    }

    res.status(200).json({ message: 'Notificação marcada como lida.' });
};

const marcarTodasComoLidas = async (req, res) => {
    await pool.execute('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0', [req.user.id]);

    res.status(200).json({ message: 'Notificações marcadas como lidas.' });
};

module.exports = {
    getNotificacoes,
    getNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas
};
