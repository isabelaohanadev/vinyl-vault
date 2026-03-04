const db = require('../config/db');
const notificationService = require('../services/notificationService');

const getTimeline = (req, res) => {
    const viewer_id = req.query.viewer_id || 0;
    const hashtag = req.query.hashtag || '';
    
    let sql = ''; 
    let params = [];

    if (hashtag) {
        sql = `
            SELECT p.*, u.username, u.foto_perfil, u.nome_completo, 
                   COUNT(DISTINCT c.id) AS likes_count, 
                   MAX(CASE WHEN c.usuario_id = ? THEN 1 ELSE 0 END) AS user_liked 
            FROM posts p 
            JOIN usuarios u ON p.usuario_id = u.id 
            LEFT JOIN curtidas c ON p.id = c.post_id 
            WHERE p.legenda LIKE ? 
            GROUP BY p.id 
            ORDER BY p.criado_em DESC 
            LIMIT 50
        `;
        params = [viewer_id, '%#' + hashtag + '%'];
    } else {
        sql = `
            SELECT p.*, u.username, u.foto_perfil, u.nome_completo, 
                   COUNT(DISTINCT c.id) AS likes_count, 
                   MAX(CASE WHEN c.usuario_id = ? THEN 1 ELSE 0 END) AS user_liked 
            FROM posts p 
            JOIN usuarios u ON p.usuario_id = u.id 
            LEFT JOIN curtidas c ON p.id = c.post_id 
            GROUP BY p.id 
            ORDER BY p.criado_em DESC 
            LIMIT 50
        `;
        params = [viewer_id];
    }
    
    db.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao carregar a timeline.' });
        }
        res.status(200).json(results);
    });
};

const getPostById = (req, res) => {
    const viewer_id = req.query.viewer_id || 0;
    const { id } = req.params;

    const sql = `
        SELECT p.*, u.username, u.foto_perfil, u.nome_completo, 
               COUNT(DISTINCT c.id) AS likes_count, 
               MAX(CASE WHEN c.usuario_id = ? THEN 1 ELSE 0 END) AS user_liked 
        FROM posts p 
        JOIN usuarios u ON p.usuario_id = u.id 
        LEFT JOIN curtidas c ON p.id = c.post_id 
        WHERE p.id = ? 
        GROUP BY p.id
    `;
    
    db.query(sql, [viewer_id, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao carregar a publicação.' });
        }
        res.status(200).json(results[0]);
    });
};

const getUserPosts = (req, res) => {
    const viewer_id = req.query.viewer_id || 0;
    const { usuario_id } = req.params;

    const sql = `
        SELECT p.*, 
               COUNT(DISTINCT c.id) AS likes_count, 
               MAX(CASE WHEN c.usuario_id = ? THEN 1 ELSE 0 END) AS user_liked 
        FROM posts p 
        LEFT JOIN curtidas c ON p.id = c.post_id 
        WHERE p.usuario_id = ? 
        GROUP BY p.id 
        ORDER BY p.criado_em DESC
    `;
    
    db.query(sql, [viewer_id, usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao carregar as publicações do usuário.' });
        }
        res.status(200).json(results);
    });
};

const createPost = (req, res) => {
    const { usuario_id, foto, legenda } = req.body;
    
    db.query('INSERT INTO posts (usuario_id, foto, legenda) VALUES (?, ?, ?)', [usuario_id, foto, legenda], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao criar a publicação.' });
        }
        res.status(201).json({ message: 'Post publicado!' });
    });
};

const updatePost = (req, res) => {
    const { id } = req.params;
    const { legenda } = req.body;
    
    db.query('UPDATE posts SET legenda = ? WHERE id = ?', [legenda, id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar a publicação.' });
        }
        res.status(200).json({ message: 'Post atualizado!' });
    });
};

const toggleLike = (req, res) => {
    const { usuario_id, post_id, dono_post_id } = req.body;
    
    db.query('SELECT id FROM curtidas WHERE usuario_id = ? AND post_id = ?', [usuario_id, post_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro interno ao processar a curtida.' });
        }
        
        if (results.length > 0) {
            db.query('DELETE FROM curtidas WHERE id = ?', [results[0].id], (err2) => {
                if (err2) {
                    return res.status(500).json({ error: 'Erro ao remover a curtida.' });
                }
                res.status(200).json({ message: 'Curtida removida!', acao: 'removida' });
            });
        } else {
            db.query('INSERT INTO curtidas (usuario_id, post_id) VALUES (?, ?)', [usuario_id, post_id], (err2) => {
                if (err2) {
                    return res.status(500).json({ error: 'Erro ao adicionar a curtida.' });
                }
                notificationService.criarNotificacao(dono_post_id, usuario_id, 'curtida', post_id); 
                res.status(201).json({ message: 'Curtiu!', acao: 'adicionada' });
            });
        }
    });
};

const getPostLikes = (req, res) => {
    const { post_id } = req.params;

    const sql = `
        SELECT u.id, u.nome_completo, u.username, u.foto_perfil 
        FROM curtidas c 
        JOIN usuarios u ON c.usuario_id = u.id 
        WHERE c.post_id = ? 
        ORDER BY c.criado_em DESC
    `;
    
    db.query(sql, [post_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar curtidas do post.' });
        }
        res.status(200).json(results);
    });
};

const addComment = (req, res) => {
    const { usuario_id, post_id, texto, dono_post_id, parent_id, usuario_mencionado_id } = req.body;
    
    db.query('INSERT INTO comentarios (usuario_id, post_id, texto, parent_id) VALUES (?, ?, ?, ?)', 
    [usuario_id, post_id, texto, parent_id || null], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar o comentário.' });
        }
        
        if (usuario_mencionado_id) {
            notificationService.criarNotificacao(usuario_mencionado_id, usuario_id, 'comentario', post_id);
        } else if (dono_post_id) {
            notificationService.criarNotificacao(dono_post_id, usuario_id, 'comentario', post_id); 
        }
        
        res.status(201).json({ message: 'Comentário salvo!' });
    });
};

const getComments = (req, res) => {
    const { post_id } = req.params;

    const sql = `
        SELECT c.*, u.username, u.foto_perfil, u.nome_completo 
        FROM comentarios c 
        JOIN usuarios u ON c.usuario_id = u.id 
        WHERE c.post_id = ? 
        ORDER BY c.criado_em ASC
    `;
    
    db.query(sql, [post_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar os comentários.' });
        }
        res.status(200).json(results);
    });
};

const deleteComment = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM comentarios WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao apagar o comentário.' });
        }
        res.status(200).json({ message: 'Comentário apagado com sucesso!' });
    });
};

module.exports = {
    getTimeline,
    getPostById,
    getUserPosts,
    createPost,
    updatePost,
    toggleLike,
    getPostLikes,
    addComment,
    getComments,
    deleteComment
};