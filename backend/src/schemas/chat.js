const { z, id, optional } = require('./common');

const sendMessageBody = z
    .object({
        destinatario_id: id,
        texto: optional(z.string().trim().max(2000)),
        vinil_id: optional(id)
    })
    .refine((body) => body.texto || body.vinil_id, { message: 'Envie um texto ou um disco.' });

const friendParam = z.object({ amigo_id: id });

const historyQuery = z.object({
    limite: z.coerce.number().int().min(1).max(200).default(100),
    // Id of the oldest message already loaded; returns the page before it.
    antes: optional(id)
});

const markReadBody = z.object({ amigo_id: id });

module.exports = { sendMessageBody, friendParam, historyQuery, markReadBody };
