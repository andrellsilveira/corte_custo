// State Management
let boards = [];
let pieces = [];
let globalSettings = {
    kerf: 3,
    refilo: 10,
    corteCost: 2.00,
    fitamentoCost: 4.50
};
let optimizedResults = []; // Armazena os resultados do último cálculo
let selectedSheetKey = null; // Chave da chapa selecionada para visualização ("boardId-sheetIndex")

// Elementos DOM
const boardForm = document.getElementById('board-form');
const boardDescInput = document.getElementById('board-desc');
const boardWInput = document.getElementById('board-w');
const boardHInput = document.getElementById('board-h');
const boardThicknessInput = document.getElementById('board-thickness');
const boardCostInput = document.getElementById('board-cost');
const boardList = document.getElementById('board-list');
const boardCountBadge = document.getElementById('board-count-badge');

const pieceForm = document.getElementById('piece-form');
const pieceBoardSelect = document.getElementById('piece-board-select');
const pieceDescInput = document.getElementById('piece-desc');
const pieceQtyInput = document.getElementById('piece-qty');
const pieceWInput = document.getElementById('piece-w');
const pieceHInput = document.getElementById('piece-h');
const pieceAllowRotationInput = document.getElementById('piece-allow-rotation');
const fitC1Input = document.getElementById('fit-c1');
const fitC2Input = document.getElementById('fit-c2');
const fitL1Input = document.getElementById('fit-l1');
const fitL2Input = document.getElementById('fit-l2');
const pieceList = document.getElementById('piece-list');
const pieceCountBadge = document.getElementById('piece-count-badge');

const globalKerfInput = document.getElementById('global-kerf');
const globalRefiloInput = document.getElementById('global-refilo');
const globalCorteCostInput = document.getElementById('global-corte-cost');
const globalFitamentoCostInput = document.getElementById('global-fitamento-cost');

const btnCalculate = document.getElementById('btn-calculate');
const btnClearAll = document.getElementById('btn-clear-all');
const btnLoadDemo = document.getElementById('btn-load-demo');

const resultsPanel = document.getElementById('results-panel');
const visualizationPanel = document.getElementById('visualization-panel');
const emptyResultsPanel = document.getElementById('empty-results-panel');

const kpiSheetsQty = document.getElementById('kpi-sheets-qty');
const kpiCutsQty = document.getElementById('kpi-cuts-qty');
const kpiFitamentoLen = document.getElementById('kpi-fitamento-len');
const kpiTotalPrice = document.getElementById('kpi-total-price');

const costDetailSheets = document.getElementById('cost-detail-sheets');
const costDetailCuts = document.getElementById('cost-detail-cuts');
const costDetailFitamento = document.getElementById('cost-detail-fitamento');
const costDetailTotal = document.getElementById('cost-detail-total');

const unfittableContainer = document.getElementById('unfittable-container');
const unfittableList = document.getElementById('unfittable-list');

// Novos botões de exportação
const btnExportCSV = document.getElementById('btn-export-csv');
const btnPrintReport = document.getElementById('btn-print-report');
const btnDownloadImage = document.getElementById('btn-download-image');


const sheetVisualSelect = document.getElementById('sheet-visual-select');
const cuttingCanvas = document.getElementById('cutting-canvas');
const visualSheetYield = document.getElementById('visual-sheet-yield');
const visualSheetPiecesCount = document.getElementById('visual-sheet-pieces-count');
const visualSheetCutsCount = document.getElementById('visual-sheet-cuts-count');

// Tooltip para o Canvas
let canvasTooltip = null;

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    updateUI();
    createCanvasTooltip();
});

