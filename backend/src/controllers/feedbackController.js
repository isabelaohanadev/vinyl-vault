const env = require('../config/env');
const mailer = require('../config/mailer');
const escapeHtml = require('../utils/escapeHtml');
const logger = require('../utils/logger');
const { HttpError } = require('../utils/httpError');

const enviarFeedback = async (req, res) => {
    const { mensagem, usuario_email, usuario_nome } = req.valid.body;

    // Everything the visitor typed is escaped: it ends up inside an HTML e-mail.
    const nome = usuario_nome || 'Anônimo';
    const html = `<p><b>De:</b> ${escapeHtml(nome)}${usuario_email ? ` &lt;${escapeHtml(usuario_email)}&gt;` : ''}</p>
<p><b>Mensagem:</b><br>${escapeHtml(mensagem).replace(/\r?\n/g, '<br>')}</p>`;

    try {
        await mailer.send({
            to: env.FEEDBACK_TO || env.EMAIL_USER || 'feedback@vinylvault.local',
            replyTo: usuario_email || undefined,
            // Line breaks are stripped so a crafted name cannot inject extra mail headers.
            subject: `Novo Feedback App - ${nome.replace(/[\r\n]+/g, ' ')}`,
            html
        });
    } catch (error) {
        logger.error('Falha ao enviar feedback:', error.message);
        throw new HttpError(502, 'Não foi possível enviar o feedback agora. Tente novamente mais tarde.');
    }

    res.status(200).json({ message: 'Feedback enviado com sucesso!' });
};

module.exports = {
    enviarFeedback
};
