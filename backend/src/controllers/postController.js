const { pool } = require('../config/database');
const notificationService = require('../services/notificationService');
const { badRequest, forbidden, notFound } = require('../utils/httpError');
const { serializePost, serializePublicUser } = require('../utils/serializers');

// Shared SELECT for every post listing. The first placeholder is the viewer id
// (for user_liked); callers append their own WHERE / ORDER / LIMIT.
const POST_SELECT = `
    SELECT p.id, p.usuario_id, p.foto, p.legenda, p.criado_em,
           u.username AS autor_username, u.nome_completo AS autor_nome_completo, u.foto_perfil AS autor_foto_perfil,
           (SELECT COUNT(*) FROM curtidas c WHERE c.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM comentarios m WHERE m.post_id = p.id) AS comments_count,
           EXISTS(SELECT 1 FROM curtidas c WHERE c.post_id = p.id AND c.usuario_id = ?) AS user_liked
    FROM posts p
    JOIN usuarios u ON p.usuario_id = u.id`;

const findPost = async (id, viewerId) => {
    const [rows] = await pool.execute(`${POST_SELECT} WHERE p.id = ?`, [viewerId, id]);

    if (rows.length === 0) {
        throw notFound('Publicação não encontrada.');
    }

    return rows[0];
};

const findOwnedPost = async (id, userId) => {
    const post = await findPost(id, userId);

    if (post.usuario_id !== userId) {
        throw forbidden('Esta publicação pertence a outro colecionador.');
    }

    return post;
};

const getTimeline = async (req, res) => {
    const { hashtag, limite, offset } = req.valid.query;

    const params = [req.user.id];
    let where = '';

    if (hashtag) {
        // The hashtag is validated to letters/digits/underscore, so it is safe inside a
        // regex. It matches whole tags only: #rock must not match #rockabilly.
        where = 'WHERE p.legenda REGEXP ?';
        params.push(`#${hashtag}(?![\\p{L}\\p{N}_])`);
    }

    // limite/offset are integers validated by zod, safe to inline.
    const [rows] = await pool.execute(`${POST_SELECT} ${where} ORDER BY p.criado_em DESC, p.id DESC LIMIT ${limite} OFFSET ${offset}`, params);

    res.status(200).json(rows.map(serializePost));
};

const getUserPosts = async (req, res) => {
    const { id } = req.valid.params;
    const { limite, offset } = req.valid.query;

    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [id]);

    if (users.length === 0) {
        throw notFound('Usuário não encontrado.');
    }

    const [rows] = await pool.execute(
        `${POST_SELECT} WHERE p.usuario_id = ? ORDER BY p.criado_em DESC, p.id DESC LIMIT ${limite} OFFSET ${offset}`,
        [req.user.id, id]
    );

    res.status(200).json(rows.map(serializePost));
};

const getPostById = async (req, res) => {
    res.status(200).json(serializePost(await findPost(req.valid.params.id, req.user.id)));
};

const createPost = async (req, res) => {
    const { foto, legenda } = req.valid.body;

    const [result] = await pool.execute('INSERT INTO posts (usuario_id, foto, legenda) VALUES (?, ?, ?)', [req.user.id, foto ?? null, legenda ?? null]);

    res.status(201).json({ message: 'Post publicado!', post: serializePost(await findPost(result.insertId, req.user.id)) });
};

const updatePost = async (req, res) => {
    const { id } = req.valid.params;
    const { legenda } = req.valid.body;

    const post = await findOwnedPost(id, req.user.id);

    if (!post.foto && !legenda) {
        throw badRequest('Uma publicação sem foto precisa ter legenda.');
    }

    await pool.execute('UPDATE posts SET legenda = ? WHERE id = ?', [legenda || null, id]);

    res.status(200).json({ message: 'Post atualizado!', post: serializePost(await findPost(id, req.user.id)) });
};

const deletePost = async (req, res) => {
    await findOwnedPost(req.valid.params.id, req.user.id);

    await pool.execute('DELETE FROM posts WHERE id = ?', [req.valid.params.id]);

    res.status(200).json({ message: 'Post removido!' });
};

