const { test, expect, criarDisco, criarPost, entrarComo, aceitarDialogos, simularITunes } = require('../helpers');

// Cada payload marca window.__xss com um número diferente: se algum executar, o teste diz qual.
const xss = (n) => `<img src=x onerror="window.__xss=${n}">`;

async function prepararAtacante(request, criarUsuario) {
    const atacante = await criarUsuario({
        nome_completo: `Mallory ${xss(1)}`,
        bio: `<script>window.__xss=2</script>${xss(3)}<b>negrito</b>`
    });
    const vitima = await criarUsuario();

    await criarDisco(request, atacante, {
        nome: `"><img src=x onerror="window.__xss=4">`,
        artista: `<svg onload="window.__xss=5">`,
        genero: `x</option><img src=x onerror="window.__xss=6">`,
        negociavel: true
    });
    const post = await criarPost(request, atacante, { legenda: `Olá ${xss(7)} #tag<script>window.__xss=8</script>` });
    await request.post(`/api/posts/${post.id}/comentarios`, { headers: atacante.auth, data: { texto: xss(9) } });
    await request.put(`/api/usuarios/${atacante.id}/status`, { headers: atacante.auth, data: { tocando_agora: xss(10) } });
    await request.post('/api/mensagens', { headers: atacante.auth, data: { destinatario_id: vitima.id, texto: xss(11) } });

    return { atacante, vitima };
}

async function nenhumScriptExecutou(page, dialogos) {
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('img[onerror], svg[onload], #app-screen script')).toHaveCount(0);
    expect(dialogos).toEqual([]);
}

test.describe('Conteúdo hostil (XSS)', () => {
    test('o que outras pessoas escrevem aparece como texto, nunca como HTML ou script', async ({ page, request, criarUsuario }) => {
        const { atacante, vitima } = await prepararAtacante(request, criarUsuario);
        const dialogos = aceitarDialogos(page);
        await entrarComo(page, vitima);

        // timeline e página da publicação
        await page.click('#btn-community');
        const post = page.locator('#timeline-container .post-card', { hasText: 'Olá' });
        await expect(post).toContainText('<img src=x onerror="window.__xss=7">');
        await expect(post).toContainText('Mallory <img src=x');
        await expect(post.locator('.hashtag')).toHaveText('#tag');
        await post.locator('.post-card-img').click();
        await expect(page.locator('#post-page-comments')).toContainText('<img src=x onerror="window.__xss=9">');
        await page.getByRole('button', { name: /Voltar/ }).first().click();

        // lista de colecionadores: nome, bio e "tocando agora"
        await page.click('#btn-tab-usuarios');
        await page.fill('#busca-comunidade', atacante.username);
        const card = page.locator('#community-container .user-card');
        await expect(card).toContainText('Mallory <img src=x');
        await expect(card).toContainText('<script>window.__xss=2</script>');
        await expect(card.locator('.now-playing-badge')).toContainText('<img src=x onerror="window.__xss=10">');
        await expect(card.locator('b').filter({ hasText: 'negrito' })).toHaveCount(0);

        // perfil público e discos dele
        await card.click();
        await expect(page.locator('#public-nome')).toContainText('Mallory <img src=x');
        await expect(page.locator('#public-now-playing')).toContainText('window.__xss=10');
        await expect(page.locator('#public-catalog-container .card')).toContainText('<svg onload="window.__xss=5">');
        await page.locator('#public-catalog-container .card').click();
        await expect(page.locator('#modal-nome')).toContainText('<img src=x onerror="window.__xss=4">');
        await page.locator('#modal-vinil .close-modal').click();

        // classificados
        await page.click('#btn-market');
        const anuncio = page.locator('#market-container .market-card', { hasText: atacante.username });
        await expect(anuncio).toContainText('<img src=x onerror="window.__xss=4">');
        await anuncio.click();
        await expect(page.getByRole('button', { name: /chamar @/i })).toBeVisible();
        await page.locator('#modal-vinil .close-modal').click();

        // chat e notificações
        await page.click('#floating-chat-btn');
        await page.locator('#chat-list-view .conversa-item', { hasText: atacante.username }).click();
        await expect(page.locator('#chat-messages')).toContainText('<img src=x onerror="window.__xss=11">');

        await nenhumScriptExecutou(page, dialogos);
    });

    test('o próprio conteúdo hostil também não executa no acervo e no menu do dono', async ({ page, request, criarUsuario }) => {
        const { atacante } = await prepararAtacante(request, criarUsuario);
        const dialogos = aceitarDialogos(page);
        await entrarComo(page, atacante);

        await expect(page.locator('#catalog-container .card')).toContainText('<svg onload="window.__xss=5">');
        await expect(page.locator('#filtro-genero')).toContainText('window.__xss=6');
        await expect(page.locator('#catalog-container .genero-title')).toContainText('<IMG SRC=X ONERROR=');
        await page.locator('#catalog-container .card').click();
        await expect(page.locator('#modal-nome')).toContainText('window.__xss=4');
        await page.getByRole('button', { name: /Definir como "tocando agora"/i }).click();
        await page.click('#nav-avatar');
        await expect(page.locator('#sidebar-now-playing')).toContainText('<svg onload="window.__xss=5">');
        await page.getByRole('button', { name: 'Perfil Comunidade' }).click();
        await expect(page.locator('#meu-nome-comunidade')).toContainText('Mallory <img src=x');

        await nenhumScriptExecutou(page, dialogos);
    });

    test('os resultados da API do iTunes também são tratados como não confiáveis', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        const dialogos = aceitarDialogos(page);
        await simularITunes(page, [{ id: 7, nome: `Álbum ${xss(20)}`, artista: `O'Brien" ${xss(21)}`, genero: `Pop${xss(22)}` }]);
        await entrarComo(page, usuario);
        await page.click('#btn-add');

        await page.fill('#busca-album-api', 'qualquer coisa');
        await page.locator('.search-magic-area').getByRole('button', { name: 'Buscar' }).click();
        const resultado = page.locator('.album-result-card');
        await expect(resultado).toContainText('<img src=x onerror="window.__xss=20">');
        await resultado.click();

        await expect(page.locator('#artista')).toHaveValue(`O'Brien" ${xss(21)}`);
        await nenhumScriptExecutou(page, dialogos);
    });
});

