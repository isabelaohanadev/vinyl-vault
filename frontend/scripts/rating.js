// ==========================================
// SISTEMA DE AVALIAÇÃO (ESTRELAS)
// ==========================================

function setNota(tipoDeFormulario, valorDaNota) {
    // Salva o valor no input escondido
    document.getElementById(`nota-${tipoDeFormulario}`).value = valorDaNota;
    
    // Pega o container específico (add ou edit)
    const containerDeEstrelas = document.getElementById(`${tipoDeFormulario}-stars-container`);
    const elementosEstrela = containerDeEstrelas.querySelectorAll('.star');
    
    // Percorre todas as estrelas e pinta as corretas
    elementosEstrela.forEach((estrelaUnica, indice) => {
        // CORREÇÃO: Usando a variável 'indice' corretamente!
        if (indice < valorDaNota) {
            estrelaUnica.classList.add('active');
        } else {
            estrelaUnica.classList.remove('active');
        }
    });
}

function renderStarsHtml(notaFinal, isCartaoDeAcervo = false) {
    if (!notaFinal || notaFinal === 0) {
        return '';
    }
    
    let estrelasHtml = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= notaFinal) {
            estrelasHtml += '<span class="star filled">★</span>';
        } else {
            estrelasHtml += '<span class="star">★</span>';
        }
    }
    
    if (isCartaoDeAcervo) {
        return `<div class="card-stars">${estrelasHtml}</div>`;
    }
    
    return `<div class="display-stars">${estrelasHtml}</div>`;
}