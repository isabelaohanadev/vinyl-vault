// ==========================================
// UTILITÁRIOS: SEGURANÇA DE HTML E IMAGENS
// ==========================================
//
// Tudo que vem do servidor, de outros usuários ou da API do iTunes é texto NÃO confiável.
// Antes de entrar em um template com innerHTML, passe por uma destas funções:
//
//   escapeHtml(x)  -> texto dentro de uma tag ou de um atributo entre aspas duplas
//   jsArg(x)       -> argumento de uma chamada JS dentro de onclick="..."
//   cssUrl(x)      -> valor de background-image
//   imgSrc(x)      -> atributo src de <img> (só aceita http(s), data:image e ./assets)
//   hrefSeguro(x)  -> atributo href de links externos (só http/https)
//   urlImagemSegura(x), urlAudioSegura(x) -> a URL "crua" (sem escape), para atribuir a .src

const IMAGEM_PADRAO = './assets/VinylVault.png';

const ENTIDADES_HTML = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ENTIDADES_HTML[caractere]);
}

// Gera um literal JS válido (string ou número) já escapado para viver dentro de um atributo HTML:
//   onclick="abrirChat(${jsArg(id)}, ${jsArg(nome)})"
function jsArg(valor) {
    return escapeHtml(JSON.stringify(valor === undefined ? null : valor));
}

// url('...') seguro: aspas, parênteses, barras, espaços e sinais de HTML viram %XX,
// então o endereço não consegue "fugir" da declaração CSS.
function cssUrl(endereco) {
    const seguro = String(endereco ?? '').replace(/["'()\\<>\s]/g, (caractere) => {
        return '%' + caractere.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
    });

    return `url('${seguro}')`;
}

const IMAGEM_PERMITIDA = /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,|\.\/assets\/)/i;

function urlImagemSegura(endereco) {
    const texto = String(endereco ?? '');

    return IMAGEM_PERMITIDA.test(texto) ? texto : IMAGEM_PADRAO;
}

function imgSrc(endereco) {
    return escapeHtml(urlImagemSegura(endereco));
}

const URL_WEB = /^https?:\/\//i;

// Links externos (por exemplo o do Spotify) só podem ser http(s): nada de javascript:.
function hrefSeguro(endereco) {
    const texto = String(endereco ?? '');

    return URL_WEB.test(texto) ? escapeHtml(texto) : '#';
}

// Prévia de áudio: só http(s). Devolve null quando não serve.
function urlAudioSegura(endereco) {
    const texto = String(endereco ?? '');

    return URL_WEB.test(texto) ? texto : null;
}

// Reduz uma foto escolhida pelo usuário (câmeras de celular geram arquivos de vários MB) e a
// devolve como data URL JPEG. Fundo branco: PNGs com transparência não ficam pretos.
function redimensionarImagem(arquivo, ladoMaximo = 1080, qualidade = 0.85) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();

        leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));

        leitor.onload = (eventoLeitura) => {
            const imagem = new Image();

            imagem.onerror = () => reject(new Error('Este arquivo não parece ser uma imagem válida.'));

            imagem.onload = () => {
                const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(imagem.width * escala);
                canvas.height = Math.round(imagem.height * escala);

                const contexto = canvas.getContext('2d');
                contexto.fillStyle = '#ffffff';
                contexto.fillRect(0, 0, canvas.width, canvas.height);
                contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL('image/jpeg', qualidade));
            };

            imagem.src = eventoLeitura.target.result;
        };

        leitor.readAsDataURL(arquivo);
    });
}
