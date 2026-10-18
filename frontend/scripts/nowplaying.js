// ==========================================
// 🎧 SISTEMA DE STATUS "TOCANDO AGORA"
// ==========================================

async function definirTocandoAgora(artista, album) {
    const statusTexto = `${artista} - ${album}`;
    
    try {
        await fetch(`${API_URL}/usuarios/${usuarioAtual.id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ tocando_agora: statusTexto })
        });
        
        // Atualiza os dados no celular do usuário
        usuarioAtual.tocando_agora = statusTexto;
        localStorage.setItem('vinyl_user', JSON.stringify(usuarioAtual));
        
        showToast(`Status atualizado: Ouvindo ${album} 🎧`);
        
        atualizarSidebarStatus();
        fecharModal(null, true);
        
    } catch (erro) {
        console.error("Erro ao atualizar o status:", erro);
        alert("Não foi possível atualizar o seu status no momento.");
    }
}

async function limparStatus() {
    try {
        await fetch(`${API_URL}/usuarios/${usuarioAtual.id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ tocando_agora: null })
        });
        
        // Remove do celular do usuário
        usuarioAtual.tocando_agora = null;
        localStorage.setItem('vinyl_user', JSON.stringify(usuarioAtual));
        
        showToast('Seu status de música foi removido.');
        
        atualizarSidebarStatus();
        
    } catch (erro) {
        console.error("Erro ao limpar o status:", erro);
    }
}

function atualizarSidebarStatus() {
    const container = document.getElementById('sidebar-now-playing');
    
    if (!container) {
        return;
    }

    if (usuarioAtual && usuarioAtual.tocando_agora) {
        container.innerHTML = `
            <div class="sidebar-status">
                <span class="spin-disc">💿</span> 
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
                    ${usuarioAtual.tocando_agora}
                </span>
                <span class="clear-status-btn" onclick="limparStatus()" title="Limpar status">✖</span>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}