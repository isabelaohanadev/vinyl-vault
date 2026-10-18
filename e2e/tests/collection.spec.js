const { test, expect, criarDisco, entrarComo, aceitarDialogos, simularITunes, PNG_BUFFER } = require('../helpers');

const abrirAba = (page, id) => page.click(id);
const cartao = (page, titulo) => page.locator('#catalog-container .card', { hasText: titulo });

test.describe('Acervo', () => {
    test('mostra contadores, separa wishlist e acervo, agrupa por gênero e filtra', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Kind of Blue', artista: 'Miles Davis', genero: 'Jazz' });
        await criarDisco(request, usuario, { nome: 'Abbey Road', artista: 'The Beatles', genero: 'Rock', adquirido: false });
        await criarDisco(request, usuario, { nome: 'Rumours', artista: 'Fleetwood Mac', genero: 'Rock' });
        await entrarComo(page, usuario);

        await expect(page.locator('#total-count')).toHaveText('3');
        await expect(page.locator('#wish-count')).toHaveText('1');
        await expect(page.locator('#owned-count')).toHaveText('2');
        await expect(page.locator('#catalog-container .main-section-title')).toHaveText(['WISHLIST', 'MEU ACERVO']);
        await expect(page.locator('#catalog-container .genero-title')).toHaveText(['ROCK', 'JAZZ', 'ROCK']);

        await page.fill('#busca', 'abbey');
        await expect(page.locator('#catalog-container .card')).toHaveCount(1);
        await page.fill('#busca', '');

        await page.selectOption('#filtro-artista', 'Miles Davis');
        await expect(page.locator('#catalog-container .card')).toHaveCount(1);
        await page.selectOption('#filtro-artista', '');

        await page.selectOption('#filtro-genero', 'Rock');
        await expect(page.locator('#catalog-container .card')).toHaveCount(2);
    });

    test('adiciona um disco manualmente, com foto, nota e troca', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);
        await abrirAba(page, '#btn-add');

        await page.setInputFiles('#fotoFile', { name: 'capa.png', mimeType: 'image/png', buffer: PNG_BUFFER });
        await page.fill('#nome', 'Blue Train');
        await page.fill('#artista', 'John Coltrane');
        await page.fill('#genero', 'Jazz');
        await page.fill('#spotifyUrl', 'https://open.spotify.com/album/abc');
        await page.locator('#add-stars-container .star').nth(3).click();
        await page.check('#jaAdquirido');
        await page.check('#negociavel');
        await page.click('#btnSalvar');

        await expect(page.locator('#toast')).toContainText('salvo com sucesso');
        const card = cartao(page, 'Blue Train');
        await expect(card).toBeVisible();
        await expect(card).toContainText('T/V');
        await expect(card.locator('.card-stars .star.filled')).toHaveCount(4);

        const salvos = await (await request.get(`/api/usuarios/${usuario.id}/vinis`, { headers: usuario.auth })).json();
        expect(salvos[0]).toMatchObject({ nome: 'Blue Train', adquirido: true, negociavel: true, nota: 4, genero: 'Jazz' });
        expect(salvos[0].foto).toMatch(/^data:image\/jpeg;base64,/);
    });

    test('a busca automática (iTunes/Apple Music) preenche capa, dados e prévia de áudio', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await simularITunes(page);
        await entrarComo(page, usuario);
        await abrirAba(page, '#btn-add');

        await page.fill('#busca-album-api', 'thriller michael jackson');
        await page.locator('.search-magic-area').getByRole('button', { name: 'Buscar' }).click();
        const resultado = page.locator('.album-result-card');
        await expect(resultado).toHaveCount(1);
        await expect(resultado).toContainText('Thriller');
        await resultado.click();

        await expect(page.locator('#nome')).toHaveValue('Thriller');
        await expect(page.locator('#artista')).toHaveValue('Michael Jackson');
        await expect(page.locator('#genero')).toHaveValue('Pop');
        await expect(page.locator('#toast')).toContainText('Álbum e Áudio importados');

        await page.check('#jaAdquirido');
        await page.click('#btnSalvar');
        await expect(cartao(page, 'Thriller')).toBeVisible();

        const [disco] = await (await request.get(`/api/usuarios/${usuario.id}/vinis`, { headers: usuario.auth })).json();
        expect(disco.preview_url).toBe('https://audio-ssl.itunes.apple.com/preview.wav');
        expect(disco.foto).toMatch(/^data:image\/jpeg;base64,/);
    });

    test('o disco desliza para fora da capa, gira enquanto a prévia toca e para ao fechar', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Thriller', artista: 'Michael Jackson', preview_url: 'https://audio-ssl.itunes.apple.com/preview.wav' });
        await simularITunes(page);
        await entrarComo(page, usuario);

        await cartao(page, 'Thriller').click();
        await expect(page.locator('#modal-vinil')).toHaveClass(/active/);
        await expect(page.locator('#modal-vinyl-wrapper')).toHaveClass(/slide-out/);

        await page.click('#btn-play-preview');
        await expect(page.locator('#modal-vinyl-record')).toHaveClass(/is-playing/);
        await expect(page.locator('#playing-indicator')).toBeVisible();
        await expect.poll(() => page.evaluate(() => !audioGlobal.paused && audioGlobal.currentTime > 0)).toBe(true);

        await page.click('#btn-play-preview');
        await expect(page.locator('#modal-vinyl-record')).not.toHaveClass(/is-playing/);
        expect(await page.evaluate(() => audioGlobal.paused)).toBe(true);

        await page.click('#btn-play-preview');
        await expect(page.locator('#modal-vinyl-record')).toHaveClass(/is-playing/);
        await page.locator('#modal-vinil .close-modal').click();
        await expect(page.locator('#modal-vinil')).not.toHaveClass(/active/);
        expect(await page.evaluate(() => audioGlobal.paused)).toBe(true);
    });

    test('edita, marca a wishlist como comprada e exclui com confirmação', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Abbey Road', artista: 'The Beatles', genero: 'Rock', adquirido: false });
        aceitarDialogos(page);
        await entrarComo(page, usuario);

        await cartao(page, 'Abbey Road').click();
        await page.getByRole('button', { name: 'Marcar como comprado' }).click();
        await expect(page.locator('#toast')).toContainText('movido da wishlist');
        await expect(page.locator('#wish-count')).toHaveText('0');
        await expect(page.locator('#owned-count')).toHaveText('1');

        await cartao(page, 'Abbey Road').click();
        await page.getByRole('button', { name: 'Editar informações' }).click();
        await expect(page.locator('#modal-edit')).toBeVisible();
        await page.fill('#edit-nome', 'Abbey Road (Remaster)');
        await page.locator('#edit-stars-container .star').nth(4).click();
        await page.getByRole('button', { name: 'Salvar alterações' }).click();
        await expect(page.locator('#toast')).toContainText('salvas com sucesso');
        await expect(cartao(page, 'Abbey Road (Remaster)').locator('.card-stars .star.filled')).toHaveCount(5);

        await cartao(page, 'Abbey Road (Remaster)').click();
        await page.getByRole('button', { name: 'Remover registro permanentemente' }).click();
        await expect(page.locator('#toast')).toContainText('removido com sucesso');
        await expect(page.locator('#catalog-container .card')).toHaveCount(0);
    });

    test('"tocando agora" aparece no menu e pode ser limpo', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Kind of Blue', artista: 'Miles Davis' });
        await entrarComo(page, usuario);

        await cartao(page, 'Kind of Blue').click();
        await page.getByRole('button', { name: /Definir como "tocando agora"/i }).click();
        await expect(page.locator('#toast')).toContainText('Status atualizado');

        await page.click('#nav-avatar');
        await expect(page.locator('#sidebar-now-playing')).toContainText('Miles Davis - Kind of Blue');
        const perfil = await (await request.get(`/api/usuarios/${usuario.id}`, { headers: usuario.auth })).json();
        expect(perfil.tocando_agora).toBe('Miles Davis - Kind of Blue');

        await page.locator('.clear-status-btn').click();
        await expect(page.locator('#sidebar-now-playing')).toBeEmpty();
    });

    test('"Descobrir" recomenda álbuns do gênero favorito e salva na wishlist em um clique', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Kind of Blue', artista: 'Miles Davis', genero: 'Jazz' });
        await criarDisco(request, usuario, { nome: 'A Love Supreme', artista: 'John Coltrane', genero: 'Jazz' });
        await simularITunes(page, [
            { id: 1, nome: 'Kind of Blue', artista: 'Miles Davis', genero: 'Jazz' },
            { id: 2, nome: 'Time Out', artista: 'The Dave Brubeck Quartet', genero: 'Jazz' },
            { id: 3, nome: 'Head Hunters', artista: 'Herbie Hancock', genero: 'Jazz' }
        ]);
        await entrarComo(page, usuario);

        await page.locator('.stats-wrapper').getByRole('button', { name: /Descobrir/ }).click();
        await expect(page.locator('#tab-discover')).toBeVisible();
        await expect(page.locator('#discover-subtitle')).toContainText('JAZZ');
        await expect(page.locator('.discover-card')).toHaveCount(2); // o que você já tem não é recomendado
        await expect(page.locator('.discover-card')).toContainText(['Time Out', 'Head Hunters']);

        await page.locator('.btn-add-wishlist').first().click();
        await expect(page.locator('.btn-add-wishlist').first()).toContainText('NA WISHLIST');

        const discos = await (await request.get(`/api/usuarios/${usuario.id}/vinis`, { headers: usuario.auth })).json();
        const novo = discos.find((d) => d.nome === 'Time Out');
        expect(novo).toMatchObject({ adquirido: false, preview_url: 'https://audio-ssl.itunes.apple.com/preview.wav' });
    });

    test('exporta a coleção em PDF', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario);
        await entrarComo(page, usuario);

        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.btn-pdf').click()]);

        expect(download.suggestedFilename()).toBe('minha-colecao-vinylvault.pdf');
    });

    test('o perfil mostra os gráficos de gêneros e de crescimento do acervo', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Kind of Blue', genero: 'Jazz' });
        await criarDisco(request, usuario, { nome: 'Rumours', genero: 'Rock' });
        await entrarComo(page, usuario);

        await page.click('#nav-avatar');
        await page.getByRole('button', { name: 'Perfil Comunidade' }).click();

        await expect(page.locator('#chartGeneros')).toBeVisible();
        await expect(page.locator('#chartCrescimento')).toBeVisible();
        const generos = await page.evaluate(() => Chart.getChart('chartGeneros').data.labels);
        expect(generos.sort()).toEqual(['Jazz', 'Rock']);
    });

    test('o tema escuro é lembrado entre visitas', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);

        await page.locator('.theme-switch').click();
        await expect(page.locator('body')).toHaveClass(/dark-mode/);

        await page.reload();
        await expect(page.locator('body')).toHaveClass(/dark-mode/);
    });

    test('o carrossel troca de banner pelos pontos', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);

        await page.locator('.carousel-dots .dot').nth(1).click();

        await expect(page.locator('.carousel-dots .dot').nth(1)).toHaveClass(/active/);
        await expect(page.locator('#carousel')).toHaveCSS('transform', /matrix/);
    });
});
