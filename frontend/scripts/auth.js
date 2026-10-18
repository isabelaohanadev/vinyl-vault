// ==========================================
// AUTENTICAÇÃO (LOGIN, REGISTRO, SENHAS)
// ==========================================

function toggleAuthMode(modoDeAutenticacao) { 
    const telaLogin = document.getElementById('login-form');
    const telaRegistro = document.getElementById('register-form');
    const telaEsqueci = document.getElementById('forgot-form');
    const telaReset = document.getElementById('reset-form');
    
    if (modoDeAutenticacao !== 'login') telaLogin.classList.add('hidden'); else telaLogin.classList.remove('hidden');
    if (modoDeAutenticacao !== 'register') telaRegistro.classList.add('hidden'); else telaRegistro.classList.remove('hidden');
    if (modoDeAutenticacao !== 'forgot') telaEsqueci.classList.add('hidden'); else telaEsqueci.classList.remove('hidden');
    if (modoDeAutenticacao !== 'reset') telaReset.classList.add('hidden'); else telaReset.classList.remove('hidden');
}

function nextStepRegister() {
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const nasc = document.getElementById('reg-nasc').value;
    const username = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const passConf = document.getElementById('reg-confirm').value.trim();

    if(!nome || !email || !nasc || !username || !pass || !passConf) return showToast('Preencha os campos obrigatórios!');
    if(!email.includes('@')) return showToast('Digite um e-mail válido!');
    if(!/^[A-Za-z0-9_.]{3,30}$/.test(username)) return showToast('Usuário: 3 a 30 caracteres, só letras, números, _ e .');
    if(pass.length < 8) return showToast('A senha deve ter pelo menos 8 caracteres!');
    if(pass !== passConf) return showToast('As senhas não coincidem!');

    document.getElementById('register-step-1').classList.add('hidden');
    document.getElementById('register-step-2').classList.remove('hidden');
}

function backStepRegister() {
    document.getElementById('register-step-2').classList.add('hidden');
    document.getElementById('register-step-1').classList.remove('hidden');
}

async function fazerCadastro() {
    const btn = document.getElementById('btn-finalizar-cad');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processando...';

    const payload = {
        nome_completo: document.getElementById('reg-nome').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        data_nascimento: document.getElementById('reg-nasc').value,
        bio: document.getElementById('reg-bio').value.trim(),
        username: document.getElementById('reg-username').value.trim(),
        senha: document.getElementById('reg-pass').value.trim(),
        foto_perfil: null
    };

    const file = document.getElementById('reg-foto').files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas'); 
                canvas.width = 300; canvas.height = 300; 
                const ctx = canvas.getContext('2d');
                const size = Math.min(img.width, img.height);
                const x = (img.width - size) / 2;
                const y = (img.height - size) / 2;
                ctx.drawImage(img, x, y, size, size, 0, 0, 300, 300);
                payload.foto_perfil = canvas.toDataURL('image/jpeg', 0.8);
                await enviarCadastroAPI(payload, btn);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        await enviarCadastroAPI(payload, btn);
    }
}

async function enviarCadastroAPI(payload, btn) {
    try {
        const data = await api.post('/auth/register', payload, { autenticada: false });

        usuarioAtual = data.usuario;
        salvarSessao(data.token, usuarioAtual);
        entrarNoApp();
        showToast('Conta criada com sucesso!');
    } catch (error) {
        alert(error.message || 'Erro ao cadastrar');
    } finally {
        btn.disabled = false; btn.innerHTML = 'Finalizar Cadastro';
    }
}

async function fazerLogin() {
    const username = document.getElementById('username-login').value.trim();
    const pass = document.getElementById('pass-login').value.trim();

    if(!username || !pass) return showToast('Preencha usuário e senha!');

    try {
        const data = await api.post('/auth/login', { login: username, senha: pass }, { autenticada: false });

        usuarioAtual = data.usuario;
        salvarSessao(data.token, usuarioAtual);
        entrarNoApp();
        showToast('Bem-vindo de volta!');
    } catch (error) {
        alert(error.message || 'Erro ao logar');
    }
}

async function enviarLinkReset() {
    const email = document.getElementById('forgot-email').value.trim();
    if(!email) return showToast('Preencha seu e-mail!');
    const btn = document.getElementById('btn-forgot');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
        const data = await api.post('/auth/forgot-password', { email }, { autenticada: false });
        showToast(data.message);
        toggleAuthMode('login');
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false; btn.innerHTML = 'Enviar Link';
    }
}

async function salvarNovaSenha() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const novaSenha = document.getElementById('reset-nova').value.trim();
    const confirma = document.getElementById('reset-confirma').value.trim();

    if(!novaSenha || !confirma) return showToast('Preencha todos os campos!');
    if(novaSenha.length < 8) return showToast('A senha deve ter no mínimo 8 caracteres!');
    if(novaSenha !== confirma) return showToast('As senhas não coincidem!');

    const btn = document.getElementById('btn-reset');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Atualizando...';

    try {
        await api.post('/auth/reset-password', { token, novaSenha }, { autenticada: false });
        showToast('Senha alterada com sucesso!');
        window.history.replaceState({}, document.title, window.location.pathname);
        toggleAuthMode('login');
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false; btn.innerHTML = 'Atualizar Senha';
    }
}

async function enviarFeedback() {
    const msgInput = document.getElementById('feedback-msg');
    const msg = msgInput.value.trim();

    if(!msg) return showToast('Por favor, escreva uma mensagem!');

    const btn = document.getElementById('btn-feedback');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';

    const payload = {
        mensagem: msg,
        usuario_email: usuarioAtual ? usuarioAtual.email : null,
        usuario_nome: usuarioAtual ? usuarioAtual.nome_completo : null
    };

    try {
        await api.post('/feedback', payload);
        showToast('Mensagem enviada! Obrigado!');
        msgInput.value = '';
    } catch (err) {
        alert(err.message || 'Erro ao enviar feedback.');
    } finally {
        btn.disabled = false; btn.innerHTML = 'Enviar Mensagem';
    }
}

