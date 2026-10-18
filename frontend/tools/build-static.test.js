const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizarApiUrl, construir } = require('./build-static');

describe('normalizarApiUrl', () => {
    it('acrescenta /api quando só o domínio é informado e tira barras do fim', () => {
        assert.equal(normalizarApiUrl('https://vinyl.onrender.com'), 'https://vinyl.onrender.com/api');
        assert.equal(normalizarApiUrl('https://vinyl.onrender.com/'), 'https://vinyl.onrender.com/api');
        assert.equal(normalizarApiUrl(' https://vinyl.onrender.com/api/ '), 'https://vinyl.onrender.com/api');
    });

    it('só aceita http em localhost', () => {
        assert.equal(normalizarApiUrl('http://localhost:3000'), 'http://localhost:3000/api');
        assert.throws(() => normalizarApiUrl('http://vinyl.onrender.com'), /https/);
    });

    it('recusa o que não é um endereço', () => {
        assert.throws(() => normalizarApiUrl('minha-api'), /não é um endereço válido/);
        assert.throws(() => normalizarApiUrl('javascript:alert(1)'), /https/);
    });
});

describe('construir', () => {
    const pasta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vinyl-static-'));

    it('publica só os arquivos do navegador e escreve o config.js', () => {
        const destino = pasta();

        construir({ destino, apiUrl: 'https://vinyl.onrender.com' });

        for (const item of ['index.html', 'config.js', 'scripts/api.js', 'styles/global.css', 'vendor', 'assets']) {
            assert.ok(fs.existsSync(path.join(destino, item)), `faltou ${item}`);
        }

        for (const item of ['Dockerfile', 'nginx', 'node_modules', 'dev-server.js', 'package.json', 'tools']) {
            assert.ok(!fs.existsSync(path.join(destino, item)), `${item} não deveria ser publicado`);
        }

        const config = fs.readFileSync(path.join(destino, 'config.js'), 'utf8');

        assert.match(config, /window\.VINYL_API_URL = "https:\/\/vinyl\.onrender\.com\/api";/);
        fs.rmSync(destino, { recursive: true, force: true });
    });

    it('sem endereço da API usa a mesma origem, exceto na Vercel, onde o build falha', () => {
        const destino = pasta();

        construir({ destino });
        assert.match(fs.readFileSync(path.join(destino, 'config.js'), 'utf8'), /window\.VINYL_API_URL = "";/);

        assert.throws(() => construir({ destino, naVercel: true }), /VINYL_API_URL/);
        fs.rmSync(destino, { recursive: true, force: true });
    });
});
