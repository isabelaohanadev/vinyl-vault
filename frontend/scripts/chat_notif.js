// ==========================================
// 🔔 SISTEMA DE NOTIFICAÇÕES (COM MATCH AUTOMÁTICO)
// ==========================================

async function carregarNotificacoes() {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        const notificacoes = (await api.get('/notificacoes')).map(adaptar.notificacao);

        
        const naoLidas = notificacoes.filter(n => !n.lida).length;
        const badge = document.getElementById('badge-notif');
        
        if (badge) {
            if (naoLidas > 0) {
                badge.innerText = naoLidas;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const container = document.getElementById('lista-notificacoes-page');
        
        if (container) {
            container.innerHTML = '';
            
            if (notificacoes.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:gray; padding: 20px;">Nenhuma notificação no momento.</p>';
                
                return;
            }

            notificacoes.forEach(notif => {
                let textoDeNotificacao = '';
                let acaoAoClicar = `lerNotificacao(${notif.id})`;

                if (notif.tipo === 'seguir') {
                    textoDeNotificacao = `<b>@${escapeHtml(notif.username)}</b> começou a seguir você.`;
                    acaoAoClicar = `lerNotificacao(${notif.id}, () => abrirPerfilPublico(${notif.ator_id}))`;
                } else if (notif.tipo === 'curtida') {
                    textoDeNotificacao = `<b>@${escapeHtml(notif.username)}</b> curtiu sua publicação.`;
                    acaoAoClicar = `lerNotificacao(${notif.id}, () => abrirPaginaPost(${notif.post_id}))`;
                } else if (notif.tipo === 'comentario') {
                    textoDeNotificacao = `<b>@${escapeHtml(notif.username)}</b> comentou na sua publicação.`;
                    acaoAoClicar = `lerNotificacao(${notif.id}, () => abrirPaginaPost(${notif.post_id}, true))`;
                } else if (notif.tipo === 'mensagem') {
                    textoDeNotificacao = `<b>@${escapeHtml(notif.username)}</b> enviou uma nova mensagem.`;
                    acaoAoClicar = `lerNotificacao(${notif.id}, () => { abrirChatWidget(); abrirChat(${notif.ator_id}, ${jsArg(notif.username)}); })`;
                } else if (notif.tipo === 'match') {
                    textoDeNotificacao = `✨ <b>MATCH! @${escapeHtml(notif.username)}</b> disponibilizou para troca um disco da sua Wishlist!`;
                    acaoAoClicar = `lerNotificacao(${notif.id}, () => switchTab('market'))`;
                }

                let bgClass = '';
                
                if (notif.lida) {
                    bgClass = 'notif-item read';
                } else {
                    bgClass = 'notif-item unread';
                }
                
                let htmlDoAvatar = '';
                
                if (notif.foto_perfil) {
                    htmlDoAvatar = `<img src="${imgSrc(notif.foto_perfil)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid var(--quaternaria);">`;
                } else {
                    let letraInicial = notif.username.charAt(0).toUpperCase();
                    let corFundo = gerarCorHex(notif.username);
                    htmlDoAvatar = `<div class="profile-avatar" style="width: 40px; height: 40px; font-size: 1rem; flex-shrink: 0; background-color:${corFundo}">${escapeHtml(letraInicial)}</div>`;
                }

                container.innerHTML += `
                    <div class="${bgClass}" onclick="${acaoAoClicar}" style="cursor:pointer; display:flex; align-items:center; gap:15px; padding:15px; border-bottom:1px solid #eee;">
                        ${htmlDoAvatar}
                        <span style="font-size:0.9rem; flex:1;">${textoDeNotificacao}</span>
                    </div>
                `;
            });
        }
    } catch(erro) {
        console.error("Erro ao carregar notificações", erro);
    }
}

async function lerNotificacao(idDaNotificacao, callbackParaRodar) {
    try {
        
        await api.put(`/notificacoes/${idDaNotificacao}/ler`);

        
        carregarNotificacoes();
        
        if (callbackParaRodar) {
            callbackParaRodar();
        }
    } catch(erro) {
        console.error("Erro ao ler notificação:", erro);
    }
}

// ==========================================
// 💬 SISTEMA DE CHAT E MENSAGENS
// ==========================================

function abrirChatWidget() {
    const chatWindow = document.getElementById('chat-window');
    
    chatWindow.classList.remove('hidden');
    chatWindow.classList.remove('chat-minimized');
    
    document.getElementById('floating-chat-btn').classList.add('hidden');
    
    if (!chatAmigoAtivo) {
        voltarParaListaChat();
    }
}

function fecharChatWidget() {
    const chatWindow = document.getElementById('chat-window');
    
    chatWindow.classList.add('hidden');
    
    document.getElementById('floating-chat-btn').classList.remove('hidden');
    
    chatAmigoAtivo = null;
    
    if (intervaloChat) {
        clearInterval(intervaloChat);
    }
}

function minimizarChat() {
    const chatWindow = document.getElementById('chat-window');
    
    chatWindow.classList.add('hidden');
    chatWindow.classList.add('chat-minimized');
    
    document.getElementById('floating-chat-btn').classList.remove('hidden');
}

async function atualizarBadgeChat() {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        const dadosBadge = await api.get('/mensagens/nao-lidas');

        
        const elementoBadge = document.getElementById('chat-unread-badge');
        
        if (dadosBadge.total > 0) {
            elementoBadge.innerText = dadosBadge.total;
            elementoBadge.classList.remove('hidden');
        } else {
            elementoBadge.classList.add('hidden');
        }
    } catch(erro) {
        console.error("Erro ao checar badge do chat:", erro);
    }
}

