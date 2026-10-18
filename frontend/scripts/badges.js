// ==========================================
// SISTEMA DE SELOS E CONQUISTAS (GAMIFICAÇÃO)
// ==========================================

function gerarHtmlSelos(totalDiscos, totalSeguidores) {
    let html = '';
    
    // Regra dos Discos (Baseado nos limites definidos)
    if (totalDiscos >= 150) {
        html += `<span class="badge-icon" title="Lenda do Vinil: 150+ discos cadastrados">🥇</span>`;
    } else if (totalDiscos >= 100) {
        html += `<span class="badge-icon" title="Curador: 100+ discos cadastrados">🥈</span>`;
    } else if (totalDiscos >= 50) {
        html += `<span class="badge-icon" title="Iniciante: 50+ discos cadastrados">🥉</span>`;
    }

    // Regra Social
    if (totalSeguidores > 50) {
        html += `<span class="badge-icon" title="Socialite: Mais de 50 seguidores">🗣️</span>`;
    }

    return html;
}

function abrirModalLegendaSelos() {
    document.getElementById('modal-legenda-selos').classList.add('active');
}

function fecharModalLegendaSelos(evento, forcarFechamento = false) {
    if (forcarFechamento || evento.target.id === 'modal-legenda-selos') {
        document.getElementById('modal-legenda-selos').classList.remove('active');
    }
}