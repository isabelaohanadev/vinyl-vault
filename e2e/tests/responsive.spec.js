const { test, expect, criarDisco, entrarComo } = require('../helpers');

test.use({ viewport: { width: 390, height: 844 } });

const semRolagemHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Celular', () => {
    test('o login cabe na tela', async ({ page }) => {
        await page.goto('/');

        await expect(page.locator('#login-form')).toBeVisible();
        expect(await semRolagemHorizontal(page)).toBeLessThanOrEqual(1);
    });

    test('o acervo e o menu lateral funcionam sem rolagem horizontal', async ({ page, request, criarUsuario }) => {
        const usuario = await criarUsuario();
        await criarDisco(request, usuario, { nome: 'Kind of Blue', artista: 'Miles Davis' });
        await entrarComo(page, usuario);

        await expect(page.locator('#catalog-container .card')).toHaveCount(1);
        expect(await semRolagemHorizontal(page)).toBeLessThanOrEqual(1);

        await page.click('#nav-avatar');
        await expect(page.locator('#user-sidebar')).toHaveClass(/active/);
        // o botão "Sair da Conta" precisa estar clicável (não coberto pelo botão flutuante de mensagens)
        await page.getByRole('button', { name: 'Sair da Conta' }).click();
        await expect(page.locator('#auth-screen')).toBeVisible();
    });
});