async function carregarConversas() {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        const listaDeConversas = await api.get('/conversas');

        
        const containerAbaSocial = document.getElementById('conversas-container');
        const containerWidgetChat = document.getElementById('chat-list-view');
        
        let htmlDeConversas = '';
        
        if (listaDeConversas.length === 0) {
            htmlDeConversas = '<p style="text-align:center; padding:20px; color:gray; font-size:0.9rem;">Nenhuma conversa recente.</p>';
        } else {
            listaDeConversas.forEach(conversaUnica => {
                let htmlAvatarConversa = '';
                
                if (conversaUnica.foto_perfil) {
                    htmlAvatarConversa = `<img src="${imgSrc(conversaUnica.foto_perfil)}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;">`;
                } else {
                    let inicialNome = conversaUnica.username.charAt(0).toUpperCase();
                    let corGerada = gerarCorHex(conversaUnica.username);
                    htmlAvatarConversa = `<div class="profile-avatar" style="width:45px;height:45px;font-size:1.2rem;background-color:${corGerada}">${escapeHtml(inicialNome)}</div>`;
                }
                
                // MÁGICA DO TOCANDO AGORA: Aparece embaixo do nome na lista de chat!
                let tocandoAgoraHtml = '';
                if (conversaUnica.tocando_agora) {
                    tocandoAgoraHtml = `
                        <div style="font-size: 0.75rem; color: #1DB954; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                            <span class="spin-disc" style="font-size: 0.8rem;">💿</span>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${escapeHtml(conversaUnica.tocando_agora)}</span>
                        </div>
                    `;
                }
                
                htmlDeConversas += `
                    <div class="conversa-item" onclick="abrirChatWidget(); abrirChat(${conversaUnica.id}, ${jsArg(conversaUnica.nome_completo)})" style="display:flex; align-items:center; gap:15px; padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
                        ${htmlAvatarConversa}
                        <div style="flex: 1; overflow: hidden;">
                            
<b style="color:var(--primaria);">${escapeHtml(conversaUnica.nome_completo)}</b><br>
<span style="font-size:0.8rem; color:gray;">@${escapeHtml(conversaUnica.username)}</span>

                            ${tocandoAgoraHtml}
                        </div>
                    </div>
                `;
            });
        }

        if (containerAbaSocial && !containerAbaSocial.classList.contains('hidden')) {
            containerAbaSocial.innerHTML = htmlDeConversas;
        }
        
        if (containerWidgetChat) {
            containerWidgetChat.innerHTML = htmlDeConversas;
        }
    } catch(erro) {
        console.error("Erro ao carregar conversas:", erro);
    }
}

function voltarParaListaChat() {
    chatAmigoAtivo = null;
    
    if (intervaloChat) {
        clearInterval(intervaloChat);
    }
    
    document.getElementById('chat-list-view').classList.remove('hidden');
    document.getElementById('chat-conversation-view').classList.add('hidden');
    document.getElementById('btn-voltar-chat').classList.add('hidden');
    document.getElementById('chat-title').innerText = 'Mensagens';
    
    carregarConversas();
}

async function abrirChat(amigo_id_selecionado, nome_do_amigo) {
    chatAmigoAtivo = amigo_id_selecionado;
    
    document.getElementById('chat-list-view').classList.add('hidden');
    document.getElementById('chat-conversation-view').classList.remove('hidden');
    document.getElementById('btn-voltar-chat').classList.remove('hidden');
    document.getElementById('chat-title').innerText = nome_do_amigo;
    
    await carregarMensagens(amigo_id_selecionado);
    
    
    await api.put('/mensagens/ler', { amigo_id: amigo_id_selecionado }).catch(() => {});

    
    if (intervaloChat) {
        clearInterval(intervaloChat);
    }
    
    intervaloChat = setInterval(() => carregarMensagens(amigo_id_selecionado, false), 3000);
}

