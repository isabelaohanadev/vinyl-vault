const { pool } = require('../config/database');
const notificationService = require('../services/notificationService');
const { badRequest, notFound } = require('../utils/httpError');

const BASE_MESSAGE_SELECT = `
    SELECT m.id, m.remetente_id, m.destinatario_id, m.texto, m.vinil_id, m.lida, m.criado_em,
           v.nome AS vinil_nome, v.foto AS vinil_foto, v.artista AS vinil_artista, v.spotify AS vinil_spotify
    FROM mensagens m
    LEFT JOIN vinis v ON m.vinil_id = v.id`;

const serializeMessage = (row) => ({ ...row, lida: Boolean(row.lida) });

// Only the two participants can read a conversation: the query is always scoped
// to the authenticated user.
const getMensagens = async (req, res) => {
    const { amigo_id } = req.valid.params;
    const { limite, antes } = req.valid.query;
    const meuId = req.user.id;

    const conditions = ['((m.remetente_id = ? AND m.destinatario_id = ?) OR (m.remetente_id = ? AND m.destinatario_id = ?))'];
    const params = [meuId, amigo_id, amigo_id, meuId];

    if (antes) {
        conditions.push('m.id < ?');
        params.push(antes);
    }

    // limite is an integer validated by zod, safe to inline. Newest N, then reversed to chronological order.
    const [rows] = await pool.execute(`${BASE_MESSAGE_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY m.id DESC LIMIT ${limite}`, params);

    res.status(200).json(rows.reverse().map(serializeMessage));
};

const enviarMensagem = async (req, res) => {
    const { destinatario_id, texto, vinil_id } = req.valid.body;

    if (destinatario_id === req.user.id) {
        throw badRequest('Você não pode enviar mensagem para si mesmo.');
    }

    const [recipients] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [destinatario_id]);

    if (recipients.length === 0) {
        throw notFound('Destinatário não encontrado.');
    }

    if (vinil_id) {
        const [vinyls] = await pool.execute('SELECT id FROM vinis WHERE id = ?', [vinil_id]);

        if (vinyls.length === 0) {
            throw badRequest('O disco compartilhado não existe.');
        }
    }

    const [result] = await pool.execute('INSERT INTO mensagens (remetente_id, destinatario_id, texto, vinil_id) VALUES (?, ?, ?, ?)', [
        req.user.id,
        destinatario_id,
        texto ?? null,
        vinil_id ?? null
    ]);

    await notificationService.criarNotificacao(destinatario_id, req.user.id, 'mensagem');

    const [rows] = await pool.execute(`${BASE_MESSAGE_SELECT} WHERE m.id = ?`, [result.insertId]);

    res.status(201).json({ message: 'Mensagem enviada com sucesso!', mensagem: serializeMessage(rows[0]) });
};

// Ordered by the newest message id rather than its timestamp: TIMESTAMP has
// one-second resolution, so ties would make the order unstable.
const getConversas = async (req, res) => {
    const meuId = req.user.id;

    const [rows] = await pool.execute(
        `SELECT u.id, u.nome_completo, u.username, u.foto_perfil, u.tocando_agora,
                MAX(m.criado_em) AS last_msg,
                CAST(SUM(m.destinatario_id = ? AND m.lida = 0) AS UNSIGNED) AS nao_lidas,
                (SELECT m2.texto FROM mensagens m2
                  WHERE (m2.remetente_id = ? AND m2.destinatario_id = u.id) OR (m2.remetente_id = u.id AND m2.destinatario_id = ?)
                  ORDER BY m2.id DESC LIMIT 1) AS ultima_mensagem
         FROM mensagens m
         JOIN usuarios u ON u.id = IF(m.remetente_id = ?, m.destinatario_id, m.remetente_id)
         WHERE m.remetente_id = ? OR m.destinatario_id = ?
         GROUP BY u.id
         ORDER BY MAX(m.id) DESC`,
        [meuId, meuId, meuId, meuId, meuId, meuId]
    );

    res.status(200).json(rows.map((row) => ({ ...row, nao_lidas: Number(row.nao_lidas) })));
};

const getNaoLidas = async (req, res) => {
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM mensagens WHERE destinatario_id = ? AND lida = 0', [req.user.id]);

    res.status(200).json({ total: Number(total) });
};

const marcarMensagensComoLidas = async (req, res) => {
    await pool.execute('UPDATE mensagens SET lida = 1 WHERE destinatario_id = ? AND remetente_id = ?', [req.user.id, req.valid.body.amigo_id]);

    res.status(200).json({ message: 'Mensagens marcadas como lidas.' });
};

module.exports = {
    getMensagens,
    enviarMensagem,
    getConversas,
    getNaoLidas,
    marcarMensagensComoLidas
};
