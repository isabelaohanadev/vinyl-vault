const { test, expect, aceitarDialogos } = require('../helpers');

// Hospedagem gratuita: a API pode estar dormindo (leva até 1 minuto para acordar) e em outro domínio.
test.describe('Hospedagem gratuita', () => {
    const entrar = async (page) => {
        await page.goto('/');
        await page.fill('#username-login', 'alguem.que.nao.existe');
        await page.fill('#pass-login', 'qualquer-senha-123');
        await page.getByRole('button', { name: 'Acessar Galeria' }).click();
    };

    test('mostra um aviso fixo enquanto a API demora e o tira quando ela responde', async ({ page }) => {
        const mensagens = aceitarDialogos(page);

        await page.route('**/api/auth/login', async (rota) => {
            await new Promise((resolver) => setTimeout(resolver, 6500));
            await rota.continue();
        });

        await entrar(page);

        await expect(page.locator('.aviso-servidor')).toContainText('Acordando o servidor');
        await expect(page.locator('.aviso-servidor')).toHaveCount(0);
        await expect.poll(() => mensagens).toContain('Credenciais inválidas.');
    });

    test('não avisa quando a API responde rápido', async ({ page }) => {
        const mensagens = aceitarDialogos(page);

        await entrar(page);

        await expect.poll(() => mensagens).toContain('Credenciais inválidas.');
        await expect(page.locator('.aviso-servidor')).toHaveCount(0);
    });

    test.describe('API em outro domínio', () => {
        // A CSP de quem hospeda decide para onde o site pode se conectar (a do Docker só permite a própria
        // origem). Aqui só interessa que o app usa o endereço do config.js; a CSP da Vercel está no vercel.json.
        test.use({ bypassCSP: true });

        test('chama a API no endereço do config.js', async ({ page }) => {
            const mensagens = aceitarDialogos(page);
            const cors = {
                'access-control-allow-origin': '*',
                'access-control-allow-headers': 'content-type, authorization',
                'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
            };
            const pedidos = [];

            await page.route('**/config.js', (rota) => rota.fulfill({
                contentType: 'text/javascript',
                body: "window.VINYL_API_URL = 'https://api.exemplo.test/api';"
            }));

            // Uma API de mentira em outro domínio: responde à pré-checagem CORS e ao login.
            await page.route('https://api.exemplo.test/**', (rota) => {
                const pedido = rota.request();

                if (pedido.method() === 'OPTIONS') {
                    return rota.fulfill({ status: 204, headers: cors });
                }

                pedidos.push(`${pedido.method()} ${new URL(pedido.url()).pathname}`);

                return rota.fulfill({
                    status: 401,
                    headers: { ...cors, 'content-type': 'application/json' },
                    body: JSON.stringify({ error: 'Resposta da API externa.' })
                });
            });

            await entrar(page);

            await expect.poll(() => mensagens).toContain('Resposta da API externa.');
            expect(pedidos).toEqual(['POST /api/auth/login']);
        });
    });
});
