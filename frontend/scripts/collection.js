// ==========================================
// VARIÁVEIS LOCAIS PARA A MAGIA DA API
// ==========================================
let capaAutomaticaB64 = null;
let previewAutomaticaUrl = null; 

// ==========================================
// FUNÇÕES DE BUSCA DA API DO ITUNES/APPLE MUSIC
// ==========================================

async function buscarAlbumAPI() {
    const inputBusca = document.getElementById('busca-album-api');
    const termoDeBusca = inputBusca.value.trim();
    
    if (!termoDeBusca) {
        return showToast("Digite o nome do álbum ou do artista para buscar!");
    }

    const botaoBuscar = document.querySelector('.search-magic-area button');
    botaoBuscar.innerHTML = '<span class="spinner"></span>';
    botaoBuscar.disabled = true;

    try {
        const urlFetch = `https://itunes.apple.com/search?term=${encodeURIComponent(termoDeBusca)}&entity=album&limit=6`;
        const responseDaApi = await fetch(urlFetch);
        const dadosDaApi = await responseDaApi.json();

        const containerResultados = document.getElementById('resultados-api');
        containerResultados.innerHTML = '';
        containerResultados.classList.remove('hidden');

        if (dadosDaApi.results.length === 0) {
            containerResultados.innerHTML = '<p style="color:gray; font-size:0.9rem; grid-column:1/-1; text-align:center;">Nenhum álbum encontrado com este nome.</p>';
            return;
        }

        dadosDaApi.results.forEach(album => {
            const capaEmAltaResolucao = album.artworkUrl100.replace('100x100bb', '600x600bb');
            
            const idDoAlbum = Number(album.collectionId);
 

            containerResultados.innerHTML += `
                
                <div class="album-result-card" onclick="selecionarAlbumAPI(${jsArg(album.collectionName)}, ${jsArg(album.artistName)}, ${jsArg(album.primaryGenreName)}, ${jsArg(capaEmAltaResolucao)}, ${idDoAlbum})">
                    <img src="${imgSrc(album.artworkUrl100)}" alt="Miniatura">
                    <div class="album-result-info">
                        <b>${escapeHtml(album.collectionName)}</b>
                        <span>${escapeHtml(album.artistName)}</span>
                    </div>

                </div>
            `;
        });
        
    } catch(erro) {
        alert("Ocorreu um erro ao tentar se conectar com a internet para buscar o álbum.");
        console.error(erro);
    } finally {
        botaoBuscar.innerHTML = 'Buscar';
        botaoBuscar.disabled = false;
    }
}

