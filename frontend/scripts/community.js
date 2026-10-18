// ==========================================
// 🌍 COMUNIDADE (TIMELINE, USUÁRIOS E HASHTAGS)
// ==========================================

function alternarAbaComunidade(abaSelecionada) {
    const btnTimeline = document.getElementById('btn-tab-timeline');
    const btnUsuarios = document.getElementById('btn-tab-usuarios');
    const btnConversas = document.getElementById('btn-tab-conversas');
    
    const contTimeline = document.getElementById('timeline-container');
    const contUsuarios = document.getElementById('community-container');
    const contConversas = document.getElementById('conversas-container');
    
    const buscaInput = document.getElementById('busca-comunidade');

    btnTimeline.classList.remove('active');
    btnUsuarios.classList.remove('active');
    btnConversas.classList.remove('active');
    
    contTimeline.classList.add('hidden');
    contUsuarios.classList.add('hidden');
    contConversas.classList.add('hidden');
    
    buscaInput.classList.add('hidden');

    if (abaSelecionada === 'timeline') {
        btnTimeline.classList.add('active');
        contTimeline.classList.remove('hidden');
        carregarTimeline(); 
    } else if (abaSelecionada === 'usuarios') {
        btnUsuarios.classList.add('active');
        contUsuarios.classList.remove('hidden');
        buscaInput.classList.remove('hidden');
        carregarComunidade();
    } else {
        btnConversas.classList.add('active');
        contConversas.classList.remove('hidden');
        carregarConversas();
    }
}


// Perfil que está aberto na tela de perfil público (usado pelos botões de negociação).
let perfilPublicoAtual = null;

// ------------------------------------------
// LÓGICA DE HASHTAGS (REGEX)
// ------------------------------------------

