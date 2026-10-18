const { pool } = require('../config/database');
const notificationService = require('../services/notificationService');
const { badRequest, notFound } = require('../utils/httpError');
const { serializePublicUser } = require('../utils/serializers');
const { likeContains } = require('../utils/sql');

const assertUserExists = async (id) => {
    const [rows] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [id]);

    if (rows.length === 0) {
        throw notFound('Usuário não encontrado.');
    }
};

const getComunidade = async (req, res) => {
    const { busca, limite, offset } = req.valid.query;

    // Placeholder order: the is_seguindo subquery comes first, then the WHERE conditions.
    const conditions = ['u.id <> ?'];
    const params = [req.user.id, req.user.id];

    if (busca) {
        conditions.push('(u.nome_completo LIKE ? OR u.username LIKE ?)');
        params.push(likeContains(busca), likeContains(busca));
    }

    // limite/offset are integers validated by zod, safe to inline.
    const [rows] = await pool.execute(
        `SELECT u.id, u.nome_completo, u.username, u.foto_perfil, u.bio, u.tocando_agora,
                EXISTS(SELECT 1 FROM seguidores s WHERE s.seguidor_id = ? AND s.seguido_id = u.id) AS is_seguindo
         FROM usuarios u
         WHERE ${conditions.join(' AND ')}
         ORDER BY u.nome_completo ASC, u.id ASC
         LIMIT ${limite} OFFSET ${offset}`,
        params
    );

    res.status(200).json(rows.map((row) => ({ ...serializePublicUser(row), is_seguindo: Boolean(row.is_seguindo) })));
};

const seguirUsuario = async (req, res) => {
    const alvoId = req.valid.params.id;

    if (alvoId === req.user.id) {
        throw badRequest('Você não pode seguir a si mesmo.');
    }

    await assertUserExists(alvoId);

    const [result] = await pool.execute('INSERT IGNORE INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [req.user.id, alvoId]);

    // Idempotent: following twice is not an error, but it only notifies once.
    if (result.affectedRows === 0) {
        return res.status(200).json({ message: 'Você já segue este usuário.' });
    }

    await notificationService.criarNotificacao(alvoId, req.user.id, 'seguir');

    return res.status(201).json({ message: 'Seguindo!' });
};

const deixarDeSeguirUsuario = async (req, res) => {
    await pool.execute('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.user.id, req.valid.params.id]);

    res.status(200).json({ message: 'Deixou de seguir.' });
};

const getStatsPerfil = async (req, res) => {
    const { id } = req.valid.params;

    const [rows] = await pool.execute(
        `SELECT
            (SELECT COUNT(*) FROM seguidores WHERE seguido_id = u.id) AS seguidores,
            (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = u.id) AS seguindo,
            (SELECT COUNT(*) FROM vinis WHERE usuario_id = u.id AND adquirido = 1) AS total_vinis,
            (SELECT COUNT(*) FROM vinis WHERE usuario_id = u.id AND adquirido = 0) AS total_desejos,
            (SELECT COUNT(*) FROM vinis WHERE usuario_id = u.id AND negociavel = 1) AS total_trocas,
            (SELECT COUNT(*) FROM posts WHERE usuario_id = u.id) AS total_posts,
            EXISTS(SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = u.id) AS eu_sigo
         FROM usuarios u
         WHERE u.id = ?`,
        [req.user.id, id]
    );

    if (rows.length === 0) {
        throw notFound('Usuário não encontrado.');
    }

    const stats = rows[0];

    res.status(200).json({
        seguidores: Number(stats.seguidores),
        seguindo: Number(stats.seguindo),
        total_vinis: Number(stats.total_vinis),
        total_desejos: Number(stats.total_desejos),
        total_trocas: Number(stats.total_trocas),
        total_posts: Number(stats.total_posts),
        eu_sigo: Boolean(stats.eu_sigo)
    });
};

const listRelations = (ownColumn, otherColumn) => async (req, res) => {
    const { id } = req.valid.params;
    const { limite, offset } = req.valid.query;

    await assertUserExists(id);

    const [rows] = await pool.execute(
        `SELECT u.id, u.nome_completo, u.username, u.foto_perfil, u.bio, u.tocando_agora
         FROM seguidores s
         JOIN usuarios u ON s.${otherColumn} = u.id
         WHERE s.${ownColumn} = ?
         ORDER BY s.criado_em DESC, s.id DESC
         LIMIT ${limite} OFFSET ${offset}`,
        [id]
    );

    res.status(200).json(rows.map(serializePublicUser));
};

const getSeguidores = listRelations('seguido_id', 'seguidor_id');
const getSeguindo = listRelations('seguidor_id', 'seguido_id');

module.exports = {
    getComunidade,
    seguirUsuario,
    deixarDeSeguirUsuario,
    getStatsPerfil,
    getSeguidores,
    getSeguindo
};