async function selecionarAlbumAPI(nomeDoAlbum, nomeDoArtista, generoMusical, urlDaCapaAltaResolucao, collectionId) {
    document.getElementById('nome').value = nomeDoAlbum;
    document.getElementById('artista').value = nomeDoArtista;
    document.getElementById('genero').value = generoMusical;

    const elementoPreviewCapa = document.getElementById('preview-capa-add');
    elementoPreviewCapa.src = urlDaCapaAltaResolucao;
    elementoPreviewCapa.style.display = 'inline-block';

    document.getElementById('resultados-api').classList.add('hidden');
    document.getElementById('busca-album-api').value = '';

    try {
        const urlTracks = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`;
        const resTracks = await fetch(urlTracks);
        const dataTracks = await resTracks.json();
        
        const track = dataTracks.results.find(t => t.wrapperType === 'track' && t.previewUrl);
        
        if (track) {
            previewAutomaticaUrl = track.previewUrl;
        } else {
            previewAutomaticaUrl = null; 
        }
    } catch(e) {
        console.error("Erro ao buscar a prévia de áudio", e);
        previewAutomaticaUrl = null;
    }

    const imagemTemporaria = new Image();
    imagemTemporaria.crossOrigin = "Anonymous"; 
    
    imagemTemporaria.onload = function() {
        const canvasMagico = document.createElement('canvas');
        canvasMagico.width = 600;
        canvasMagico.height = 600;
        
        const contextoCanvas = canvasMagico.getContext('2d');
        contextoCanvas.drawImage(imagemTemporaria, 0, 0, 600, 600);
        
        capaAutomaticaB64 = canvasMagico.toDataURL('image/jpeg', 0.8);
        
        showToast("Álbum e Áudio importados com sucesso!");
    };
    
    imagemTemporaria.onerror = function() {
        capaAutomaticaB64 = urlDaCapaAltaResolucao; 
        console.warn("Fallback de imagem ativado devido a bloqueio de CORS.");
    };
    
    imagemTemporaria.src = urlDaCapaAltaResolucao;
    document.getElementById('fotoFile').value = '';
}

function previewCapaManual(eventoDeInput) {
    const arquivoSelecionado = eventoDeInput.target.files[0];
    
    if (arquivoSelecionado) {
        capaAutomaticaB64 = null; 
        previewAutomaticaUrl = null; 
        
        const leitorDeArquivo = new FileReader();
        
        leitorDeArquivo.onload = function(eventoDeLeitura) {
            const elementoPreviewCapa = document.getElementById('preview-capa-add');
            elementoPreviewCapa.src = eventoDeLeitura.target.result;
            elementoPreviewCapa.style.display = 'inline-block';
        };
        
        leitorDeArquivo.readAsDataURL(arquivoSelecionado);
    }
}

// ==========================================
// SALVAMENTO E GESTÃO DO ACERVO DE VINIS
// ==========================================

function salvarDisco() {
    const botaoSalvarDisco = document.getElementById('btnSalvar'); 
    const inputArquivoNovo = document.getElementById('fotoFile');
    const arquivoNovoDisco = inputArquivoNovo.files[0];
    
    const nomeDoVinil = document.getElementById('nome').value.trim(); 
    const nomeDoArtista = document.getElementById('artista').value.trim();
    const inputGeneroAdd = document.getElementById('genero').value.trim() || 'Geral';
    const inputSpotifyAdd = document.getElementById('spotifyUrl').value.trim();
    const inputAdquiridoAdd = document.getElementById('jaAdquirido').checked;
    const inputNegociavelAdd = document.getElementById('negociavel').checked;
    
    const inputNotaAdd = parseInt(document.getElementById('nota-add').value) || 0;
    
    if (!nomeDoVinil || !nomeDoArtista) {
        return alert("Por favor, preencha o nome do álbum e o nome do artista!");
    }
    
    if (!arquivoNovoDisco && !capaAutomaticaB64) {
        return alert("Por favor, escolha uma foto da capa clicando no botão ou busque um álbum automaticamente na internet!");
    }
    
    botaoSalvarDisco.disabled = true; 
    botaoSalvarDisco.innerHTML = '<span class="spinner"></span> ENVIANDO PARA NUVEM...';

    if (capaAutomaticaB64) {
        executarEnvioParaAPI(capaAutomaticaB64, nomeDoVinil, nomeDoArtista, inputGeneroAdd, inputSpotifyAdd, inputAdquiridoAdd, inputNegociavelAdd, previewAutomaticaUrl, inputNotaAdd, botaoSalvarDisco);
    } 
    else {
        const leitorDeVinilUpload = new FileReader(); 
        
        leitorDeVinilUpload.onload = function(eventoDeLeituraVinil) {
            const imagemVinilGerada = new Image(); 
            
            imagemVinilGerada.onload = async function() {
                const canvasNovoDisco = document.createElement('canvas'); 
                canvasNovoDisco.width = 600; 
                canvasNovoDisco.height = 600; 
                
                const contextCanvasNovo = canvasNovoDisco.getContext('2d');
                contextCanvasNovo.drawImage(imagemVinilGerada, 0, 0, 600, 600);
                
                const stringImagemFinal = canvasNovoDisco.toDataURL('image/jpeg', 0.8);
                
                executarEnvioParaAPI(stringImagemFinal, nomeDoVinil, nomeDoArtista, inputGeneroAdd, inputSpotifyAdd, inputAdquiridoAdd, inputNegociavelAdd, null, inputNotaAdd, botaoSalvarDisco);
            }; 
            
            imagemVinilGerada.src = eventoDeLeituraVinil.target.result;
        }; 
        
        leitorDeVinilUpload.readAsDataURL(arquivoNovoDisco);
    }
}

async function executarEnvioParaAPI(fotoFinalBase64, nome, artista, genero, spotifyUrl, isAdquirido, isNegociavel, urlDeAudioPreview, valorDaNota, btnRef) {
    const payloadDoNovoDisco = { 
        foto: fotoFinalBase64, 
        nome: nome, 
        artista: artista, 
        genero: genero, 
        spotify: spotifyUrl, 
        adquirido: isAdquirido,
        negociavel: isNegociavel,
        preview_url: urlDeAudioPreview,
        nota: valorDaNota
    };
    
    try {
        
        await api.post('/vinis', payloadDoNovoDisco);

        
        btnRef.disabled = false; 
        btnRef.innerHTML = 'SALVAR NA NUVEM'; 
        
        const arrayDeInputsAdd = document.querySelectorAll('#tab-add input');
        
        arrayDeInputsAdd.forEach(inputNoFormulario => { 
            if (inputNoFormulario.type !== 'checkbox') { 
                inputNoFormulario.value = ''; 
            } else { 
                inputNoFormulario.checked = false; 
            } 
        });
        
        document.getElementById('preview-capa-add').style.display = 'none';
        
        capaAutomaticaB64 = null;
        previewAutomaticaUrl = null;
        setNota('add', 0); 
        
        switchTab('explore'); 
        showToast("O seu novo disco foi salvo com sucesso no seu acervo!"); 
        
        carregarDados(); 
        
    } catch(erroDoFetchDisco) { 
        alert(erroDoFetchDisco.message || "Houve um erro grave ao tentar salvar no banco de dados!"); 
        btnRef.disabled = false; 
        btnRef.innerHTML = 'SALVAR NA NUVEM'; 
    }
}

// ==========================================
// FUNÇÕES DE EXIBIÇÃO E FILTROS DO ACERVO
// ==========================================

async function carregarDados() {
    if (!usuarioAtual) {
        return;
    }
    
    try {
        
        todosDiscos = await api.get(`/usuarios/${usuarioAtual.id}/vinis`);

        
        atualizarFiltrosEDatalists(); 
        renderizar();
        
        if (typeof renderizarGraficos === 'function') {
            renderizarGraficos();
        }
        
    } catch (erroCarregamento) { 
        console.error("Erro ocorrido ao buscar os discos", erroCarregamento); 
    }
}

function atualizarFiltrosEDatalists() {
    const seletorArtista = document.getElementById('filtro-artista'); 
    const seletorGenero = document.getElementById('filtro-genero');
    const listaDeDataArtista = document.getElementById('lista-artistas'); 
    const listaDeDataGenero = document.getElementById('lista-generos');
    
    const arrayArtistas = todosDiscos.map(disco => disco.artista);
    const artistasUnicosFiltrados = [...new Set(arrayArtistas)].sort(); 
    
    const arrayGeneros = todosDiscos.map(disco => disco.genero);
    const generosUnicosFiltrados = [...new Set(arrayGeneros)].sort();
    
    const valorAtualArtista = seletorArtista.value; 
    const valorAtualGenero = seletorGenero.value;
    
    seletorArtista.innerHTML = '<option value="">Todos os Artistas</option>'; 
    
    artistasUnicosFiltrados.forEach(artistaLocal => { 
        seletorArtista.innerHTML += `<option value="${escapeHtml(artistaLocal)}">${escapeHtml(artistaLocal)}</option>`; 
    }); 
    
    seletorArtista.value = valorAtualArtista;
    
    seletorGenero.innerHTML = '<option value="">Todos os Gêneros</option>'; 
    
    generosUnicosFiltrados.forEach(generoLocal => { 
        seletorGenero.innerHTML += `<option value="${escapeHtml(generoLocal)}">${escapeHtml(generoLocal)}</option>`; 
    }); 
    
    seletorGenero.value = valorAtualGenero;
    
    listaDeDataArtista.innerHTML = ''; 
    
    artistasUnicosFiltrados.forEach(artistaLocalLista => { 
        listaDeDataArtista.innerHTML += `<option value="${escapeHtml(artistaLocalLista)}">`; 
    }); 
    
    listaDeDataGenero.innerHTML = ''; 
    
    generosUnicosFiltrados.forEach(generoLocalLista => { 
        listaDeDataGenero.innerHTML += `<option value="${escapeHtml(generoLocalLista)}">`; 
    });
}

function renderizar() {
    const inputDaBusca = document.getElementById('busca');
    const termoDaBusca = inputDaBusca.value.toLowerCase();
    
    const filtroDeArtista = document.getElementById('filtro-artista').value; 
    const filtroDeGenero = document.getElementById('filtro-genero').value;
    
    const containerPrincipalDeCatalogo = document.getElementById('catalog-container'); 
    containerPrincipalDeCatalogo.innerHTML = '';
    
    let listaFiltradaDeDiscos = todosDiscos.filter(discoIndividual => { 
        const matchNoNome = discoIndividual.nome.toLowerCase().includes(termoDaBusca);
        const matchNoArtista = (filtroDeArtista === "" || discoIndividual.artista === filtroDeArtista);
        const matchNoGenero = (filtroDeGenero === "" || discoIndividual.genero === filtroDeGenero);
        
        return matchNoNome && matchNoArtista && matchNoGenero; 
    });
    
    document.getElementById('total-count').innerText = todosDiscos.length; 
    document.getElementById('wish-count').innerText = todosDiscos.filter(discoW => !discoW.adquirido).length; 
    document.getElementById('owned-count').innerText = todosDiscos.filter(discoO => discoO.adquirido).length;
    
    const categoriasParaRenderizar = [
        { titulo: "WISHLIST", dados: listaFiltradaDeDiscos.filter(d => !d.adquirido) }, 
        { titulo: "MEU ACERVO", dados: listaFiltradaDeDiscos.filter(d => d.adquirido) }
    ];
    
    categoriasParaRenderizar.forEach(categoriaAtual => {
        if (categoriaAtual.dados.length > 0) {
            containerPrincipalDeCatalogo.innerHTML += `<h2 class="main-section-title">${categoriaAtual.titulo}</h2>`;
            
            const gruposPorGeneros = categoriaAtual.dados.reduce((acumulador, vinilItem) => { 
                if (!acumulador[vinilItem.genero]) { 
                    acumulador[vinilItem.genero] = []; 
                }
                acumulador[vinilItem.genero].push(vinilItem); 
                return acumulador; 
            }, {});
            
            Object.keys(gruposPorGeneros).sort().forEach(chaveDoGenero => {
                let stringHtmlSecao = `<div class="genero-title">${escapeHtml(chaveDoGenero.toUpperCase())}</div><div class="grid">`;
                
                gruposPorGeneros[chaveDoGenero].forEach(vinilDaVez => { 
                    let seloNegociacao = '';
                    
                    if (vinilDaVez.negociavel) {
                        seloNegociacao = `<div style="position:absolute; top:5px; right:5px; background:var(--secundaria); color:white; font-size:0.6rem; padding:3px 6px; border-radius:4px; font-weight:bold; z-index: 10;">T/V</div>`;
                    }
                    
                    let seloEstrelas = '';
                    
                    if (typeof renderStarsHtml === 'function') {
                        seloEstrelas = renderStarsHtml(vinilDaVez.nota, true);
                    }

                    stringHtmlSecao += `
                        <div class="card" style="position:relative;" onclick="abrirModal(${vinilDaVez.id})">
                            ${seloEstrelas}
                            ${seloNegociacao}
                            
                            <img src="${imgSrc(vinilDaVez.foto)}" alt="${escapeHtml(vinilDaVez.nome)}">
                            <h4>${escapeHtml(vinilDaVez.nome)}</h4>
                            <p>${escapeHtml(vinilDaVez.artista)}</p>

                        </div>
                    `; 
                });
                
                stringHtmlSecao += `</div>`;
                containerPrincipalDeCatalogo.innerHTML += stringHtmlSecao;
            });
        }
    });
}

function abrirModal(idDoVinilSelecionado) {
    const discoAchado = todosDiscos.find(discoElemento => discoElemento.id === idDoVinilSelecionado); 
    
    if (!discoAchado) {
        return; 
    }
    
    discoAtualId = idDoVinilSelecionado;
    
    const modalViewDiv = document.getElementById('modal-view');
    modalViewDiv.classList.remove('hidden'); 
    
    const modalEditDiv = document.getElementById('modal-edit');
    modalEditDiv.classList.add('hidden');
    
    document.getElementById('modal-img').src = urlImagemSegura(discoAchado.foto); 
    
    let tituloNome = escapeHtml(discoAchado.nome);
    
    if (discoAchado.negociavel) {
        tituloNome += ` <span style="font-size:0.8rem; color:var(--secundaria);">(Disponível em Classificados)</span>`;
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
        vinylLabel.style.backgroundImage = cssUrl(urlImagemSegura(discoAchado.foto));
    }
    
    if (vinylWrapper) {
        vinylWrapper.classList.remove('slide-out');
        
        setTimeout(() => {
            vinylWrapper.classList.add('slide-out');
        }, 50);
    }

    let stringHtmlAcoes = '';
    
    // MÁGICA: BOTÃO DE "TOCANDO AGORA"
    if (discoAchado.adquirido) {
        
        stringHtmlAcoes += `
            <button onclick="definirTocandoAgora(${jsArg(discoAchado.artista)}, ${jsArg(discoAchado.nome)})"
 class="modal-btn" style="background:#1DB954; color:white; margin-top:10px; border-radius: 20px;">
                🎧 DEFINIR COMO "TOCANDO AGORA"
            </button>
        `;
    }
    
    if (discoAchado.spotify) {
        stringHtmlAcoes += `
            <a href="${hrefSeguro(discoAchado.spotify)}" target="_blank" rel="noopener noreferrer" class="modal-btn" style="background:var(--spotify); color:white; text-decoration:none; display:flex; align-items:center; justify-content:center; margin-top:10px;">
                <img src="./assets/spotify.svg" style="width:20px; margin-right:10px;" alt="Spotify Icon">
                OUVIR NO SPOTIFY
            </a>
        `;
    }
    
    if (!discoAchado.adquirido) {
        stringHtmlAcoes += `
            <button onclick="comprado(${discoAchado.id})" class="modal-btn" style="background:var(--secundaria); color:white; margin-top:10px;">
                MARCAR COMO COMPRADO
            </button>
        `;
    }
    
    stringHtmlAcoes += `
        <button onclick="abrirModalEncaminhar(${discoAchado.id})" class="modal-btn" style="background:var(--primaria); color:var(--quaternaria); margin-top:10px;">
            ENCAMINHAR DISCO NO CHAT
        </button>
    `;
    
    stringHtmlAcoes += `
        <button onclick="toggleEdit(${discoAchado.id})" class="modal-btn" style="background:var(--terciaria); color:white; margin-top:10px;">
            EDITAR INFORMAÇÕES
        </button>
    `;
    
    stringHtmlAcoes += `
        <button onclick="deletar(${discoAchado.id})" style="background:#fdd; color:red; border:1px solid #fbb; font-size:0.7rem; padding: 8px; border-radius:4px; margin-top:10px; cursor:pointer;">
            REMOVER REGISTRO PERMANENTEMENTE
        </button>
    `;
    
    document.getElementById('modal-actions').innerHTML = stringHtmlAcoes;
    document.getElementById('modal-vinil').classList.add('active');
}

function toggleEdit(idParaEditar) {
    const discoEncontrado = todosDiscos.find(discoX => discoX.id === idParaEditar);
    
    document.getElementById('modal-view').classList.add('hidden'); 
    document.getElementById('modal-edit').classList.remove('hidden');
    
    document.getElementById('edit-foto').value = ''; 
    document.getElementById('edit-nome').value = discoEncontrado.nome; 
    document.getElementById('edit-artista').value = discoEncontrado.artista; 
    document.getElementById('edit-genero').value = discoEncontrado.genero; 
    
    if (discoEncontrado.spotify) { 
        document.getElementById('edit-spotify').value = discoEncontrado.spotify; 
    } else { 
        document.getElementById('edit-spotify').value = ''; 
    }
    
    if (discoEncontrado.negociavel) { 
        document.getElementById('edit-negociavel').checked = true; 
    } else { 
        document.getElementById('edit-negociavel').checked = false; 
    }
    
    setNota('edit', discoEncontrado.nota || 0);
    
    if (typeof pararAudioGlobal === 'function') {
        pararAudioGlobal();
    }
    
    document.getElementById('modal-actions').innerHTML = `
        <button onclick="salvarEdicao()" class="modal-btn" style="background:var(--secundaria); color:white;">
            SALVAR ALTERAÇÕES
        </button>
        <button onclick="abrirModal(${idParaEditar})" class="modal-btn" style="background:var(--quinta); color:var(--primaria); border: 1px solid var(--quaternaria); margin-top:10px;">
            CANCELAR EDIÇÃO
        </button>
    `;
}

async function salvarEdicao() {
    const arrayBotoes = document.querySelectorAll('#modal-actions button');
    const botaoSalvar = arrayBotoes[0];
    
    botaoSalvar.disabled = true; 
    botaoSalvar.innerHTML = '<span class="spinner"></span> SALVANDO...';
    
    const inputGeneroValue = document.getElementById('edit-genero').value;
    const generoCorrigido = inputGeneroValue ? inputGeneroValue : 'Geral';
    const inputNegociavelAtualizado = document.getElementById('edit-negociavel').checked;
    
    const inputNotaAtualizada = parseInt(document.getElementById('nota-edit').value) || 0;
    
    const payloadEdicaoDisco = { 
        nome: document.getElementById('edit-nome').value, 
        artista: document.getElementById('edit-artista').value, 
        genero: generoCorrigido, 
        spotify: document.getElementById('edit-spotify').value,
        negociavel: inputNegociavelAtualizado,
        nota: inputNotaAtualizada
    };
    
    const campoDeArquivo = document.getElementById('edit-foto');
    const arquivoDeEdicao = campoDeArquivo.files[0];
    
    if (arquivoDeEdicao) {
        const leitorFileEdit = new FileReader(); 
        
        leitorFileEdit.onload = function(eventoLoadEdit) {
            const imagemNovaEdit = new Image(); 
            
            imagemNovaEdit.onload = async function() {
                const canvasEdit = document.createElement('canvas'); 
                canvasEdit.width = 600; 
                canvasEdit.height = 600; 
                
                const contextEdit = canvasEdit.getContext('2d');
                contextEdit.drawImage(imagemNovaEdit, 0, 0, 600, 600);
                
                payloadEdicaoDisco.foto = canvasEdit.toDataURL('image/jpeg', 0.8); 
                
                try {
                    await api.put(`/vinis/${discoAtualId}`, payloadEdicaoDisco);
                    
                    fecharModal(null, true); 
                    showToast("As informações foram salvas com sucesso!"); 
                    carregarDados(); 
                    
                } catch(errCatch) { 
                    alert(errCatch.message || "Falha na atualização do disco via API"); 
                }
            }; 
            
            imagemNovaEdit.src = eventoLoadEdit.target.result;
        }; 
        
        leitorFileEdit.readAsDataURL(arquivoDeEdicao);
    } else {
        try {
            await api.put(`/vinis/${discoAtualId}`, payloadEdicaoDisco);
            
            fecharModal(null, true); 
            showToast("As informações foram salvas com sucesso!"); 
            carregarDados(); 
            
        } catch(errCatchDois) { 
            alert(errCatchDois.message || "Falha na atualização do disco via API sem imagem"); 
        }
    }
}

function fecharModal(eventoCliqueModal, forcarFechamentoModal = false) { 
    if (forcarFechamentoModal || (eventoCliqueModal && eventoCliqueModal.target.id === 'modal-vinil')) {
        const principalModal = document.getElementById('modal-vinil');
        principalModal.classList.remove('active'); 
        
        const vinylWrapper = document.getElementById('modal-vinyl-wrapper');
        
        if (vinylWrapper) {
            vinylWrapper.classList.remove('slide-out');
        }
        
        if (typeof pararAudioGlobal === 'function') {
            pararAudioGlobal();
        }
    }
}

async function comprado(identificadorDoVinil) { 
    try {
        
        await api.put(`/vinis/${identificadorDoVinil}`, { adquirido: true });

        
        fecharModal(null, true); 
        showToast("O disco foi movido da wishlist para o seu acervo com sucesso!"); 
        carregarDados(); 
        
    } catch (erroDeCompraAPI) { 
        alert(erroDeCompraAPI.message || "Ocorreu um erro ao atualizar o status do seu disco."); 
    }
}

async function deletar(identificadorDelecao) { 
    const textoDeConfirmacao = "Você tem certeza absoluta que deseja remover este registro permanentemente do banco de dados?";
    
    if (confirm(textoDeConfirmacao)) { 
        try {
            
            await api.delete(`/vinis/${identificadorDelecao}`);

            
            fecharModal(null, true); 
            showToast("Registro do disco removido com sucesso."); 
            carregarDados(); 
            
        } catch (erroNaDelecaoDeVinil) { 
            alert(erroNaDelecaoDeVinil.message || "Erro de comunicação ao tentar remover o seu disco."); 
        }
    } 
}

function exportarPDF() { 
    const elementoParaExportar = document.getElementById('catalog-container');
    
    const opcoesDoPDF = { 
        margin: 10, 
        filename: 'minha-colecao-vinylvault.pdf', 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    html2pdf().set(opcoesDoPDF).from(elementoParaExportar).save(); 
}

function voltarHome() { 
    document.getElementById('busca').value = ''; 
    document.getElementById('filtro-genero').value = ''; 
    document.getElementById('filtro-artista').value = '';
    
    switchTab('explore'); 
    renderizar(); 
    
    window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
    }); 
}