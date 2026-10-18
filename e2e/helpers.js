const base = require('@playwright/test');

const { expect } = base;

const SENHA = 'senha-forte-123';
let contador = 0;

const sufixo = () => `${Date.now().toString(36)}${(contador++).toString(36)}`;

// Cria um usuário pela API (rápido e independente da interface) e devolve a sessão.
async function novoUsuario(request, sobrescrever = {}) {
    const id = sufixo();
    const corpo = {
        nome_completo: `Colecionador ${id}`,
        email: `e2e.${id}@example.com`,
        username: `e2e_${id}`,
        senha: SENHA,
        data_nascimento: '1990-05-20',
        ...sobrescrever
    };

    const resposta = await request.post('/api/auth/register', { data: corpo });
    expect(resposta.status(), `cadastro: ${await resposta.text()}`).toBe(201);
    const dados = await resposta.json();

    return { ...dados.usuario, token: dados.token, senha: corpo.senha, auth: { Authorization: `Bearer ${dados.token}` } };
}

async function criarDisco(request, usuario, disco = {}) {
    const resposta = await request.post('/api/vinis', {
        headers: usuario.auth,
        data: { nome: 'Kind of Blue', artista: 'Miles Davis', genero: 'Jazz', adquirido: true, nota: 0, ...disco }
    });
    expect(resposta.status(), `disco: ${await resposta.text()}`).toBe(201);

    return (await resposta.json()).vinil;
}

async function criarPost(request, usuario, post = {}) {
    const resposta = await request.post('/api/posts', { headers: usuario.auth, data: { foto: PNG_PIXEL, legenda: 'Meu novo disco', ...post } });
    expect(resposta.status(), `post: ${await resposta.text()}`).toBe(201);

    return (await resposta.json()).post;
}

// Entra no app já autenticado (como se a pessoa tivesse feito login antes).
async function entrarComo(page, usuario) {
    await page.addInitScript(([token, dados]) => {
        localStorage.setItem('vinyl_token', token);
        localStorage.setItem('vinyl_user', JSON.stringify(dados));
    }, [usuario.token, { id: usuario.id, email: usuario.email, nome_completo: usuario.nome_completo, username: usuario.username, bio: usuario.bio, foto_perfil: usuario.foto_perfil }]);

    await page.goto('/');
    await expect(page.locator('#app-screen')).toBeVisible();
}

// confirm()/prompt()/alert(): aceita tudo e guarda as mensagens para as asserções.
function aceitarDialogos(page, respostaDoPrompt = 'EXCLUIR') {
    const mensagens = [];

    page.on('dialog', (dialogo) => {
        mensagens.push(dialogo.message());

        if (dialogo.type() === 'prompt') {
            dialogo.accept(respostaDoPrompt);
        } else {
            dialogo.accept();
        }
    });

    return mensagens;
}

// Um PNG de 1x1 pixel, válido para o upload de imagens.
const PNG_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG_BUFFER = Buffer.from(PNG_PIXEL.split(',')[1], 'base64');

// Um áudio de 2 segundos para o player ter o que tocar.
function audioDeTeste() {
    const taxa = 8000;
    const amostras = taxa * 2;
    const buffer = Buffer.alloc(44 + amostras * 2);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + amostras * 2, 4);
    buffer.write('WAVEfmt ', 8);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(taxa, 24);
    buffer.writeUInt32LE(taxa * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(amostras * 2, 40);

    for (let i = 0; i < amostras; i++) {
        buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / taxa) * 8000), 44 + i * 2);
    }

    return buffer;
}

const CAPA_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#355834"/><circle cx="300" cy="300" r="200" fill="#14281D"/><circle cx="300" cy="300" r="60" fill="#C2A878"/></svg>';

// Substitui a API do iTunes e as imagens/áudio dela por respostas fixas: os testes não dependem da internet.
async function simularITunes(page, albuns = [{ id: 111, nome: 'Thriller', artista: 'Michael Jackson', genero: 'Pop' }]) {
    const cors = { 'access-control-allow-origin': '*' };

    await page.route(/itunes\.apple\.com\/search/, (rota) => rota.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: cors,
        body: JSON.stringify({
            results: albuns.map((a) => ({
                collectionId: a.id,
                collectionName: a.nome,
                artistName: a.artista,
                primaryGenreName: a.genero,
                artworkUrl100: `https://is1-ssl.mzstatic.com/image/${a.id}/100x100bb.jpg`
            }))
        })
    }));

    await page.route(/itunes\.apple\.com\/lookup/, (rota) => rota.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: cors,
        body: JSON.stringify({ results: [{ wrapperType: 'collection' }, { wrapperType: 'track', previewUrl: 'https://audio-ssl.itunes.apple.com/preview.wav' }] })
    }));

    await page.route(/mzstatic\.com\/image/, (rota) => rota.fulfill({ status: 200, contentType: 'image/svg+xml', headers: cors, body: CAPA_SVG }));
    await page.route(/audio-ssl\.itunes\.apple\.com\/preview\.wav/, (rota) => rota.fulfill({ status: 200, contentType: 'audio/wav', headers: cors, body: audioDeTeste() }));
}

// `test` com um fixture que cria usuários e os apaga no final (o banco não acumula contas de teste).
const test = base.test.extend({
    criarUsuario: async ({ request }, use) => {
        const criados = [];

        await use(async (sobrescrever) => {
            const usuario = await novoUsuario(request, sobrescrever);
            criados.push(usuario);
            return usuario;
        });

        for (const usuario of criados) {
            await request.delete(`/api/usuarios/${usuario.id}`, { headers: usuario.auth });
        }
    }
});

module.exports = { test, expect, SENHA, novoUsuario, criarDisco, criarPost, entrarComo, aceitarDialogos, simularITunes, PNG_PIXEL, PNG_BUFFER, audioDeTeste, CAPA_SVG, sufixo };
