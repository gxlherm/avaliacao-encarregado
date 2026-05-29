/**
 * MOTOR DE PDF V2 - ULTRA ROBUSTO
 * Focado em paginação dinâmica perfeita e layout A4 premium.
 */
function _doPDF(inputData) {
    try {
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const W = 210;
        const H = 297;
        const margin = 20; // Margens maiores para elegância
        const contentWidth = W - (margin * 2);
        let y = margin;

        const items = Array.isArray(inputData) ? inputData : [inputData];

        // Paleta de Cores Premium
        const colors = {
            primary: [30, 58, 138],    // Azul Royal Profundo
            secondary: [71, 85, 105],  // Cinza Azulado
            text: [15, 23, 42],        // Quase Preto
            lightText: [100, 116, 139],// Cinza Médio
            border: [226, 232, 240],   // Cinza Suave
            bg: [248, 250, 252],       // Gelo
            success: [21, 128, 61],    // Verde
            warning: [180, 83, 9],     // Âmbar
            danger: [185, 28, 28]      // Vermelho
        };

        const checkNewPage = (neededHeight) => {
            if (y + neededHeight > H - margin - 15) {
                doc.addPage();
                y = margin + 10;
                // Borda decorativa lateral em todas as páginas
                doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.rect(0, 0, 2, H, 'F');
                return true;
            }
            return false;
        };

        items.forEach((av, idx) => {
            if (idx > 0) {
                doc.addPage();
                y = margin;
            }

            // Borda decorativa lateral
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(0, 0, 2, H, 'F');

            // Cabeçalho Principal
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.text('AVALIAÇÃO DE DESEMPENHO', margin, y + 10);
            y += 20;

            // Info Box
            doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
            doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');
            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
            doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'S');

            doc.setFontSize(10);
            doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
            doc.text('COLABORADOR', margin + 5, y + 8);
            doc.text('SETOR', margin + contentWidth / 2 + 5, y + 8);
            doc.text('FORMADOR', margin + 5, y + 22);
            doc.text('DATA DA AVALIAÇÃO', margin + contentWidth / 2 + 5, y + 22);

            doc.setFontSize(12);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(String(av.nome || 'N/A').toUpperCase(), margin + 5, y + 14);
            doc.text(String(av.setor || 'N/A').toUpperCase(), margin + contentWidth / 2 + 5, y + 14);
            doc.text(String(av.formador || 'N/A').toUpperCase(), margin + 5, y + 28);
            const dataFmt = av.data ? new Date(av.data + 'T12:00').toLocaleDateString('pt-BR') : 'N/A';
            doc.text(dataFmt, margin + contentWidth / 2 + 5, y + 28);
            y += 45;

            // Médias em Destaque
            const cAvg = calcAvg(av.scores, COMP, 'comp');
            const pAvg = calcAvg(av.scores, PERF, 'perf');

            const drawScoreCircle = (label, score, x) => {
                doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
                doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.setLineWidth(0.5);
                doc.circle(x, y + 10, 15, 'FD');
                
                doc.setFontSize(16);
                doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.text(String(score), x, y + 12, { align: 'center' });
                
                doc.setFontSize(9);
                doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
                doc.text(label, x, y + 30, { align: 'center' });
            };

            drawScoreCircle('MÉDIA COMPETÊNCIAS', cAvg, margin + contentWidth / 4);
            drawScoreCircle('MÉDIA PERFORMANCE', pAvg, margin + (3 * contentWidth / 4));
            y += 45;

            // Seções de Tabelas
            const renderTable = (title, itemsList, prefix) => {
                checkNewPage(25);
                doc.setFontSize(14);
                doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.text(title, margin, y);
                y += 5;
                doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.setLineWidth(0.8);
                doc.line(margin, y, margin + 20, y);
                y += 10;

                itemsList.forEach((item, i) => {
                    const score = av.scores[prefix + '_' + item.k] || 0;
                    const evidence = av.evid ? (av.evid[prefix + '_' + item.k] || '') : '';
                    const evLines = evidence ? doc.splitTextToSize(evidence, contentWidth - 85) : [];
                    const rowHeight = Math.max(15, (evLines.length * 5) + 8);

                    checkNewPage(rowHeight);

                    // Fundo zebrado
                    if (i % 2 === 0) {
                        doc.setFillColor(252, 252, 253);
                        doc.rect(margin, y, contentWidth, rowHeight, 'F');
                    }
                    
                    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                    doc.setLineWidth(0.1);
                    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                    doc.text(item.l, margin + 3, y + (rowHeight / 2), { baseline: 'middle' });

                    if (evidence) {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(9);
                        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                        doc.text(evLines, margin + 75, y + 6);
                    }

                    // Nota
                    if (score > 0) {
                        let scColor = colors.danger;
                        if (score >= 4) scColor = colors.success;
                        else if (score === 3) scColor = colors.warning;

                        doc.setFillColor(scColor[0], scColor[1], scColor[2]);
                        doc.roundedRect(margin + contentWidth - 12, y + (rowHeight / 2) - 4, 8, 8, 1, 1, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(10);
                        doc.text(String(score), margin + contentWidth - 8, y + (rowHeight / 2) + 0.5, { align: 'center', baseline: 'middle' });
                    }

                    y += rowHeight;
                });
                y += 15;
            };

            renderTable('1. COMPETÊNCIAS TÉCNICAS E COMPORTAMENTAIS', COMP, 'comp');
            renderTable('2. PERFORMANCE E RESULTADOS', PERF, 'perf');

            // Blocos de Texto (Fortes, Melhoria, etc)
            const renderTextBlock = (title, text) => {
                if (!text) return;
                const lines = doc.splitTextToSize(text, contentWidth - 10);
                const blockHeight = (lines.length * 6) + 15;

                checkNewPage(blockHeight);

                doc.setFontSize(13);
                doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.text(title, margin, y);
                y += 6;

                doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
                doc.roundedRect(margin, y, contentWidth, blockHeight - 8, 1, 1, 'F');
                
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.text(lines, margin + 5, y + 8);
                
                y += blockHeight + 5;
            };

            const diagD = av.diagSel ? DIAG.find(d => d.k === av.diagSel) : null;
            renderTextBlock('3. DIAGNÓSTICO FINAL', diagD ? diagD.l : '');
            renderTextBlock('4. PONTOS FORTES IDENTIFICADOS', av.fortes);
            renderTextBlock('5. OPORTUNIDADES DE MELHORIA', av.melhoria);
            renderTextBlock('6. OBSERVAÇÕES E PRÓXIMOS PASSOS', av.nsobs);

            // Assinatura Final
            checkNewPage(40);
            y += 20;
            doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.setLineWidth(0.5);
            doc.line(W / 2 - 40, y + 10, W / 2 + 40, y + 10);
            doc.setFontSize(10);
            doc.text('ASSINATURA DO FORMADOR', W / 2, y + 16, { align: 'center' });
            if (av.formador) {
                doc.setFont('helvetica', 'bold');
                doc.text(av.formador.toUpperCase(), W / 2, y + 8, { align: 'center' });
            }
        });

        // Rodapé em todas as páginas
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
            doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}  |  Página ${i} de ${totalPages}`, W / 2, H - 10, { align: 'center' });
        }

        const pdfUri = doc.output('datauristring');
        document.getElementById('overlay').classList.remove('show');
        
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<html><head><title>Relatório Premium</title></head><body style="margin:0"><iframe src="${pdfUri}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
            win.document.close();
        } else {
            const a = document.createElement('a');
            a.href = pdfUri;
            a.download = `Avaliacao_${items[0].nome || 'Relatorio'}.pdf`;
            a.click();
        }
        showToast('PDF Premium gerado com sucesso');
    } catch (e) {
        console.error('Erro PDF V2:', e);
        document.getElementById('overlay').classList.remove('show');
        alert('Erro ao gerar PDF: ' + e.message);
    }
}
