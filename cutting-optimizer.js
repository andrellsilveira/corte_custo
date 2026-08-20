/**
 * Otimizador de Plano de Corte para MDF utilizando Algoritmo Guilhotina 2D
 */

class CuttingOptimizer {
    /**
     * Otimiza o plano de corte para um tipo de chapa e sua lista de peças
     * @param {Object} board - O tipo de chapa { w: largura, h: altura, cost: valor, desc: descricao }
     * @param {Array} pieces - Lista de peças { id, w, h, qty, desc, fitamento: { c1, c2, l1, l2 }, allowRotation }
     * @param {Object} settings - Configurações globais { kerf: espessura serra (mm), refilo: margem (mm) }
     */
    static optimize(board, pieces, settings) {
        const kerf = parseFloat(settings.kerf) || 3;
        const refilo = parseFloat(settings.refilo) || 0;
        
        // Expandir peças por quantidade
        let flatPieces = [];
        pieces.forEach(p => {
            for (let i = 0; i < p.qty; i++) {
                flatPieces.push({
                    id: p.id,
                    desc: p.desc,
                    w: parseFloat(p.w),
                    h: parseFloat(p.h),
                    fitamento: { ...p.fitamento },
                    allowRotation: p.allowRotation !== false,
                    originalIndex: i + 1
                });
            }
        });

        const totalPiecesCount = flatPieces.length;
        let unfittablePieces = [];
        let fittablePieces = [];

        // Usável dimensões da chapa
        const usableW = board.w - (2 * refilo);
        const usableH = board.h - (2 * refilo);

        // Filtrar peças que não cabem de jeito nenhum
        flatPieces.forEach(p => {
            const fitsNormal = p.w <= usableW && p.h <= usableH;
            const fitsRotated = p.allowRotation && p.w <= usableH && p.h <= usableW;

            if (fitsNormal || fitsRotated) {
                fittablePieces.push(p);
            } else {
                unfittablePieces.push(p);
            }
        });

        // Ordenar peças por área decrescente, e depois pela maior dimensão decrescente
        fittablePieces.sort((a, b) => {
            const areaA = a.w * a.h;
            const areaB = b.w * b.h;
            if (Math.abs(areaA - areaB) > 0.01) {
                return areaB - areaA;
            }
            return Math.max(b.w, b.h) - Math.max(a.w, a.h);
        });

        let sheets = [];

        // Função para criar uma nova chapa com seu bloco livre inicial
        function createNewSheet(index) {
            const sheet = {
                index: index + 1,
                w: board.w,
                h: board.h,
                refilo: refilo,
                placedPieces: [],
                freeBlocks: [],
                cuts: [] // lista de cortes: { x1, y1, x2, y2, orientation, length }
            };

            // Se tem refilo, adiciona os cortes de refilo (4 cortes nas bordas)
            if (refilo > 0) {
                sheet.cuts.push({ x1: refilo, y1: 0, x2: refilo, y2: board.h, orientation: 'V', length: board.h, isRefilo: true });
                sheet.cuts.push({ x1: board.w - refilo, y1: 0, x2: board.w - refilo, y2: board.h, orientation: 'V', length: board.h, isRefilo: true });
                sheet.cuts.push({ x1: refilo, y1: refilo, x2: board.w - refilo, y2: refilo, orientation: 'H', length: board.w - 2 * refilo, isRefilo: true });
                sheet.cuts.push({ x1: refilo, y1: board.h - refilo, x2: board.w - refilo, y2: board.h - refilo, orientation: 'H', length: board.w - 2 * refilo, isRefilo: true });
            }

            // Bloco livre inicial é a área utilizável interna
            sheet.freeBlocks.push({
                x: refilo,
                y: refilo,
                w: usableW,
                h: usableH
            });

            return sheet;
        }

        // Tentar posicionar cada peça fittable
        fittablePieces.forEach(piece => {
            let placed = false;

            // Tenta colocar em uma chapa já existente
            for (let s = 0; s < sheets.length; s++) {
                const sheet = sheets[s];
                const fit = findBestBlockForPiece(sheet.freeBlocks, piece);
                if (fit) {
                    placePieceInBlock(sheet, fit.blockIndex, fit.rotated, piece, kerf);
                    placed = true;
                    break;
                }
            }

            // Se não coube em nenhuma chapa existente, abre uma nova
            if (!placed) {
                const newSheet = createNewSheet(sheets.length);
                const fit = findBestBlockForPiece(newSheet.freeBlocks, piece);
                // Certamente vai caber na chapa vazia pois filtramos as unfittable
                placePieceInBlock(newSheet, fit.blockIndex, fit.rotated, piece, kerf);
                sheets.push(newSheet);
            }
        });

        // Calcular estatísticas para este tipo de chapa
        let totalUsedSheets = sheets.length;
        let totalCutsCount = 0;
        let totalCutsLength = 0; // em metros
        let totalEdgeBandingLength = 0; // em metros

        sheets.forEach(sheet => {
            totalCutsCount += sheet.cuts.length;
            sheet.cuts.forEach(c => {
                totalCutsLength += c.length / 1000;
            });

            sheet.placedPieces.forEach(p => {
                // Cálculo de fitamento da peça
                let fitMm = 0;
                if (p.fitamento.c1) fitMm += p.w_original; // Comprimento 1
                if (p.fitamento.c2) fitMm += p.w_original; // Comprimento 2
                if (p.fitamento.l1) fitMm += p.h_original; // Largura 1
                if (p.fitamento.l2) fitMm += p.h_original; // Largura 2
                
                totalEdgeBandingLength += fitMm / 1000;
            });
        });

        // Calcular aproveitamento
        let totalSheetArea = totalUsedSheets * board.w * board.h;
        let totalPiecesArea = 0;
        sheets.forEach(sheet => {
            sheet.placedPieces.forEach(p => {
                totalPiecesArea += p.w * p.h;
            });
        });

        let yieldPercentage = totalSheetArea > 0 ? (totalPiecesArea / totalSheetArea) * 100 : 0;

        return {
            boardId: board.id,
            boardDesc: board.desc,
            boardCost: board.cost,
            sheets: sheets,
            unfittablePieces: unfittablePieces,
            stats: {
                totalUsedSheets,
                totalCutsCount,
                totalCutsLength,
                totalEdgeBandingLength,
                yieldPercentage,
                totalPiecesArea: totalPiecesArea / 1000000, // em m2
                totalSheetsArea: totalSheetArea / 1000000 // em m2
            }
        };
    }

