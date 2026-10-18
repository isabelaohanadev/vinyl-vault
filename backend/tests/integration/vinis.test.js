const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');

const abbeyRoad = { nome: 'Abbey Road', artista: 'The Beatles', genero: 'Rock', ano: 1969, estado_capa: 'NM', estado_disco: 'VG+' };

describe('vinyls', () => {
    let ana;
    let bruno;

    const addVinil = (user, body = abbeyRoad) => request(app).post('/api/vinis').set(asUser(user)).send(body);
    const notificationsFor = async (userId) => (await database.pool.query('SELECT * FROM notificacoes WHERE usuario_id = ?', [userId]))[0];

    before(applySchema);
    beforeEach(async () => {
        await truncateAll();
        ana = await registerUser({ username: 'ana' });
        bruno = await registerUser({ username: 'bruno' });
    });
    after(() => database.close());

    describe('POST /api/vinis', () => {
        it('creates a vinyl with sensible defaults and real booleans', async () => {
            const res = await addVinil(ana, { nome: 'Kind of Blue', artista: 'Miles Davis' });

            assert.equal(res.status, 201);
            assert.equal(res.body.vinil.usuario_id, ana.id);
            assert.equal(res.body.vinil.adquirido, true);
            assert.equal(res.body.vinil.negociavel, false);
            assert.equal(res.body.vinil.nota, 0);
            assert.equal(res.body.vinil.foto, null);
        });

        it('stores the extra details sent by the form', async () => {
            const res = await addVinil(ana, { ...abbeyRoad, ano: '1969', foto: 'https://img.example.com/abbey.jpg', negociavel: true });

            assert.equal(res.body.vinil.ano, 1969);
            assert.equal(res.body.vinil.estado_capa, 'NM');
            assert.equal(res.body.vinil.estado_disco, 'VG+');
            assert.equal(res.body.vinil.negociavel, true);
        });

        it('always assigns the vinyl to the token owner, ignoring a forged usuario_id', async () => {
            const res = await addVinil(ana, { ...abbeyRoad, usuario_id: bruno.id });

            assert.equal(res.body.vinil.usuario_id, ana.id);
            const brunos = await request(app).get(`/api/usuarios/${bruno.id}/vinis`).set(asUser(bruno));
            assert.deepEqual(brunos.body, []);
        });

        it('validates the payload', async () => {
            const bad = await addVinil(ana, { artista: 'Sem nome', nota: 9, ano: 3000, estado_capa: 'X', foto: 'ftp://x', spotify: 'javascript:1' });

            assert.equal(bad.status, 400);
            assert.deepEqual(bad.body.details.map((d) => d.campo).sort(), ['ano', 'estado_capa', 'foto', 'nome', 'nota', 'spotify']);
            await request(app).post('/api/vinis').send(abbeyRoad).expect(401);
        });
    });

    describe('GET /api/usuarios/:id/vinis and /api/vinis/:id', () => {
        it('lists a collection newest first, visible to other collectors', async () => {
            await addVinil(ana, { nome: 'Primeiro', artista: 'A' });
            await addVinil(ana, { nome: 'Segundo', artista: 'B' });

            const res = await request(app).get(`/api/usuarios/${ana.id}/vinis`).set(asUser(bruno));

            assert.equal(res.status, 200);
            assert.deepEqual(res.body.map((v) => v.nome), ['Segundo', 'Primeiro']);
        });

        it('404s for an unknown user or vinyl and requires a token', async () => {
            await request(app).get('/api/usuarios/99999/vinis').set(asUser(ana)).expect(404);
            await request(app).get('/api/vinis/99999').set(asUser(ana)).expect(404);
            await request(app).get(`/api/usuarios/${ana.id}/vinis`).expect(401);
        });

        it('returns a single vinyl', async () => {
            const { body } = await addVinil(ana);

            const res = await request(app).get(`/api/vinis/${body.vinil.id}`).set(asUser(bruno));

            assert.equal(res.body.nome, 'Abbey Road');
        });
    });

    describe('PUT /api/vinis/:id', () => {
        it('updates only the provided fields', async () => {
            const { body } = await addVinil(ana, { ...abbeyRoad, nota: 3 });

            const res = await request(app).put(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).send({ nota: 5, genero: '' });

            assert.equal(res.status, 200);
            assert.equal(res.body.vinil.nota, 5);
            assert.equal(res.body.vinil.genero, null);
            assert.equal(res.body.vinil.nome, 'Abbey Road');
            assert.equal(res.body.vinil.negociavel, false);
        });

        it('forbids editing somebody else\'s vinyl and 404s for unknown ones', async () => {
            const { body } = await addVinil(ana);

            await request(app).put(`/api/vinis/${body.vinil.id}`).set(asUser(bruno)).send({ nome: 'Roubado' }).expect(403);
            await request(app).put('/api/vinis/99999').set(asUser(ana)).send({ nome: 'x' }).expect(404);

            const stored = await request(app).get(`/api/vinis/${body.vinil.id}`).set(asUser(ana));
            assert.equal(stored.body.nome, 'Abbey Road');
        });

        it('rejects an empty update', async () => {
            const { body } = await addVinil(ana);

            await request(app).put(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).send({}).expect(400);
        });
    });

    describe('DELETE /api/vinis/:id', () => {
        it('lets only the owner delete', async () => {
            const { body } = await addVinil(ana);

            await request(app).delete(`/api/vinis/${body.vinil.id}`).set(asUser(bruno)).expect(403);
            await request(app).delete(`/api/vinis/${body.vinil.id}`).expect(401);
            await request(app).get(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).expect(200);

            await request(app).delete(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).expect(200);
            await request(app).get(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).expect(404);
            await request(app).delete(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).expect(404);
        });
    });

    describe('GET /api/classificados', () => {
        it('shows only tradable vinyls from other collectors, with the owner attached', async () => {
            await addVinil(ana, { ...abbeyRoad, negociavel: true });
            await addVinil(ana, { nome: 'Guardado', artista: 'X' });
            await addVinil(bruno, { nome: 'Rumours', artista: 'Fleetwood Mac', negociavel: true });

            const res = await request(app).get('/api/classificados').set(asUser(ana));

            assert.equal(res.status, 200);
            assert.deepEqual(res.body.map((v) => v.nome), ['Rumours']);
            assert.equal(res.body[0].dono.username, 'bruno');
            assert.equal(res.body[0].dono.id, bruno.id);
            assert.equal(res.body[0].negociavel, true);
            assert.equal(res.body[0].dono.email, undefined);
        });

        it('searches by title or artist and treats LIKE wildcards literally', async () => {
            await addVinil(bruno, { nome: 'Rumours', artista: 'Fleetwood Mac', negociavel: true });
            await addVinil(bruno, { nome: '100% Pure', artista: 'Someone', negociavel: true });

            const byArtist = await request(app).get('/api/classificados?busca=fleetwood').set(asUser(ana));
            const wildcard = await request(app).get('/api/classificados?busca=%25').set(asUser(ana));
            const underscore = await request(app).get('/api/classificados?busca=_').set(asUser(ana));

            assert.deepEqual(byArtist.body.map((v) => v.nome), ['Rumours']);
            assert.deepEqual(wildcard.body.map((v) => v.nome), ['100% Pure']);
            assert.deepEqual(underscore.body, []);
        });

        it('paginates and validates the page parameters', async () => {
            for (const nome of ['A', 'B', 'C']) {
                await addVinil(bruno, { nome, artista: 'X', negociavel: true });
            }

            const page = await request(app).get('/api/classificados?limite=2&offset=1').set(asUser(ana));

            assert.deepEqual(page.body.map((v) => v.nome), ['B', 'A']);
            await request(app).get('/api/classificados?limite=0').set(asUser(ana)).expect(400);
            await request(app).get('/api/classificados?limite=9999').set(asUser(ana)).expect(400);
            await request(app).get('/api/classificados').expect(401);
        });
    });

    describe('wishlist match notifications', () => {
        const wishlistItem = { nome: 'abbey road ', artista: 'The Beatles', adquirido: false };

        it('notifies collectors who want a record when it becomes tradable', async () => {
            await addVinil(bruno, wishlistItem);

            await addVinil(ana, { ...abbeyRoad, negociavel: true });

            const [notification] = await notificationsFor(bruno.id);
            assert.equal(notification.tipo, 'match');
            assert.equal(notification.ator_id, ana.id);
        });

        it('does not notify for records that are not tradable, nor the owner themselves', async () => {
            await addVinil(bruno, wishlistItem);
            await addVinil(ana, { ...abbeyRoad, negociavel: false });
            await addVinil(bruno, { ...abbeyRoad, negociavel: true });

            assert.equal((await notificationsFor(bruno.id)).length, 0);
        });

        it('notifies once when an existing vinyl is listed, not on every later edit', async () => {
            await addVinil(bruno, wishlistItem);
            const { body } = await addVinil(ana);

            await request(app).put(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).send({ negociavel: true }).expect(200);
            await request(app).put(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).send({ nota: 4 }).expect(200);
            await request(app).put(`/api/vinis/${body.vinil.id}`).set(asUser(ana)).send({ negociavel: true, nota: 5 }).expect(200);

            assert.equal((await notificationsFor(bruno.id)).length, 1);
        });
    });
});
