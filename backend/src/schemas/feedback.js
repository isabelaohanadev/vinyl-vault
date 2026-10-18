const { z, optional } = require('./common');

const feedbackBody = z.object({
    mensagem: z.string().trim().min(1).max(2000),
    usuario_email: optional(z.email().max(255)),
    usuario_nome: optional(z.string().trim().max(150))
});

module.exports = { feedbackBody };