async function carregarMensagens(amigo_id_pesquisa, fazerScroll = true) {
    try {
        
        const mensagensRecebidas = await api.get(`/mensagens/${amigo_id_pesquisa}?limite=200`);

        
        if (JSON.stringify(mensagensRecebidas) === JSON.stringify(mensagensAtuaisChat)) {
            return;
        }
        
        mensagensAtuaisChat = mensagensRecebidas;
        
        const caixaDeMensagens = document.getElementById('chat-messages');
        caixaDeMensagens.innerHTML = '';
        
        mensagensRecebidas.forEach(msg => {
            const isMinhaMensagem = msg.remetente_id === usuarioAtual.id;
            
            let estiloDeAlinhamento = '';
            
            if (isMinhaMensagem) {
                estiloDeAlinhamento = 'align-self: flex-end; background: var(--quaternaria); color: var(--primaria);';
            } else {
                estiloDeAlinhamento = 'align-self: flex-start; background: #eee; color: #333;';
            }
            
            let htmlCardVinil = '';
            
            if (msg.vinil_id) {
                htmlCardVinil = `
                    <div style="background:rgba(255,255,255,0.8); padding:5px; border-radius:4px; margin-bottom:5px; display:flex; gap:10px; align-items:center;">
                        <img src="${imgSrc(msg.vinil_foto)}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
                        <div style="font-size:0.75rem;">
                            <b>${escapeHtml(msg.vinil_nome)}</b><br>${escapeHtml(msg.vinil_artista)}
                        </div>
                    </div>
                `;
            }

            caixaDeMensagens.innerHTML += `
                <div style="max-width: 80%; padding: 10px 15px; border-radius: 12px; margin-bottom: 10px; font-size: 0.9rem; ${estiloDeAlinhamento}">
                    ${htmlCardVinil} ${escapeHtml(msg.texto)}
                </div>
            `;
        });
        
        if (fazerScroll) {
            caixaDeMensagens.scrollTop = caixaDeMensagens.scrollHeight;
        }
    } catch(erro) {
        console.error("Erro ao carregar mensagens:", erro);
    }
}

async function enviarMensagem() {
    const inputDaMensagem = document.getElementById('chat-input');
    const textoLimpo = inputDaMensagem.value.trim();
    
    if (!textoLimpo && !vinilParaEncaminhar) {
        return;
    }
    
    let idDoVinil = null;
    
    if (vinilParaEncaminhar) {
        idDoVinil = vinilParaEncaminhar;
    }
    
    
    // O remetente é sempre o usuário logado (o servidor lê do token).
    const payloadEnvio = {
        destinatario_id: chatAmigoAtivo,
        texto: textoLimpo,
        vinil_id: idDoVinil
    };

    try {
        await api.post('/mensagens', payloadEnvio);

        
        inputDaMensagem.value = '';
        vinilParaEncaminhar = null;
        
        carregarMensagens(chatAmigoAtivo, true);
    } catch(erro) {
        console.error("Erro ao enviar mensagem:", erro);
        showToast(erro.message || 'Não foi possível enviar a mensagem.');
    }
}

// ==========================================
// 🚀 ENCAMINHAR VINIL PARA CHAT
// ==========================================

async function abrirModalEncaminhar(idDoVinil) {
    vinilParaEncaminhar = idDoVinil;
    
    await carregarComunidade();
    
    const listaHtmlEncaminhar = document.getElementById('lista-encaminhar');
    listaHtmlEncaminhar.innerHTML = '';
    
    if (listaComunidade.length === 0) {
        listaHtmlEncaminhar.innerHTML = '<p>Nenhum colecionador na comunidade.</p>';
    } else {
        listaComunidade.forEach(userAmigo => {
            let avatarDoAmigo = '';
            
            if (userAmigo.foto_perfil) {
                avatarDoAmigo = `<img src="${imgSrc(userAmigo.foto_perfil)}" style="width:30px;height:30px;border-radius:50%; object-fit:cover;">`;
            } else {
                avatarDoAmigo = `<div class="profile-avatar" style="width:30px;height:30px;font-size:0.8rem;background-color:${gerarCorHex(userAmigo.username)}">${escapeHtml(userAmigo.username.charAt(0).toUpperCase())}</div>`;
            }
            
            listaHtmlEncaminhar.innerHTML += `
                <div onclick="encaminharVinil(${userAmigo.id}, ${jsArg(userAmigo.nome_completo)})" style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid #ccc; border-radius:4px; cursor:pointer;">
                    ${avatarDoAmigo}
                    <b>${escapeHtml(userAmigo.nome_completo)}</b>
                </div>
            `;
        });
    }
    
    document.getElementById('modal-encaminhar').classList.add('active');
    fecharModal(null, true);
}

function fecharModalEncaminhar(eventoOrigem, forcar = false) {
    if (forcar || eventoOrigem.target.id === 'modal-encaminhar') {
        document.getElementById('modal-encaminhar').classList.remove('active');
        vinilParaEncaminhar = null;
    }
}


function encaminharVinil(amigo_id_alvo, amigo_nome_alvo) {
    // fecharModalEncaminhar() zera vinilParaEncaminhar; sem guardar o disco antes, ele nunca ia na mensagem.
    const idDoVinil = vinilParaEncaminhar;

    fecharModalEncaminhar(null, true);
    vinilParaEncaminhar = idDoVinil;

    
    abrirChatWidget();
    abrirChat(amigo_id_alvo, amigo_nome_alvo);
    
    document.getElementById('chat-input').value = "Olha esse disco incrível do acervo!";
    
    enviarMensagem();
}