const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');

describe('community', () => {
    let ana;
    let bruno;
    let carla;

    const follow = (who, target) => request(app).post(`/api/usuarios/${target.id}/seguir`).set(asUser(who));

    before(applySchema);
    beforeEach(async () => {
        await truncateAll();
        ana = await registerUser({ username: 'ana', nome_completo: 'Ana Souza' });
        bruno = await registerUser({ username: 'bruno', nome_completo: 'Bruno Lima' });
        carla = await registerUser({ username: 'carla.dj', nome_completo: 'Carla Dias' });
    });
    after(() => database.close());

    describe('GET /api/comunidade', () => {
        it('lists everybody but me, flagging who I follow, without private data', async () => {
            await follow(ana, bruno).expect(201);

            const res = await request(app).get('/api/comunidade').set(asUser(ana));

            assert.equal(res.status, 200);
            assert.deepEqual(res.body.map((u) => [u.username, u.is_seguindo]), [['bruno', true], ['carla.dj', false]]);
            assert.equal(res.body[0].email, undefined);
            assert.equal(res.body[0].senha, undefined);
        });

        it('searches by name or username and escapes wildcards', async () => {
            const byName = await request(app).get('/api/comunidade?busca=dias').set(asUser(ana));
            const byUsername = await request(app).get('/api/comunidade?busca=carla.dj').set(asUser(ana));
            const wildcard = await request(app).get('/api/comunidade?busca=%25').set(asUser(ana));

            assert.deepEqual(byName.body.map((u) => u.username), ['carla.dj']);
            assert.deepEqual(byUsername.body.map((u) => u.username), ['carla.dj']);
            assert.deepEqual(wildcard.body, []);
        });

        it('paginates and requires a token', async () => {
            const page = await request(app).get('/api/comunidade?limite=1&offset=1').set(asUser(ana));

            assert.deepEqual(page.body.map((u) => u.username), ['carla.dj']);
            await request(app).get('/api/comunidade').expect(401);
        });
    });

    describe('follow / unfollow', () => {
        it('follows, notifies once and is idempotent', async () => {
            const first = await follow(ana, bruno);
            const second = await follow(ana, bruno);

            assert.equal(first.status, 201);
            assert.equal(second.status, 200);
            const [notifications] = await database.pool.query("SELECT * FROM notificacoes WHERE usuario_id = ? AND tipo = 'seguir'", [bruno.id]);
            assert.equal(notifications.length, 1);
            assert.equal(notifications[0].ator_id, ana.id);
        });

        it('refuses to follow yourself or someone who does not exist', async () => {
            await follow(ana, ana).expect(400);
            await request(app).post('/api/usuarios/99999/seguir').set(asUser(ana)).expect(404);
            await request(app).post(`/api/usuarios/${bruno.id}/seguir`).expect(401);
        });

        it('unfollows only for the authenticated user (cannot remove other people\'s follows)', async () => {
            await follow(ana, bruno).expect(201);
            await follow(carla, bruno).expect(201);

            await request(app).delete(`/api/usuarios/${bruno.id}/seguir`).set(asUser(ana)).expect(200);

            const stats = await request(app).get(`/api/usuarios/${bruno.id}/stats`).set(asUser(bruno));
            assert.equal(stats.body.seguidores, 1);
            const carlaFollows = await request(app).get(`/api/usuarios/${carla.id}/seguindo`).set(asUser(carla));
            assert.deepEqual(carlaFollows.body.map((u) => u.username), ['bruno']);
        });
    });

    describe('profile stats and relations', () => {
        it('counts followers, following, owned vinyls, wishlist, tradable records and posts, and tells if I follow', async () => {
            await follow(ana, bruno);
            await follow(carla, bruno);
            await follow(bruno, ana);
            await request(app).post('/api/vinis').set(asUser(bruno)).send({ nome: 'A', artista: 'B', negociavel: true });
            await request(app).post('/api/vinis').set(asUser(bruno)).send({ nome: 'C', artista: 'D' });
            await request(app).post('/api/vinis').set(asUser(bruno)).send({ nome: 'E', artista: 'F', adquirido: false });
            await request(app).post('/api/posts').set(asUser(bruno)).send({ legenda: 'oi' });

            const res = await request(app).get(`/api/usuarios/${bruno.id}/stats`).set(asUser(ana));

            assert.deepEqual(res.body, { seguidores: 2, seguindo: 1, total_vinis: 2, total_desejos: 1, total_trocas: 1, total_posts: 1, eu_sigo: true });
        });

        it('lists followers and following as public profiles', async () => {
            await follow(ana, bruno);
            await follow(carla, bruno);
            await follow(bruno, ana);

            const followers = await request(app).get(`/api/usuarios/${bruno.id}/seguidores`).set(asUser(ana));
            const following = await request(app).get(`/api/usuarios/${bruno.id}/seguindo`).set(asUser(ana));

            assert.deepEqual(followers.body.map((u) => u.username).sort(), ['ana', 'carla.dj']);
            assert.deepEqual(following.body.map((u) => u.username), ['ana']);
            assert.equal(followers.body[0].email, undefined);
        });

        it('404s for unknown users', async () => {
            await request(app).get('/api/usuarios/99999/stats').set(asUser(ana)).expect(404);
            await request(app).get('/api/usuarios/99999/seguidores').set(asUser(ana)).expect(404);
            await request(app).get('/api/usuarios/99999/seguindo').set(asUser(ana)).expect(404);
        });

        it('cascades: deleting an account removes its follows', async () => {
            await follow(ana, bruno);
            await request(app).delete(`/api/usuarios/${ana.id}`).set(asUser(ana)).expect(200);

            const stats = await request(app).get(`/api/usuarios/${bruno.id}/stats`).set(asUser(bruno));
            assert.equal(stats.body.seguidores, 0);
        });
    });
});
