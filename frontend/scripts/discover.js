// ==========================================
// 🔮 ALGORITMO DE RECOMENDAÇÃO INTELIGENTE
// ==========================================

async function abrirDescobrir() {
    switchTab('discover');
    
    const containerResultados = document.getElementById('discover-results');
    const subtitulo = document.getElementById('discover-subtitle');
    
    containerResultados.innerHTML = `
        <div style="text-align:center; padding: 50px; grid-column: 1/-1;">
            <span class="spinner" style="border-top-color: var(--secundaria); width: 40px; height: 40px;"></span>
            <p style="margin-top: 20px; color: gray;">Analisando o seu gosto musical...</p>
        </div>
    `;

    if (todosDiscos.length === 0) {
        subtitulo.innerText = "Comece sua coleção para recebermos dicas!";
        containerResultados.innerHTML = '<p style="text-align:center; color:gray; grid-column: 1/-1;">Adicione alguns discos ao seu acervo físico ou wishlist para o algoritmo começar a entender o seu gosto.</p>';
        return;
    }

    // 1. Analisa a frequência dos gêneros
    const contagemDeGeneros = {};
    todosDiscos.forEach(disco => {
        const generoAtual = disco.genero || 'Geral';
        contagemDeGeneros[generoAtual] = (contagemDeGeneros[generoAtual] || 0) + 1;
    });

    // 2. Identifica o Gênero Favorito (Top 1)
    const generoFavorito = Object.keys(contagemDeGeneros).reduce((a, b) => contagemDeGeneros[a] > contagemDeGeneros[b] ? a : b);

    subtitulo.innerHTML = `Percebemos que você tem muito <b>${generoFavorito.toUpperCase()}</b> no acervo. Aqui estão algumas joias para a sua coleção:`;

    // 3. Busca álbuns famosos na API do iTunes para esse gênero
    try {
        const respostaDaApi = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(generoFavorito)}&entity=album&limit=30`);
        const dados = await respostaDaApi.json();

        // 4. Mágica do Filtro: Remove os álbuns que o usuário já tem
        const nomesDosMeusDiscos = todosDiscos.map(d => d.nome.toLowerCase().trim());

        const recomendacoesFinais = dados.results.filter(album => {
            const nomeDoAlbumNaApi = album.collectionName.toLowerCase().trim();
            return !nomesDosMeusDiscos.includes(nomeDoAlbumNaApi);
        }).slice(0, 10); // Pega apenas os 10 primeiros resultados válidos

        if (recomendacoesFinais.length === 0) {
            containerResultados.innerHTML = '<p style="text-align:center; color:gray; grid-column: 1/-1;">Uau! O seu acervo é impressionante, você já tem os principais álbuns desse gênero!</p>';
            return;
        }

        // 5. Renderiza a Galeria de Recomendações
        containerResultados.innerHTML = '';
        
        recomendacoesFinais.forEach(album => {
            const capaEmAltaQualidade = album.artworkUrl100.replace('100x100bb', '600x600bb');
            const nomeAlbumLimpo = album.collectionName.replace(/'/g, "\\'");
            const nomeArtistaLimpo = album.artistName.replace(/'/g, "\\'");
            const generoLimpo = album.primaryGenreName.replace(/'/g, "\\'");
            const idColecao = album.collectionId;

            containerResultados.innerHTML += `
                <div class="discover-card">
                    <img src="${capaEmAltaQualidade}" alt="${album.collectionName}">
                    <div class="discover-info">
                        <h4>${album.collectionName}</h4>
                        <p>${album.artistName}</p>
                        <button class="btn-add-wishlist" onclick="salvarRecomendacaoNaWishlist('${nomeAlbumLimpo}', '${nomeArtistaLimpo}', '${generoLimpo}', '${capaEmAltaQualidade}', ${idColecao}, this)">
                            + Adicionar à Wishlist
                        </button>
                    </div>
                </div>
            `;
        });

    } catch(erro) {
        console.error("Erro no algoritmo de recomendação:", erro);
        containerResultados.innerHTML = '<p style="text-align:center; color:red; grid-column: 1/-1;">Erro de conexão ao buscar novas recomendações. Tente novamente mais tarde.</p>';
    }
}

// Salva o disco diretamente no banco com 1 clique (E puxa a prévia de áudio!)
async function salvarRecomendacaoNaWishlist(nome, artista, genero, urlDaCapa, idCollection, botaoClicado) {
    botaoClicado.disabled = true;
    botaoClicado.innerHTML = '<span class="spinner"></span> CARREGANDO...';

    let urlDeAudioPreview = null;

    // Busca a música para ter o Player funcionando na Wishlist!
    try {
        const urlFaixas = `https://itunes.apple.com/lookup?id=${idCollection}&entity=song`;
        const resFaixas = await fetch(urlFaixas);
        const dadosFaixas = await resFaixas.json();
        
        const faixaAudio = dadosFaixas.results.find(f => f.wrapperType === 'track' && f.previewUrl);
        if (faixaAudio) {
            urlDeAudioPreview = faixaAudio.previewUrl;
        }
    } catch(e) {
        console.warn("Sem preview de áudio.");
    }

    // Processa a Imagem para Base64 (Para não expirar o link da Apple)
    try {
        const imagemTemporaria = new Image();
        imagemTemporaria.crossOrigin = "Anonymous";
        
        imagemTemporaria.onload = async function() {
            const canvasRender = document.createElement('canvas');
            canvasRender.width = 600; 
            canvasRender.height = 600;
            
            const context = canvasRender.getContext('2d');
            context.drawImage(imagemTemporaria, 0, 0, 600, 600);
            const base64Final = canvasRender.toDataURL('image/jpeg', 0.8);

            const payloadWishlist = {
                nome: nome,
                artista: artista,
                genero: genero,
                spotify: '',
                adquirido: false, // WISHLIST = false
                negociavel: false,
                preview_url: urlDeAudioPreview,
                nota: 0,
                foto: base64Final
            };

            
            try {
                await api.post('/vinis', payloadWishlist);
            } catch (erroApi) {
                alert(erroApi.message || "Erro ao adicionar à wishlist.");
                botaoClicado.disabled = false;
                botaoClicado.innerHTML = '+ Adicionar à Wishlist';
                return;
            }


            botaoClicado.innerHTML = '✅ NA WISHLIST';
            botaoClicado.style.background = '#27ae60';
            botaoClicado.style.color = 'white';
            
            showToast(`${nome} foi salvo na sua lista de desejos!`);
            
            // Atualiza os dados no fundo silenciosamente
            carregarDados(); 
        };

        imagemTemporaria.onerror = function() {
            alert("Ocorreu um bloqueio ao processar a capa do disco.");
            botaoClicado.disabled = false;
            botaoClicado.innerHTML = '+ Adicionar à Wishlist';
        };

        imagemTemporaria.src = urlDaCapa;

    } catch(erro) {
        console.error(erro);
        alert("Erro ao adicionar à wishlist.");
        botaoClicado.disabled = false;
        botaoClicado.innerHTML = '+ Adicionar à Wishlist';
    }
}