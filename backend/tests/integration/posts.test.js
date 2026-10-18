const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerUser, asUser } = require('../helpers/api');
const { applySchema, truncateAll } = require('../helpers/db');
const database = require('../../src/config/database');

describe('posts', () => {
    let ana;
    let bruno;

    const createPost = (user, body = { legenda: 'Nova aquisição #vinil' }) => request(app).post('/api/posts').set(asUser(user)).send(body);
    const notificationsFor = async (userId) => (await database.pool.query('SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY id', [userId]))[0];

    before(applySchema);
    beforeEach(async () => {
        await truncateAll();
        ana = await registerUser({ username: 'ana' });
        bruno = await registerUser({ username: 'bruno' });
    });
    after(() => database.close());

    describe('create / read', () => {
        it('creates a post for the token owner and returns it with the author', async () => {
            const res = await createPost(ana, { legenda: 'Olá', foto: 'https://img.example.com/a.jpg', usuario_id: bruno.id });

            assert.equal(res.status, 201);
            assert.equal(res.body.post.usuario_id, ana.id);
            assert.equal(res.body.post.autor.username, 'ana');
            assert.equal(res.body.post.likes_count, 0);
            assert.equal(res.body.post.user_liked, false);
        });

        it('stamps posts with the real current time, whatever the time zones of Node and MySQL', async () => {
            const { body } = await createPost(ana);

            const ageMs = Date.now() - Date.parse(body.post.criado_em);

            assert.ok(Math.abs(ageMs) < 15_000, `criado_em is ${Math.round(ageMs / 3_600_000)}h off from now (${body.post.criado_em})`);
        });

        it('needs a photo or a caption and a valid photo', async () => {
            await createPost(ana, {}).expect(400);
            await createPost(ana, { legenda: '   ' }).expect(400);
            await createPost(ana, { foto: 'javascript:alert(1)' }).expect(400);
            await request(app).post('/api/posts').send({ legenda: 'x' }).expect(401);
        });

        it('reads a single post and 404s for unknown ones', async () => {
            const { body } = await createPost(ana);

            const res = await request(app).get(`/api/posts/${body.post.id}`).set(asUser(bruno));

            assert.equal(res.body.legenda, 'Nova aquisição #vinil');
            await request(app).get('/api/posts/99999').set(asUser(bruno)).expect(404);
        });

        it('serves the timeline newest first with like state for the viewer', async () => {
            const first = await createPost(ana, { legenda: 'primeiro' });
            await createPost(bruno, { legenda: 'segundo' });
            await request(app).post(`/api/posts/${first.body.post.id}/curtir`).set(asUser(bruno));

            const res = await request(app).get('/api/posts').set(asUser(bruno));

            assert.deepEqual(res.body.map((p) => p.legenda), ['segundo', 'primeiro']);
            assert.equal(res.body[1].likes_count, 1);
            assert.equal(res.body[1].user_liked, true);
            assert.equal(res.body[0].user_liked, false);
            await request(app).get('/api/posts').expect(401);
        });

        it('filters by whole hashtag only', async () => {
            await createPost(ana, { legenda: 'amo #rock demais' });
            await createPost(ana, { legenda: 'hoje só #rockabilly' });
            await createPost(ana, { legenda: '#ROCK!' });
            await createPost(ana, { legenda: 'sem tag' });

            const res = await request(app).get('/api/posts?hashtag=rock').set(asUser(ana));
            const withHash = await request(app).get('/api/posts?hashtag=%23rock').set(asUser(ana));

            assert.deepEqual(res.body.map((p) => p.legenda).sort(), ['#ROCK!', 'amo #rock demais']);
            assert.equal(withHash.body.length, 2);
            await request(app).get('/api/posts?hashtag=a%20b').set(asUser(ana)).expect(400);
            await request(app).get('/api/posts?hashtag=%27%20OR%201=1').set(asUser(ana)).expect(400);
        });

        it('lists the posts of one user', async () => {
            await createPost(ana, { legenda: 'da ana' });
            await createPost(bruno, { legenda: 'do bruno' });

            const res = await request(app).get(`/api/usuarios/${ana.id}/posts`).set(asUser(bruno));

            assert.deepEqual(res.body.map((p) => p.legenda), ['da ana']);
            await request(app).get('/api/usuarios/99999/posts').set(asUser(bruno)).expect(404);
        });

        it('paginates the timeline', async () => {
            for (const legenda of ['a', 'b', 'c']) {
                await createPost(ana, { legenda });
            }

            const res = await request(app).get('/api/posts?limite=2&offset=1').set(asUser(ana));

            assert.deepEqual(res.body.map((p) => p.legenda), ['b', 'a']);
            await request(app).get('/api/posts?limite=500').set(asUser(ana)).expect(400);
        });
    });

    describe('update / delete', () => {
        it('lets the owner edit the caption, but nobody else', async () => {
            const { body } = await createPost(ana);

            await request(app).put(`/api/posts/${body.post.id}`).set(asUser(bruno)).send({ legenda: 'hacked' }).expect(403);
            const res = await request(app).put(`/api/posts/${body.post.id}`).set(asUser(ana)).send({ legenda: 'editado' });

            assert.equal(res.status, 200);
            assert.equal(res.body.post.legenda, 'editado');
            await request(app).put('/api/posts/99999').set(asUser(ana)).send({ legenda: 'x' }).expect(404);
        });

        it('does not let a text-only post lose its caption', async () => {
            const { body } = await createPost(ana);

            await request(app).put(`/api/posts/${body.post.id}`).set(asUser(ana)).send({ legenda: '' }).expect(400);
        });

        it('lets only the owner delete, cascading likes and comments', async () => {
            const { body } = await createPost(ana);
            await request(app).post(`/api/posts/${body.post.id}/curtir`).set(asUser(bruno));
            await request(app).post(`/api/posts/${body.post.id}/comentarios`).set(asUser(bruno)).send({ texto: 'bom' });

            await request(app).delete(`/api/posts/${body.post.id}`).set(asUser(bruno)).expect(403);
            await request(app).delete(`/api/posts/${body.post.id}`).set(asUser(ana)).expect(200);
            await request(app).get(`/api/posts/${body.post.id}`).set(asUser(ana)).expect(404);

            const [[{ likes }]] = await database.pool.query('SELECT COUNT(*) AS likes FROM curtidas');
            const [[{ comments }]] = await database.pool.query('SELECT COUNT(*) AS comments FROM comentarios');
            assert.equal(likes + comments, 0);
        });
    });

    describe('likes', () => {
        it('toggles a like, counts it and notifies the owner derived from the database', async () => {
            const { body } = await createPost(ana);
            const url = `/api/posts/${body.post.id}/curtir`;

            const liked = await request(app).post(url).set(asUser(bruno)).send({ dono_post_id: bruno.id });
            assert.deepEqual(liked.body, { acao: 'adicionada', user_liked: true, likes_count: 1 });

            const [notification] = await notificationsFor(ana.id);
            assert.equal(notification.tipo, 'curtida');
            assert.equal(notification.ator_id, bruno.id);
            assert.equal(notification.post_id, body.post.id);
            assert.equal((await notificationsFor(bruno.id)).length, 0, 'a forged dono_post_id must be ignored');

            const unliked = await request(app).post(url).set(asUser(bruno));
            assert.deepEqual(unliked.body, { acao: 'removida', user_liked: false, likes_count: 0 });
        });

        it('does not notify when liking your own post, and 404s for unknown posts', async () => {
            const { body } = await createPost(ana);

            await request(app).post(`/api/posts/${body.post.id}/curtir`).set(asUser(ana)).expect(200);
            await request(app).post('/api/posts/99999/curtir').set(asUser(ana)).expect(404);
            await request(app).post(`/api/posts/${body.post.id}/curtir`).expect(401);

            assert.equal((await notificationsFor(ana.id)).length, 0);
        });

        it('lists who liked a post', async () => {
            const { body } = await createPost(ana);
            await request(app).post(`/api/posts/${body.post.id}/curtir`).set(asUser(bruno));

            const res = await request(app).get(`/api/posts/${body.post.id}/curtidas`).set(asUser(ana));

            assert.deepEqual(res.body.map((u) => u.username), ['bruno']);
            assert.equal(res.body[0].email, undefined);
        });
    });

    describe('comments', () => {
        it('adds comments, notifies the post owner (or the replied author) and lists them in order', async () => {
            const { body } = await createPost(ana);
            const url = `/api/posts/${body.post.id}/comentarios`;

            const first = await request(app).post(url).set(asUser(bruno)).send({ texto: 'Que capa linda!' });
            await request(app).post(url).set(asUser(ana)).send({ texto: 'Obrigada!', parent_id: first.body.id }).expect(201);

            const list = await request(app).get(url).set(asUser(ana));
            assert.deepEqual(list.body.map((c) => [c.username, c.texto]), [['bruno', 'Que capa linda!'], ['ana', 'Obrigada!']]);
            assert.equal(list.body[1].parent_id, first.body.id);

            const [notification] = await notificationsFor(ana.id);
            assert.equal(notification.tipo, 'comentario');
            assert.equal((await notificationsFor(ana.id)).length, 1, 'bruno commented on ana\'s post');
            assert.equal((await notificationsFor(bruno.id)).length, 1, 'ana replied to bruno\'s comment');
        });

        it('notifies the mentioned user instead of the post owner', async () => {
            const { body } = await createPost(ana);
            const carla = await registerUser({ username: 'carla' });

            await request(app)
                .post(`/api/posts/${body.post.id}/comentarios`)
                .set(asUser(bruno))
                .send({ texto: '@carla olha isso', usuario_mencionado_id: carla.id })
                .expect(201);

            assert.equal((await notificationsFor(carla.id)).length, 1);
            assert.equal((await notificationsFor(ana.id)).length, 0);
        });

        it('validates text, parent and mention', async () => {
            const { body } = await createPost(ana);
            const other = await createPost(bruno);
            const parent = await request(app).post(`/api/posts/${other.body.post.id}/comentarios`).set(asUser(ana)).send({ texto: 'x' });
            const url = `/api/posts/${body.post.id}/comentarios`;

            await request(app).post(url).set(asUser(bruno)).send({ texto: '' }).expect(400);
            await request(app).post(url).set(asUser(bruno)).send({ texto: 'x'.repeat(1001) }).expect(400);
            await request(app).post(url).set(asUser(bruno)).send({ texto: 'ok', parent_id: parent.body.id }).expect(400);
            await request(app).post(url).set(asUser(bruno)).send({ texto: 'ok', usuario_mencionado_id: 99999 }).expect(400);
            await request(app).post('/api/posts/99999/comentarios').set(asUser(bruno)).send({ texto: 'ok' }).expect(404);
            await request(app).post(url).send({ texto: 'ok' }).expect(401);
        });

        it('lets the comment author or the post owner delete it, nobody else', async () => {
            const { body } = await createPost(ana);
            const carla = await registerUser({ username: 'carla' });
            const url = `/api/posts/${body.post.id}/comentarios`;
            const c1 = await request(app).post(url).set(asUser(bruno)).send({ texto: 'um' });
            const c2 = await request(app).post(url).set(asUser(bruno)).send({ texto: 'dois' });

            await request(app).delete(`/api/comentarios/${c1.body.id}`).set(asUser(carla)).expect(403);
            await request(app).delete(`/api/comentarios/${c1.body.id}`).set(asUser(bruno)).expect(200);
            await request(app).delete(`/api/comentarios/${c2.body.id}`).set(asUser(ana)).expect(200);
            await request(app).delete(`/api/comentarios/${c2.body.id}`).set(asUser(ana)).expect(404);
            await request(app).delete(`/api/comentarios/${c1.body.id}`).expect(401);

            const list = await request(app).get(url).set(asUser(ana));
            assert.deepEqual(list.body, []);
        });
    });
});
