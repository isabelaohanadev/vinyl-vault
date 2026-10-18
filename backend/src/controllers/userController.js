const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const env = require('../config/env');
const { badRequest, notFound } = require('../utils/httpError');
const { serializeUser, serializePublicUser } = require('../utils/serializers');

const getProfile = async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [req.valid.params.id]);

    if (rows.length === 0) {
        throw notFound('Usuário não encontrado.');
    }

    res.status(200).json(serializePublicUser(rows[0]));
};

const updateProfile = async (req, res) => {
    const { id } = req.valid.params;
    const { nome_completo, bio, foto_perfil, senha, senha_atual } = req.valid.body;

    const columns = [];
    const params = [];
    const set = (column, value) => {
        columns.push(`${column} = ?`);
        params.push(value);
    };

    if (nome_completo !== undefined) set('nome_completo', nome_completo);
    if (bio !== undefined) set('bio', bio);
    if (foto_perfil !== undefined) set('foto_perfil', foto_perfil);

    if (senha !== undefined) {
        const [[current]] = await pool.execute('SELECT senha FROM usuarios WHERE id = ?', [id]);

        if (!current || !(await bcrypt.compare(senha_atual, current.senha))) {
            throw badRequest('Senha atual incorreta.');
        }

        set('senha', await bcrypt.hash(senha, env.BCRYPT_ROUNDS));
    }

    if (columns.length > 0) {
        await pool.execute(`UPDATE usuarios SET ${columns.join(', ')} WHERE id = ?`, [...params, id]);
    }

    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [id]);

    res.status(200).json({ message: 'Perfil atualizado!', usuario: serializeUser(rows[0]) });
};

const deleteAccount = async (req, res) => {
    // Foreign keys cascade: the user's vinyls, posts, follows, messages and notifications go too.
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [req.valid.params.id]);

    res.status(200).json({ message: 'Conta excluída!' });
};

const updateStatus = async (req, res) => {
    await pool.execute('UPDATE usuarios SET tocando_agora = ? WHERE id = ?', [req.valid.body.tocando_agora ?? null, req.valid.params.id]);

    res.status(200).json({ message: 'Status atualizado com sucesso!' });
};

module.exports = {
    getProfile,
    updateProfile,
    deleteAccount,
    updateStatus
};
