const { z, id, optional, image, httpUrl } = require('./common');

const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G', 'P'];

const currentYear = new Date().getFullYear();

const fields = {
    nome: z.string().trim().min(1).max(255),
    artista: z.string().trim().min(1).max(255),
    genero: optional(z.string().trim().max(100)),
    ano: optional(z.coerce.number().int().min(1877).max(currentYear + 1)),
    spotify: httpUrl(500),
    adquirido: z.boolean(),
    foto: image,
    negociavel: z.boolean(),
    preview_url: httpUrl(1000),
    nota: z.coerce.number().int().min(0).max(5),
    estado_capa: optional(z.enum(CONDITIONS)),
    estado_disco: optional(z.enum(CONDITIONS))
};

// Create: owner always comes from the token; unknown keys (such as a legacy
// "usuario_id") are ignored.
const createBody = z.object({
    ...fields,
    adquirido: fields.adquirido.default(true),
    negociavel: fields.negociavel.default(false),
    nota: fields.nota.default(0)
});

// Update: every field optional, and no defaults so omitted fields stay untouched.
const updateBody = z
    .object(fields)
    .partial()
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
        message: 'Informe ao menos um campo para atualizar.'
    });

const listQuery = z.object({
    busca: optional(z.string().trim().max(100)),
    limite: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).default(0)
});

const userIdParam = z.object({ id });

module.exports = { CONDITIONS, createBody, updateBody, listQuery, userIdParam };
