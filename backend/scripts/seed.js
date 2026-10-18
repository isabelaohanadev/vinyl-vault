/*
 * Fills the database with demo data: collectors, vinyls, follows, posts,
 * likes, comments, messages and notifications.
 *
 *   npm run seed            create the demo data (does nothing if it exists)
 *   npm run seed -- --reset remove the demo users, then create them again
 *
 * Only touches users whose e-mail ends with @demo.vinylvault.test, and refuses
 * to run in production. Every demo account has the password "demo1234".
 */
const bcrypt = require('bcrypt');
const env = require('../src/config/env');
const { pool, close } = require('../src/config/database');

const DEMO_DOMAIN = '@demo.vinylvault.test';
const DEMO_PASSWORD = 'demo1234';

// Placeholder artwork from picsum.photos (random photos, not real covers).
const cover = (seed) => `https://picsum.photos/seed/${seed}/480/480`;
const avatar = (seed) => `https://picsum.photos/seed/${seed}/240/240`;

const users = [
    { key: 'ana', username: 'ana.souza', nome: 'Ana Souza', bio: 'Jazz, bossa nova e uma estante que não para de crescer.', nascimento: '1992-03-14' },
    { key: 'bruno', username: 'bruno.lima', nome: 'Bruno Lima', bio: 'Rock clássico e blues. Caçando prensagens originais dos anos 70.', nascimento: '1988-11-02' },
    { key: 'carla', username: 'carla.dj', nome: 'Carla Dias', bio: 'DJ de fim de semana, vicia em synth-pop e música eletrônica.', nascimento: '1995-07-21' },
    { key: 'diego', username: 'diego.mpb', nome: 'Diego Alves', bio: 'MPB, tropicália e samba. Vinil é terapia.', nascimento: '1990-01-30' }
];

// owner, name, artist, genre, year, cover condition, media condition, rating, tradable, owned
const vinyls = [
    ['ana', 'Kind of Blue', 'Miles Davis', 'Jazz', 1959, 'NM', 'VG+', 5, false, true],
    ['ana', 'Getz/Gilberto', 'Stan Getz & João Gilberto', 'Bossa Nova', 1964, 'VG+', 'VG+', 5, true, true],
    ['ana', 'A Love Supreme', 'John Coltrane', 'Jazz', 1965, 'VG', 'VG', 4, false, true],
    ['ana', 'Abbey Road', 'The Beatles', 'Rock', 1969, null, null, 0, false, false],
    ['bruno', 'Abbey Road', 'The Beatles', 'Rock', 1969, 'NM', 'NM', 5, true, true],
    ['bruno', 'Led Zeppelin IV', 'Led Zeppelin', 'Rock', 1971, 'VG+', 'VG', 5, false, true],
    ['bruno', 'Rumours', 'Fleetwood Mac', 'Rock', 1977, 'NM', 'NM', 4, true, true],
    ['bruno', 'Kind of Blue', 'Miles Davis', 'Jazz', 1959, null, null, 0, false, false],
    ['carla', 'Discovery', 'Daft Punk', 'Eletrônica', 2001, 'M', 'M', 5, true, true],
    ['carla', 'Violator', 'Depeche Mode', 'Synth-pop', 1990, 'VG+', 'VG+', 4, false, true],
    ['carla', 'Random Access Memories', 'Daft Punk', 'Eletrônica', 2013, 'M', 'NM', 5, true, true],
    ['diego', 'Tropicália ou Panis et Circencis', 'Vários artistas', 'Tropicália', 1968, 'VG', 'VG', 5, true, true],
    ['diego', 'Construção', 'Chico Buarque', 'MPB', 1971, 'VG+', 'VG+', 5, false, true],
    ['diego', 'Getz/Gilberto', 'Stan Getz & João Gilberto', 'Bossa Nova', 1964, null, null, 0, false, false]
];

// follower, followed
const follows = [['ana', 'bruno'], ['ana', 'carla'], ['bruno', 'ana'], ['carla', 'ana'], ['diego', 'ana'], ['diego', 'bruno']];

const posts = [
    { by: 'ana', caption: 'Chegou hoje! Prensagem linda de #KindOfBlue 🎷 #jazz #vinil', seed: 'post-kindofblue' },
    { by: 'bruno', caption: 'Domingo de #rock clássico. Qual disco vocês colocariam agora? #vinil', seed: 'post-rock' },
    { by: 'carla', caption: 'Setup novo pronto para os discos de #synthpop #vinil', seed: 'post-setup' },
    { by: 'diego', caption: 'Achei esse #tropicalia numa feira de rua. Valeu cada centavo.', seed: 'post-tropicalia' }
];

