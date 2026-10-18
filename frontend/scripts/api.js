// ==========================================
// CLIENTE DA API (TOKEN, ERROS E FORMATO DAS RESPOSTAS)
// ==========================================
//
// Todas as chamadas ao backend passam por aqui. As chamadas a APIs de terceiros (iTunes) usam
// fetch direto e NUNCA recebem o token.

// "/api" funciona atrás do nginx do projeto e do servidor de desenvolvimento (scripts/dev-server.js),
// que encaminham /api para o backend. Para uma API em outro domínio, defina
// window.VINYL_API_URL antes de carregar este arquivo.
const API_URL = window.VINYL_API_URL || '/api';

const CHAVE_TOKEN = 'vinyl_token';
const CHAVE_USUARIO = 'vinyl_user';

function obterToken() {
    return localStorage.getItem(CHAVE_TOKEN);
}

function salvarSessao(token, usuario) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

function limparSessao() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
}

class ApiError extends Error {
    constructor(status, mensagem, detalhes) {
        super(mensagem);
        this.name = 'ApiError';
        this.status = status;
        this.detalhes = detalhes;
    }
}

function mensagemDeErro(dados, status) {
    if (dados && Array.isArray(dados.details) && dados.details.length > 0) {
        return dados.details.map((detalhe) => detalhe.mensagem).join(' ');
    }

    if (dados && dados.error) {
        return dados.error;
    }

    return `Erro inesperado do servidor (${status}).`;
}

let sessaoExpirando = false;

async function requisicaoApi(metodo, caminho, corpo, { autenticada = true } = {}) {
    const cabecalhos = {};
    const token = obterToken();

    if (corpo !== undefined) {
        cabecalhos['Content-Type'] = 'application/json';
    }

    if (autenticada && token) {
        cabecalhos.Authorization = `Bearer ${token}`;
    }

    let resposta;

    try {
        resposta = await fetch(`${API_URL}${caminho}`, {
            method: metodo,
            headers: cabecalhos,
            body: corpo !== undefined ? JSON.stringify(corpo) : undefined
        });
    } catch (erroDeRede) {
        throw new ApiError(0, 'Erro de conexão com o servidor. Ele está ligado?');
    }

    let dados = null;

    try {
        dados = await resposta.json();
    } catch (semCorpo) {
        // algumas respostas não têm corpo JSON
    }

    if (!resposta.ok) {
        // Um 401 com token guardado significa sessão vencida ou revogada (uma senha errada no
        // login chega sem token, então não cai aqui).
        if (resposta.status === 401 && token && autenticada && !sessaoExpirando) {
            sessaoExpirando = true;
            limparSessao();

            if (typeof logout === 'function' && usuarioAtual) {
                logout();
                showToast('Sua sessão expirou. Entre novamente.');
            }

            setTimeout(() => { sessaoExpirando = false; }, 2000);
        }

        throw new ApiError(resposta.status, mensagemDeErro(dados, resposta.status), dados && dados.details);
    }

    return dados;
}

const api = {
    get: (caminho, opcoes) => requisicaoApi('GET', caminho, undefined, opcoes),
    post: (caminho, corpo, opcoes) => requisicaoApi('POST', caminho, corpo === undefined ? {} : corpo, opcoes),
    put: (caminho, corpo, opcoes) => requisicaoApi('PUT', caminho, corpo === undefined ? {} : corpo, opcoes),
    delete: (caminho, opcoes) => requisicaoApi('DELETE', caminho, undefined, opcoes)
};

// ------------------------------------------
// A API devolve objetos aninhados (autor, dono, ator); a interface sempre trabalhou com
// campos "planos". Estes adaptadores mantêm o resto do código como sempre foi.
// ------------------------------------------
const adaptar = {
    post: (post) => ({
        ...post,
        username: post.autor.username,
        nome_completo: post.autor.nome_completo,
        foto_perfil: post.autor.foto_perfil,
        user_liked: post.user_liked ? 1 : 0
    }),

    classificado: (vinil) => ({
        ...vinil,
        username: vinil.dono.username,
        nome_completo: vinil.dono.nome_completo,
        foto_perfil: vinil.dono.foto_perfil
    }),

    notificacao: (notificacao) => ({
        ...notificacao,
        ator_id: notificacao.ator.id,
        username: notificacao.ator.username,
        foto_perfil: notificacao.ator.foto_perfil
    })
};
