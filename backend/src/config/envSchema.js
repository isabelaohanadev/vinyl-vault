const { z } = require('zod');

const flag = (fallback) =>
    z.enum(['true', 'false']).default(fallback).transform((value) => value === 'true');

const schema = z
    .object({
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        PORT: z.coerce.number().int().positive().default(3000),

        DB_HOST: z.string().min(1).default('localhost'),
        DB_PORT: z.coerce.number().int().positive().default(3306),
        DB_USER: z.string().min(1, 'DB_USER é obrigatório'),
        DB_PASSWORD: z.string().default(''),
        DB_NAME: z.string().min(1, 'DB_NAME é obrigatório'),
        DB_POOL_SIZE: z.coerce.number().int().positive().default(10),

        JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres (gere com: openssl rand -hex 32)'),
        JWT_EXPIRES_IN: z.string().min(1).default('7d'),
        BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

        CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
        FRONTEND_URL: z.string().url().default('http://localhost:5173'),
        JSON_LIMIT: z.string().min(1).default('5mb'),
        TRUST_PROXY: z.coerce.number().int().min(0).default(0),
        RATE_LIMIT_ENABLED: flag('true'),

        EMAIL_USER: z.string().optional(),
        EMAIL_PASS: z.string().optional(),
        FEEDBACK_TO: z.string().email().optional()
    })
    .superRefine((env, ctx) => {
        if (env.NODE_ENV !== 'production') {
            return;
        }

        if (/change-?me/i.test(env.JWT_SECRET)) {
            ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET ainda está com o valor de exemplo' });
        }

        for (const key of ['EMAIL_USER', 'EMAIL_PASS']) {
            if (!env[key]) {
                ctx.addIssue({ code: 'custom', path: [key], message: `${key} é obrigatório em produção (recuperação de senha envia e-mail)` });
            }
        }
    });

// A blank value (`FEEDBACK_TO=` copied from .env.example, or `${VAR:-}` in docker-compose)
// means "not set", so optional settings stay optional and required ones are reported.
const withoutBlanks = (source) => Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));

const parseEnv = (source = process.env) => {
    const result = schema.safeParse(withoutBlanks(source));

    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('\n');
        throw new Error(`Variáveis de ambiente inválidas:\n${details}\n\nVeja backend/.env.example.`);
    }

    return Object.freeze(result.data);
};

module.exports = { parseEnv };
