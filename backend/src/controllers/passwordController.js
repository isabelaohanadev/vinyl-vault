const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const env = require('../config/env');
const mailer = require('../config/mailer');
const logger = require('../utils/logger');
const { generateResetToken, hashToken } = require('../utils/token');
const { badRequest } = require('../utils/httpError');

const RESET_TTL_MINUTES = 60;

// The answer is identical whether or not the e-mail exists, so the endpoint
// cannot be used to discover who has an account.
const forgotPassword = async (req, res) => {
    const { email } = req.valid.body;

    const [rows] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);

    if (rows.length > 0) {
        const { token, hash } = generateResetToken();

        await pool.execute(
            'UPDATE usuarios SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
            [hash, RESET_TTL_MINUTES, rows[0].id]
        );

        // The web app reads ?token= on its root page and opens the "new password" form.
        const link = `${env.FRONTEND_URL.replace(/\/$/, '')}/?token=${token}`;

        // Not awaited on purpose: waiting on SMTP would make existing accounts slower to answer.
        mailer
            .send({
                to: email,
                subject: 'Redefinição de senha - Vinyl Vault',
                html: `<p>Recebemos um pedido para redefinir sua senha.</p>
<p><a href="${link}">Clique aqui para escolher uma nova senha</a>. O link vale por ${RESET_TTL_MINUTES} minutos.</p>
<p>Se não foi você, ignore este e-mail.</p>`
            })
            .catch((error) => logger.error('Falha ao enviar e-mail de recuperação:', error.message));
    }

    res.status(200).json({ message: 'Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.' });
};

const resetPassword = async (req, res) => {
    const { token, novaSenha } = req.valid.body;

    const hashedPassword = await bcrypt.hash(novaSenha, env.BCRYPT_ROUNDS);

    // A single conditional UPDATE consumes the token atomically: it cannot be used twice.
    const [result] = await pool.execute(
        'UPDATE usuarios SET senha = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ? AND reset_token_expires > NOW()',
        [hashedPassword, hashToken(token)]
    );

    if (result.affectedRows === 0) {
        throw badRequest('Token inválido ou expirado.');
    }

    res.status(200).json({ message: 'Senha redefinida!' });
};

module.exports = {
    forgotPassword,
    resetPassword
};