const run = async () => {
    if (env.NODE_ENV === 'production') {
        throw new Error('Recusando rodar o seed em produção.');
    }

    const reset = process.argv.includes('--reset');

    const [existing] = await pool.execute('SELECT id FROM usuarios WHERE email LIKE ?', [`%${DEMO_DOMAIN}`]);

    if (existing.length > 0 && !reset) {
        console.log(`Dados de demonstração já existem (${existing.length} usuários). Use "npm run seed -- --reset" para recriar.`);
        return;
    }

    if (reset) {
        // ON DELETE CASCADE removes the demo users' vinyls, posts, follows, messages...
        await pool.execute('DELETE FROM usuarios WHERE email LIKE ?', [`%${DEMO_DOMAIN}`]);
    }

    const hash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);
    const id = {};

    for (const user of users) {
        const [result] = await pool.execute(
            'INSERT INTO usuarios (email, nome_completo, data_nascimento, bio, username, senha, foto_perfil) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [`${user.key}${DEMO_DOMAIN}`, user.nome, user.nascimento, user.bio, user.username, hash, avatar(user.key)]
        );
        id[user.key] = result.insertId;
    }

    const vinylId = {};

    for (const [owner, nome, artista, genero, ano, capa, disco, nota, negociavel, adquirido] of vinyls) {
        const [result] = await pool.execute(
            `INSERT INTO vinis (usuario_id, nome, artista, genero, ano, estado_capa, estado_disco, nota, negociavel, adquirido, foto)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id[owner], nome, artista, genero, ano, capa, disco, nota, negociavel ? 1 : 0, adquirido ? 1 : 0, cover(`${owner}-${nome}`)]
        );
        vinylId[`${owner}:${nome}`] = result.insertId;
    }

    for (const [follower, followed] of follows) {
        await pool.execute('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [id[follower], id[followed]]);
        await pool.execute("INSERT INTO notificacoes (usuario_id, ator_id, tipo) VALUES (?, ?, 'seguir')", [id[followed], id[follower]]);
    }

    const postId = [];

    for (const post of posts) {
        const [result] = await pool.execute('INSERT INTO posts (usuario_id, foto, legenda) VALUES (?, ?, ?)', [id[post.by], cover(post.seed), post.caption]);
        postId.push(result.insertId);
    }

    const likes = [[0, 'bruno'], [0, 'carla'], [0, 'diego'], [1, 'ana'], [1, 'carla'], [2, 'ana'], [3, 'ana'], [3, 'bruno']];

    for (const [index, who] of likes) {
        await pool.execute('INSERT INTO curtidas (usuario_id, post_id) VALUES (?, ?)', [id[who], postId[index]]);
        await pool.execute("INSERT INTO notificacoes (usuario_id, ator_id, tipo, post_id) VALUES (?, ?, 'curtida', ?)", [id[posts[index].by], id[who], postId[index]]);
    }

    await pool.execute('INSERT INTO comentarios (usuario_id, post_id, texto) VALUES (?, ?, ?)', [id.bruno, postId[0], 'Que capa linda! Está em que estado?']);
    await pool.execute('INSERT INTO comentarios (usuario_id, post_id, texto) VALUES (?, ?, ?)', [id.carla, postId[0], 'Clássico absoluto 🎷']);
    await pool.execute("INSERT INTO notificacoes (usuario_id, ator_id, tipo, post_id) VALUES (?, ?, 'comentario', ?)", [id.ana, id.bruno, postId[0]]);

    const messages = [
        ['bruno', 'ana', 'Oi, Ana! Vi que você quer o Abbey Road. O meu está disponível para troca.', vinylId['bruno:Abbey Road']],
        ['ana', 'bruno', 'Opa! Troco pelo Getz/Gilberto, topa?', vinylId['ana:Getz/Gilberto']],
        ['bruno', 'ana', 'Fechado, vamos combinar a entrega.', null]
    ];

    for (const [from, to, texto, vinilId] of messages) {
        await pool.execute('INSERT INTO mensagens (remetente_id, destinatario_id, texto, vinil_id, lida) VALUES (?, ?, ?, ?, ?)', [id[from], id[to], texto, vinilId, from === 'ana' ? 0 : 1]);
    }

    await pool.execute("INSERT INTO notificacoes (usuario_id, ator_id, tipo) VALUES (?, ?, 'match')", [id.ana, id.bruno]);
    await pool.execute('UPDATE usuarios SET tocando_agora = ? WHERE id = ?', ['Kind of Blue - Miles Davis', id.ana]);

    console.log(`✅ Dados de demonstração criados: ${users.length} usuários, ${vinyls.length} discos, ${posts.length} posts.`);
    console.log(`   Login: ${users.map((u) => u.username).join(', ')}  |  senha: ${DEMO_PASSWORD}`);
};

run()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(close);
