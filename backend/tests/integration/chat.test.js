const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');

describe('chat', () => {
    let ana;
    let bruno;
    let carla;

    const send = (from, to, body = {}) => request(app).post('/api/mensagens').set(asUser(from)).send({ destinatario_id: to.id, ...body });

    before(applySchema);
    beforeEach(async () => {
        await truncateAll();
        ana = await registerUser({ username: 'ana' });
        bruno = await registerUser({ username: 'bruno' });
        carla = await registerUser({ username: 'carla' });
    });
    after(() => database.close());

    describe('POST /api/mensagens', () => {
        it('sends a message as the token user and notifies the recipient', async () => {
            const res = await send(ana, bruno, { texto: 'Oi! Ainda tem o Abbey Road?', remetente_id: carla.id });

            assert.equal(res.status, 201);
            assert.equal(res.body.mensagem.remetente_id, ana.id, 'sender is forged-proof');
            assert.equal(res.body.mensagem.destinatario_id, bruno.id);
            assert.equal(res.body.mensagem.lida, false);

            const [[notification]] = await database.pool.query("SELECT * FROM notificacoes WHERE usuario_id = ? AND tipo = 'mensagem'", [bruno.id]);
            assert.equal(notification.ator_id, ana.id);
        });

        it('can share a vinyl and exposes its details', async () => {
            const { body } = await request(app).post('/api/vinis').set(asUser(ana)).send({ nome: 'Rumours', artista: 'Fleetwood Mac' });

            const res = await send(ana, bruno, { vinil_id: body.vinil.id });

            assert.equal(res.status, 201);
            assert.equal(res.body.mensagem.vinil_nome, 'Rumours');
            assert.equal(res.body.mensagem.vinil_artista, 'Fleetwood Mac');
        });

        it('validates recipient, content and shared vinyl', async () => {
            await send(ana, ana, { texto: 'eu comigo' }).expect(400);
            await request(app).post('/api/mensagens').set(asUser(ana)).send({ destinatario_id: 99999, texto: 'oi' }).expect(404);
            await send(ana, bruno, {}).expect(400);
            await send(ana, bruno, { texto: '   ' }).expect(400);
            await send(ana, bruno, { texto: 'x'.repeat(2001) }).expect(400);
            await send(ana, bruno, { texto: 'oi', vinil_id: 99999 }).expect(400);
            await request(app).post('/api/mensagens').send({ destinatario_id: bruno.id, texto: 'oi' }).expect(401);
        });
    });

    describe('GET /api/mensagens/:amigo_id', () => {
        it('returns the conversation in chronological order, for its participants only', async () => {
            await send(ana, bruno, { texto: 'um' });
            await send(bruno, ana, { texto: 'dois' });
            await send(ana, carla, { texto: 'segredo para a carla' });

            const asAna = await request(app).get(`/api/mensagens/${bruno.id}`).set(asUser(ana));
            const asBruno = await request(app).get(`/api/mensagens/${ana.id}`).set(asUser(bruno));
            const asCarlaSnooping = await request(app).get(`/api/mensagens/${ana.id}`).set(asUser(carla));

            assert.deepEqual(asAna.body.map((m) => m.texto), ['um', 'dois']);
            assert.deepEqual(asBruno.body.map((m) => m.texto), ['um', 'dois']);
            assert.deepEqual(asCarlaSnooping.body.map((m) => m.texto), ['segredo para a carla']);
            await request(app).get(`/api/mensagens/${bruno.id}`).expect(401);
        });

        it('pages backwards with limite and antes', async () => {
            for (const texto of ['1', '2', '3', '4']) {
                await send(ana, bruno, { texto });
            }

            const latest = await request(app).get(`/api/mensagens/${bruno.id}?limite=2`).set(asUser(ana));
            const older = await request(app).get(`/api/mensagens/${bruno.id}?limite=2&antes=${latest.body[0].id}`).set(asUser(ana));

            assert.deepEqual(latest.body.map((m) => m.texto), ['3', '4']);
            assert.deepEqual(older.body.map((m) => m.texto), ['1', '2']);
            await request(app).get(`/api/mensagens/${bruno.id}?limite=0`).set(asUser(ana)).expect(400);
        });
    });

    describe('unread handling', () => {
        it('counts unread messages and marks a conversation as read', async () => {
            await send(bruno, ana, { texto: 'a' });
            await send(bruno, ana, { texto: 'b' });
            await send(carla, ana, { texto: 'c' });

            const before = await request(app).get('/api/mensagens/nao-lidas').set(asUser(ana));
            assert.equal(before.body.total, 3);

            await request(app).put('/api/mensagens/ler').set(asUser(ana)).send({ amigo_id: bruno.id }).expect(200);

            const after = await request(app).get('/api/mensagens/nao-lidas').set(asUser(ana));
            assert.equal(after.body.total, 1);
            await request(app).put('/api/mensagens/ler').set(asUser(ana)).send({}).expect(400);
            await request(app).get('/api/mensagens/nao-lidas').expect(401);
        });

        it('cannot mark messages addressed to somebody else as read', async () => {
            await send(bruno, ana, { texto: 'para a ana' });

            await request(app).put('/api/mensagens/ler').set(asUser(carla)).send({ amigo_id: bruno.id }).expect(200);

            const unread = await request(app).get('/api/mensagens/nao-lidas').set(asUser(ana));
            assert.equal(unread.body.total, 1);
        });
    });

    describe('GET /api/conversas', () => {
        it('lists my conversations, most recent first, with unread counts and a preview', async () => {
            await send(ana, bruno, { texto: 'oi bruno' });
            await send(carla, ana, { texto: 'oi ana' });
            await send(carla, ana, { texto: 'tudo bem?' });

            const res = await request(app).get('/api/conversas').set(asUser(ana));

            assert.equal(res.status, 200);
            assert.deepEqual(res.body.map((c) => c.username), ['carla', 'bruno']);
            assert.equal(res.body[0].nao_lidas, 2);
            assert.equal(res.body[0].ultima_mensagem, 'tudo bem?');
            assert.equal(res.body[1].nao_lidas, 0);
            assert.equal(res.body[0].email, undefined);
            await request(app).get('/api/conversas').expect(401);
        });

        it('does not leak other people\'s conversations', async () => {
            await send(bruno, carla, { texto: 'entre nós' });

            const res = await request(app).get('/api/conversas').set(asUser(ana));

            assert.deepEqual(res.body, []);
        });
    });
});
