// Servidor de desenvolvimento do front: entrega os arquivos estáticos e encaminha /api para o backend.
// Sem dependências:  node dev-server.js   (porta 5173 e backend em http://localhost:3000 por padrão)
//
//   PORT=5173  API_TARGET=http://localhost:3000  node dev-server.js
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 5173);
const API_TARGET = new URL(process.env.API_TARGET || 'http://localhost:3000');
const ROOT = __dirname;

// Só estas entradas são públicas (nada de package.json, dev-server.js, node_modules...).
const PUBLICO = new Set(['index.html', 'config.js', 'scripts', 'styles', 'assets', 'vendor']);

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.map': 'application/json'
};

function encaminharParaApi(req, res) {
    const proxy = http.request(
        {
            hostname: API_TARGET.hostname,
            port: API_TARGET.port || 80,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: API_TARGET.host, 'x-forwarded-for': req.socket.remoteAddress }
        },
        (resposta) => {
            res.writeHead(resposta.statusCode, resposta.headers);
            resposta.pipe(res);
        }
    );

    proxy.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Backend indisponível em ${API_TARGET.origin}. Ele está ligado?` }));
    });

    req.pipe(proxy);
}

function entregarArquivo(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    const relativo = decodeURIComponent(pathname === '/' ? '/index.html' : pathname).replace(/^\/+/, '');
    const arquivo = path.normalize(path.join(ROOT, relativo));
    const topo = path.relative(ROOT, arquivo).split(path.sep)[0];

    if (arquivo !== ROOT && !arquivo.startsWith(ROOT + path.sep)) {
        res.writeHead(403).end('Proibido');
        return;
    }

    if (!PUBLICO.has(topo)) {
        res.writeHead(404).end('Não encontrado');
        return;
    }

    fs.readFile(arquivo, (erro, conteudo) => {
        if (erro) {
            res.writeHead(404).end('Não encontrado');
            return;
        }

        res.writeHead(200, {
            'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        res.end(conteudo);
    });
}

http.createServer((req, res) => {
    if (req.url === '/api' || req.url.startsWith('/api/')) {
        encaminharParaApi(req, res);
    } else {
        entregarArquivo(req, res);
    }
}).listen(PORT, () => {
    console.log(`Vinyl Vault (front) em http://localhost:${PORT}  ->  /api para ${API_TARGET.origin}`);
});
