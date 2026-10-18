const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const z = require('../../src/config/zod');
const validate = require('../../src/middlewares/validate');
const { requireAuth, requireSelf } = require('../../src/middlewares/auth');
const { notFoundHandler, errorHandler } = require('../../src/middlewares/errorHandler');
const { createLimiter } = require('../../src/middlewares/rateLimit');
const { signToken } = require('../../src/utils/token');
const { forbidden, conflict } = require('../../src/utils/httpError');

const buildApp = (configure) => {
    const app = express();
    app.use(express.json());
    configure(app);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
};

describe('validate middleware', () => {
    const app = buildApp((a) => {
        a.post(
            '/items/:id',
            validate({
                params: z.object({ id: z.coerce.number().int().positive() }),
                query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
                body: z.object({ nome: z.string().trim().min(1).max(5), email: z.email().optional() })
            }),
            (req, res) => res.json(req.valid)
        );
    });

    it('passes parsed, coerced and defaulted values to the handler', async () => {
        const res = await request(app).post('/items/7').send({ nome: '  ab  ' });

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { params: { id: 7 }, query: { page: 1 }, body: { nome: 'ab' } });
    });

    it('reports every invalid field in pt-BR', async () => {
        const res = await request(app).post('/items/abc?page=0').send({ nome: 'muito longo', email: 'x' });

        assert.equal(res.status, 400);
        assert.equal(res.body.error, 'Dados inválidos.');
        const byField = Object.fromEntries(res.body.details.map((d) => [d.campo, d.mensagem]));
        assert.ok(byField.id);
        assert.ok(byField.page);
        assert.equal(byField.nome, 'Deve ter no máximo 5 caracteres.');
        assert.equal(byField.email, 'E-mail inválido.');
    });

    it('can be chained: later calls keep what earlier ones parsed', async () => {
        const chained = buildApp((a) => {
            a.post(
                '/items/:id',
                validate({ params: z.object({ id: z.coerce.number() }) }),
                validate({ body: z.object({ nome: z.string() }) }),
                (req, res) => res.json(req.valid)
            );
        });

        const res = await request(chained).post('/items/3').send({ nome: 'x' });

        assert.deepEqual(res.body, { params: { id: 3 }, body: { nome: 'x' } });
    });

    it('treats a missing body as an empty object', async () => {
        const res = await request(app).post('/items/1');

        assert.equal(res.status, 400);
        assert.equal(res.body.details[0].mensagem, 'Campo obrigatório.');
    });
});

describe('auth middlewares', () => {
    const app = buildApp((a) => {
        a.get('/me', requireAuth, (req, res) => res.json(req.user));
        a.get('/users/:id', requireAuth, requireSelf('id'), (req, res) => res.json({ ok: true }));
    });
    const bearer = (id) => `Bearer ${signToken({ id, username: `u${id}` })}`;

    it('rejects requests without a valid bearer token', async () => {
        assert.equal((await request(app).get('/me')).status, 401);
        assert.equal((await request(app).get('/me').set('Authorization', 'Token abc')).status, 401);

        const res = await request(app).get('/me').set('Authorization', 'Bearer not-a-jwt');
        assert.equal(res.status, 401);
        assert.match(res.body.error, /inválida ou expirada/);
    });

    it('exposes the authenticated user', async () => {
        const res = await request(app).get('/me').set('Authorization', bearer(5));

        assert.deepEqual(res.body, { id: 5, username: 'u5' });
    });

    it('requireSelf allows the owner and forbids everyone else', async () => {
        assert.equal((await request(app).get('/users/5').set('Authorization', bearer(5))).status, 200);
        assert.equal((await request(app).get('/users/6').set('Authorization', bearer(5))).status, 403);
    });
});

describe('error handler', () => {
    const app = buildApp((a) => {
        a.get('/forbidden', () => { throw forbidden(); });
        a.get('/conflict', () => { throw conflict('Já existe.'); });
        a.get('/async-boom', async () => { throw new Error('secret internals'); });
        a.get('/dup', () => { throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }); });
        a.get('/fk', () => { throw Object.assign(new Error('fk'), { code: 'ER_NO_REFERENCED_ROW_2' }); });
    });

    it('maps HttpError and known MySQL errors to client errors', async () => {
        assert.equal((await request(app).get('/forbidden')).status, 403);
        assert.deepEqual((await request(app).get('/conflict')).body, { error: 'Já existe.' });
        assert.equal((await request(app).get('/dup')).status, 409);
        assert.equal((await request(app).get('/fk')).status, 400);
    });

    it('turns async failures into a generic 500 without leaking details', async () => {
        const res = await request(app).get('/async-boom');

        assert.equal(res.status, 500);
        assert.deepEqual(res.body, { error: 'Erro interno do servidor.' });
    });

    it('returns JSON errors for unknown routes, malformed and oversized JSON', async () => {
        assert.equal((await request(app).get('/nope')).status, 404);

        const malformed = await request(app).get('/forbidden').set('Content-Type', 'application/json').send('{bad');
        assert.equal(malformed.status, 400);
        assert.equal(malformed.body.error, 'JSON inválido.');

        const small = express();
        small.use(express.json({ limit: '10b' }));
        small.post('/', (req, res) => res.end());
        small.use(errorHandler);
        const big = await request(small).post('/').send({ texto: 'x'.repeat(100) });
        assert.equal(big.status, 413);
    });
});

describe('rate limiter', () => {
    it('blocks after the configured number of requests', async () => {
        const app = buildApp((a) => {
            a.use(createLimiter({ windowMs: 60000, limit: 2 }, true));
            a.get('/', (req, res) => res.json({ ok: true }));
        });

        assert.equal((await request(app).get('/')).status, 200);
        assert.equal((await request(app).get('/')).status, 200);

        const blocked = await request(app).get('/');
        assert.equal(blocked.status, 429);
        assert.match(blocked.body.error, /Muitas requisições/);
    });

    it('is a pass-through when disabled', async () => {
        const app = buildApp((a) => {
            a.use(createLimiter({ windowMs: 60000, limit: 1 }, false));
            a.get('/', (req, res) => res.json({ ok: true }));
        });

        for (let i = 0; i < 5; i++) {
            assert.equal((await request(app).get('/')).status, 200);
        }
    });
});
