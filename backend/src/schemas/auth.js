const { z, optional, image, password } = require('./common');

const registerBody = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
    nome_completo: z.string().trim().min(2).max(150),
    username: z
        .string()
        .trim()
        .min(3)
        .max(30)
        .regex(/^[A-Za-z0-9_.]+$/, 'Use apenas letras, números, "_" e ".".'),
    senha: password,
    data_nascimento: optional(
        z.iso.date().refine((value) => value <= new Date().toISOString().slice(0, 10), 'A data não pode estar no futuro.')
    ),
    bio: optional(z.string().trim().max(500)),
    foto_perfil: image
});

const loginBody = z.object({
    login: z.string().trim().min(1).max(255),
    senha: z.string().min(1).max(200)
});

const forgotPasswordBody = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(255))
});

const resetPasswordBody = z.object({
    token: z.string().trim().min(1).max(200),
    novaSenha: password
});

module.exports = { registerBody, loginBody, forgotPasswordBody, resetPasswordBody };
