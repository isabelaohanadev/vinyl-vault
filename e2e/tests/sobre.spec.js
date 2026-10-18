const { test, expect, entrarComo, PNG_BUFFER } = require('../helpers');

// A foto de "Sobre Nós" é pessoal e não vai para o Git: num clone novo o arquivo não existe.
test.describe('Sobre Nós', () => {
    test('esconde a foto quando o arquivo não existe', async ({ page, criarUsuario }) => {
        await page.route('**/assets/iandj.jpg', (rota) => rota.fulfill({ status: 404, body: '' }));

        await entrarComo(page, await criarUsuario());
        await page.evaluate(() => switchTab('aboutus'));

        await expect(page.locator('#tab-aboutus')).toBeVisible();
        await expect(page.locator('.aboutus-img')).toBeHidden();
        await expect(page.getByText('Este projeto nasceu de um encontro.')).toBeVisible();
    });

    test('mostra a foto quando ela existe', async ({ page, criarUsuario }) => {
        await page.route('**/assets/iandj.jpg', (rota) => rota.fulfill({ status: 200, contentType: 'image/png', body: PNG_BUFFER }));

        await entrarComo(page, await criarUsuario());
        await page.evaluate(() => switchTab('aboutus'));

        await expect(page.locator('.aboutus-img')).toBeVisible();
    });
});
