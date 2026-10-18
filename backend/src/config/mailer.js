const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('../utils/logger');

const smtpConfigured = Boolean(env.EMAIL_USER && env.EMAIL_PASS);

// Without SMTP credentials (local development) messages are rendered to JSON
// and logged instead of being delivered, so flows like password recovery can
// still be exercised. Production requires credentials (see config/env.js).
const transport = smtpConfigured
    ? nodemailer.createTransport({ service: 'gmail', auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS } })
    : nodemailer.createTransport({ jsonTransport: true });

const send = async ({ to, subject, html, replyTo }) => {
    const info = await transport.sendMail({
        from: env.EMAIL_USER || 'Vinyl Vault <no-reply@vinylvault.local>',
        to,
        subject,
        html,
        replyTo
    });

    if (!smtpConfigured) {
        logger.info(`[mailer] SMTP não configurado, e-mail não enviado. Para: ${to} | Assunto: ${subject}\n${html}`);
    }

    return info;
};

module.exports = { send };
