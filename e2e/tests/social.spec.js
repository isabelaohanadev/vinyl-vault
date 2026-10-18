const { test, expect, criarDisco, criarPost, entrarComo, aceitarDialogos, simularITunes, PNG_BUFFER } = require('../helpers');

const irParaComunidade = async (page) => {
    await page.click('#btn-community');
    await expect(page.locator('#tab-community')).toBeVisible();
};
const menuLateral = async (page, item) => {
    await page.click('#nav-avatar');
    await page.getByRole('button', { name: item }).click();
};
const postDe = (page, legenda) => page.locator('#timeline-container .post-card', { hasText: legenda });

test.describe('Timeline e publicações', () => {
    test('curte, vê quem curtiu e filtra por hashtag', async ({ page, request, criarUsuario }) => {
        const autora = await criarUsuario({ nome_completo: 'Ana Autora' });
        const leitor = await criarUsuario();
        const legenda = `Disco novo na estante #jazz #vinil ${Date.now()}`;
        await criarPost(request, autora, { legenda });
        await entrarComo(page, leitor);
        await irParaComunidade(page);

        const post = postDe(page, 'Disco novo na estante');
        await expect(post.locator('.hashtag')).toHaveText(['#jazz', '#vinil']);

        await post.locator('.btn-like').click();
        await expect(post.locator('.btn-like')).toContainText('❤️');
        await expect(post.locator('.btn-like')).toContainText('1 curtidas');
        await post.locator('.btn-ver-curtidas').click();
        await expect(page.locator('#modal-usuarios.active')).toContainText(leitor.username);
        await page.locator('#modal-usuarios .close-modal').click();

        await post.locator('.btn-like').click();
        await expect(post.locator('.btn-like')).toContainText('0 curtidas');

        await post.locator('.hashtag', { hasText: '#jazz' }).click();
        await expect(page.locator('.active-filter-banner')).toContainText('#jazz');
        await expect(postDe(page, 'Disco novo na estante')).toBeVisible();
        await page.getByRole('button', { name: /Limpar Filtro/ }).click();
        await expect(page.locator('.active-filter-banner')).toHaveCount(0);
    });

    test('abre a publicação, comenta, responde em thread e apaga o próprio comentário', async ({ page, request, criarUsuario }) => {
        const autora = await criarUsuario();
        const leitor = await criarUsuario();
        await criarPost(request, autora, { legenda: 'Foto do meu vinil favorito' });
        aceitarDialogos(page);
        await entrarComo(page, leitor);
        await irParaComunidade(page);

        await postDe(page, 'Foto do meu vinil favorito').locator('.post-card-img').click();
        await expect(page.locator('#tab-post-detail')).toBeVisible();
        await expect(page.locator('#post-page-legenda')).toContainText('Foto do meu vinil favorito');

        await page.fill('#post-page-comment-input', 'Que capa linda!');
        await page.getByRole('button', { name: 'Enviar', exact: true }).click();
        const comentario = page.locator('.comment-wrapper', { hasText: 'Que capa linda!' });
        await expect(comentario).toBeVisible();

        await comentario.getByRole('button', { name: 'Responder' }).click();
        await expect(page.locator('#post-page-comment-input')).toHaveAttribute('placeholder', new RegExp(`Respondendo a @${leitor.username}`));
        await page.fill('#post-page-comment-input', 'Concordo, é demais');
        await page.getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(page.locator('.comment-child-wrapper', { hasText: 'Concordo, é demais' })).toBeVisible();

        await comentario.getByRole('button', { name: 'Apagar' }).click();
        await expect(page.locator('#toast')).toContainText('Comentário apagado');
        await expect(page.locator('#post-page-comments')).not.toContainText('Que capa linda!');

        await page.getByRole('button', { name: /Voltar/ }).first().click();
        await expect(page.locator('#tab-community')).toBeVisible();
    });

    test('a dona edita a legenda da própria publicação', async ({ page, request, criarUsuario }) => {
        const autora = await criarUsuario();
        const publicacao = await criarPost(request, autora, { legenda: 'Legenda antiga' });
        await entrarComo(page, autora);

        await menuLateral(page, 'Perfil Comunidade');
        await page.locator('#meus-posts img').first().click();
        await expect(page.locator('#tab-post-detail')).toBeVisible();

        await page.locator('#btn-editar-legenda').click();
        await page.fill('#input-nova-legenda', 'Legenda nova com #hashtag');
        await page.getByRole('button', { name: 'Salvar', exact: true }).click();
        await expect(page.locator('#toast')).toContainText('Legenda atualizada');
        await expect(page.locator('#post-page-legenda .hashtag')).toHaveText('#hashtag');

        const depois = await (await request.get(`/api/posts/${publicacao.id}`, { headers: autora.auth })).json();
        expect(depois.legenda).toBe('Legenda nova com #hashtag');
    });

    test('publica uma foto nova pelo perfil e ela aparece na galeria', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);
        await menuLateral(page, 'Perfil Comunidade');

        await page.getByRole('button', { name: 'Nova Publicação' }).click();
        await page.setInputFiles('#modal-post-foto', { name: 'vinil.png', mimeType: 'image/png', buffer: PNG_BUFFER });
        await page.fill('#modal-post-legenda', 'Primeira publicação #estreia');
        await page.getByRole('button', { name: 'Postar no Feed' }).click();

        await expect(page.locator('#toast')).toContainText('publicação foi enviada');
        await expect(page.locator('#meus-posts img')).toHaveCount(1);

        const posts = await (await request.get(`/api/usuarios/${usuario.id}/posts`, { headers: usuario.auth })).json();
        expect(posts[0].legenda).toBe('Primeira publicação #estreia');
        expect(posts[0].foto).toMatch(/^data:image\/jpeg;base64,/);
    });
});