const toggleLike = async (req, res) => {
    const { id } = req.valid.params;

    // The post owner (who gets notified) is read from the database, never from the client.
    const post = await findPost(id, req.user.id);

    const [inserted] = await pool.execute('INSERT IGNORE INTO curtidas (usuario_id, post_id) VALUES (?, ?)', [req.user.id, id]);

    let acao = 'adicionada';

    if (inserted.affectedRows === 0) {
        await pool.execute('DELETE FROM curtidas WHERE usuario_id = ? AND post_id = ?', [req.user.id, id]);
        acao = 'removida';
    } else {
        await notificationService.criarNotificacao(post.usuario_id, req.user.id, 'curtida', id);
    }

    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM curtidas WHERE post_id = ?', [id]);

    res.status(200).json({ acao, user_liked: acao === 'adicionada', likes_count: Number(total) });
};

const getPostLikes = async (req, res) => {
    const { id } = req.valid.params;

    await findPost(id, req.user.id);

    const [rows] = await pool.execute(
        `SELECT u.id, u.nome_completo, u.username, u.foto_perfil
         FROM curtidas c
         JOIN usuarios u ON c.usuario_id = u.id
         WHERE c.post_id = ?
         ORDER BY c.criado_em DESC, c.id DESC`,
        [id]
    );

    res.status(200).json(rows.map(serializePublicUser));
};

const addComment = async (req, res) => {
    const { id } = req.valid.params;
    const { texto, parent_id, usuario_mencionado_id } = req.valid.body;

    const post = await findPost(id, req.user.id);

    let parentAuthorId = null;

    if (parent_id) {
        const [parents] = await pool.execute('SELECT usuario_id FROM comentarios WHERE id = ? AND post_id = ?', [parent_id, id]);

        if (parents.length === 0) {
            throw badRequest('O comentário respondido não existe nesta publicação.');
        }

        parentAuthorId = parents[0].usuario_id;
    }

    if (usuario_mencionado_id) {
        const [mentioned] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [usuario_mencionado_id]);

        if (mentioned.length === 0) {
            throw badRequest('O usuário mencionado não existe.');
        }
    }

    const [result] = await pool.execute('INSERT INTO comentarios (usuario_id, post_id, texto, parent_id) VALUES (?, ?, ?, ?)', [
        req.user.id,
        id,
        texto,
        parent_id ?? null
    ]);

    // Who hears about it: the mentioned user, else the author of the comment being
    // replied to, else the post owner. All derived server-side.
    await notificationService.criarNotificacao(usuario_mencionado_id ?? parentAuthorId ?? post.usuario_id, req.user.id, 'comentario', id);

    res.status(201).json({ message: 'Comentário salvo!', id: result.insertId });
};

const getComments = async (req, res) => {
    const { id } = req.valid.params;

    await findPost(id, req.user.id);

    const [rows] = await pool.execute(
        `SELECT c.id, c.usuario_id, c.post_id, c.texto, c.parent_id, c.criado_em,
                u.username, u.nome_completo, u.foto_perfil
         FROM comentarios c
         JOIN usuarios u ON c.usuario_id = u.id
         WHERE c.post_id = ?
         ORDER BY c.criado_em ASC, c.id ASC`,
        [id]
    );

    res.status(200).json(rows);
};

// A comment can be removed by its author or by the owner of the post it is on.
const deleteComment = async (req, res) => {
    const { id } = req.valid.params;

    const [rows] = await pool.execute(
        'SELECT c.usuario_id AS autor_id, p.usuario_id AS dono_post_id FROM comentarios c JOIN posts p ON c.post_id = p.id WHERE c.id = ?',
        [id]
    );

    if (rows.length === 0) {
        throw notFound('Comentário não encontrado.');
    }

    if (![rows[0].autor_id, rows[0].dono_post_id].includes(req.user.id)) {
        throw forbidden('Você só pode apagar seus próprios comentários.');
    }

    await pool.execute('DELETE FROM comentarios WHERE id = ?', [id]);

    res.status(200).json({ message: 'Comentário apagado com sucesso!' });
};

module.exports = {
    getTimeline,
    getUserPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    getPostLikes,
    addComment,
    getComments,
    deleteComment
};
