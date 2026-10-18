const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const forgotPassword = (req, res) => {
    const { email } = req.body;

    db.query('SELECT id FROM usuarios WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro interno do servidor.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Este e-mail não está cadastrado.' });
        }

        const token = crypto.randomBytes(20).toString('hex');

        db.query('UPDATE usuarios SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = ?', [token, email], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: 'Erro ao gerar token de recuperação.' });
            }

            const linkReset = `http://127.0.0.1:5500/index.html?token=${token}`;

            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Redefinição de Senha - Vinyl Vault',
                html: `<a href="${linkReset}">Redefinir Senha</a>`
            }, (mailErr) => {
                if (mailErr) {
                    return res.status(500).json({ error: 'Erro de comunicação no envio do e-mail.' });
                }
                res.status(200).json({ message: 'Link enviado!' });
            });
        });
    });
};

const resetPassword = (req, res) => {
    const { token, novaSenha } = req.body;

    db.query('SELECT id FROM usuarios WHERE reset_token = ? AND reset_token_expires > NOW()', [token], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro interno do servidor.' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(novaSenha, 10);

            db.query('UPDATE usuarios SET senha = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, results[0].id], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ error: 'Erro ao redefinir a senha.' });
                }
                res.status(200).json({ message: 'Senha redefinida!' });
            });
        } catch (hashErr) {
            res.status(500).json({ error: 'Erro no processamento de segurança.' });
        }
    });
};

module.exports = {
    forgotPassword,
    resetPassword
};