test.describe('Comunidade e perfis públicos', () => {
    test('segue, deixa de seguir, busca colecionadores e abre o perfil público', async ({ page, request, criarUsuario }) => {
        const colecionadora = await criarUsuario({ nome_completo: 'Carla Colecionadora', bio: 'Colecionadora de jazz' });
        await criarDisco(request, colecionadora, { nome: 'Blue Train', artista: 'John Coltrane', negociavel: true });
        await criarDisco(request, colecionadora, { nome: 'Giant Steps', artista: 'John Coltrane' });
        const visitante = await criarUsuario();
        await entrarComo(page, visitante);
        await irParaComunidade(page);

        await page.click('#btn-tab-usuarios');
        await page.fill('#busca-comunidade', colecionadora.username);
        const card = page.locator('#community-container .user-card');
        await expect(card).toHaveCount(1);
        await expect(card).toContainText('Colecionadora de jazz');

        await card.getByRole('button', { name: 'Seguir', exact: true }).click();
        await expect(page.locator('#toast')).toContainText('seguido com sucesso');
        await expect(card.getByRole('button', { name: 'Deixar de Seguir' })).toBeVisible();

        await card.getByRole('button', { name: 'Deixar de Seguir' }).click();
        await expect(page.locator('#toast')).toContainText('deixou de seguir');
        await expect(card.getByRole('button', { name: 'Seguir', exact: true })).toBeVisible();

        await card.click();
        await expect(page.locator('#tab-public-profile')).toBeVisible();
        await expect(page.locator('#public-nome')).toHaveText('Carla Colecionadora');
        await expect(page.locator('#public-user')).toHaveText(`@${colecionadora.username}`);
        await expect(page.locator('#public-catalog-container .card')).toHaveCount(2);
        await expect(page.locator('#public-market-container .card')).toHaveCount(1);

        await page.locator('#public-actions').getByRole('button', { name: 'Seguir', exact: true }).click();
        await expect(page.locator('#public-seguidores')).toHaveText('1');
        await page.locator('#btn-public-seguidores').click();
        await expect(page.locator('#modal-usuarios.active')).toContainText(visitante.username);
    });

    test('o perfil público mostra o que a pessoa está ouvindo e abre os discos dela', async ({ page, request, criarUsuario }) => {
        const dona = await criarUsuario();
        await criarDisco(request, dona, { nome: 'Kind of Blue', artista: 'Miles Davis', negociavel: true });
        await request.put(`/api/usuarios/${dona.id}/status`, { headers: dona.auth, data: { tocando_agora: 'Miles Davis - So What' } });
        const visitante = await criarUsuario();
        await entrarComo(page, visitante);
        await irParaComunidade(page);
        await page.click('#btn-tab-usuarios');
        await page.fill('#busca-comunidade', dona.username);

        await expect(page.locator('#community-container .now-playing-badge')).toContainText('Miles Davis - So What');
        await page.locator('#community-container .user-card').click();
        await expect(page.locator('#public-now-playing')).toContainText('Ouvindo agora: Miles Davis - So What');

        await page.locator('#public-catalog-container .card').first().click();
        await expect(page.locator('#modal-vinil')).toHaveClass(/active/);
        await expect(page.locator('#modal-nome')).toContainText('Kind of Blue');
        await expect(page.getByRole('button', { name: /Chamar no chat para negociar/i })).toBeVisible();
    });

    test('os selos de conquista aparecem no perfil quando há discos suficientes', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        for (let i = 0; i < 50; i++) {
            await criarDisco(request, usuario, { nome: `Disco ${i}`, artista: `Artista ${i % 7}` });
        }
        await entrarComo(page, usuario);
        await menuLateral(page, 'Perfil Comunidade');

        await expect(page.locator('#meu-badges .badge-icon')).toHaveAttribute('title', /Iniciante/);
        await page.locator('#tab-profile-community .info-badges-btn').click();
        await expect(page.locator('#modal-legenda-selos.active')).toContainText('Lenda do Vinil');
    });
});

