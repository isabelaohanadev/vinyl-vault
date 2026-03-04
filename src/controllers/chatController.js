const db = require('../config/db');
const notificationService = require('../services/notificationService');

const getMensagens = (req, res) => {
    const { meu_id, amigo_id } = req.params;

    const sql = `
        SELECT m.*, v.nome AS vinil_nome, v.foto AS vinil_foto, v.artista AS vinil_artista, v.spotify AS vinil_spotify 
        FROM mensagens m 
        LEFT JOIN vinis v ON m.vinil_id = v.id 
        WHERE (m.remetente_id = ? AND m.destinatario_id = ?) 
           OR (m.remetente_id = ? AND m.destinatario_id = ?) 
        ORDER BY m.criado_em ASC
    `;
    
    db.query(sql, [meu_id, amigo_id, amigo_id, meu_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar o histórico de mensagens.' });
        }
        res.status(200).json(results);
    });
};

const enviarMensagem = (req, res) => {
    const { remetente_id, destinatario_id, texto, vinil_id } = req.body;
    
    const sql = 'INSERT INTO mensagens (remetente_id, destinatario_id, texto, vinil_id) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [remetente_id, destinatario_id, texto, vinil_id || null], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
        }
        
        notificationService.criarNotificacao(destinatario_id, remetente_id, 'mensagem');
        res.status(201).json({ message: 'Mensagem enviada com sucesso!' });
    });
};

const getConversas = (req, res) => {
    const { meu_id } = req.params;

    const sql = `
        SELECT u.id, u.nome_completo, u.username, u.foto_perfil, u.tocando_agora, MAX(m.criado_em) as last_msg 
        FROM mensagens m 
        JOIN usuarios u ON (u.id = m.remetente_id OR u.id = m.destinatario_id) 
        WHERE (m.remetente_id = ? OR m.destinatario_id = ?) AND u.id != ? 
        GROUP BY u.id 
        ORDER BY last_msg DESC
    `;
    
    db.query(sql, [meu_id, meu_id, meu_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao listar conversas recentes.' });
        }
        res.status(200).json(results);
    });
};

const getNaoLidas = (req, res) => {
    const { usuario_id } = req.params;

    db.query('SELECT COUNT(*) AS total FROM mensagens WHERE destinatario_id = ? AND lida = 0', [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao verificar mensagens não lidas.' });
        }
        res.status(200).json({ total: results[0].total });
    });
};

const marcarMensagensComoLidas = (req, res) => {
    const { meu_id, amigo_id } = req.body;
    
    db.query('UPDATE mensagens SET lida = 1 WHERE destinatario_id = ? AND remetente_id = ?', [meu_id, amigo_id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar o status das mensagens.' });
        }
        res.status(200).json({ message: 'Mensagens marcadas como lidas.' });
    });
};

module.exports = {
    getMensagens,
    enviarMensagem,
    getConversas,
    getNaoLidas,
    marcarMensagensComoLidas
};