const db = require('../config/db');
const notificationService = require('../services/notificationService');

const getVinisUsuario = (req, res) => {
    const { usuario_id } = req.params;

    db.query('SELECT * FROM vinis WHERE usuario_id = ? ORDER BY criadoEm DESC', [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar o acervo.' });
        }
        
        const formatados = results.map(v => ({
            ...v,
            adquirido: v.adquirido === 1,
            negociavel: v.negociavel === 1
        }));
        
        res.status(200).json(formatados);
    });
};

const addVinil = (req, res) => {
    const { usuario_id, nome, artista, genero, spotify, adquirido, foto, negociavel, preview_url, nota } = req.body;
    
    const sql = 'INSERT INTO vinis (usuario_id, nome, artista, genero, spotify, adquirido, foto, negociavel, preview_url, nota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [usuario_id, nome, artista, genero, spotify, adquirido, foto, negociavel || false, preview_url || null, nota || 0];
    
    db.query(sql, values, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao cadastrar o disco.' });
        }
        
        if (negociavel) {
            notificationService.verificarMatchWishlist(usuario_id, nome);
        }
        
        res.status(201).json({ message: 'Salvo!' });
    });
};

const updateVinil = (req, res) => {
    const { id } = req.params;
    const { nome, artista, genero, spotify, adquirido, foto, negociavel, preview_url, nota } = req.body;
    
    let campos = [];
    let params = [];
    
    if (nome !== undefined) { campos.push('nome=?'); params.push(nome); }
    if (artista !== undefined) { campos.push('artista=?'); params.push(artista); }
    if (genero !== undefined) { campos.push('genero=?'); params.push(genero); }
    if (spotify !== undefined) { campos.push('spotify=?'); params.push(spotify); }
    if (adquirido !== undefined) { campos.push('adquirido=?'); params.push(adquirido); }
    if (foto !== undefined) { campos.push('foto=?'); params.push(foto); }
    if (negociavel !== undefined) { campos.push('negociavel=?'); params.push(negociavel); }
    if (preview_url !== undefined) { campos.push('preview_url=?'); params.push(preview_url); }
    if (nota !== undefined) { campos.push('nota=?'); params.push(nota); }
    
    if (campos.length === 0) {
        return res.status(400).json({ message: 'Sem alteração.' });
    }
    
    let sql = 'UPDATE vinis SET ' + campos.join(', ') + ' WHERE id=?';
    params.push(id);
    
    db.query(sql, params, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar o disco.' });
        }

        if (negociavel) {
            db.query('SELECT usuario_id, nome FROM vinis WHERE id = ?', [id], (err2, resultVinil) => {
                if (!err2 && resultVinil.length > 0) {
                    notificationService.verificarMatchWishlist(resultVinil[0].usuario_id, resultVinil[0].nome);
                }
            });
        }
        
        res.status(200).json({ message: 'Disco atualizado!' });
    });
};

const deleteVinil = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM vinis WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao deletar o disco.' });
        }
        res.status(200).json({ message: 'Disco removido!' });
    });
};

const getClassificados = (req, res) => {
    const { meu_id } = req.params;

    const sql = `
        SELECT v.*, u.nome_completo, u.username, u.foto_perfil 
        FROM vinis v 
        JOIN usuarios u ON v.usuario_id = u.id 
        WHERE v.negociavel = 1 AND v.usuario_id != ?
        ORDER BY v.criadoEm DESC
    `;
    
    db.query(sql, [meu_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar os classificados.' });
        }
        res.status(200).json(results);
    });
};

module.exports = {
    getVinisUsuario,
    addVinil,
    updateVinil,
    deleteVinil,
    getClassificados
};