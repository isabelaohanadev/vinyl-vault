const db = require('../config/db');
const bcrypt = require('bcrypt');

const updateProfile = async (req, res) => {
    const { id } = req.params;
    const { nome_completo, bio, foto_perfil, senha } = req.body;

    let sql = 'UPDATE usuarios SET nome_completo = ?, bio = ?';
    let params = [nome_completo, bio];

    if (foto_perfil) {
        sql += ', foto_perfil = ?';
        params.push(foto_perfil);
    }

    if (senha) {
        try {
            const hashedPassword = await bcrypt.hash(senha, 10);
            sql += ', senha = ?';
            params.push(hashedPassword);
        } catch (hashErr) {
            return res.status(500).json({ error: 'Erro no processamento de segurança.' });
        }
    }

    sql += ' WHERE id = ?';
    params.push(id);

    db.query(sql, params, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar os dados do perfil.' });
        }
        res.status(200).json({ message: 'Perfil atualizado!' });
    });
};

const deleteAccount = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao processar a exclusão da conta.' });
        }
        res.status(200).json({ message: 'Conta excluída!' });
    });
};

const updateStatus = (req, res) => {
    const { id } = req.params;
    const { tocando_agora } = req.body;

    db.query('UPDATE usuarios SET tocando_agora = ? WHERE id = ?', [tocando_agora, id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar o status atual.' });
        }
        res.status(200).json({ message: 'Status atualizado com sucesso!' });
    });
};

module.exports = {
    updateProfile,
    deleteAccount,
    updateStatus
};