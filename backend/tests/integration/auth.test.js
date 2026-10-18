const { describe, it, before, beforeEach, afterEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');
const mailer = require('../../src/config/mailer');
const { verifyToken } = require('../../src/utils/token');

const validBody = {
    email: 'Ana@Example.com',
    nome_completo: 'Ana Souza',
    username: 'ana.souza',
    senha: 'uma-senha-forte-1',
    data_nascimento: '1995-06-15',
    bio: 'Colecionadora de jazz'
};

describe('auth', () => {
    before(applySchema);
    beforeEach(truncateAll);
    after(() => database.close());

    describe('POST /api/auth/register', () => {
        it('creates the account, hashes the password and returns a working token', async () => {
            const res = await request(app).post('/api/auth/register').send(validBody);

            assert.equal(res.status, 201);
            assert.equal(res.body.usuario.email, 'ana@example.com');
            assert.equal(res.body.usuario.data_nascimento, '1995-06-15');
            assert.equal(res.body.usuario.senha, undefined);
            assert.equal(verifyToken(res.body.token).sub, String(res.body.usuario.id));

            const [[row]] = await database.pool.query('SELECT senha FROM usuarios WHERE id = ?', [res.body.usuario.id]);
            assert.match(row.senha, /^\$2[aby]\$/);
            assert.notEqual(row.senha, validBody.senha);

            const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
            assert.equal(me.status, 200);
        });

        it('rejects duplicate usernames (case-insensitive) and e-mails', async () => {
            await request(app).post('/api/auth/register').send(validBody).expect(201);

            const sameUsername = await request(app).post('/api/auth/register').send({ ...validBody, email: 'outra@example.com', username: 'ANA.SOUZA' });
            const sameEmail = await request(app).post('/api/auth/register').send({ ...validBody, username: 'outra.pessoa' });

            assert.equal(sameUsername.status, 409);
            assert.match(sameUsername.body.error, /nome de usuário/);
            assert.equal(sameEmail.status, 409);
            assert.match(sameEmail.body.error, /e-mail/);
        });

        it('validates every field and explains what is wrong', async () => {
            const res = await request(app).post('/api/auth/register').send({
                email: 'nao-e-email',
                nome_completo: 'A',
                username: 'com espaço',
                senha: '123',
                foto_perfil: 'javascript:alert(1)'
            });

            assert.equal(res.status, 400);
            const fields = res.body.details.map((detail) => detail.campo);
            assert.deepEqual(fields.sort(), ['email', 'foto_perfil', 'nome_completo', 'senha', 'username']);
        });

        it('answers 400 (and keeps serving) when the password is missing', async () => {
            // Regression: this used to throw inside a callback and crash the whole process.
            const { senha: _omitted, ...withoutPassword } = validBody;

            const res = await request(app).post('/api/auth/register').send(withoutPassword);
            assert.equal(res.status, 400);

            await request(app).get('/api/health').expect(200);
        });

        it('rejects passwords over 72 bytes instead of truncating them', async () => {
            const res = await request(app).post('/api/auth/register').send({ ...validBody, senha: 'á'.repeat(40) });

            assert.equal(res.status, 400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('logs in with username or e-mail (any case) and never returns the hash', async () => {
            const user = await registerUser({ email: 'login@test.com', username: 'LoginUser' });

            for (const login of ['LoginUser', 'loginuser', 'login@test.com', 'LOGIN@test.com']) {
                const res = await request(app).post('/api/auth/login').send({ login, senha: user.senha });

                assert.equal(res.status, 200, `login as "${login}"`);
                assert.equal(res.body.usuario.id, user.id);
                assert.equal(res.body.usuario.senha, undefined);
                assert.ok(res.body.token);
            }
        });

        it('gives the same answer for a wrong password and an unknown user', async () => {
            const user = await registerUser();

            const wrongPassword = await request(app).post('/api/auth/login').send({ login: user.username, senha: 'errada-errada' });
            const unknownUser = await request(app).post('/api/auth/login').send({ login: 'ninguem', senha: 'errada-errada' });

            assert.equal(wrongPassword.status, 401);
            assert.equal(unknownUser.status, 401);
            assert.deepEqual(wrongPassword.body, unknownUser.body);
        });

        it('rejects a body without credentials (and does not crash)', async () => {
            const res = await request(app).post('/api/auth/login').send({});

            assert.equal(res.status, 400);
            await request(app).get('/api/health').expect(200);
        });

        it('is not fooled by SQL injection in the login field', async () => {
            await registerUser();

            const res = await request(app).post('/api/auth/login').send({ login: "' OR '1'='1", senha: 'qualquer-coisa' });

            assert.equal(res.status, 401);
        });
    });

    describe('GET /api/auth/me', () => {
        it('requires a token', async () => {
            await request(app).get('/api/auth/me').expect(401);
        });

        it('returns the current user', async () => {
            const user = await registerUser();

            const res = await request(app).get('/api/auth/me').set(asUser(user));

            assert.equal(res.status, 200);
            assert.equal(res.body.usuario.username, user.username);
        });

        it('rejects the token of a deleted account', async () => {
            const user = await registerUser();
            await database.pool.query('DELETE FROM usuarios WHERE id = ?', [user.id]);

            await request(app).get('/api/auth/me').set(asUser(user)).expect(401);
        });
    });

    describe('password recovery', () => {
        let sent;

        beforeEach(() => {
            sent = [];
            mock.method(mailer, 'send', async (message) => {
                sent.push(message);
            });
        });

        afterEach(() => mock.restoreAll());

        const requestReset = (email) => request(app).post('/api/auth/forgot-password').send({ email });
        const tokenFrom = (message) => new URL(message.html.match(/href="([^"]+)"/)[1]).searchParams.get('token');

        it('answers identically for known and unknown e-mails, and only mails real accounts', async () => {
            const user = await registerUser();

            const known = await requestReset(user.email);
            const unknown = await requestReset('ninguem@test.com');

            assert.equal(known.status, 200);
            assert.deepEqual(known.body, unknown.body);
            assert.equal(sent.length, 1);
            assert.equal(sent[0].to, user.email);
        });

        it('mails a frontend link and stores only the hash of the token', async () => {
            const user = await registerUser();
            await requestReset(user.email);

            const token = tokenFrom(sent[0]);
            assert.match(sent[0].html, /^[\s\S]*http:\/\/localhost:5173\/reset-password\?token=/);

            const [[row]] = await database.pool.query('SELECT reset_token, reset_token_expires FROM usuarios WHERE id = ?', [user.id]);
            assert.notEqual(row.reset_token, token);
            assert.equal(row.reset_token.length, 64);
            assert.ok(row.reset_token_expires);
        });

        it('resets the password once and invalidates the old one', async () => {
            const user = await registerUser();
            await requestReset(user.email);
            const token = tokenFrom(sent[0]);

            const reset = await request(app).post('/api/auth/reset-password').send({ token, novaSenha: 'nova-senha-123' });
            assert.equal(reset.status, 200);

            await request(app).post('/api/auth/login').send({ login: user.username, senha: user.senha }).expect(401);
            await request(app).post('/api/auth/login').send({ login: user.username, senha: 'nova-senha-123' }).expect(200);

            const reuse = await request(app).post('/api/auth/reset-password').send({ token, novaSenha: 'outra-senha-456' });
            assert.equal(reuse.status, 400);
        });

        it('rejects expired, unknown and malformed tokens', async () => {
            const user = await registerUser();
            await requestReset(user.email);
            const token = tokenFrom(sent[0]);
            await database.pool.query('UPDATE usuarios SET reset_token_expires = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?', [user.id]);

            const expired = await request(app).post('/api/auth/reset-password').send({ token, novaSenha: 'nova-senha-123' });
            const unknown = await request(app).post('/api/auth/reset-password').send({ token: 'abc', novaSenha: 'nova-senha-123' });
            const weak = await request(app).post('/api/auth/reset-password').send({ token, novaSenha: '123' });

            assert.equal(expired.status, 400);
            assert.equal(expired.body.error, 'Token inválido ou expirado.');
            assert.equal(unknown.status, 400);
            assert.equal(weak.status, 400);
            assert.equal(weak.body.error, 'Dados inválidos.');
        });

        it('still answers 200 when the mail provider fails', async () => {
            const user = await registerUser();
            mock.restoreAll();
            mock.method(mailer, 'send', async () => {
                throw new Error('SMTP down');
            });

            const res = await requestReset(user.email);

            assert.equal(res.status, 200);
        });
    });
});
