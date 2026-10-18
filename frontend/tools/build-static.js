// Monta a pasta que vai para uma hospedagem estática (Vercel, Netlify, GitHub Pages...).
//
//   VINYL_API_URL=https://minha-api.onrender.com node tools/build-static.js
//
// Copia só o que o navegador precisa (nada de Dockerfile, nginx ou node_modules) para dist/ e escreve
// o config.js com o endereço da API, que fica em outro domínio. Sem dependências.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const PUBLICO = ['index.html', 'scripts', 'styles', 'assets', 'vendor'];

// Aceita "https://api.exemplo.com" ou "https://api.exemplo.com/api" e devolve sempre o endereço com /api.
function normalizarApiUrl(valor) {
    let url;

    try {
        url = new URL(String(valor).trim());
    } catch {
        throw new Error(`VINYL_API_URL não é um endereço válido: "${valor}".`);
    }

    const local = ['localhost', '127.0.0.1'].includes(url.hostname);

    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
        throw new Error('VINYL_API_URL precisa começar com https:// (o site publicado é HTTPS e o navegador bloquearia uma API em http).');
    }

    const caminho = url.pathname.replace(/\/+$/, '');

    return `${url.origin}${caminho || '/api'}`;
}

function construir({ origem = RAIZ, destino = path.join(RAIZ, 'dist'), apiUrl, naVercel = false } = {}) {
    if (!apiUrl && naVercel) {
        throw new Error(
            'Defina VINYL_API_URL (Project Settings > Environment Variables na Vercel) com o endereço da API, ' +
            'por exemplo https://vinyl-vault-api.onrender.com. Sem ele o site publicado chamaria /api na própria Vercel e falharia.'
        );
    }

    fs.rmSync(destino, { recursive: true, force: true });
    fs.mkdirSync(destino, { recursive: true });

    for (const item of PUBLICO) {
        fs.cpSync(path.join(origem, item), path.join(destino, item), { recursive: true });
    }

    const endereco = apiUrl ? normalizarApiUrl(apiUrl) : '';
    const config = `// Gerado por tools/build-static.js\nwindow.VINYL_API_URL = ${JSON.stringify(endereco)};\n`;

    fs.writeFileSync(path.join(destino, 'config.js'), config);

    return { destino, apiUrl: endereco };
}

if (require.main === module) {
    try {
        const { destino, apiUrl } = construir({ apiUrl: process.env.VINYL_API_URL, naVercel: Boolean(process.env.VERCEL) });

        console.log(`Site estático montado em ${path.relative(process.cwd(), destino) || '.'}`);
        console.log(apiUrl ? `API: ${apiUrl}` : 'API: mesma origem (/api)');
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = { normalizarApiUrl, construir };
