// Copia as bibliotecas de terceiros de node_modules para vendor/ (o app as carrega de lá, sem CDN).
//   npm install && npm run vendor
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const arquivos = [
    ['node_modules/chart.js/dist/chart.umd.min.js', 'vendor/chart.umd.min.js'],
    ['node_modules/chart.js/LICENSE.md', 'vendor/licenses/chart.js.LICENSE.md'],
    ['node_modules/html2pdf.js/dist/html2pdf.bundle.min.js', 'vendor/html2pdf.bundle.min.js'],
    ['node_modules/html2pdf.js/LICENSE', 'vendor/licenses/html2pdf.js.LICENSE']
];

for (const [origem, destino] of arquivos) {
    fs.mkdirSync(path.dirname(path.join(raiz, destino)), { recursive: true });
    fs.copyFileSync(path.join(raiz, origem), path.join(raiz, destino));
    console.log(`${origem} -> ${destino}`);
}
