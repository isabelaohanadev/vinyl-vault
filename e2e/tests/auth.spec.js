const { execSync } = require('node:child_process');
const { test, expect, aceitarDialogos, entrarComo, sufixo, SENHA } = require('../helpers');

test.describe('Autenticação', () => {
    test('o cadastro em duas etapas leva direto para o app e guarda o token', async ({ page }) => {
        const id = sufixo();
        await page.goto('/');
        await expect(page.locator('#login-form')).toBeVisible();

        await page.getByRole('link', { name: 'Cadastre-se' }).click();
        await page.fill('#reg-nome', 'Eva Teste');
        await page.fill('#reg-email', `eva.${id}@example.com`);
        await page.fill('#reg-nasc', '1992-03-14');
        await page.fill('#reg-username', `eva_${id}`);
        await page.fill('#reg-bio', 'Jazz e bossa nova');
        await page.fill('#reg-pass', SENHA);
        await page.fill('#reg-confirm', SENHA);
        await page.getByRole('button', { name: 'Próximo' }).click();

        await expect(page.locator('#register-step-2')).toBeVisible();
        await page.click('#btn-finalizar-cad');

        await expect(page.locator('#app-screen')).toBeVisible();
        await expect(page.locator('#toast')).toContainText('Conta criada com sucesso');
        expect(await page.evaluate(() => localStorage.getItem('vinyl_token'))).toBeTruthy();

        // apaga a conta criada pela interface
        await page.evaluate(async () => {
            await api.delete(`/usuarios/${usuarioAtual.id}`);
        });
    });

    test('o cadastro explica o que está errado antes de chamar a API', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Cadastre-se' }).click();

        const preencher = async (campos) => {
            for (const [seletor, valor] of Object.entries({ '#reg-nome': 'Eva', '#reg-email': 'eva@example.com', '#reg-nasc': '1992-03-14', '#reg-username': 'eva_ok', '#reg-pass': SENHA, '#reg-confirm': SENHA, ...campos })) {
                await page.fill(seletor, valor);
            }
            await page.getByRole('button', { name: 'Próximo' }).click();
        };

        await preencher({ '#reg-pass': 'curta', '#reg-confirm': 'curta' });
        await expect(page.locator('#toast')).toContainText('pelo menos 8 caracteres');

        await preencher({ '#reg-username': 'com espaço' });
        await expect(page.locator('#toast')).toContainText('só letras, números');

        await preencher({ '#reg-confirm': 'outra-senha-123' });
        await expect(page.locator('#toast')).toContainText('não coincidem');

        await expect(page.locator('#register-step-2')).toBeHidden();
    });

    test('login: erro genérico para credenciais erradas e entrada com as certas', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        const mensagens = aceitarDialogos(page);

        await page.goto('/');
        await page.fill('#username-login', usuario.username);
        await page.fill('#pass-login', 'senha-errada-123');
        await page.getByRole('button', { name: 'Acessar Galeria' }).click();
        await expect.poll(() => mensagens).toContain('Credenciais inválidas.');
        await expect(page.locator('#auth-screen')).toBeVisible();

        await page.fill('#pass-login', usuario.senha);
        await page.getByRole('button', { name: 'Acessar Galeria' }).click();
        await expect(page.locator('#app-screen')).toBeVisible();
        await expect(page.locator('#toast')).toContainText('Bem-vindo de volta');
        await expect(page.locator('#nav-avatar')).toHaveText(usuario.username.charAt(0).toUpperCase());
    });

    test('uma sessão vencida ou inválida devolve para o login', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();

        await page.addInitScript((dados) => {
            localStorage.setItem('vinyl_token', 'token.invalido.qualquer');
            localStorage.setItem('vinyl_user', JSON.stringify(dados));
        }, { id: usuario.id, username: usuario.username, nome_completo: usuario.nome_completo, email: usuario.email });

        await page.goto('/');

        await expect(page.locator('#auth-screen')).toBeVisible();
        await expect(page.locator('#app-screen')).toBeHidden();
        expect(await page.evaluate(() => localStorage.getItem('vinyl_token'))).toBeNull();
    });

    test('uma sessão antiga, sem token, é descartada', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('vinyl_user', JSON.stringify({ id: 1, username: 'fantasma', nome_completo: 'Fantasma' })));

        await page.goto('/');

        await expect(page.locator('#auth-screen')).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('vinyl_user'))).toBeNull();
    });

    test('sair limpa a sessão e volta ao login', async ({ page, criarUsuario }) => {
        const usuario = await criarUsuario();
        await entrarComo(page, usuario);

        await page.click('#nav-avatar');
        await page.getByRole('button', { name: 'Sair da Conta' }).click();

        await expect(page.locator('#auth-screen')).toBeVisible();
        expect(await page.evaluate(() => [localStorage.getItem('vinyl_token'), localStorage.getItem('vinyl_user')])).toEqual([null, null]);
    });

    test('esqueci a senha responde igual para qualquer e-mail', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Esqueceu a senha?' }).click();
        await page.fill('#forgot-email', `ninguem.${sufixo()}@example.com`);
        await page.click('#btn-forgot');

        await expect(page.locator('#toast')).toContainText('Se este e-mail estiver cadastrado');
        await expect(page.locator('#login-form')).toBeVisible();
    });

    test('o link do e-mail abre o formulário de nova senha e a senha nova funciona', async ({ page, criarUsuario }) => {
        test.skip(!process.env.E2E_BACKEND_LOGS_COMMAND, 'defina E2E_BACKEND_LOGS_COMMAND (ex.: "docker compose logs --no-color backend") para ler o e-mail de recuperação');

        const usuario = await criarUsuario();
        const mensagens = aceitarDialogos(page);

        await page.goto('/');
        await page.getByRole('link', { name: 'Esqueceu a senha?' }).click();
        await page.fill('#forgot-email', usuario.email);
        await page.click('#btn-forgot');
        await expect(page.locator('#toast')).toContainText('Se este e-mail estiver cadastrado');

        // Em desenvolvimento a API escreve o e-mail no log em vez de enviá-lo.
        let link;
        await expect.poll(() => {
            const registro = execSync(process.env.E2E_BACKEND_LOGS_COMMAND, { encoding: 'utf8' });
            link = [...registro.matchAll(/href="([^"]*\?token=[0-9a-f]{64})"/g)].pop()?.[1];
            return Boolean(link);
        }, { timeout: 15_000 }).toBe(true);

        await page.goto(`/?token=${new URL(link).searchParams.get('token')}`);
        await expect(page.locator('#reset-form')).toBeVisible();

        await page.fill('#reset-nova', 'nova-senha-forte-1');
        await page.fill('#reset-confirma', 'outra-diferente-1');
        await page.click('#btn-reset');
        await expect(page.locator('#toast')).toContainText('não coincidem');

        await page.fill('#reset-confirma', 'nova-senha-forte-1');
        await page.click('#btn-reset');
        await expect(page.locator('#toast')).toContainText('Senha alterada com sucesso');

        await page.fill('#username-login', usuario.username);
        await page.fill('#pass-login', 'nova-senha-forte-1');
        await page.getByRole('button', { name: 'Acessar Galeria' }).click();
        await expect(page.locator('#app-screen')).toBeVisible();
        expect(mensagens).toEqual([]);
    });
});