    /**
     * Procura o melhor bloco livre que comporte a peça de acordo com o critério Best-Area-Fit
     */
    static findBestBlockForPiece(freeBlocks, piece) {
        let bestBlockIndex = -1;
        let minLeftoverArea = Infinity;
        let rotateNeeded = false;

        for (let i = 0; i < freeBlocks.length; i++) {
            const block = freeBlocks[i];
            
            // Caso 1: sem rotacionar
            const fitsNormal = piece.w <= block.w && piece.h <= block.h;
            // Caso 2: com rotação (se permitido)
            const fitsRotated = piece.allowRotation && piece.h <= block.w && piece.w <= block.h;

            if (fitsNormal) {
                const leftoverArea = (block.w * block.h) - (piece.w * piece.h);
                if (leftoverArea < minLeftoverArea) {
                    minLeftoverArea = leftoverArea;
                    bestBlockIndex = i;
                    rotateNeeded = false;
                }
            }

            if (fitsRotated) {
                const leftoverArea = (block.w * block.h) - (piece.w * piece.h);
                // Se couber de ambas as formas, damos preferência a não rotacionar
                // caso a sobra seja igual, ou se rotacionado for melhor aproveitado
                if (leftoverArea < minLeftoverArea) {
                    minLeftoverArea = leftoverArea;
                    bestBlockIndex = i;
                    rotateNeeded = true;
                }
            }
        }

        if (bestBlockIndex === -1) return null;

        return {
            blockIndex: bestBlockIndex,
            rotated: rotateNeeded
        };
    }
}

/**
 * Encontra o melhor bloco livre de uma lista
 */
function findBestBlockForPiece(freeBlocks, piece) {
    return CuttingOptimizer.findBestBlockForPiece(freeBlocks, piece);
}

/**
 * Posiciona uma peça em um bloco livre específico de uma chapa e divide o bloco restante (corte guilhotina)
 */
