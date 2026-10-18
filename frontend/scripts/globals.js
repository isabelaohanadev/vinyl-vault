// ==========================================
// CONFIGURAÇÕES GLOBAIS E ESTADO DA APLICAÇÃO
// ==========================================
const API_URL = 'http://localhost:3000/api';

let usuarioAtual = null; 
let todosDiscos = [];
let listaComunidade = []; 
let mensagensAtuaisChat = []; 
let discoAtualId = null;
let fotoPerfilTempB64 = null; 

let vinisPerfilPublico = [];

let chatAmigoAtivo = null; 
let intervaloChat = null; 
let intervaloNotif = null;
let intervaloBadgeChat = null;

let comentarioPaiIdAtivo = null; 
let usuarioMencionadoIdAtivo = null;
let abaAnteriorParaPost = 'explore'; 

let vinilParaEncaminhar = null;

let slideIndex = 0;

// ==========================================
// INICIALIZAÇÃO E CARROSSEL
// ==========================================

function showSlides() {
    slideIndex++;
    
    if (slideIndex > 1) {
        slideIndex = 0;
    }
    
    updateCarousel();
    
    setTimeout(showSlides, 5000); 
}

function currentSlide(n) {
    slideIndex = n;
    
    updateCarousel();
}

function updateCarousel() {
    const slide = document.getElementById('carousel');
    const dots = document.querySelectorAll('.dot');
    
    if (slide) {
        slide.style.transform = `translateX(-${slideIndex * 100}%)`;
        
        dots.forEach((dot, i) => {
            if (i === slideIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const temaSalvo = localStorage.getItem('tema');
    const checkboxTheme = document.getElementById('checkbox-theme');
    
    if (temaSalvo === 'escuro') {
        document.body.classList.add('dark-mode');
        
        if (checkboxTheme) {
            checkboxTheme.checked = true;
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');

    if (resetToken) {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        
        toggleAuthMode('reset'); 
        
        return; 
    }

    const userSalvo = localStorage.getItem('vinyl_user');
    
    if (userSalvo) {
        usuarioAtual = JSON.parse(userSalvo);
        entrarNoApp();
    }
});

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const checkboxTheme = document.getElementById('checkbox-theme');
    
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('tema', 'escuro');
        
        if (checkboxTheme) {
            checkboxTheme.checked = true; 
        }
    } else {
        localStorage.setItem('tema', 'claro');
        
        if (checkboxTheme) {
            checkboxTheme.checked = false; 
        }
    }

    if (typeof renderizarGraficos === 'function') {
        renderizarGraficos();
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    
    setTimeout(() => { 
        toast.classList.remove('show'); 
    }, 3000);
}

function gerarCorHex(textoString) {
    let hash = 0; 
    
    for (let i = 0; i < textoString.length; i++) {
        hash = textoString.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let codigoDeCor = '#'; 
    
    for (let i = 0; i < 3; i++) {
        let valorParaHex = (hash >> (i * 8)) & 0xFF;
        let stringHex = valorParaHex.toString(16);
        
        if (stringHex.length < 2) { 
            stringHex = '0' + stringHex; 
        }
        
        codigoDeCor += stringHex;
    }
    
    return codigoDeCor;
}

// ==========================================
// FUNÇÕES DE BASE E NAVEGAÇÃO DA APLICAÇÃO
// ==========================================

function toggleSidebar() {
    const sidebar = document.getElementById('user-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    sidebar.classList.toggle('active');
    backdrop.classList.toggle('active');
}

function navFromSidebar(tabName) {
    toggleSidebar(); 
    switchTab(tabName);
}

function atualizarCabecalhoPerfilComunidade() {
    if (!usuarioAtual) {
        return;
    }
    
    const nomeDisplayComunidade = document.getElementById('meu-nome-comunidade');
    nomeDisplayComunidade.innerText = usuarioAtual.nome_completo;
    
    const previewDaFotoComunidade = document.getElementById('meu-avatar-comunidade');
    
    if (usuarioAtual.foto_perfil) { 
        previewDaFotoComunidade.style.backgroundImage = `url(${usuarioAtual.foto_perfil})`; 
        previewDaFotoComunidade.innerText = ''; 
        previewDaFotoComunidade.style.backgroundColor = 'transparent'; 
    } else { 
        previewDaFotoComunidade.style.backgroundImage = 'none'; 
        previewDaFotoComunidade.innerText = usuarioAtual.username.charAt(0).toUpperCase(); 
        previewDaFotoComunidade.style.backgroundColor = gerarCorHex(usuarioAtual.username); 
    }
}

function switchTab(nomeDaAba) {
    const abaExplore = document.getElementById('tab-explore');
    const abaAdd = document.getElementById('tab-add');
    const abaProfileCommunity = document.getElementById('tab-profile-community');
    const abaEditProfile = document.getElementById('tab-edit-profile');
    const abaCommunity = document.getElementById('tab-community');
    const abaNotifications = document.getElementById('tab-notifications');
    const abaPublicProfile = document.getElementById('tab-public-profile');
    const abaPostDetail = document.getElementById('tab-post-detail');
    const abaMarket = document.getElementById('tab-market');
    const abaAboutUs = document.getElementById('tab-aboutus');
    
    // NOVA ABA DESCOBRIR
    const abaDiscover = document.getElementById('tab-discover');
    
    abaExplore.classList.toggle('hidden', nomeDaAba !== 'explore');
    abaAdd.classList.toggle('hidden', nomeDaAba !== 'add');
    abaProfileCommunity.classList.toggle('hidden', nomeDaAba !== 'profile-community');
    abaEditProfile.classList.toggle('hidden', nomeDaAba !== 'edit-profile');
    abaCommunity.classList.toggle('hidden', nomeDaAba !== 'community');
    abaNotifications.classList.toggle('hidden', nomeDaAba !== 'notifications');
    abaPublicProfile.classList.toggle('hidden', nomeDaAba !== 'public-profile');
    abaPostDetail.classList.toggle('hidden', nomeDaAba !== 'post-detail');
    abaMarket.classList.toggle('hidden', nomeDaAba !== 'market');
    
    if (abaAboutUs) {
        abaAboutUs.classList.toggle('hidden', nomeDaAba !== 'aboutus');
    }
    
    if (abaDiscover) {
        abaDiscover.classList.toggle('hidden', nomeDaAba !== 'discover');
    }
    
    const btnExplore = document.getElementById('btn-explore'); 
    const btnAdd = document.getElementById('btn-add'); 
    const btnCommunity = document.getElementById('btn-community');
    const btnMarket = document.getElementById('btn-market');
    
    if (btnExplore) {
        btnExplore.classList.toggle('active', nomeDaAba === 'explore');
    }
    
    if (btnAdd) {
        btnAdd.classList.toggle('active', nomeDaAba === 'add');
    }
    
    if (btnCommunity) {
        btnCommunity.classList.toggle('active', nomeDaAba === 'community');
    }
    
    if (btnMarket) {
        btnMarket.classList.toggle('active', nomeDaAba === 'market');
    }

    if (nomeDaAba === 'profile-community') { 
        atualizarCabecalhoPerfilComunidade();
        carregarStatsPerfil(usuarioAtual.id, 'meu'); 
        renderizarMeusPosts(); 
        
        if (typeof renderizarGraficos === 'function') {
            renderizarGraficos();
        }
    }
    
    if (nomeDaAba === 'edit-profile') { 
        carregarDadosPerfil(); 
    }
    
    if (nomeDaAba === 'community') { 
        alternarAbaComunidade('timeline'); 
    } 
    
    if (nomeDaAba === 'notifications') { 
        carregarNotificacoes(); 
    }
    
    if (nomeDaAba === 'market') {
        carregarClassificados();
    }
    
    if (nomeDaAba !== 'public-profile' && nomeDaAba !== 'post-detail') {
        window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
        });
    }
}

function entrarNoApp() {
    const telaDeAuth = document.getElementById('auth-screen');
    const telaPrincipal = document.getElementById('app-screen');
    
    telaDeAuth.classList.add('hidden');
    telaPrincipal.classList.remove('hidden');
    
    const floatingBtnChat = document.getElementById('floating-chat-btn');
    
    if (floatingBtnChat) {
        floatingBtnChat.classList.remove('hidden');
    }
    
    atualizarAvatarUI(); 
    carregarDados(); 
    carregarNotificacoes(); 
    atualizarBadgeChat();
    showSlides(); 
    
    if (!intervaloNotif) { 
        intervaloNotif = setInterval(carregarNotificacoes, 10000); 
    }
    
    if (!intervaloBadgeChat) { 
        intervaloBadgeChat = setInterval(atualizarBadgeChat, 5000); 
    }
}

function logout() { 
    usuarioAtual = null; 
    localStorage.removeItem('vinyl_user');
    
    if (intervaloNotif) {
        clearInterval(intervaloNotif);
    }
    
    if (intervaloChat) {
        clearInterval(intervaloChat);
    }
    
    if (intervaloBadgeChat) {
        clearInterval(intervaloBadgeChat);
    }
    
    const todosOsInputs = document.querySelectorAll('input');
    
    todosOsInputs.forEach(inputElement => { 
        inputElement.value = ''; 
    });
    
    const sidebar = document.getElementById('user-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (sidebar) sidebar.classList.remove('active'); 
    if (backdrop) backdrop.classList.remove('active');
    
    const floatingBtnChat = document.getElementById('floating-chat-btn');
    
    if (floatingBtnChat) {
        floatingBtnChat.classList.add('hidden');
    }
    
    toggleAuthMode('login'); 
    
    const telaDeAuth = document.getElementById('auth-screen');
    const telaPrincipal = document.getElementById('app-screen');
    
    telaDeAuth.classList.remove('hidden'); 
    telaPrincipal.classList.add('hidden');
    
    switchTab('explore');
}

function atualizarAvatarUI() {
    const navAvatar = document.getElementById('nav-avatar'); 
    const sidebarAvatar = document.getElementById('sidebar-avatar'); 
    const sidebarNome = document.getElementById('sidebar-name');
    
    if (!usuarioAtual) {
        return;
    }
    
    const primeiroNome = usuarioAtual.nome_completo.split(' ')[0];
    
    if (sidebarNome) {
        sidebarNome.innerText = `Olá, ${primeiroNome}!`;
    }
    
    if (usuarioAtual.foto_perfil) {
        if (navAvatar) {
            navAvatar.style.backgroundImage = `url(${usuarioAtual.foto_perfil})`; 
            navAvatar.innerText = ''; 
            navAvatar.style.backgroundColor = 'transparent';
        }
        
        if (sidebarAvatar) {
            sidebarAvatar.style.backgroundImage = `url(${usuarioAtual.foto_perfil})`; 
            sidebarAvatar.innerText = ''; 
            sidebarAvatar.style.backgroundColor = 'transparent';
        }
    } else {
        const letraInicial = usuarioAtual.username.charAt(0).toUpperCase(); 
        const corDeFundo = gerarCorHex(usuarioAtual.username);
        
        if (navAvatar) {
            navAvatar.style.backgroundImage = 'none'; 
            navAvatar.innerText = letraInicial; 
            navAvatar.style.backgroundColor = corDeFundo;
        }
        
        if (sidebarAvatar) {
            sidebarAvatar.style.backgroundImage = 'none'; 
            sidebarAvatar.innerText = letraInicial; 
            sidebarAvatar.style.backgroundColor = corDeFundo;
        }
    }
}