test.describe('Classificados, chat e notificações', () => {
    test('lista os discos para troca, busca e abre a negociação no chat', async ({ page, request, criarUsuario }) => {
        const vendedora = await criarUsuario();
        const compradora = await criarUsuario();
        await criarDisco(request, vendedora, { nome: 'Rumours', artista: 'Fleetwood Mac', negociavel: true });
        await criarDisco(request, vendedora, { nome: 'Guardado', artista: 'Ninguém', negociavel: false });
        await entrarComo(page, compradora);

        await page.click('#btn-market');
        await page.fill('#busca-market', vendedora.username);
        const anuncio = page.locator('#market-container .market-card');
        await expect(anuncio).toHaveCount(1);
        await expect(anuncio).toContainText('Rumours');
        await expect(anuncio).toContainText(`@${vendedora.username}`);

        await anuncio.click();
        await expect(page.locator('#modal-vinil')).toHaveClass(/active/);
        await page.getByRole('button', { name: /chamar @/i }).click();

        await expect(page.locator('#chat-window')).toBeVisible();
        await expect(page.locator('#chat-input')).toHaveValue(/Vi o seu disco "Rumours"/);
        await page.click('#chat-conversation-view button');
        await expect(page.locator('#chat-messages')).toContainText('Vi o seu disco "Rumours"');
    });

    test('a outra pessoa recebe o aviso no chat e na notificação, e lê a conversa', async ({ page, request, criarUsuario }) => {
        const remetente = await criarUsuario({ nome_completo: 'Rita Remetente' });
        const destinatario = await criarUsuario();
        await request.post('/api/mensagens', { headers: remetente.auth, data: { destinatario_id: destinatario.id, texto: 'Oi! Ainda tem o disco?' } });
        await entrarComo(page, destinatario);

        await expect(page.locator('#chat-unread-badge')).toBeVisible();
        await expect(page.locator('#chat-unread-badge')).toHaveText('1');
        await expect(page.locator('#badge-notif')).toBeVisible();

        await page.click('#floating-chat-btn');
        const conversa = page.locator('#chat-list-view .conversa-item', { hasText: 'Rita Remetente' });
        await expect(conversa).toBeVisible();
        await conversa.click();
        await expect(page.locator('#chat-messages')).toContainText('Oi! Ainda tem o disco?');

        await page.fill('#chat-input', 'Tenho sim!');
        await page.click('#chat-conversation-view button');
        await expect(page.locator('#chat-messages')).toContainText('Tenho sim!');
        await expect(page.locator('#chat-unread-badge')).toBeHidden({ timeout: 15_000 });

        const historico = await (await request.get(`/api/mensagens/${destinatario.id}`, { headers: remetente.auth })).json();
        expect(historico.map((m) => m.texto)).toEqual(['Oi! Ainda tem o disco?', 'Tenho sim!']);
    });

    test('encaminha um disco do acervo para outro colecionador pelo chat', async ({ page, request, criarUsuario }) => {
        const dona = await criarUsuario();
        const amiga = await criarUsuario({ nome_completo: 'Amiga Encaminhada' });
        await criarDisco(request, dona, { nome: 'Kind of Blue', artista: 'Miles Davis' });
        await entrarComo(page, dona);

        await page.locator('#catalog-container .card', { hasText: 'Kind of Blue' }).click();
        await page.getByRole('button', { name: 'Encaminhar disco no chat' }).click();
        await page.locator('#lista-encaminhar div', { hasText: 'Amiga Encaminhada' }).first().click();

        await expect(page.locator('#chat-window')).toBeVisible();
        await expect(page.locator('#chat-messages')).toContainText('Olha esse disco incrível do acervo!');
        await expect(page.locator('#chat-messages')).toContainText('Kind of Blue');
    });

    test('mostra as notificações, marca como lida ao clicar e abre o perfil de quem seguiu', async ({ page, request, criarUsuario }) => {
        const alvo = await criarUsuario();
        const seguidor = await criarUsuario();
        await request.post(`/api/usuarios/${alvo.id}/seguir`, { headers: seguidor.auth });
        await entrarComo(page, alvo);

        await expect(page.locator('#badge-notif')).toHaveText('1');
        await page.locator('.notif-wrapper').click();
        const item = page.locator('.notif-item', { hasText: `@${seguidor.username} começou a seguir você` });
        await expect(item).toHaveClass(/unread/);

        await item.click();
        await expect(page.locator('#tab-public-profile')).toBeVisible();
        await expect(page.locator('#public-user')).toHaveText(`@${seguidor.username}`);
        await expect(page.locator('#badge-notif')).toBeHidden();
    });
});

