const z = require('../config/zod');

const id = z.coerce.number().int().positive();

const idParam = z.object({ id });

// Empty strings coming from forms are stored as NULL.
const emptyToNull = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);

const optional = (schema) => z.preprocess(emptyToNull, schema.nullish());

// Remote images must be plain http(s) URLs (no quotes, spaces or parentheses,
// which could break out of a CSS url(...) on the client) or a raster data URI.
const HTTP_URL = /^https?:\/\/[^\s"'()\\<>]+$/i;
const DATA_URI = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const imageSource = z
    .string()
    .trim()
    .max(4_000_000)
    .refine(
        (value) => (HTTP_URL.test(value) ? value.length <= 2048 : DATA_URI.test(value)),
        'Use uma URL http(s) ou uma imagem PNG, JPG, WEBP ou GIF em base64.'
    );

const image = optional(imageSource);

const httpUrl = (max = 500) =>
    optional(
        z
            .string()
            .trim()
            .max(max)
            .refine((value) => HTTP_URL.test(value), 'URL inválida.')
    );

// bcrypt only uses the first 72 bytes of a password; reject longer ones instead
// of silently truncating them.
const password = z
    .string()
    .min(8)
    .refine((value) => Buffer.byteLength(value) <= 72, 'A senha deve ter no máximo 72 bytes.');

module.exports = { z, id, idParam, optional, image, httpUrl, password };
