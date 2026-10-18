// ==========================================
// LÓGICA DA VITRINE DE CLASSIFICADOS
// ==========================================

let listaClassificados = [];

async function carregarClassificados() {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        listaClassificados = (await api.get('/classificados?limite=200')).map(adaptar.classificado);

        
        renderizarClassificados();
    } catch(erro) {
        console.error("Erro ao carregar os classificados:", erro);
    }
}

function renderizarClassificados() {
    const inputBusca = document.getElementById('busca-market');
    const termo = inputBusca.value.toLowerCase();
    
    const container = document.getElementById('market-container');
    container.innerHTML = '';

    const filtrados = listaClassificados.filter(vinil => {
        return vinil.nome.toLowerCase().includes(termo) || 
               vinil.artista.toLowerCase().includes(termo) ||
               vinil.username.toLowerCase().includes(termo);
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:gray; padding: 40px 0;">Nenhum disco disponível para negociação no momento.</p>';
        return;
    }

    filtrados.forEach(vinil => {
        let avatarHtml = '';
        
        if (vinil.foto_perfil) {
            avatarHtml = `<div class="profile-avatar" style="width: 26px; height: 26px; font-size: 0.8rem; border-width: 1px; background-image: url('${vinil.foto_perfil}');"></div>`;
        } else {
            let corFundo = gerarCorHex(vinil.username);
            let primeiraLetra = vinil.username.charAt(0).toUpperCase();
            avatarHtml = `<div class="profile-avatar" style="width: 26px; height: 26px; font-size: 0.8rem; border-width: 1px; background-color: ${corFundo};">${primeiraLetra}</div>`;
        }
        
        let seloEstrelas = '';
        
        if (typeof renderStarsHtml === 'function') {
            seloEstrelas = renderStarsHtml(vinil.nota, true);
        }
        
        container.innerHTML += `
            <div class="card market-card" onclick="abrirModalClassificado(${vinil.id})">
                ${seloEstrelas}
                <div class="market-badge">Negociável</div>
                <img src="${vinil.foto}" alt="${vinil.nome}">
                <h4>${vinil.nome}</h4>
                <p>${vinil.artista}</p>
                <div class="market-owner">
                    ${avatarHtml}
                    <span>@${vinil.username}</span>
                </div>
            </div>
        `;
    });
}

// ------------------------------------------
// MÁGICA 3D NOS CLASSIFICADOS
// ------------------------------------------
function abrirModalClassificado(idDoVinil) {
    const vinilAchado = listaClassificados.find(v => v.id === idDoVinil); 
    
    if (!vinilAchado) {
        return; 
    }
    
    const modalViewDiv = document.getElementById('modal-view');
    modalViewDiv.classList.remove('hidden'); 
    
    const modalEditDiv = document.getElementById('modal-edit');
    modalEditDiv.classList.add('hidden');
    
    document.getElementById('modal-img').src = vinilAchado.foto; 
    document.getElementById('modal-nome').innerText = vinilAchado.nome; 
    document.getElementById('modal-artista').innerText = vinilAchado.artista;

    const displayEstrelas = document.getElementById('modal-display-stars');
    
    if (displayEstrelas && typeof renderStarsHtml === 'function') {
        displayEstrelas.innerHTML = renderStarsHtml(vinilAchado.nota, false);
    }

    const playerContainer = document.getElementById('modal-player-container');
    
    if (playerContainer && typeof gerarHtmlPlayer === 'function') {
        playerContainer.innerHTML = gerarHtmlPlayer(vinilAchado.preview_url);
    }
    
    // Animação 3D do Vinil
    const vinylWrapper = document.getElementById('modal-vinyl-wrapper');
    const vinylLabel = document.getElementById('modal-vinyl-label');
    
    if (vinylLabel) {
        vinylLabel.style.backgroundImage = `url('${vinilAchado.foto}')`;
    }
    
    if (vinylWrapper) {
        vinylWrapper.classList.remove('slide-out');
        
        setTimeout(() => {
            vinylWrapper.classList.add('slide-out');
        }, 50);
    }
    
    let stringHtmlAcoes = '';
    
    stringHtmlAcoes += `
        <button class="modal-btn" style="background:var(--secundaria); color:white;" onclick="iniciarNegociacao(${vinilAchado.usuario_id}, '${vinilAchado.nome_completo}', '${vinilAchado.nome}')">
            💬 CHAMAR @${vinilAchado.username} NO CHAT
        </button>
    `;
    
    stringHtmlAcoes += `
        <button class="modal-btn" style="background:transparent; border: 1px solid var(--quaternaria); color:var(--primaria); margin-top:10px;" onclick="fecharModal(null, true); abrirPerfilPublico(${vinilAchado.usuario_id});">
            VER PERFIL DO COLECIONADOR
        </button>
    `;
    
    stringHtmlAcoes += `
        <button onclick="fecharModal(null, true)" class="modal-btn" style="background:#ccc; color:#333; margin-top:10px;">
            FECHAR
        </button>
    `;
    
    document.getElementById('modal-actions').innerHTML = stringHtmlAcoes;
    document.getElementById('modal-vinil').classList.add('active');
}

function iniciarNegociacao(amigo_id, amigo_nome, nome_do_disco) {
    fecharModal(null, true);
    
    abrirChatWidget();
    abrirChat(amigo_id, amigo_nome);
    
    const inputChat = document.getElementById('chat-input');
    inputChat.value = `Olá! Vi o seu disco "${nome_do_disco}" nos classificados e tenho interesse na negociação.`;
    
    inputChat.focus();
}