test.describe('Sessão e API', () => {
    test('a API recusa chamadas sem token ou com token inválido', async ({ request }) => {
        for (const rota of ['/api/usuarios/1/vinis', '/api/classificados', '/api/comunidade', '/api/posts', '/api/notificacoes', '/api/conversas', '/api/auth/me']) {
            expect((await request.get(rota)).status(), rota).toBe(401);
        }

        const invalido = await request.get('/api/auth/me', { headers: { Authorization: 'Bearer abc.def.ghi' } });
        expect(invalido.status()).toBe(401);
    });

    test('o token da sessão nunca é enviado para a API do iTunes', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        await simularITunes(page);
        const cabecalhos = [];
        page.on('request', (requisicao) => {
            if (/itunes\.apple\.com|mzstatic\.com/.test(requisicao.url())) {
                cabecalhos.push(requisicao.headers());
            }
        });
        await entrarComo(page, usuario);
        await page.click('#btn-add');

        await page.fill('#busca-album-api', 'thriller');
        await page.locator('.search-magic-area').getByRole('button', { name: 'Buscar' }).click();
        await page.locator('.album-result-card').click();
        await expect(page.locator('#nome')).toHaveValue('Thriller');

        expect(cabecalhos.length).toBeGreaterThan(0);
        for (const h of cabecalhos) {
            expect(h.authorization).toBeUndefined();
        }
    });

    test('os helpers de escape neutralizam links e imagens perigosos', async ({ page }) => {
        await page.goto('/');

        const resultado = await page.evaluate(() => ({
            link: hrefSeguro('javascript:alert(1)'),
            linkOk: hrefSeguro('https://open.spotify.com/album/1'),
            imagem: imgSrc('javascript:alert(1)'),
            imagemOk: imgSrc('https://is1-ssl.mzstatic.com/a.jpg'),
            audio: urlAudioSegura('javascript:alert(1)'),
            css: cssUrl(`https://x/a.png');background:red;("`),
            argumento: jsArg(`');alert(1);//"`)
        }));

        expect(resultado.link).toBe('#');
        expect(resultado.linkOk).toBe('https://open.spotify.com/album/1');
        expect(resultado.imagem).toContain('VinylVault.png');
        expect(resultado.imagemOk).toBe('https://is1-ssl.mzstatic.com/a.jpg');
        expect(resultado.audio).toBeNull();
        // continua sendo um único url('...') sem aspas, parênteses ou espaços soltos dentro
        expect(resultado.css).toMatch(/^url\('[^'"()\s\\]*'\)$/);
        // um literal JS único (uma string entre aspas), com aspas e HTML escapados
        expect(resultado.argumento).toMatch(/^&quot;.*&quot;$/);
        expect(resultado.argumento).not.toMatch(/[<>"]/);
    });
});
