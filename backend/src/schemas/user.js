const { z, optional, image } = require('./common');
const { password } = require('./common');

const updateProfileBody = z
    .object({
        nome_completo: z.string().trim().min(2).max(150).optional(),
        bio: optional(z.string().trim().max(500)),
        // undefined keeps the current photo, null (or "") removes it.
        foto_perfil: image,
        senha: password.optional(),
        senha_atual: z.string().min(1).max(200).optional()
    })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
        message: 'Informe ao menos um campo para atualizar.'
    })
    .refine((body) => body.senha === undefined || body.senha_atual !== undefined, {
        path: ['senha_atual'],
        message: 'Informe a senha atual para definir uma nova.'
    });

const statusBody = z.object({
    tocando_agora: optional(z.string().trim().max(255))
});

module.exports = { updateProfileBody, statusBody };
