const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');

describe('notifications', () => {
    let ana;
    let bruno;

    before(applySchema);
    beforeEach(async () => {
        await truncateAll();
        ana = await registerUser({ username: 'ana' });
        bruno = await registerUser({ username: 'bruno' });
        // bruno follows and messages ana: two notifications for her.
        await request(app).post(`/api/usuarios/${ana.id}/seguir`).set(asUser(bruno)).expect(201);
        await request(app).post('/api/mensagens').set(asUser(bruno)).send({ destinatario_id: ana.id, texto: 'oi' }).expect(201);
    });
    after(() => database.close());

    it('lists only my notifications, newest first, with the actor', async () => {
        const res = await request(app).get('/api/notificacoes').set(asUser(ana));

        assert.equal(res.status, 200);
        assert.deepEqual(res.body.map((n) => n.tipo), ['mensagem', 'seguir']);
        assert.equal(res.body[0].ator.username, 'bruno');
        assert.equal(res.body[0].ator.email, undefined);
        assert.equal(res.body[0].lida, false);

        const brunos = await request(app).get('/api/notificacoes').set(asUser(bruno));
        assert.deepEqual(brunos.body, []);
        await request(app).get('/api/notificacoes').expect(401);
    });

    it('respects the limit parameter', async () => {
        const res = await request(app).get('/api/notificacoes?limite=1').set(asUser(ana));

        assert.equal(res.body.length, 1);
        await request(app).get('/api/notificacoes?limite=0').set(asUser(ana)).expect(400);
    });

    it('counts unread notifications', async () => {
        const res = await request(app).get('/api/notificacoes/nao-lidas').set(asUser(ana));

        assert.deepEqual(res.body, { total: 2 });
    });

    it('marks one notification as read', async () => {
        const [first] = (await request(app).get('/api/notificacoes').set(asUser(ana))).body;

        await request(app).put(`/api/notificacoes/${first.id}/ler`).set(asUser(ana)).expect(200);

        const unread = await request(app).get('/api/notificacoes/nao-lidas').set(asUser(ana));
        assert.equal(unread.body.total, 1);
    });

    it('cannot mark somebody else\'s notification (404, and it stays unread)', async () => {
        const [first] = (await request(app).get('/api/notificacoes').set(asUser(ana))).body;

        await request(app).put(`/api/notificacoes/${first.id}/ler`).set(asUser(bruno)).expect(404);
        await request(app).put(`/api/notificacoes/${first.id}/ler`).expect(401);
        await request(app).put('/api/notificacoes/99999/ler').set(asUser(ana)).expect(404);

        const unread = await request(app).get('/api/notificacoes/nao-lidas').set(asUser(ana));
        assert.equal(unread.body.total, 2);
    });

    it('marks all of mine as read without touching other users', async () => {
        await request(app).post(`/api/usuarios/${bruno.id}/seguir`).set(asUser(ana)).expect(201);

        await request(app).put('/api/notificacoes/ler-todas').set(asUser(ana)).expect(200);

        const anas = await request(app).get('/api/notificacoes/nao-lidas').set(asUser(ana));
        const brunos = await request(app).get('/api/notificacoes/nao-lidas').set(asUser(bruno));
        assert.equal(anas.body.total, 0);
        assert.equal(brunos.body.total, 1);
    });
});
