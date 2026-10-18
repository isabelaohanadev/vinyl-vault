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
    if(username.includes(' ')) return showToast('Nome de usuário não pode ter espaços!');
    if(pass.length < 6) return showToast('A senha deve ter pelo menos 6 caracteres!');
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
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if(response.ok) {
            usuarioAtual = data.usuario;
            localStorage.setItem('vinyl_user', JSON.stringify(usuarioAtual));
            entrarNoApp();
            showToast('Conta criada com sucesso!');
        } else {
            alert(data.error || 'Erro ao cadastrar');
        }
    } catch (error) {
        alert('Erro de conexão com o servidor.');
    } finally {
        btn.disabled = false; btn.innerHTML = 'Finalizar Cadastro';
    }
}

async function fazerLogin() { 
    const username = document.getElementById('username-login').value.trim();
    const pass = document.getElementById('pass-login').value.trim();

    if(!username || !pass) return showToast('Preencha usuário e senha!');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, senha: pass })
        });
        const data = await response.json();
        
        if(response.ok) {
            usuarioAtual = data.usuario;
            localStorage.setItem('vinyl_user', JSON.stringify(usuarioAtual));
            entrarNoApp();
            showToast('Bem-vindo de volta!');
        } else {
            alert(data.error || 'Erro ao logar');
        }
    } catch (error) {
        alert('Erro de conexão. Servidor está ligado?');
    }
}

async function enviarLinkReset() {
    const email = document.getElementById('forgot-email').value.trim();
    if(!email) return showToast('Preencha seu e-mail!');
    const btn = document.getElementById('btn-forgot');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });
        const data = await response.json();
        if(response.ok) { showToast(data.message); toggleAuthMode('login'); } else { alert(data.error); }
    } catch (err) { alert('Erro de conexão.'); } finally { btn.disabled = false; btn.innerHTML = 'Enviar Link'; }
}

async function salvarNovaSenha() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const novaSenha = document.getElementById('reset-nova').value.trim();
    const confirma = document.getElementById('reset-confirma').value.trim();

    if(!novaSenha || !confirma) return showToast('Preencha todos os campos!');
    if(novaSenha.length < 6) return showToast('A senha deve ter no mínimo 6 caracteres!');
    if(novaSenha !== confirma) return showToast('As senhas não coincidem!');

    const btn = document.getElementById('btn-reset');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Atualizando...';

    try {
        const response = await fetch(`${API_URL}/reset-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, novaSenha })
        });
        const data = await response.json();
        if(response.ok) {
            showToast('Senha alterada com sucesso!');
            window.history.replaceState({}, document.title, window.location.pathname);
            toggleAuthMode('login');
        } else { alert(data.error); }
    } catch (err) { alert('Erro de conexão.'); } finally { btn.disabled = false; btn.innerHTML = 'Atualizar Senha'; }
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
        const response = await fetch(`${API_URL}/feedback`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if(response.ok) { showToast('Mensagem enviada! Obrigado!'); msgInput.value = ''; } else { alert(data.error); }
    } catch (err) { alert('Erro ao enviar feedback.'); } finally { btn.disabled = false; btn.innerHTML = 'Enviar Mensagem'; }
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
        const responseFetch = await fetch(`${API_URL}/forgot-password`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: usuarioAtual.email }) 
        });
        const dataResponse = await responseFetch.json();
        if (responseFetch.ok) showToast('O Link foi enviado para o seu e-mail!'); else alert(dataResponse.error);
    } catch (erroDeConexao) { alert('Erro de conexão com o servidor de e-mails.'); } finally { botaoResetar.disabled = false; botaoResetar.innerHTML = 'Receber link de redefinição'; }
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
        const responseUpdate = await fetch(`${API_URL}/usuarios/${usuarioAtual.id}`, { 
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadPerfil) 
        });
        
        if (responseUpdate.ok) {
            usuarioAtual.nome_completo = payloadPerfil.nome_completo; 
            usuarioAtual.bio = payloadPerfil.bio; 
            if (payloadPerfil.foto_perfil) usuarioAtual.foto_perfil = payloadPerfil.foto_perfil;
            
            localStorage.setItem('vinyl_user', JSON.stringify(usuarioAtual)); 
            atualizarAvatarUI(); carregarDadosPerfil(); showToast("Seu perfil foi atualizado com sucesso!");
        } else { alert("Ocorreu um erro ao tentar salvar o seu perfil."); }
    } catch(erroConexaoApi) { alert("Erro de conexão ao tentar salvar o perfil."); } finally { botaoSalvarPerfil.disabled = false; botaoSalvarPerfil.innerHTML = 'Salvar Alterações'; }
}

async function excluirConta() {
    if (!usuarioAtual) return;
    
    const mensagemConfirmacao1 = "🚨 TEM CERTEZA ABSOLUTA?\n\nIsso apagará sua conta e TODOS os seus discos salvos permanentemente.";
    if (confirm(mensagemConfirmacao1)) {
        const confirmacaoDigitada = prompt("Para continuar o processo, digite a palavra EXCLUIR:");
        if (confirmacaoDigitada !== "EXCLUIR") return alert("O processo de exclusão foi cancelado.");
        
        try {
            const responseDelete = await fetch(`${API_URL}/usuarios/${usuarioAtual.id}`, { method: 'DELETE' });
            if (responseDelete.ok) { alert("Sua conta foi excluída!"); logout(); } else { alert("Erro ao excluir a conta."); }
        } catch(erroDelete) { alert("Ocorreu um erro de conexão durante a exclusão."); }
    }
}