// Setup de Event Listeners
function setupEventListeners() {
    // Configurações Globais
    globalKerfInput.addEventListener('change', () => {
        globalSettings.kerf = parseFloat(globalKerfInput.value) || 0;
        saveToLocalStorage();
    });
    globalRefiloInput.addEventListener('change', () => {
        globalSettings.refilo = parseFloat(globalRefiloInput.value) || 0;
        saveToLocalStorage();
    });
    globalCorteCostInput.addEventListener('change', () => {
        globalSettings.corteCost = parseFloat(globalCorteCostInput.value) || 0;
        saveToLocalStorage();
    });
    globalFitamentoCostInput.addEventListener('change', () => {
        globalSettings.fitamentoCost = parseFloat(globalFitamentoCostInput.value) || 0;
        saveToLocalStorage();
    });

    // Cadastro de Chapa
    boardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBoard = {
            id: 'b_' + Date.now(),
            desc: boardDescInput.value.trim(),
            w: parseInt(boardWInput.value),
            h: parseInt(boardHInput.value),
            thickness: parseInt(boardThicknessInput.value),
            cost: parseFloat(boardCostInput.value)
        };
        boards.push(newBoard);
        boardForm.reset();
        saveToLocalStorage();
        updateUI();
    });

    // Cadastro de Peça
    pieceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!pieceBoardSelect.value) {
            alert('Por favor, adicione e selecione um tipo de chapa de MDF primeiro.');
            return;
        }
        const newPiece = {
            id: 'p_' + Date.now(),
            boardId: pieceBoardSelect.value,
            desc: pieceDescInput.value.trim(),
            qty: parseInt(pieceQtyInput.value),
            w: parseInt(pieceWInput.value),
            h: parseInt(pieceHInput.value),
            allowRotation: pieceAllowRotationInput.checked,
            fitamento: {
                c1: fitC1Input.checked,
                c2: fitC2Input.checked,
                l1: fitL1Input.checked,
                l2: fitL2Input.checked
            }
        };
        pieces.push(newPiece);
        
        // Resetar formulário de peça de forma amigável
        pieceDescInput.value = '';
        pieceQtyInput.value = '1';
        pieceWInput.value = '';
        pieceHInput.value = '';
        fitC1Input.checked = false;
        fitC2Input.checked = false;
        fitL1Input.checked = false;
        fitL2Input.checked = false;
        pieceAllowRotationInput.checked = true;

        saveToLocalStorage();
        updateUI();
    });

    btnCalculate.addEventListener('click', calculateCuttingPlan);
    btnClearAll.addEventListener('click', clearAll);
    btnLoadDemo.addEventListener('click', loadDemoData);
    btnExportCSV.addEventListener('click', exportToCSV);
    btnPrintReport.addEventListener('click', () => window.print());
    btnDownloadImage.addEventListener('click', downloadSheetImage);


    // Seletor de visualização do plano
    sheetVisualSelect.addEventListener('change', (e) => {
        selectedSheetKey = e.target.value;
        drawSheetLayout();
    });

    // Redimensionamento responsivo do Canvas
    window.addEventListener('resize', () => {
        if (selectedSheetKey) {
            drawSheetLayout();
        }
    });

    // Hover do Canvas para exibir detalhes das peças
    cuttingCanvas.addEventListener('mousemove', handleCanvasHover);
    cuttingCanvas.addEventListener('mouseleave', () => {
        if (canvasTooltip) canvasTooltip.style.opacity = '0';
    });
}

// Persistência em LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('mdf_boards', JSON.stringify(boards));
    localStorage.setItem('mdf_pieces', JSON.stringify(pieces));
    localStorage.setItem('mdf_settings', JSON.stringify(globalSettings));
}

function loadFromLocalStorage() {
    const savedBoards = localStorage.getItem('mdf_boards');
    const savedPieces = localStorage.getItem('mdf_pieces');
    const savedSettings = localStorage.getItem('mdf_settings');

    if (savedBoards) boards = JSON.parse(savedBoards);
    if (savedPieces) pieces = JSON.parse(savedPieces);
    if (savedSettings) {
        globalSettings = JSON.parse(savedSettings);
        // Atualiza inputs globais
        globalKerfInput.value = globalSettings.kerf;
        globalRefiloInput.value = globalSettings.refilo;
        globalCorteCostInput.value = globalSettings.corteCost;
        globalFitamentoCostInput.value = globalSettings.fitamentoCost;
    }
}