// ==========================================
// EDIÇÃO DE PERFIL E SEGURANÇA GERAL
// ==========================================

function carregarDadosPerfil() {
    const inputNome = document.getElementById('edit-perfil-nome');
    const inputBio = document.getElementById('edit-perfil-bio');
    
    inputNome.value = usuarioAtual.nome_completo;
    
    if (usuarioAtual.bio) {
        inputBio.value = usuarioAtual.bio;
    } else {
        inputBio.value = '';
    }
    
    fotoPerfilTempB64 = null; 
    const previewDaFoto = document.getElementById('perfil-avatar-preview');
    
    if (usuarioAtual.foto_perfil) { 
        previewDaFoto.style.backgroundImage = `url(${usuarioAtual.foto_perfil})`; 
        previewDaFoto.innerText = ''; 
        previewDaFoto.style.backgroundColor = 'transparent'; 
    } else { 
        previewDaFoto.style.backgroundImage = 'none'; 
        previewDaFoto.innerText = usuarioAtual.username.charAt(0).toUpperCase(); 
        previewDaFoto.style.backgroundColor = gerarCorHex(usuarioAtual.username); 
    }
}

function previewNovaFoto(eventoDeUpload) {
    const arquivoFoto = eventoDeUpload.target.files[0]; 
    if (!arquivoFoto) return;
    
    const leitor = new FileReader();
    leitor.onload = function(eventoLeitura) {
        const imagemOriginal = new Image();
        imagemOriginal.onload = function() {
            const canvasDesenho = document.createElement('canvas'); 
            canvasDesenho.width = 300; canvasDesenho.height = 300;
            const contexto2D = canvasDesenho.getContext('2d'); 
            const tamanhoMenor = Math.min(imagemOriginal.width, imagemOriginal.height);
            const posicaoX = (imagemOriginal.width - tamanhoMenor) / 2;
            const posicaoY = (imagemOriginal.height - tamanhoMenor) / 2;
            
            contexto2D.drawImage(imagemOriginal, posicaoX, posicaoY, tamanhoMenor, tamanhoMenor, 0, 0, 300, 300);
            fotoPerfilTempB64 = canvasDesenho.toDataURL('image/jpeg', 0.8);
            
            const previewAtualizado = document.getElementById('perfil-avatar-preview'); 
            previewAtualizado.style.backgroundImage = `url(${fotoPerfilTempB64})`; 
            previewAtualizado.innerText = '';
        };
        imagemOriginal.src = eventoLeitura.target.result;
    };
    leitor.readAsDataURL(arquivoFoto);
}

async function enviarLinkResetPerfil() {
    if (!usuarioAtual || !usuarioAtual.email) return showToast('E-mail não encontrado.');
    const botaoResetar = document.getElementById('btn-reset-perfil');
    botaoResetar.disabled = true; botaoResetar.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
        await api.post('/auth/forgot-password', { email: usuarioAtual.email });
        showToast('O Link foi enviado para o seu e-mail!');
    } catch (erro) {
        alert(erro.message || 'Erro de conexão com o servidor de e-mails.');
    } finally {
        botaoResetar.disabled = false; botaoResetar.innerHTML = 'Receber link de redefinição';
    }
}

async function salvarPerfil() {
    const botaoSalvarPerfil = document.getElementById('btn-salvar-perfil');
    botaoSalvarPerfil.disabled = true; botaoSalvarPerfil.innerHTML = '<span class="spinner"></span> Salvando alterações...';

    const payloadPerfil = {
        nome_completo: document.getElementById('edit-perfil-nome').value.trim(),
        bio: document.getElementById('edit-perfil-bio').value.trim()
    };

    if (fotoPerfilTempB64) payloadPerfil.foto_perfil = fotoPerfilTempB64;

    try {
        await api.put(`/usuarios/${usuarioAtual.id}`, payloadPerfil);

        usuarioAtual.nome_completo = payloadPerfil.nome_completo;
        usuarioAtual.bio = payloadPerfil.bio;
        if (payloadPerfil.foto_perfil) usuarioAtual.foto_perfil = payloadPerfil.foto_perfil;

        localStorage.setItem('vinyl_user', JSON.stringify(usuarioAtual));
        atualizarAvatarUI(); carregarDadosPerfil(); showToast("Seu perfil foi atualizado com sucesso!");
    } catch(erro) {
        alert(erro.message || "Ocorreu um erro ao tentar salvar o seu perfil.");
    } finally {
        botaoSalvarPerfil.disabled = false; botaoSalvarPerfil.innerHTML = 'Salvar Alterações';
    }
}

async function excluirConta() {
    if (!usuarioAtual) return;
    
    const mensagemConfirmacao1 = "🚨 TEM CERTEZA ABSOLUTA?\n\nIsso apagará sua conta e TODOS os seus discos salvos permanentemente.";
    if (confirm(mensagemConfirmacao1)) {
        const confirmacaoDigitada = prompt("Para continuar o processo, digite a palavra EXCLUIR:");
        if (confirmacaoDigitada !== "EXCLUIR") return alert("O processo de exclusão foi cancelado.");
        
        try {
            
            await api.delete(`/usuarios/${usuarioAtual.id}`);
            alert("Sua conta foi excluída!");
            logout();
        } catch(erroDelete) { alert(erroDelete.message || "Ocorreu um erro durante a exclusão."); }

    }
}