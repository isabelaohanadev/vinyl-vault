const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');

describe('users', () => {
    let ana;
    let bruno;

    before(applySchema);
    beforeEach(async () => {
        await truncateAll();
        ana = await registerUser({ username: 'ana', data_nascimento: '1990-01-01', bio: 'Jazz' });
        bruno = await registerUser({ username: 'bruno' });
    });
    after(() => database.close());

    describe('GET /api/usuarios/:id', () => {
        it('shows the public profile without private data', async () => {
            const res = await request(app).get(`/api/usuarios/${ana.id}`).set(asUser(bruno));

            assert.equal(res.status, 200);
            assert.equal(res.body.username, 'ana');
            assert.equal(res.body.bio, 'Jazz');
            assert.equal(res.body.email, undefined);
            assert.equal(res.body.data_nascimento, undefined);
            assert.equal(res.body.senha, undefined);
        });

        it('404s for unknown users, 400s for malformed ids and requires a token', async () => {
            await request(app).get('/api/usuarios/99999').set(asUser(ana)).expect(404);
            await request(app).get('/api/usuarios/abc').set(asUser(ana)).expect(400);
            await request(app).get(`/api/usuarios/${ana.id}`).expect(401);
        });
    });

    describe('PUT /api/usuarios/:id', () => {
        it('updates only the fields that were sent', async () => {
            const res = await request(app)
                .put(`/api/usuarios/${ana.id}`)
                .set(asUser(ana))
                .send({ nome_completo: 'Ana Maria', foto_perfil: 'https://img.example.com/ana.png' });

            assert.equal(res.status, 200);
            assert.equal(res.body.usuario.nome_completo, 'Ana Maria');
            assert.equal(res.body.usuario.foto_perfil, 'https://img.example.com/ana.png');
            assert.equal(res.body.usuario.bio, 'Jazz');
        });

        it('clears the bio and the photo when sent empty', async () => {
            await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(ana)).send({ foto_perfil: 'https://img.example.com/a.png' }).expect(200);

            const res = await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(ana)).send({ bio: '', foto_perfil: '' });

            assert.equal(res.body.usuario.bio, null);
            assert.equal(res.body.usuario.foto_perfil, null);
        });

        it('rejects an empty update and invalid values', async () => {
            await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(ana)).send({}).expect(400);
            await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(ana)).send({ nome_completo: 'A' }).expect(400);
            await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(ana)).send({ foto_perfil: 'file:///etc/passwd' }).expect(400);
        });

        it('does not let a client change the e-mail or the username', async () => {
            await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(ana)).send({ bio: 'x', email: 'hacker@evil.com', username: 'root' }).expect(200);

            const me = await request(app).get('/api/auth/me').set(asUser(ana));
            assert.equal(me.body.usuario.email, ana.email);
            assert.equal(me.body.usuario.username, 'ana');
        });

        it('changes the password only when the current one is provided and correct', async () => {
            const url = `/api/usuarios/${ana.id}`;

            await request(app).put(url).set(asUser(ana)).send({ senha: 'nova-senha-123' }).expect(400);
            const wrong = await request(app).put(url).set(asUser(ana)).send({ senha: 'nova-senha-123', senha_atual: 'errada-errada' });
            assert.equal(wrong.status, 400);
            assert.equal(wrong.body.error, 'Senha atual incorreta.');

            await request(app).put(url).set(asUser(ana)).send({ senha: 'nova-senha-123', senha_atual: ana.senha }).expect(200);

            await request(app).post('/api/auth/login').send({ login: 'ana', senha: ana.senha }).expect(401);
            await request(app).post('/api/auth/login').send({ login: 'ana', senha: 'nova-senha-123' }).expect(200);
        });

        it('forbids editing somebody else (IDOR)', async () => {
            const res = await request(app).put(`/api/usuarios/${ana.id}`).set(asUser(bruno)).send({ bio: 'hacked' });

            assert.equal(res.status, 403);
            const profile = await request(app).get(`/api/usuarios/${ana.id}`).set(asUser(ana));
            assert.equal(profile.body.bio, 'Jazz');
        });

        it('requires authentication', async () => {
            await request(app).put(`/api/usuarios/${ana.id}`).send({ bio: 'x' }).expect(401);
        });
    });

    describe('PUT /api/usuarios/:id/status', () => {
        it('lets the owner set and clear what is playing', async () => {
            await request(app).put(`/api/usuarios/${ana.id}/status`).set(asUser(ana)).send({ tocando_agora: 'Kind of Blue - Miles Davis' }).expect(200);
            let profile = await request(app).get(`/api/usuarios/${ana.id}`).set(asUser(bruno));
            assert.equal(profile.body.tocando_agora, 'Kind of Blue - Miles Davis');

            await request(app).put(`/api/usuarios/${ana.id}/status`).set(asUser(ana)).send({ tocando_agora: '' }).expect(200);
            profile = await request(app).get(`/api/usuarios/${ana.id}`).set(asUser(bruno));
            assert.equal(profile.body.tocando_agora, null);
        });

        it('forbids changing somebody else\'s status', async () => {
            await request(app).put(`/api/usuarios/${ana.id}/status`).set(asUser(bruno)).send({ tocando_agora: 'x' }).expect(403);
        });
    });

    describe('DELETE /api/usuarios/:id', () => {
        it('forbids deleting somebody else\'s account (IDOR)', async () => {
            await request(app).delete(`/api/usuarios/${ana.id}`).set(asUser(bruno)).expect(403);
            await request(app).delete(`/api/usuarios/${ana.id}`).expect(401);

            await request(app).get(`/api/usuarios/${ana.id}`).set(asUser(ana)).expect(200);
        });

        it('lets owners delete their own account, which invalidates the session', async () => {
            await request(app).delete(`/api/usuarios/${ana.id}`).set(asUser(ana)).expect(200);

            await request(app).get(`/api/usuarios/${ana.id}`).set(asUser(bruno)).expect(404);
            await request(app).get('/api/auth/me').set(asUser(ana)).expect(401);
            await request(app).post('/api/auth/login').send({ login: 'ana', senha: ana.senha }).expect(401);
        });
    });
});