// Atualizar Elementos de Interface
function updateUI() {
    updateBoardDropdown();
    renderBoardsList();
    renderPiecesList();
}

function updateBoardDropdown() {
    // Manter a seleção atual se ela ainda existir
    const currentSelect = pieceBoardSelect.value;
    pieceBoardSelect.innerHTML = '<option value="" disabled>Selecione a chapa...</option>';
    
    if (boards.length === 0) {
        pieceBoardSelect.innerHTML = '<option value="" disabled selected>Adicione uma chapa primeiro...</option>';
        return;
    }

    boards.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.desc} (${b.w}x${b.h}x${b.thickness}mm)`;
        pieceBoardSelect.appendChild(opt);
    });

    if (boards.some(b => b.id === currentSelect)) {
        pieceBoardSelect.value = currentSelect;
    } else {
        pieceBoardSelect.selectedIndex = 1; // Seleciona o primeiro
    }
}

function renderBoardsList() {
    boardCountBadge.textContent = boards.length;
    
    if (boards.length === 0) {
        boardList.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-medium">Nenhuma chapa cadastrada.</div>`;
        return;
    }

    boardList.innerHTML = '';
    boards.forEach(b => {
        const item = document.createElement('div');
        item.className = 'p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors';
        item.innerHTML = `
            <div class="space-y-0.5">
                <h4 class="text-sm font-bold text-gray-700">${b.desc}</h4>
                <div class="text-xs text-gray-500">
                    Dimensões: <span class="font-semibold text-gray-600">${b.w} x ${b.h} x ${b.thickness} mm</span> | 
                    Preço: <span class="font-semibold text-emerald-600">R$ ${b.cost.toFixed(2)}</span>
                </div>
            </div>
            <button onclick="deleteBoard('${b.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors" title="Excluir Chapa">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        `;
        boardList.appendChild(item);
    });
}

function renderPiecesList() {
    pieceCountBadge.textContent = pieces.length;

    if (pieces.length === 0) {
        pieceList.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-medium">Nenhuma peça cadastrada.</div>`;
        return;
    }

    pieceList.innerHTML = '';
    pieces.forEach(p => {
        const board = boards.find(b => b.id === p.boardId);
        const boardDesc = board ? board.desc : 'Chapa Desconhecida';
        
        // Formatar fitamento
        let fitInfo = [];
        if (p.fitamento.c1) fitInfo.push('C1');
        if (p.fitamento.c2) fitInfo.push('C2');
        if (p.fitamento.l1) fitInfo.push('L1');
        if (p.fitamento.l2) fitInfo.push('L2');
        const fitText = fitInfo.length > 0 ? `Fitar: ${fitInfo.join(', ')}` : 'Sem fitamento';

        const item = document.createElement('div');
        item.className = 'p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors piece-card-hover';
        item.innerHTML = `
            <div class="space-y-0.5 max-w-[85%]">
                <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-gray-700">${p.desc}</h4>
                    <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-indigo-100">Qtd: ${p.qty}</span>
                </div>
                <div class="text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>Tam: <span class="font-semibold text-gray-600">${p.w} x ${p.h} mm</span></span>
                    <span class="text-gray-300">|</span>
                    <span class="truncate">Chapa: <span class="font-semibold text-gray-600">${boardDesc}</span></span>
                    <span class="text-gray-300">|</span>
                    <span class="text-amber-600 font-medium">${fitText}</span>
                    ${p.allowRotation ? '' : '<span class="text-gray-400">(Rotação Proibida)</span>'}
                </div>
            </div>
            <button onclick="deletePiece('${p.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors" title="Excluir Peça">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        `;
        pieceList.appendChild(item);
    });
}

// Ações de Deleção
window.deleteBoard = function(id) {
    boards = boards.filter(b => b.id !== id);
    // Remover também as peças associadas a essa chapa
    pieces = pieces.filter(p => p.boardId !== id);
    saveToLocalStorage();
    updateUI();
};

window.deletePiece = function(id) {
    pieces = pieces.filter(p => p.id !== id);
    saveToLocalStorage();
    updateUI();
};

