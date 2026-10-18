// ==========================================
// LÓGICA DO PLAYER DE ÁUDIO GLOBAL
// ==========================================

let audioGlobal = new Audio();
let playerInterval = null;
let isPlayingPreview = false;


function gerarHtmlPlayer(previewUrlBruta) {
    // Só toca áudio http(s): o endereço vai para dentro de um onclick.
    const previewUrl = urlAudioSegura(previewUrlBruta);

    if (!previewUrl) {
        return '';
    }

    
    return `
        <div class="custom-audio-player">
            <button id="btn-play-preview" class="player-play-btn" onclick="togglePlayPreview(${jsArg(previewUrl)})">▶</button>
            <div id="playing-indicator" class="playing-waves hidden">
                <div class="wave"></div><div class="wave"></div><div class="wave"></div>
            </div>
            <div class="player-progress-bar" id="player-progress-container" onclick="seekAudio(event)">
                <div class="player-progress-fill" id="player-progress-fill"></div>
            </div>
            <span class="player-time" id="player-time">0:00</span>
        </div>
    `;
}

function togglePlayPreview(url) {
    const btnPlay = document.getElementById('btn-play-preview');
    const waves = document.getElementById('playing-indicator');
    
    // MÁGICA: Referência ao disco de vinil 3D para ele girar!
    const recordAnimado = document.getElementById('modal-vinyl-record'); 
    
    if (isPlayingPreview && audioGlobal.src === url) {
        audioGlobal.pause();
        isPlayingPreview = false;
        
        btnPlay.innerText = '▶';
        waves.classList.add('hidden');
        
        if (recordAnimado) {
            recordAnimado.classList.remove('is-playing');
        }
        
        clearInterval(playerInterval);
        
        return;
    }

    if (audioGlobal.src !== url) {
        audioGlobal.src = url;
    }
    
    audioGlobal.play();
    isPlayingPreview = true;
    
    btnPlay.innerHTML = '⏸';
    waves.classList.remove('hidden');
    
    if (recordAnimado) {
        recordAnimado.classList.add('is-playing');
    }

    if (playerInterval) {
        clearInterval(playerInterval);
    }
    
    playerInterval = setInterval(atualizarBarraDeProgresso, 100);

    audioGlobal.onended = () => {
        isPlayingPreview = false;
        
        btnPlay.innerText = '▶';
        waves.classList.add('hidden');
        
        if (recordAnimado) {
            recordAnimado.classList.remove('is-playing');
        }
        
        clearInterval(playerInterval);
        
        document.getElementById('player-progress-fill').style.width = '0%';
        document.getElementById('player-time').innerText = '0:00';
    };
}

function atualizarBarraDeProgresso() {
    if (!audioGlobal.duration) {
        return;
    }
    
    const porcentagem = (audioGlobal.currentTime / audioGlobal.duration) * 100;
    
    const progressFill = document.getElementById('player-progress-fill');
    const timeDisplay = document.getElementById('player-time');
    
    if (progressFill) {
        progressFill.style.width = `${porcentagem}%`;
    }
    
    let segundosRestantes = Math.floor(audioGlobal.duration - audioGlobal.currentTime);
    
    if (isNaN(segundosRestantes)) {
        segundosRestantes = 30; 
    }
    
    if (timeDisplay) {
        timeDisplay.innerText = `0:${segundosRestantes.toString().padStart(2, '0')}`;
    }
}

function seekAudio(evento) {
    if (!audioGlobal.src || !audioGlobal.duration) {
        return;
    }
    
    const container = document.getElementById('player-progress-container');
    const clickX = evento.offsetX;
    const width = container.clientWidth;
    const clickRatio = clickX / width;
    
    audioGlobal.currentTime = clickRatio * audioGlobal.duration;
    atualizarBarraDeProgresso();
}

function pararAudioGlobal() {
    audioGlobal.pause();
    audioGlobal.currentTime = 0;
    isPlayingPreview = false;
    
    if (playerInterval) {
        clearInterval(playerInterval);
    }
    
    // MÁGICA: Para o giro imediatamente se a pessoa fechar o modal
    const recordAnimado = document.getElementById('modal-vinyl-record');
    
    if (recordAnimado) {
        recordAnimado.classList.remove('is-playing');
    }
}