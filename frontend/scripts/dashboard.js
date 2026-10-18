// ==========================================
// DASHBOARD DE ESTATÍSTICAS DO COLECIONADOR
// ==========================================

let graficoGenerosInstance = null;
let graficoCrescimentoInstance = null;

function renderizarGraficos() {
    const ctxGeneros = document.getElementById('chartGeneros');
    const ctxCrescimento = document.getElementById('chartCrescimento');
    
    // Verifica se os elementos canvas existem na tela atual
    if (!ctxGeneros || !ctxCrescimento) return;

    // Destrói os gráficos antigos para evitar sobreposição de canvas
    if (graficoGenerosInstance) graficoGenerosInstance.destroy();
    if (graficoCrescimentoInstance) graficoCrescimentoInstance.destroy();

    const isDarkMode = document.body.classList.contains('dark-mode');
    const corTexto = isDarkMode ? '#F1F5F2' : '#14281D';
    const corGrid = isDarkMode ? '#2c4a2b' : '#eeeeee';

    // 1. Processamento de Dados (Apenas Discos Adquiridos no Acervo)
    const acervoReal = todosDiscos.filter(disco => disco.adquirido === true);

    if (acervoReal.length === 0) {
        ctxGeneros.style.display = 'none';
        ctxCrescimento.style.display = 'none';
        document.querySelectorAll('.chart-empty-state').forEach(el => el.classList.remove('hidden'));
        return;
    } else {
        ctxGeneros.style.display = 'block';
        ctxCrescimento.style.display = 'block';
        document.querySelectorAll('.chart-empty-state').forEach(el => el.classList.add('hidden'));
    }

    // --- GRÁFICO 1: PIZZA DE GÊNEROS ---
    const contagemGeneros = {};
    
    acervoReal.forEach(disco => {
        const genero = disco.genero || 'Outros';
        contagemGeneros[genero] = (contagemGeneros[genero] || 0) + 1;
    });

    const labelsGeneros = Object.keys(contagemGeneros);
    const dadosGeneros = Object.values(contagemGeneros);
    const paletaCores = ['#C2A878', '#355834', '#6E633D', '#1DB954', '#ff6b6b', '#54a0ff', '#ff9f43', '#8395a7'];

    graficoGenerosInstance = new Chart(ctxGeneros, {
        type: 'doughnut',
        data: {
            labels: labelsGeneros,
            datasets: [{
                data: dadosGeneros,
                backgroundColor: paletaCores.slice(0, labelsGeneros.length),
                borderWidth: 2,
                borderColor: isDarkMode ? '#172B1F' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: corTexto, font: { family: 'Georgia' } }
                },
                title: {
                    display: true,
                    text: 'Gêneros do Acervo',
                    color: corTexto,
                    font: { family: 'Georgia', size: 16 }
                }
            }
        }
    });

    // --- GRÁFICO 2: BARRAS DE CRESCIMENTO ---
    const contagemCrescimento = {};
    
    // Ordena os discos pela data de criação
    const acervoOrdenado = [...acervoReal].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
    
    acervoOrdenado.forEach(disco => {
        const dataStr = disco.criadoEm || disco.criado_em;
        if (dataStr) {
            const data = new Date(dataStr);
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            const mesAno = `${mes}/${ano}`;
            
            contagemCrescimento[mesAno] = (contagemCrescimento[mesAno] || 0) + 1;
        }
    });

    const labelsCrescimento = [];
    const dadosCrescimentoAcumulado = [];
    let totalAcumulado = 0;

    for (const [mesAno, quantidade] of Object.entries(contagemCrescimento)) {
        labelsCrescimento.push(mesAno);
        totalAcumulado += quantidade;
        dadosCrescimentoAcumulado.push(totalAcumulado);
    }

    graficoCrescimentoInstance = new Chart(ctxCrescimento, {
        type: 'bar',
        data: {
            labels: labelsCrescimento,
            datasets: [{
                label: 'Total de Discos',
                data: dadosCrescimentoAcumulado,
                backgroundColor: '#C2A878',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: corTexto, font: { family: 'Georgia' } },
                    grid: { color: corGrid }
                },
                y: {
                    ticks: { color: corTexto, font: { family: 'Georgia' }, stepSize: 1 },
                    grid: { color: corGrid },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Evolução da Coleção',
                    color: corTexto,
                    font: { family: 'Georgia', size: 16 }
                }
            }
        }
    });
}