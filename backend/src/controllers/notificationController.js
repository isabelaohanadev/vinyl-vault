const db = require('../config/db');

const getNotificacoes = (req, res) => {
    const { usuario_id } = req.params;

    const sql = `
        SELECT n.*, u.username, u.foto_perfil 
        FROM notificacoes n 
        JOIN usuarios u ON n.ator_id = u.id 
        WHERE n.usuario_id = ? 
        ORDER BY n.criado_em DESC 
        LIMIT 30
    `;
    
    db.query(sql, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar notificações.' });
        }
        res.status(200).json(results);
    });
};

const marcarComoLida = (req, res) => {
    const { id } = req.params;

    db.query('UPDATE notificacoes SET lida = TRUE WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar notificação.' });
        }
        res.status(200).json({ message: 'Notificação marcada como lida.' });
    });
};

module.exports = {
    getNotificacoes,
    marcarComoLida
};