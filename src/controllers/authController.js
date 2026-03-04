const db = require('../config/db');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
    const { email, nome_completo, data_nascimento, bio, username, senha, foto_perfil } = req.body;

    try {
        db.query('SELECT * FROM usuarios WHERE email = ? OR username = ?', [email, username], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erro interno do servidor.' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Usuário já existe.' });
            }

            const hashedPassword = await bcrypt.hash(senha, 10);

            const sql = 'INSERT INTO usuarios (email, nome_completo, data_nascimento, bio, username, senha, foto_perfil) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const values = [email, nome_completo, data_nascimento, bio, username, hashedPassword, foto_perfil];

            db.query(sql, values, (insertErr, result) => {
                if (insertErr) {
                    return res.status(500).json({ error: 'Erro ao criar conta.' });
                }

                res.status(201).json({
                    message: 'Conta criada!',
                    usuario: {
                        id: result.insertId,
                        email,
                        nome_completo,
                        username,
                        bio,
                        foto_perfil,
                        tocando_agora: null
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no processamento.' });
    }
};

const login = (req, res) => {
    const { username, senha } = req.body;

    try {
        db.query('SELECT * FROM usuarios WHERE username = ?', [username], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erro interno do servidor.' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            const user = results[0];
            const match = await bcrypt.compare(senha, user.senha);

            if (!match) {
                return res.status(401).json({ error: 'Senha incorreta.' });
            }

            res.status(200).json({
                message: 'Logado!',
                usuario: {
                    id: user.id,
                    email: user.email,
                    nome_completo: user.nome_completo,
                    username: user.username,
                    bio: user.bio,
                    foto_perfil: user.foto_perfil,
                    tocando_agora: user.tocando_agora
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no processamento.' });
    }
};

module.exports = {
    register,
    login
};