// Limpar Tudo
function clearAll() {
    if (confirm('Tem certeza que deseja apagar todas as chapas, peças e configurações?')) {
        boards = [];
        pieces = [];
        globalSettings = {
            kerf: 3,
            refilo: 10,
            corteCost: 2.00,
            fitamentoCost: 4.50
        };
        optimizedResults = [];
        selectedSheetKey = null;

        // Resetar inputs
        globalKerfInput.value = globalSettings.kerf;
        globalRefiloInput.value = globalSettings.refilo;
        globalCorteCostInput.value = globalSettings.corteCost;
        globalFitamentoCostInput.value = globalSettings.fitamentoCost;

        saveToLocalStorage();
        updateUI();

        // Ocultar resultados
        resultsPanel.classList.add('hidden');
        visualizationPanel.classList.add('hidden');
        emptyResultsPanel.classList.remove('hidden');
    }
}

// Carregar Dados Demo
function loadDemoData() {
    boards = [
        { id: 'b_1', desc: 'MDF Branco Supremo 15mm', w: 2750, h: 1840, thickness: 15, cost: 235.00 },
        { id: 'b_2', desc: 'MDF Carvalho Soft 6mm', w: 2750, h: 1840, thickness: 6, cost: 110.00 }
    ];

    pieces = [
        // Peças do MDF Branco (Cozinha Lateral + Portas)
        { id: 'p_1', boardId: 'b_1', desc: 'Lateral Balcão', qty: 4, w: 720, h: 550, allowRotation: true, fitamento: { c1: true, c2: false, l1: true, l2: false } },
        { id: 'p_2', boardId: 'b_1', desc: 'Tampo/Base Cozinha', qty: 2, w: 1200, h: 550, allowRotation: true, fitamento: { c1: true, c2: false, l1: false, l2: false } },
        { id: 'p_3', boardId: 'b_1', desc: 'Prateleira Interna', qty: 3, w: 568, h: 500, allowRotation: true, fitamento: { c1: true, c2: false, l1: false, l2: false } },
        { id: 'p_4', boardId: 'b_1', desc: 'Porta Cozinha', qty: 4, w: 715, h: 297, allowRotation: false, fitamento: { c1: true, c2: true, l1: true, l2: true } }, // Sem rotação para manter o veio vertical
        
        // Peças do MDF Carvalho Soft (Fundos de armário e gavetas)
        { id: 'p_5', boardId: 'b_2', desc: 'Fundo Balcão Grande', qty: 2, w: 1180, h: 700, allowRotation: true, fitamento: { c1: false, c2: false, l1: false, l2: false } },
        { id: 'p_6', boardId: 'b_2', desc: 'Fundo de Gaveta', qty: 6, w: 450, h: 350, allowRotation: true, fitamento: { c1: false, c2: false, l1: false, l2: false } }
    ];

    globalSettings = {
        kerf: 3,
        refilo: 10,
        corteCost: 2.50,
        fitamentoCost: 5.00
    };

    globalKerfInput.value = globalSettings.kerf;
    globalRefiloInput.value = globalSettings.refilo;
    globalCorteCostInput.value = globalSettings.corteCost;
    globalFitamentoCostInput.value = globalSettings.fitamentoCost;

    saveToLocalStorage();
    updateUI();
    calculateCuttingPlan();
}

// Calcular Plano de Corte
function calculateCuttingPlan() {
    if (boards.length === 0) {
        alert('Cadastre pelo menos uma chapa de MDF para calcular.');
        return;
    }

    optimizedResults = [];

    // Calcular plano para cada tipo de chapa
    boards.forEach(board => {
        const boardPieces = pieces.filter(p => p.boardId === board.id);
        if (boardPieces.length > 0) {
            const res = CuttingOptimizer.optimize(board, boardPieces, globalSettings);
            optimizedResults.push(res);
        }
    });

    if (optimizedResults.length === 0) {
        alert('Não há peças cadastradas para as chapas registradas.');
        return;
    }

    // Apresentar Resultados
    displayResults();
}