test.describe('Meu perfil', () => {
    test('edita nome, bio e foto, e o menu reflete a mudança', async ({ page, criarUsuario, request }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);
        await menuLateral(page, 'Editar Perfil');

        await page.fill('#edit-perfil-nome', 'Novo Nome Completo');
        await page.fill('#edit-perfil-bio', 'Minha nova biografia');
        await page.setInputFiles('#edit-perfil-foto', { name: 'eu.png', mimeType: 'image/png', buffer: PNG_BUFFER });
        await page.getByRole('button', { name: 'Salvar Alterações' }).click();
        await expect(page.locator('#toast')).toContainText('perfil foi atualizado');

        const perfil = await (await request.get(`/api/usuarios/${usuario.id}`, { headers: usuario.auth })).json();
        expect(perfil).toMatchObject({ nome_completo: 'Novo Nome Completo', bio: 'Minha nova biografia' });
        expect(perfil.foto_perfil).toMatch(/^data:image\/jpeg;base64,/);

        await page.click('#nav-avatar');
        await expect(page.locator('#sidebar-name')).toHaveText('Olá, Novo!');
    });

    test('a senha só muda pelo link enviado ao e-mail', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);
        await menuLateral(page, 'Editar Perfil');

        await page.click('#btn-reset-perfil');

        await expect(page.locator('#toast')).toContainText('O Link foi enviado');
    });

    test('exclui a conta depois de duas confirmações', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        const mensagens = aceitarDialogos(page, 'EXCLUIR');
        await entrarComo(page, usuario);
        await menuLateral(page, 'Editar Perfil');

        await page.getByRole('button', { name: 'Excluir Minha Conta' }).click();

        await expect(page.locator('#auth-screen')).toBeVisible();
        expect(mensagens.some((m) => m.includes('conta foi excluída'))).toBe(true);
        const login = await request.post('/api/auth/login', { data: { login: usuario.username, senha: usuario.senha } });
        expect(login.status()).toBe(401);
    });

    test('a exclusão é cancelada se a palavra de confirmação estiver errada', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        const mensagens = aceitarDialogos(page, 'excluir');
        await entrarComo(page, usuario);
        await menuLateral(page, 'Editar Perfil');

        await page.getByRole('button', { name: 'Excluir Minha Conta' }).click();

        await expect.poll(() => mensagens.some((m) => m.includes('cancelado'))).toBe(true);
        const login = await request.post('/api/auth/login', { data: { login: usuario.username, senha: usuario.senha } });
        expect(login.status()).toBe(200);
    });
});
