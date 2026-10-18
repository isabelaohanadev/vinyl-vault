const { z, id, optional, image } = require('./common');

const MAX_CAPTION = 2200;

const hashtag = z
    .string()
    .trim()
    .regex(/^#?[\p{L}\p{N}_]{1,50}$/u, 'Hashtag inválida.')
    .transform((value) => value.replace(/^#/, ''));

const timelineQuery = z.object({
    hashtag: optional(hashtag),
    limite: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0)
});

const pageQuery = z.object({
    limite: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0)
});

const createPostBody = z
    .object({
        foto: image,
        legenda: optional(z.string().trim().max(MAX_CAPTION))
    })
    .refine((body) => body.foto || body.legenda, { message: 'Envie uma foto ou uma legenda.' });

const updatePostBody = z.object({
    legenda: z.string().trim().max(MAX_CAPTION)
});

const commentBody = z.object({
    texto: z.string().trim().min(1).max(1000),
    parent_id: optional(id),
    usuario_mencionado_id: optional(id)
});

module.exports = { timelineQuery, pageQuery, createPostBody, updatePostBody, commentBody };