// Exibir Resultados e KPIs na Tela
function displayResults() {
    emptyResultsPanel.classList.add('hidden');
    resultsPanel.classList.remove('hidden');
    visualizationPanel.classList.remove('hidden');

    let totalSheets = 0;
    let totalCuts = 0;
    let totalFitamentoMeters = 0;
    let totalSheetsCost = 0;

    // Listar peças não posicionadas (erros)
    let allUnfittable = [];

    optimizedResults.forEach(res => {
        totalSheets += res.stats.totalUsedSheets;
        totalCuts += res.stats.totalCutsCount;
        totalFitamentoMeters += res.stats.totalEdgeBandingLength;
        totalSheetsCost += res.stats.totalUsedSheets * res.boardCost;
        
        res.unfittablePieces.forEach(up => {
            allUnfittable.push(`${up.desc} (${up.w}x${up.h}mm) - Excede tamanho útil da chapa ${res.boardDesc}`);
        });
    });

    const totalCutsCost = totalCuts * globalSettings.corteCost;
    const totalFitamentoCost = totalFitamentoMeters * globalSettings.fitamentoCost;
    const totalProjectCost = totalSheetsCost + totalCutsCost + totalFitamentoCost;

    // Atualizar KPIs
    kpiSheetsQty.textContent = totalSheets;
    kpiCutsQty.textContent = totalCuts;
    kpiFitamentoLen.textContent = `${totalFitamentoMeters.toFixed(1)} m`;
    kpiTotalPrice.textContent = `R$ ${totalProjectCost.toFixed(2)}`;

    // Detalhes Financeiros
    costDetailSheets.textContent = `R$ ${totalSheetsCost.toFixed(2)}`;
    costDetailCuts.textContent = `R$ ${totalCutsCost.toFixed(2)} (${totalCuts} cortes)`;
    costDetailFitamento.textContent = `R$ ${totalFitamentoCost.toFixed(2)} (${totalFitamentoMeters.toFixed(2)}m)`;
    costDetailTotal.textContent = `R$ ${totalProjectCost.toFixed(2)}`;

    // Exibir avisos de peças gigantes
    if (allUnfittable.length > 0) {
        unfittableContainer.classList.remove('hidden');
        unfittableList.innerHTML = '';
        allUnfittable.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            unfittableList.appendChild(li);
        });
    } else {
        unfittableContainer.classList.add('hidden');
    }

    // Configurar seletor de visualização
    populateSheetSelector();
    drawSheetLayout();
}

