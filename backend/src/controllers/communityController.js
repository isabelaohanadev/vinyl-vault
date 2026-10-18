const db = require('../config/db');
const notificationService = require('../services/notificationService');

const getComunidade = (req, res) => {
    const { meu_id } = req.params;

    const sql = `
        SELECT u.id, u.nome_completo, u.username, u.foto_perfil, u.bio, u.tocando_agora,
        IF(s.id IS NOT NULL, true, false) AS is_seguindo 
        FROM usuarios u 
        LEFT JOIN seguidores s ON u.id = s.seguido_id AND s.seguidor_id = ? 
        WHERE u.id != ?
    `;
    
    db.query(sql, [meu_id, meu_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao carregar a comunidade.' });
        }
        res.status(200).json(results);
    });
};

const seguirUsuario = (req, res) => {
    const { seguidor_id, seguido_id } = req.body;
    
    db.query('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [seguidor_id, seguido_id], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Erro ao processar a ação de seguir.' });
        }
        
        notificationService.criarNotificacao(seguido_id, seguidor_id, 'seguir');
        res.status(201).json({ message: 'Seguindo!' });
    });
};

const deixarDeSeguirUsuario = (req, res) => {
    const { seguidor_id, seguido_id } = req.params;

    db.query('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [seguidor_id, seguido_id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao processar a ação de deixar de seguir.' });
        }
        res.status(200).json({ message: 'Deixou de seguir.' });
    });
};

const getStatsPerfil = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
        (SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?) AS seguidores, 
        (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?) AS seguindo,
        (SELECT COUNT(*) FROM vinis WHERE usuario_id = ?) AS total_vinis
    `;
    
    db.query(sql, [id, id, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao calcular estatísticas do perfil.' });
        }
        res.status(200).json(results[0]);
    });
};

const getSeguidores = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT u.id, u.nome_completo, u.username, u.foto_perfil 
        FROM seguidores s 
        JOIN usuarios u ON s.seguidor_id = u.id 
        WHERE s.seguido_id = ?
    `;
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar seguidores.' });
        }
        res.status(200).json(results);
    });
};

const getSeguindo = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT u.id, u.nome_completo, u.username, u.foto_perfil 
        FROM seguidores s 
        JOIN usuarios u ON s.seguido_id = u.id 
        WHERE s.seguidor_id = ?
    `;
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar usuários seguidos.' });
        }
        res.status(200).json(results);
    });
};

module.exports = {
    getComunidade,
    seguirUsuario,
    deixarDeSeguirUsuario,
    getStatsPerfil,
    getSeguidores,
    getSeguindo
};