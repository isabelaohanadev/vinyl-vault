const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const env = require('../config/env');
const { signToken } = require('../utils/token');
const { conflict, unauthorized } = require('../utils/httpError');
const { serializeUser } = require('../utils/serializers');

let dummyHash;

// Compared against when the user does not exist, so that a login attempt takes
// the same time whether or not the account is real.
const getDummyHash = async () => {
    dummyHash ??= await bcrypt.hash('vinyl-vault-dummy-password', env.BCRYPT_ROUNDS);
    return dummyHash;
};

const register = async (req, res) => {
    const { email, nome_completo, data_nascimento, bio, username, senha, foto_perfil } = req.valid.body;

    const [existing] = await pool.execute('SELECT email, username FROM usuarios WHERE email = ? OR username = ?', [email, username]);

    if (existing.some((row) => row.username.toLowerCase() === username.toLowerCase())) {
        throw conflict('Este nome de usuário já está em uso.');
    }

    if (existing.length > 0) {
        throw conflict('Este e-mail já está cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(senha, env.BCRYPT_ROUNDS);

    const [result] = await pool.execute(
        'INSERT INTO usuarios (email, nome_completo, data_nascimento, bio, username, senha, foto_perfil) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, nome_completo, data_nascimento ?? null, bio ?? null, username, hashedPassword, foto_perfil ?? null]
    );

    const usuario = serializeUser({ id: result.insertId, email, nome_completo, username, bio, foto_perfil, data_nascimento });

    res.status(201).json({ token: signToken(usuario), usuario });
};

const login = async (req, res) => {
    const { login: identifier, senha } = req.valid.body;

    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ? OR username = ? LIMIT 1', [identifier.toLowerCase(), identifier]);
    const user = rows[0];

    const match = await bcrypt.compare(senha, user ? user.senha : await getDummyHash());

    if (!user || !match) {
        throw unauthorized('Credenciais inválidas.');
    }

    const usuario = serializeUser(user);

    res.status(200).json({ token: signToken(usuario), usuario });
};

// Lets the frontend validate a stored session and refresh the cached profile.
const me = async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);

    if (rows.length === 0) {
        throw unauthorized('Conta não encontrada. Faça login novamente.');
    }

    res.status(200).json({ usuario: serializeUser(rows[0]) });
};

module.exports = {
    register,
    login,
    me
};