function placePieceInBlock(sheet, blockIndex, rotated, piece, kerf) {
    const block = sheet.freeBlocks[blockIndex];
    sheet.freeBlocks.splice(blockIndex, 1); // remove o bloco original

    // Definir as dimensões reais da peça após rotação
    const pw = rotated ? piece.h : piece.w;
    const ph = rotated ? piece.w : piece.h;

    // Adicionar peça posicionada
    sheet.placedPieces.push({
        id: piece.id,
        desc: piece.desc,
        x: block.x,
        y: block.y,
        w: pw,
        h: ph,
        w_original: piece.w,
        h_original: piece.h,
        rotated: rotated,
        fitamento: { ...piece.fitamento },
        originalIndex: piece.originalIndex
    });

    const dw = block.w - pw;
    const dh = block.h - ph;

    // Se dw == 0 e dh == 0, a peça coube perfeitamente no bloco. Sem splits ou cortes adicionais.
    if (dw <= 0 && dh <= 0) {
        return;
    }

    // Se dw > 0 e dh == 0: apenas 1 corte vertical
    if (dw > 0 && dh <= 0) {
        const cutX = block.x + pw;
        sheet.cuts.push({
            x1: cutX,
            y1: block.y,
            x2: cutX,
            y2: block.y + block.h,
            orientation: 'V',
            length: block.h
        });

        // Novo bloco livre à direita (subtraindo o kerf)
        const newW = dw - kerf;
        if (newW > 0) {
            sheet.freeBlocks.push({
                x: block.x + pw + kerf,
                y: block.y,
                w: newW,
                h: block.h
            });
        }
        return;
    }

    // Se dw == 0 e dh > 0: apenas 1 corte horizontal
    if (dw <= 0 && dh > 0) {
        const cutY = block.y + ph;
        sheet.cuts.push({
            x1: block.x,
            y1: cutY,
            x2: block.x + block.w,
            y2: cutY,
            orientation: 'H',
            length: block.w
        });

        // Novo bloco livre abaixo (subtraindo o kerf)
        const newH = dh - kerf;
        if (newH > 0) {
            sheet.freeBlocks.push({
                x: block.x,
                y: block.y + ph + kerf,
                w: block.w,
                h: newH
            });
        }
        return;
    }

    // Se dw > 0 e dh > 0: precisamos de 2 cortes (um corte principal e um secundário)
    // Heurística de divisão: dividir ao longo do lado que mantém os blocos maiores
    if (dw >= dh) {
        // DIVISÃO VERTICAL PRINCIPAL (Corta no comprimento da peça, gerando um bloco grande do lado direito)
        const cutX = block.x + pw;
        sheet.cuts.push({
            x1: cutX,
            y1: block.y,
            x2: cutX,
            y2: block.y + block.h,
            orientation: 'V',
            length: block.h
        });

        // Corte horizontal secundário na subchapa da esquerda
        const cutY = block.y + ph;
        sheet.cuts.push({
            x1: block.x,
            y1: cutY,
            x2: block.x + pw,
            y2: cutY,
            orientation: 'H',
            length: pw
        });

        // Novo bloco abaixo da peça
        const blockBelowH = dh - kerf;
        if (blockBelowH > 0) {
            sheet.freeBlocks.push({
                x: block.x,
                y: block.y + ph + kerf,
                w: pw,
                h: blockBelowH
            });
        }

        // Novo bloco à direita da peça (e do bloco de baixo)
        const blockRightW = dw - kerf;
        if (blockRightW > 0) {
            sheet.freeBlocks.push({
                x: block.x + pw + kerf,
                y: block.y,
                w: blockRightW,
                h: block.h
            });
        }
    } else {
        // DIVISÃO HORIZONTAL PRINCIPAL (Corta na largura da peça, gerando um bloco grande embaixo)
        const cutY = block.y + ph;
        sheet.cuts.push({
            x1: block.x,
            y1: cutY,
            x2: block.x + block.w,
            y2: cutY,
            orientation: 'H',
            length: block.w
        });

        // Corte vertical secundário na subchapa de cima
        const cutX = block.x + pw;
        sheet.cuts.push({
            x1: cutX,
            y1: block.y,
            x2: cutX,
            y2: block.y + ph,
            orientation: 'V',
            length: ph
        });

        // Novo bloco à direita da peça
        const blockRightW = dw - kerf;
        if (blockRightW > 0) {
            sheet.freeBlocks.push({
                x: block.x + pw + kerf,
                y: block.y,
                w: blockRightW,
                h: ph
            });
        }

        // Novo bloco abaixo da peça (e do bloco da direita)
        const blockBelowH = dh - kerf;
        if (blockBelowH > 0) {
            sheet.freeBlocks.push({
                x: block.x,
                y: block.y + ph + kerf,
                w: block.w,
                h: blockBelowH
            });
        }
    }
}

// Exportar para ambiente Node.js se aplicável
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuttingOptimizer;
}