function formatarLegendaComHashtags(textoOriginal) {
    if (!textoOriginal) {
        return '';
    }
    
    return textoOriginal.replace(/#([\wÀ-ÿ]+)/g, `<span class="hashtag" onclick="filtrarTimelinePorHashtag('$1', event)">#$1</span>`);
}

function filtrarTimelinePorHashtag(hashtagTexto, evento) {
    if (evento) {
        evento.stopPropagation(); 
    }
    
    const abaCommunity = document.getElementById('tab-community');
    
    if (abaCommunity.classList.contains('hidden')) {
        switchTab('community');
        alternarAbaComunidade('timeline');
    }
    
    carregarTimeline(hashtagTexto);
}

function limparFiltroTimeline() {
    carregarTimeline();
}

async function carregarTimeline(hashtagFiltro = null) {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        let caminhoTimeline = '/posts?limite=50';

        if (hashtagFiltro) {
            caminhoTimeline += `&hashtag=${encodeURIComponent(hashtagFiltro)}`;
        }

        const postsTimeline = (await api.get(caminhoTimeline)).map(adaptar.post);

        
        const container = document.getElementById('timeline-container');
        container.innerHTML = '';
        
        if (hashtagFiltro) {
            container.innerHTML += `
                <div class="active-filter-banner">
                    <span>Mostrando resultados para: <b>#${hashtagFiltro}</b></span>
                    <button class="btn-clear-filter" onclick="limparFiltroTimeline()">✖ Limpar Filtro</button>
                </div>
            `;
        }
        
        if (postsTimeline.length === 0) {
            if (hashtagFiltro) {
                container.innerHTML += '<p style="text-align:center; color:gray; padding-top: 20px;">Nenhuma publicação encontrada com esta hashtag. :(</p>';
            } else {
                container.innerHTML += '<p style="text-align:center; color:gray;">A timeline está vazia. Seja o primeiro a postar!</p>';
            }
            return;
        }
        
        postsTimeline.forEach(post => {
            let avatarHtml = '';
            
            if (post.foto_perfil) {
                avatarHtml = `<img src="${post.foto_perfil}">`;
            } else {
                let corFundo = gerarCorHex(post.username);
                let inicial = post.username.charAt(0).toUpperCase();
                avatarHtml = `<div class="profile-avatar" style="width:40px; height:40px; font-size:1rem; background-color:${corFundo}">${inicial}</div>`;
            }
            
            let heartIcon = post.user_liked === 1 ? '❤️' : '🤍';
            let legendaComLinks = formatarLegendaComHashtags(post.legenda);
            
            container.innerHTML += `
                <div class="post-card">
                    <div class="post-header" onclick="abrirPerfilPublico(${post.usuario_id})">
                        ${avatarHtml}
                        <b>${post.nome_completo}</b>
                    </div>
                    <img class="post-card-img" src="${post.foto}" onclick="abrirPaginaPost(${post.id})">
                    <p class="post-legenda">${legendaComLinks}</p>
                    
                    <div class="post-actions">
                        <button class="btn-like" id="btn-like-${post.id}" onclick="curtirPostTimeline(${post.id}, ${post.usuario_id})">
                            ${heartIcon} <span style="font-size: 1rem; color: var(--primaria);" id="like-count-${post.id}">${post.likes_count} curtidas</span>
                        </button>
                        <button class="btn-ver-curtidas" onclick="abrirListaUsuarios('curtidas', ${post.id})">
                            Ver quem curtiu
                        </button>
                        <button class="btn-comment" onclick="abrirPaginaPost(${post.id}, true)">
                            💬 Comentar
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Erro ao carregar a timeline:", error);
    }
}

async function carregarComunidade() {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        listaComunidade = await api.get('/comunidade?limite=200');

        
        renderizarComunidade();
    } catch(erro) {
        console.error('Erro ao carregar a comunidade:', erro);
    }
}

function renderizarComunidade() {
    const buscaInput = document.getElementById('busca-comunidade');
    const termo = buscaInput.value.toLowerCase();
    
    const container = document.getElementById('community-container');
    container.innerHTML = '';

    const usuariosFiltrados = listaComunidade.filter(usuario => {
        return usuario.nome_completo.toLowerCase().includes(termo) || usuario.username.toLowerCase().includes(termo);
    });

    if (usuariosFiltrados.length === 0) { 
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: gray;">Nenhum colecionador encontrado.</p>'; 
        return; 
    }

    usuariosFiltrados.forEach(usuario => {
        let avatarStyle = '';
        let letra = '';

        if (usuario.foto_perfil) {
            avatarStyle = `background-image: url('${usuario.foto_perfil}')`;
        } else {
            avatarStyle = `background-color: ${gerarCorHex(usuario.username)}`;
            letra = usuario.username.charAt(0).toUpperCase();
        }

        let botaoSeguirHtml = '';
        
        if (usuario.is_seguindo) {
            botaoSeguirHtml = `
                <button class="btn-unfollow" onclick="deixarDeSeguir(${usuario.id}, event)">
                    Deixar de Seguir
                </button>
            `;
        } else {
            botaoSeguirHtml = `
                <button class="btn-follow" onclick="seguir(${usuario.id}, event)">
                    Seguir
                </button>
            `;
        }

        const bioTexto = usuario.bio ? usuario.bio : 'Colecionador de Vinil';
        
        // MÁGICA DO TOCANDO AGORA: Badge no card de usuário
        let tocandoAgoraHtml = '';
        
        if (usuario.tocando_agora) {
            tocandoAgoraHtml = `
                <div class="now-playing-badge" style="margin-bottom: 10px; font-size: 0.7rem; padding: 4px 8px;">
                    <span class="spin-disc">💿</span>
                    <span class="now-playing-text"><b>${usuario.tocando_agora}</b></span>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="user-card" style="cursor:pointer;" onclick="abrirPerfilPublico(${usuario.id})">
                <div class="profile-avatar user-avatar-large" style="${avatarStyle}">
                    ${letra}
                </div>
                <h4>${usuario.nome_completo}</h4>
                <span style="margin-bottom: 5px; display:block;">@${usuario.username}</span>
                ${tocandoAgoraHtml}
                <p>"${bioTexto}"</p>
                <div style="display:flex; width:100%;">
                    ${botaoSeguirHtml}
                </div>
            </div>
        `;
    });
}

async function seguir(seguido_id, event) {
    if (event) {
        event.stopPropagation();
    }

    try {
        await api.post(`/usuarios/${seguido_id}/seguir`);

        showToast('Usuário seguido com sucesso!');
        carregarComunidade();

        const perfilPublicoTab = document.getElementById('tab-public-profile');

        if (!perfilPublicoTab.classList.contains('hidden')) {
            abrirPerfilPublico(seguido_id);
        }
    } catch(erro) {
        alert(erro.message || "Erro ao tentar seguir o usuário.");
    }
}

async function deixarDeSeguir(seguido_id, event) {
    if (event) {
        event.stopPropagation();
    }

    try {
        await api.delete(`/usuarios/${seguido_id}/seguir`);

        showToast('Você deixou de seguir este usuário.');
        carregarComunidade();

        const perfilPublicoTab = document.getElementById('tab-public-profile');

        if (!perfilPublicoTab.classList.contains('hidden')) {
            abrirPerfilPublico(seguido_id);
        }
    } catch(erro) {
        alert(erro.message || "Erro ao tentar deixar de seguir o usuário.");
    }
}

// ==========================================
// VISUALIZAÇÃO DE PERFIL E SELOS
// ==========================================

async function carregarStatsPerfil(user_id, prefixo_elemento) {
    try {
        
        const estatisticas = await api.get(`/usuarios/${user_id}/stats`);

        
        const elementoSeguidores = document.getElementById(`${prefixo_elemento}-seguidores`);
        const elementoSeguindo = document.getElementById(`${prefixo_elemento}-seguindo`);
        
        if (elementoSeguidores) {
            elementoSeguidores.innerText = estatisticas.seguidores || 0;
        }
        
        if (elementoSeguindo) {
            elementoSeguindo.innerText = estatisticas.seguindo || 0;
        }

        const containerSelos = document.getElementById(`${prefixo_elemento}-badges`);
        
        if (containerSelos && typeof gerarHtmlSelos === 'function') {
            containerSelos.innerHTML = gerarHtmlSelos((estatisticas.total_vinis || 0) + (estatisticas.total_desejos || 0), estatisticas.seguidores || 0);
        }

    } catch(erro) {
        console.error("Erro ao carregar as estatísticas do perfil:", erro);
    }
}

async function abrirPerfilPublico(amigo_id) {
    if (amigo_id === usuarioAtual.id) {
        switchTab('profile-community');
        return;
    }
    
    
    let amigo;

    try {
        const [perfil, estatisticas] = await Promise.all([
            api.get(`/usuarios/${amigo_id}`),
            api.get(`/usuarios/${amigo_id}/stats`)
        ]);

        amigo = { ...perfil, is_seguindo: estatisticas.eu_sigo };
    } catch (erroPerfil) {
        showToast(erroPerfil.message || 'Não foi possível abrir este perfil.');
        return;
    }

    perfilPublicoAtual = amigo;


    document.getElementById('public-nome').innerText = amigo.nome_completo;
    document.getElementById('public-user').innerText = `@${amigo.username}`;
    
    if (amigo.bio) {
        document.getElementById('public-bio').innerText = amigo.bio;
    } else {
        document.getElementById('public-bio').innerText = 'Sem biografia disponível.';
    }
    
    const avatar = document.getElementById('public-avatar');
    
    if (amigo.foto_perfil) { 
        avatar.style.backgroundImage = `url('${amigo.foto_perfil}')`; 
        avatar.innerText = ''; 
    } else { 
        avatar.style.backgroundImage = 'none'; 
        avatar.style.backgroundColor = gerarCorHex(amigo.username); 
        avatar.innerText = amigo.username.charAt(0).toUpperCase(); 
    }

    // MÁGICA DO TOCANDO AGORA: Badge no header do Perfil Público
    const containerNowPlaying = document.getElementById('public-now-playing');
    
    if (amigo.tocando_agora) {
        containerNowPlaying.innerHTML = `
            <div class="now-playing-badge" style="margin-top: 15px;">
                <span class="spin-disc">💿</span>
                <span class="now-playing-text">Ouvindo agora: <b>${amigo.tocando_agora}</b></span>
            </div>
        `;
    } else {
        containerNowPlaying.innerHTML = '';
    }

    carregarStatsPerfil(amigo.id, 'public');

    document.getElementById('btn-public-seguidores').onclick = function() {
        abrirListaUsuarios('seguidores', amigo.id);
    };
    
    document.getElementById('btn-public-seguindo').onclick = function() {
        abrirListaUsuarios('seguindo', amigo.id);
    };

    let botaoSeguir = '';
    
    if (amigo.is_seguindo) {
        botaoSeguir = `
            <button class="nav-btn" onclick="deixarDeSeguir(${amigo.id})" style="border-color:#ff6b6b; color:#ff6b6b;">
                Deixar de Seguir
            </button>
        `;
    } else {
        botaoSeguir = `
            <button class="nav-btn" onclick="seguir(${amigo.id})" style="background:var(--primaria); color:var(--quaternaria);">
                Seguir
            </button>
        `;
    }

    const primeiroNome = amigo.nome_completo.split(' ')[0];

    document.getElementById('public-actions').innerHTML = `
        ${botaoSeguir}
        <button class="nav-btn" onclick="abrirChatEspecialParaPerfil(${amigo.id}, '${primeiroNome}')" style="background:var(--secundaria); color:white;">
            Mensagem
        </button>
    `;

    try {
        
        const vinisAmigo = await api.get(`/usuarios/${amigo.id}/vinis`);

        
        vinisPerfilPublico = vinisAmigo; 
        
        const containerVinis = document.getElementById('public-catalog-container');
        const containerMarket = document.getElementById('public-market-container');
        
        containerVinis.innerHTML = '';
        containerMarket.innerHTML = '';
        
        const vinisMarket = vinisAmigo.filter(v => v.negociavel);
        
        if (vinisMarket.length === 0) {
            containerMarket.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:gray;">Nenhum disco disponível para negociação.</p>';
        } else {
            vinisMarket.forEach(vinil => { 
                let seloEstrelas = '';
                
                if (typeof renderStarsHtml === 'function') {
                    seloEstrelas = renderStarsHtml(vinil.nota, true);
                }

                containerMarket.innerHTML += `
                    <div class="card market-card" onclick="abrirModalVinilPublico(${vinil.id})">
                        ${seloEstrelas}
                        <div class="market-badge">Negociável</div>
                        <img src="${vinil.foto}" alt="${vinil.nome}">
                        <h4>${vinil.nome}</h4>
                        <p>${vinil.artista}</p>
                    </div>
                `; 
            });
        }

        if (vinisAmigo.length === 0) {
            containerVinis.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:gray;">O acervo deste usuário está vazio no momento.</p>';
        } else {
            vinisAmigo.forEach(vinil => { 
                let seloNegociacao = '';
                
                if (vinil.negociavel) {
                    seloNegociacao = `<div style="position:absolute; top:5px; right:5px; background:var(--secundaria); color:white; font-size:0.6rem; padding:3px 6px; border-radius:4px; font-weight:bold; z-index:10;">T/V</div>`;
                }

                let seloEstrelas = '';
                
                if (typeof renderStarsHtml === 'function') {
                    seloEstrelas = renderStarsHtml(vinil.nota, true);
                }

                containerVinis.innerHTML += `
                    <div class="card" style="position:relative;" onclick="abrirModalVinilPublico(${vinil.id})">
                        ${seloEstrelas}
                        ${seloNegociacao}
                        <img src="${vinil.foto}" alt="${vinil.nome}">
                        <h4>${vinil.nome}</h4>
                        <p>${vinil.artista}</p>
                    </div>
                `; 
            });
        }
    } catch(erro) {
        console.error("Erro ao carregar o acervo do amigo:", erro);
    }

    try {
        
        const postsAmigo = await api.get(`/usuarios/${amigo.id}/posts?limite=50`);

        
        const containerPosts = document.getElementById('public-posts');
        containerPosts.innerHTML = '';
        
        if (postsAmigo.length === 0) {
            containerPosts.style.display = 'block';
            containerPosts.innerHTML = '<p style="text-align:center; color:gray;">Nenhuma publicação realizada ainda.</p>';
        } else {
            containerPosts.style.display = 'grid'; 
            postsAmigo.forEach(post => {
                containerPosts.innerHTML += `
                    <img src="${post.foto}" alt="Post" onclick="abrirPaginaPost(${post.id})">
                `;
            });
        }
    } catch(erro) {
        console.error("Erro ao carregar as publicações do amigo:", erro);
    }

    switchTab('public-profile');
}

function abrirChatEspecialParaPerfil(amigo_id, primeiroNome) {
    abrirChatWidget();
    abrirChat(amigo_id, primeiroNome);
}

function abrirModalVinilPublico(idDoVinilSelecionado) {
    const discoAchado = vinisPerfilPublico.find(discoElemento => discoElemento.id === idDoVinilSelecionado); 
    
    if (!discoAchado) {
        return; 
    }
    
    const modalViewDiv = document.getElementById('modal-view');
    modalViewDiv.classList.remove('hidden'); 
    
    const modalEditDiv = document.getElementById('modal-edit');
    modalEditDiv.classList.add('hidden');
    
    document.getElementById('modal-img').src = discoAchado.foto; 
    
    let tituloNome = discoAchado.nome;
    
    if (discoAchado.negociavel) {
        tituloNome += ` <span style="font-size:0.8rem; color:var(--secundaria);">(Disponível para Negociação)</span>`;
    }
    
    document.getElementById('modal-nome').innerHTML = tituloNome; 
    document.getElementById('modal-artista').innerText = discoAchado.artista;
    
    const displayEstrelas = document.getElementById('modal-display-stars');
    
    if (displayEstrelas && typeof renderStarsHtml === 'function') {
        displayEstrelas.innerHTML = renderStarsHtml(discoAchado.nota, false);
    }
    
    const playerContainer = document.getElementById('modal-player-container');
    
    if (playerContainer && typeof gerarHtmlPlayer === 'function') {
        playerContainer.innerHTML = gerarHtmlPlayer(discoAchado.preview_url);
    }
    
    const vinylWrapper = document.getElementById('modal-vinyl-wrapper');
    const vinylLabel = document.getElementById('modal-vinyl-label');
    
    if (vinylLabel) {
        vinylLabel.style.backgroundImage = `url('${discoAchado.foto}')`;
    }
    
    if (vinylWrapper) {
        vinylWrapper.classList.remove('slide-out');
        
        setTimeout(() => {
            vinylWrapper.classList.add('slide-out');
        }, 50);
    }
    
    let stringHtmlAcoes = '';
    
    if (discoAchado.negociavel) {
        const amigo = perfilPublicoAtual && perfilPublicoAtual.id === discoAchado.usuario_id ? perfilPublicoAtual : null;
        
        if (amigo) {
            stringHtmlAcoes += `
                <button class="modal-btn" style="background:var(--secundaria); color:white;" onclick="iniciarNegociacao(${amigo.id}, '${amigo.nome_completo}', '${discoAchado.nome}')">
                    💬 CHAMAR NO CHAT PARA NEGOCIAR
                </button>
            `;
        }
    }

    if (discoAchado.spotify) {
        stringHtmlAcoes += `
            <a href="${discoAchado.spotify}" target="_blank" class="modal-btn" style="background:var(--spotify); color:white; text-decoration:none; display:flex; align-items:center; justify-content:center; margin-top:10px;">
                <img src="./assets/spotify.svg" style="width:20px; margin-right:10px;" alt="Spotify Icon">
                OUVIR NO SPOTIFY
            </a>
        `;
    }
    
    stringHtmlAcoes += `
        <button onclick="fecharModal(null, true)" class="modal-btn" style="background:var(--terciaria); color:white; margin-top:10px;">
            FECHAR VISUALIZAÇÃO
        </button>
    `;
    
    document.getElementById('modal-actions').innerHTML = stringHtmlAcoes;
    document.getElementById('modal-vinil').classList.add('active');
}

// ==========================================
// 👥 MODAL DE LISTAS (SEGUIDORES/CURTIDAS)
// ==========================================

async function abrirListaUsuarios(tipo_lista, id_alvo) {
    try {
        let urlFetch = '';
        const tituloModal = document.getElementById('modal-usuarios-titulo');
        
        if (tipo_lista === 'seguidores') {
            urlFetch = `/usuarios/${id_alvo}/seguidores?limite=100`;
            tituloModal.innerText = 'Seguidores';
        } else if (tipo_lista === 'seguindo') {
            urlFetch = `/usuarios/${id_alvo}/seguindo?limite=100`;
            tituloModal.innerText = 'Seguindo';
        } else if (tipo_lista === 'curtidas') {
            urlFetch = `/posts/${id_alvo}/curtidas`;
            tituloModal.innerText = 'Quem curtiu';
        }

        
        const listaUsuarios = await api.get(urlFetch);

        
        const containerLista = document.getElementById('modal-usuarios-lista');
        containerLista.innerHTML = '';
        
        if (listaUsuarios.length === 0) {
            containerLista.innerHTML = '<p style="text-align:center; color:gray; font-size:0.9rem;">Nenhum usuário encontrado nesta lista.</p>';
        } else {
            listaUsuarios.forEach(usuario => {
                let avatarHtml = '';
                
                if (usuario.foto_perfil) {
                    avatarHtml = `<img src="${usuario.foto_perfil}" style="width:40px;height:40px;border-radius:50%;object-fit:cover; border: 2px solid var(--quaternaria);">`;
                } else {
                    let corFundo = gerarCorHex(usuario.username);
                    let primeiraLetra = usuario.username.charAt(0).toUpperCase();
                    avatarHtml = `<div class="profile-avatar" style="width:40px;height:40px;font-size:1rem;background-color:${corFundo}">${primeiraLetra}</div>`;
                }
                
                containerLista.innerHTML += `
                    <div class="user-list-item" onclick="fecharModalUsuarios(null, true); abrirPerfilPublico(${usuario.id});">
                        ${avatarHtml}
                        <div style="display:flex; flex-direction:column;">
                            <b style="color:var(--primaria); font-size:0.95rem;">${usuario.nome_completo}</b>
                            <span style="font-size:0.8rem; color:gray;">@${usuario.username}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        document.getElementById('modal-usuarios').classList.add('active');
    } catch(erro) {
        console.error("Erro ao carregar a lista de usuários do modal:", erro);
    }
}

function fecharModalUsuarios(evento, forcar_fechamento = false) {
    if (forcar_fechamento || evento.target.id === 'modal-usuarios') {
        document.getElementById('modal-usuarios').classList.remove('active');
    }
}

// ==========================================
// 📷 SISTEMA DE POSTS E PUBLICAÇÃO
// ==========================================

function abrirModalNovoPost() {
    document.getElementById('modal-post-foto').value = '';
    document.getElementById('modal-post-legenda').value = '';
    document.getElementById('modal-novo-post').classList.add('active');
}

function fecharModalNovoPost(evento, forcar_fechamento = false) {
    if (forcar_fechamento || evento.target.id === 'modal-novo-post') {
        document.getElementById('modal-novo-post').classList.remove('active');
    }
}

async function salvarNovoPost() {
    const inputFoto = document.getElementById('modal-post-foto');
    const arquivoSelecionado = inputFoto.files[0];
    const legendaTexto = document.getElementById('modal-post-legenda').value;

    if (!arquivoSelecionado) {
        return alert('Por favor, selecione uma foto do seu vinil para postar no feed!');
    }

    inputFoto.disabled = true;

    try {
        // Fotos de celular têm vários MB: reduz antes de enviar.
        const fotoReduzida = await redimensionarImagem(arquivoSelecionado, 1080, 0.85);

        await api.post('/posts', { foto: fotoReduzida, legenda: legendaTexto });

        showToast('Sua publicação foi enviada com sucesso!');

        fecharModalNovoPost(null, true);

        const abaPerfilMeu = document.getElementById('tab-profile-community');

        if (!abaPerfilMeu.classList.contains('hidden')) {
            renderizarMeusPosts();
        } else {
            switchTab('profile-community');
        }
    } catch(erro) {
        alert(erro.message || "Ocorreu um erro ao tentar publicar a sua foto.");
    } finally {
        inputFoto.disabled = false;
    }
}

// ------------------------------------------
// NOVA TELA DE DETALHE DE POST
// ------------------------------------------

function registrarAbaAnteriorParaVoltar() {
    const abasNavegacao = ['explore', 'community', 'notifications', 'public-profile', 'profile-community', 'edit-profile', 'market'];
    
    for (let i = 0; i < abasNavegacao.length; i++) {
        const abaId = `tab-${abasNavegacao[i]}`;
        const elementoAba = document.getElementById(abaId);
        
        if (elementoAba && !elementoAba.classList.contains('hidden')) {
            abaAnteriorParaPost = abasNavegacao[i];
            break;
        }
    }
}

function voltarDaPaginaDePost() {
    switchTab(abaAnteriorParaPost);
}

async function abrirPaginaPost(post_id, focarComentario = false) {
    registrarAbaAnteriorParaVoltar();
    
    try {
        
        const postUnico = adaptar.post(await api.get(`/posts/${post_id}`));

        
        if (!postUnico) {
            return;
        }

        document.getElementById('post-page-id').value = post_id;
        document.getElementById('post-page-dono-id').value = postUnico.usuario_id;
        
        document.getElementById('post-page-img').src = postUnico.foto;
        document.getElementById('post-page-user').innerText = postUnico.nome_completo;
        
        document.getElementById('post-page-legenda').innerHTML = formatarLegendaComHashtags(postUnico.legenda);

        const headerAvatar = document.getElementById('post-page-avatar');
        
        if (postUnico.foto_perfil) {
            headerAvatar.src = postUnico.foto_perfil;
        } else {
            headerAvatar.src = './assets/VinylVault.png'; 
        }

        const btnEditarContainer = document.getElementById('btn-editar-legenda');
        const areaEdicao = document.getElementById('area-edicao-legenda');
        areaEdicao.classList.add('hidden'); 
        
        if (postUnico.usuario_id === usuarioAtual.id) {
            btnEditarContainer.classList.remove('hidden');
        } else {
            btnEditarContainer.classList.add('hidden');
        }

        document.getElementById('post-page-header-btn').onclick = () => {
            abrirPerfilPublico(postUnico.usuario_id);
        };

        let heartIcon = postUnico.user_liked === 1 ? '❤️' : '🤍';

        document.getElementById('post-page-actions').innerHTML = `
            <button class="btn-like" id="btn-like-pagina-${post_id}" onclick="curtirPostPagina(${post_id}, ${postUnico.usuario_id})">
                ${heartIcon} <span style="font-size: 1rem; color: var(--primaria);" id="post-page-like-count">${postUnico.likes_count} curtidas</span>
            </button>
            <button class="btn-ver-curtidas" onclick="abrirListaUsuarios('curtidas', ${post_id})">
                Ver quem curtiu
            </button>
        `;

        comentarioPaiIdAtivo = null; 
        usuarioMencionadoIdAtivo = null;
        document.getElementById('post-page-comment-input').placeholder = "Adicione um comentário...";

        await carregarComentariosDaPagina(post_id);

        switchTab('post-detail');
        
        if (focarComentario) {
            setTimeout(() => {
                abrirComentariosMobile(); 
                const inputDeComentario = document.getElementById('post-page-comment-input');
                
                if (inputDeComentario) {
                    inputDeComentario.focus();
                }
            }, 500);
        }
    } catch(erro) {
        console.error("Erro ao abrir a página do post:", erro);
        showToast(erro.message || 'Não foi possível abrir esta publicação.');
    }
}

async function curtirPostPagina(post_id) {
    try {
        const dados = await api.post(`/posts/${post_id}/curtir`);
        const btnLike = document.getElementById(`btn-like-pagina-${post_id}`);

        if (btnLike) {
            const coracao = dados.user_liked ? '❤️' : '🤍';
            btnLike.innerHTML = `${coracao} <span style="font-size: 1rem; color: var(--primaria);" id="post-page-like-count">${dados.likes_count} curtidas</span>`;
        }
    } catch(erro) {
        console.error("Erro ao tentar curtir a publicação na página:", erro);
        showToast(erro.message || 'Não foi possível curtir agora.');
    }
}

async function curtirPostTimeline(post_id) {
    try {
        const dados = await api.post(`/posts/${post_id}/curtir`);
        const btnLike = document.getElementById(`btn-like-${post_id}`);

        if (btnLike) {
            const coracao = dados.user_liked ? '❤️' : '🤍';
            btnLike.innerHTML = `${coracao} <span style="font-size: 1rem; color: var(--primaria);" id="like-count-${post_id}">${dados.likes_count} curtidas</span>`;
        }
    } catch(erro) {
        console.error("Erro ao tentar curtir a publicação na timeline:", erro);
        showToast(erro.message || 'Não foi possível curtir agora.');
    }
}

// ------------------------------------------
// LÓGICA DE COMENTÁRIOS E APAGAR
// ------------------------------------------

function abrirComentariosMobile() {
    const painelComentarios = document.getElementById('comments-wrapper');
    
    if (painelComentarios) {
        painelComentarios.classList.add('mobile-open');
    }
}

function fecharComentariosMobile() {
    const painelComentarios = document.getElementById('comments-wrapper');
    
    if (painelComentarios) {
        painelComentarios.classList.remove('mobile-open');
    }
}

async function carregarComentariosDaPagina(post_id) {
    try {
        
        const listaBrutaDeComentarios = await api.get(`/posts/${post_id}/comentarios`);

        
        const containerLista = document.getElementById('post-page-comments');
        containerLista.innerHTML = '';
        
        containerLista.classList.remove('animate-comments');
        void containerLista.offsetWidth; 
        containerLista.classList.add('animate-comments');
        
        if (listaBrutaDeComentarios.length === 0) {
            containerLista.innerHTML = '<p style="color:gray; font-size:0.85rem; text-align:center; padding-top: 10px;">Nenhum comentário ainda. Seja o primeiro a comentar!</p>';
            return;
        }

        const comentariosPais = listaBrutaDeComentarios.filter(c => !c.parent_id);
        const comentariosFilhos = listaBrutaDeComentarios.filter(c => c.parent_id);

        comentariosPais.forEach(comentarioPai => {
            let fotoAvatarPai = comentarioPai.foto_perfil ? comentarioPai.foto_perfil : './assets/VinylVault.png';
            let isMeuComentarioPai = comentarioPai.usuario_id === usuarioAtual.id;
            
            let btnApagarPaiHtml = '';
            
            if (isMeuComentarioPai) {
                btnApagarPaiHtml = `<button class="comment-action-btn delete" onclick="apagarComentario(${comentarioPai.id}, ${post_id})">Apagar</button>`;
            }

            let blocoDeConversa = document.createElement('div');
            blocoDeConversa.style.display = 'flex';
            blocoDeConversa.style.flexDirection = 'column';
            blocoDeConversa.style.marginBottom = '20px';

            let divPai = document.createElement('div');
            divPai.className = 'comment-wrapper';
            divPai.style.marginBottom = '0'; 
            
            divPai.innerHTML = `
                <img src="${fotoAvatarPai}" class="comment-avatar">
                <div style="flex: 1;">
                    <div class="comment-content">
                        <strong>@${comentarioPai.username}</strong>
                        <p>${comentarioPai.texto}</p>
                    </div>
                    <div class="comment-actions-bar">
                        <button class="comment-action-btn" onclick="prepararRespostaDeComentario(${comentarioPai.id}, '${comentarioPai.username}', ${comentarioPai.usuario_id})">Responder</button>
                        ${btnApagarPaiHtml}
                    </div>
                </div>
            `;
            
            blocoDeConversa.appendChild(divPai);
            
            const respostasParaEstePai = comentariosFilhos.filter(f => f.parent_id === comentarioPai.id);
            
            if (respostasParaEstePai.length > 0) {
                respostasParaEstePai.forEach(resposta => {
                    let fotoAvatarFilho = resposta.foto_perfil ? resposta.foto_perfil : './assets/VinylVault.png';
                    let isMeuComentarioFilho = resposta.usuario_id === usuarioAtual.id;
                    
                    let btnApagarFilhoHtml = '';
                    
                    if (isMeuComentarioFilho) {
                        btnApagarFilhoHtml = `<button class="comment-action-btn delete" onclick="apagarComentario(${resposta.id}, ${post_id})">Apagar</button>`;
                    }

                    let divFilho = document.createElement('div');
                    divFilho.className = 'comment-child-wrapper';
                    
                    divFilho.innerHTML = `
                        <img src="${fotoAvatarFilho}" class="comment-avatar" style="width: 30px; height: 30px;">
                        <div style="flex: 1;">
                            <div class="comment-content">
                                <strong>@${resposta.username}</strong>
                                <p>${resposta.texto}</p>
                            </div>
                            <div class="comment-actions-bar">
                                ${btnApagarFilhoHtml}
                            </div>
                        </div>
                    `;
                    
                    blocoDeConversa.appendChild(divFilho);
                });
            }
            
            containerLista.appendChild(blocoDeConversa);
        });
        
        setTimeout(() => {
            containerLista.scrollTop = containerLista.scrollHeight;
        }, 100);
        
    } catch(erro) {
        console.error("Erro ao carregar a lista de comentários:", erro);
    }
}

async function apagarComentario(comentario_id, post_id) {
    if (!confirm("Tem certeza que deseja apagar este comentário? Esta ação não pode ser desfeita.")) {
        return;
    }

    try {
        
        await api.delete(`/comentarios/${comentario_id}`);

        showToast("Comentário apagado com sucesso.");
        carregarComentariosDaPagina(post_id);
    } catch(erro) {
        console.error("Erro ao tentar apagar:", erro);
        alert(erro.message || "Não foi possível apagar o comentário.");
    }

}

function prepararRespostaDeComentario(comentario_pai_id, username_alvo, usuario_mencionado_id) {
    comentarioPaiIdAtivo = comentario_pai_id;
    usuarioMencionadoIdAtivo = usuario_mencionado_id;
    
    const inputTexto = document.getElementById('post-page-comment-input');
    inputTexto.placeholder = `Respondendo a @${username_alvo}...`;
    inputTexto.focus();
}

async function enviarComentarioNaPagina() {
    const inputPostId = document.getElementById('post-page-id').value;
    
    const inputTexto = document.getElementById('post-page-comment-input');
    
    const textoDoComentario = inputTexto.value.trim();
    
    if (!textoDoComentario) {
        return;
    }

    
    // Quem recebe a notificação é decidido pelo servidor (mencionado, autor do comentário respondido ou dono do post).
    const payloadComentario = {
        texto: textoDoComentario,
        parent_id: comentarioPaiIdAtivo,
        usuario_mencionado_id: usuarioMencionadoIdAtivo
    };

    try {
        await api.post(`/posts/${inputPostId}/comentarios`, payloadComentario);

        
        inputTexto.value = '';
        inputTexto.placeholder = "Adicione um comentário...";
        
        comentarioPaiIdAtivo = null; 
        usuarioMencionadoIdAtivo = null;
        
        await carregarComentariosDaPagina(inputPostId);
    } catch(erro) {
        console.error("Erro ao tentar enviar o comentário:", erro);
        alert(erro.message || "Não foi possível enviar o comentário.");
    }
}

// ------------------------------------------
// EDITAR LEGENDA NO MODAL
// ------------------------------------------

function habilitarEdicaoLegenda() {
    const areaEdicao = document.getElementById('area-edicao-legenda');
    const inputNovaLegenda = document.getElementById('input-nova-legenda');
    const legendaAtual = document.getElementById('post-page-legenda').innerText;
    
    const legendaLimpa = legendaAtual.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
    
    inputNovaLegenda.value = legendaLimpa;
    areaEdicao.classList.remove('hidden');
}

async function salvarEdicaoLegenda() {
    const inputId = document.getElementById('post-page-id').value;
    const novaLegenda = document.getElementById('input-nova-legenda').value;
    
    const payloadEdicao = {
        legenda: novaLegenda
    };
    
    try {
        
        await api.put(`/posts/${inputId}`, payloadEdicao);

        
        showToast('Legenda atualizada com sucesso!');
        
        document.getElementById('post-page-legenda').innerHTML = formatarLegendaComHashtags(novaLegenda);
        document.getElementById('area-edicao-legenda').classList.add('hidden');
        
        renderizarMeusPosts(); 
    } catch(erro) {
        alert(erro.message || "Ocorreu um erro ao atualizar a legenda da publicação.");
    }
}

async function renderizarMeusPosts() {
    try {
        
        const meusPostsRecuperados = await api.get(`/usuarios/${usuarioAtual.id}/posts?limite=50`);

        
        const containerDosMeusPosts = document.getElementById('meus-posts');
        containerDosMeusPosts.innerHTML = '';
        
        if (meusPostsRecuperados.length === 0) {
            containerDosMeusPosts.style.display = 'block';
            containerDosMeusPosts.innerHTML = '<p style="text-align:center; color:gray;">Você ainda não possui publicações na sua galeria.</p>';
            return;
        }
        
        containerDosMeusPosts.style.display = 'grid'; 
        
        meusPostsRecuperados.forEach(postagem => {
            containerDosMeusPosts.innerHTML += `
                <img src="${postagem.foto}" alt="Minha Publicação" onclick="abrirPaginaPost(${postagem.id})">
            `;
        });
    } catch(erro) {
        console.error("Erro ao renderizar as minhas publicações:", erro);
    }
}