function populateSheetSelector() {
    sheetVisualSelect.innerHTML = '';
    
    let firstKey = null;

    optimizedResults.forEach(res => {
        res.sheets.forEach(sheet => {
            const key = `${res.boardId}-${sheet.index}`;
            if (!firstKey) firstKey = key;

            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${res.boardDesc} - Folha ${sheet.index} de ${res.stats.totalUsedSheets}`;
            sheetVisualSelect.appendChild(opt);
        });
    });

    // Se já havia uma chave selecionada e ela ainda existe, mantém
    const currentOptions = Array.from(sheetVisualSelect.options).map(o => o.value);
    if (selectedSheetKey && currentOptions.includes(selectedSheetKey)) {
        sheetVisualSelect.value = selectedSheetKey;
    } else {
        selectedSheetKey = firstKey;
        sheetVisualSelect.value = firstKey;
    }
}

// Obter a chapa selecionada e o resultado correspondente
function getSelectedSheetData() {
    if (!selectedSheetKey) return null;
    const parts = selectedSheetKey.split('-');
    const boardId = parts[0];
    const sheetIndex = parseInt(parts[1]);

    const result = optimizedResults.find(r => r.boardId === boardId);
    if (!result) return null;

    const sheet = result.sheets.find(s => s.index === sheetIndex);
    return {
        boardDesc: result.boardDesc,
        sheet: sheet,
        stats: result.stats
    };
}

// Desenhar a chapa no Canvas
function drawSheetLayout() {
    const data = getSelectedSheetData();
    if (!data) return;

    const sheet = data.sheet;
    const boardDesc = data.boardDesc;

    // Configurar resolução física do Canvas para ficar nítido
    const containerWidth = cuttingCanvas.parentElement.clientWidth - 16; // Menos o padding
    const scale = containerWidth / sheet.w;
    const height = sheet.h * scale;

    // Resolução lógica
    cuttingCanvas.width = containerWidth;
    cuttingCanvas.height = height;

    const ctx = cuttingCanvas.getContext('2d');
    ctx.clearRect(0, 0, cuttingCanvas.width, cuttingCanvas.height);

    // Calcular estatísticas da chapa individual para o painel inferior
    let sheetPiecesArea = 0;
    sheet.placedPieces.forEach(p => {
        sheetPiecesArea += p.w * p.h;
    });
    const sheetArea = sheet.w * sheet.h;
    const sheetYield = (sheetPiecesArea / sheetArea) * 100;

    visualSheetYield.textContent = `${sheetYield.toFixed(1)}%`;
    visualSheetPiecesCount.textContent = sheet.placedPieces.length;
    visualSheetCutsCount.textContent = sheet.cuts.length;

    // 1. Desenhar a chapa base (MDF)
    ctx.fillStyle = '#fef3c7'; // cor de madeira clara / âmbar claro
    ctx.fillRect(0, 0, cuttingCanvas.width, cuttingCanvas.height);

    // 2. Desenhar área de Refilo (se houver)
    if (sheet.refilo > 0) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.15)'; // âmbar com opacidade
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        const scaledRefilo = sheet.refilo * scale;
        // Desenha linhas do refilo
        ctx.strokeRect(scaledRefilo, scaledRefilo, cuttingCanvas.width - (2 * scaledRefilo), cuttingCanvas.height - (2 * scaledRefilo));
        ctx.setLineDash([]); // Limpa padrão pontilhado
    }

    // 3. Desenhar peças posicionadas
    sheet.placedPieces.forEach(piece => {
        const px = piece.x * scale;
        const py = piece.y * scale;
        const pw = piece.w * scale;
        const ph = piece.h * scale;

        // Fundo da peça
        ctx.fillStyle = '#e0e7ff'; // Indigo claro
        ctx.fillRect(px, py, pw, ph);

        // Borda da peça
        ctx.strokeStyle = '#4f46e5'; // Indigo escuro
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px, py, pw, ph);

        // Desenhar fitamento de borda (Linhas vermelhas grossas)
        drawPieceEdgeBanding(ctx, piece, px, py, pw, ph);

        // Desenhar textos da peça (Descrição e Dimensões)
        ctx.fillStyle = '#1e1b4b'; // Azul escuro
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const descText = `${piece.desc}`;
        const dimText = `${piece.w_original}x${piece.h_original}`;

        // Truncar ou omitir textos se a peça for muito pequena no desenho
        if (pw > 50 && ph > 30) {
            ctx.fillText(descText, px + pw / 2, py + ph / 2 - 7, pw - 10);
            ctx.font = '9px sans-serif';
            ctx.fillText(dimText, px + pw / 2, py + ph / 2 + 7, pw - 10);
        } else if (pw > 30 && ph > 15) {
            ctx.font = '9px sans-serif';
            ctx.fillText(dimText, px + pw / 2, py + ph / 2, pw - 4);
        }
    });

    // 4. Desenhar Linhas de Corte (Linhas pontilhadas escuras)
    ctx.strokeStyle = '#475569'; // Slate 600
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 3]);

    sheet.cuts.forEach(cut => {
        // Ignorar linhas de refilo que já foram mostradas no refilo se o usuário quiser,
        // mas é legal mostrar para clareza
        const cx1 = cut.x1 * scale;
        const cy1 = cut.y1 * scale;
        const cx2 = cut.x2 * scale;
        const cy2 = cut.y2 * scale;

        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
    });

    ctx.setLineDash([]); // Limpa pontilhado
}

// Auxiliar para desenhar linhas de fitamento coloridas
function drawPieceEdgeBanding(ctx, piece, px, py, pw, ph) {
    ctx.strokeStyle = '#ef4444'; // Vermelho vibrante para o fitamento
    ctx.lineWidth = 3.5;

    const fit = piece.fitamento;
    const rotated = piece.rotated;

    // Mapeamento correto conforme rotação da peça
    let top = false, bottom = false, left = false, right = false;

    if (!rotated) {
        top = fit.c1;
        bottom = fit.c2;
        left = fit.l1;
        right = fit.l2;
    } else {
        // Se rotacionado:
        // C1 (Comprimento 1) vira a borda esquerda (eixo vertical original)
        // C2 (Comprimento 2) vira a borda direita
        // L1 (Largura 1) vira a borda superior
        // L2 (Largura 2) vira a borda inferior
        left = fit.c1;
        right = fit.c2;
        top = fit.l1;
        bottom = fit.l2;
    }

    // Desenhar cada linha
    if (top) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + pw, py);
        ctx.stroke();
    }
    if (bottom) {
        ctx.beginPath();
        ctx.moveTo(px, py + ph);
        ctx.lineTo(px + pw, py + ph);
        ctx.stroke();
    }
    if (left) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + ph);
        ctx.stroke();
    }
    if (right) {
        ctx.beginPath();
        ctx.moveTo(px + pw, py);
        ctx.lineTo(px + pw, py + ph);
        ctx.stroke();
    }
}

// Criar Tooltip Dinâmico para Hover do Canvas
function createCanvasTooltip() {
    canvasTooltip = document.createElement('div');
    canvasTooltip.className = 'absolute bg-gray-900 text-white text-xs rounded p-2.5 pointer-events-none shadow-md opacity-0 transition-opacity duration-150 z-50 whitespace-pre';
    document.body.appendChild(canvasTooltip);
}

// Tratar Hover do Canvas para Mostrar Dados da Peça
function handleCanvasHover(e) {
    const data = getSelectedSheetData();
    if (!data) return;

    const sheet = data.sheet;
    const rect = cuttingCanvas.getBoundingClientRect();
    
    // Obter as coordenadas do mouse em pixels lógicos do Canvas
    const scale = sheet.w / cuttingCanvas.width;
    const mouseX = (e.clientX - rect.left) * scale;
    const mouseY = (e.clientY - rect.top) * scale;

    // Procurar peça sob o cursor
    const piece = sheet.placedPieces.find(p => {
        return mouseX >= p.x && mouseX <= (p.x + p.w) &&
               mouseY >= p.y && mouseY <= (p.y + p.h);
    });

    if (piece) {
        // Formatar fitamento para o tooltip
        let fitInfo = [];
        if (piece.fitamento.c1) fitInfo.push('Comprimento 1');
        if (piece.fitamento.c2) fitInfo.push('Comprimento 2');
        if (piece.fitamento.l1) fitInfo.push('Largura 1');
        if (piece.fitamento.l2) fitInfo.push('Largura 2');
        const fitText = fitInfo.length > 0 ? fitInfo.join(', ') : 'Sem fitamento';

        // Atualizar conteúdo do tooltip
        canvasTooltip.innerHTML = `<strong>Peça:</strong> ${piece.desc}
<strong>Medida Bruta:</strong> ${piece.w_original} x ${piece.h_original} mm
<strong>Rotacionada:</strong> ${piece.rotated ? 'Sim' : 'Não'}
<strong>Fitamento:</strong> ${fitText}`;

        // Posicionar tooltip próximo ao cursor
        canvasTooltip.style.left = `${e.pageX + 15}px`;
        canvasTooltip.style.top = `${e.pageY + 15}px`;
        canvasTooltip.style.opacity = '1';
    } else {
        canvasTooltip.style.opacity = '0';
    }
}

// Baixar imagem PNG do Canvas atual
function downloadSheetImage() {
    const data = getSelectedSheetData();
    if (!data) {
        alert('Nenhuma chapa selecionada.');
        return;
    }
    
    const boardDescClean = data.boardDesc.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    const filename = `plano-corte_${boardDescClean}_folha-${data.sheet.index}.png`;
    
    // Forçar download
    const link = document.createElement('a');
    link.download = filename;
    link.href = cuttingCanvas.toDataURL('image/png');
    link.click();
}

// Exportar relatório completo de peças e custos como CSV (compatível com Excel)
function exportToCSV() {
    if (optimizedResults.length === 0) {
        alert('Execute o cálculo do plano de corte primeiro para poder exportar.');
        return;
    }

    let csvContent = '\uFEFF'; // BOM (Byte Order Mark) para garantir compatibilidade de acentos no Excel em português

    // 1. Resumo Geral de Custos e Totais
    csvContent += '=== RESUMO GERAL DO PROJETO ===\n';
    
    let totalSheets = 0;
    let totalCuts = 0;
    let totalFitamentoMeters = 0;
    let totalSheetsCost = 0;
    
    optimizedResults.forEach(res => {
        totalSheets += res.stats.totalUsedSheets;
        totalCuts += res.stats.totalCutsCount;
        totalFitamentoMeters += res.stats.totalEdgeBandingLength;
        totalSheetsCost += res.stats.totalUsedSheets * res.boardCost;
    });
    
    const totalCutsCost = totalCuts * globalSettings.corteCost;
    const totalFitamentoCost = totalFitamentoMeters * globalSettings.fitamentoCost;
    const totalProjectCost = totalSheetsCost + totalCutsCost + totalFitamentoCost;
    
    csvContent += `Total de Chapas Utilizadas;${totalSheets};unidades\n`;
    csvContent += `Total de Cortes Realizados;${totalCuts};cortes\n`;
    csvContent += `Total de Fitamento;${totalFitamentoMeters.toFixed(2).replace('.', ',')};metros\n`;
    csvContent += `Custo Total Estimado;R$ ${totalProjectCost.toFixed(2).replace('.', ',')};;\n\n`;
    
    csvContent += '=== DETALHAMENTO DE CUSTOS ===\n';
    csvContent += `MDF (Chapas);R$ ${totalSheetsCost.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Servico de Corte;R$ ${totalCutsCost.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Servico de Fitamento;R$ ${totalFitamentoCost.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Total Geral;R$ ${totalProjectCost.toFixed(2).replace('.', ',')}\n\n`;

    // 2. Tabela de Chapas
    csvContent += '=== DETALHE DE CHAPAS UTILIZADAS ===\n';
    csvContent += 'Chapa MDF;Qtd Usada;Preco Unitario;Custo Total\n';
    optimizedResults.forEach(res => {
        const cost = res.stats.totalUsedSheets * res.boardCost;
        csvContent += `${res.boardDesc};${res.stats.totalUsedSheets};R$ ${res.boardCost.toFixed(2).replace('.', ',')};R$ ${cost.toFixed(2).replace('.', ',')}\n`;
    });
    csvContent += '\n';

    // 3. Tabela de Peças Cortadas
    csvContent += '=== LISTA DETALHADA DE PECAS ===\n';
    csvContent += 'Peca;Chapa MDF;Qtd;Comprimento (mm);Largura (mm);Permite Rotacao;Fitamento\n';
    
    pieces.forEach(p => {
        const board = boards.find(b => b.id === p.boardId);
        const boardDesc = board ? board.desc : 'Desconhecida';
        
        let fitInfo = [];
        if (p.fitamento.c1) fitInfo.push('C1');
        if (p.fitamento.c2) fitInfo.push('C2');
        if (p.fitamento.l1) fitInfo.push('L1');
        if (p.fitamento.l2) fitInfo.push('L2');
        const fitText = fitInfo.length > 0 ? fitInfo.join('+') : 'Nenhum';
        
        csvContent += `${p.desc};${boardDesc};${p.qty};${p.w};${p.h};${p.allowRotation ? 'Sim' : 'Nao'};${fitText}\n`;
    });
    
    // Baixar o arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Formatando nome do arquivo com a data
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `relatorio-plano-corte_${dateStr}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

