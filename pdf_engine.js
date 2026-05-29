/**
 * NOVO MOTOR DE GERAÇÃO DE PDF
 * Design focado em clareza, profissionalismo e suporte a múltiplas páginas.
 */
function _doPDF(inputData) {
    try {
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const W = 210;
        const H = 297;
        const margin = 15;
        const contentWidth = W - (margin * 2);
        let y = margin;

        const items = Array.isArray(inputData) ? inputData : [inputData];

        // Cores
        const primary = [26, 86, 219];
        const textDark = [15, 17, 23];
        const textGray = [107, 114, 128];
        const border = [226, 229, 235];
        const bgLight = [249, 250, 251];

        const checkPage = (h) => {
            if (y + h > H - margin - 10) {
                doc.addPage();
                y = margin;
                drawHeader();
                return true;
            }
            return false;
        };

        const drawHeader = () => {
            doc.setFillColor(primary[0], primary[1], primary[2]);
            doc.rect(0, 0, W, 2, 'F');
            y = margin + 2;
        };

        items.forEach((av, index) => {
            if (index > 0) {
                doc.addPage();
                y = margin;
            }
            drawHeader();

            // Título e Metadados
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.text('Relatório de Avaliação Individual', margin, y + 5);
            y += 15;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textGray[0], textGray[1], textGray[2]);
            
            const metaY = y;
            doc.text(`Colaborador: ${av.nome || '—'}`, margin, metaY);
            doc.text(`Setor: ${av.setor || '—'}`, margin + (contentWidth / 2), metaY);
            y += 6;
            doc.text(`Formador: ${av.formador || '—'}`, margin, y);
            doc.text(`Data: ${av.data || '—'}`, margin + (contentWidth / 2), y);
            y += 10;

            // Linha divisória
            doc.setDrawColor(border[0], border[1], border[2]);
            doc.line(margin, y, W - margin, y);
            y += 10;

            // Seção de Médias
            const cAvg = calcAvg(av.scores, COMP, 'comp');
            const pAvg = calcAvg(av.scores, PERF, 'perf');

            doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
            doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(textGray[0], textGray[1], textGray[2]);
            doc.text('MÉDIA COMPETÊNCIAS', margin + 10, y + 8);
            doc.text('MÉDIA PERFORMANCE', margin + (contentWidth / 2) + 10, y + 8);
            
            doc.setFontSize(14);
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(String(cAvg), margin + 10, y + 15);
            doc.text(String(pAvg), margin + (contentWidth / 2) + 10, y + 15);
            y += 25;

            // Tabelas de Notas
            const drawTable = (title, dataItems, prefix) => {
                checkPage(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                doc.text(title, margin, y);
                y += 6;

                dataItems.forEach(item => {
                    const score = av.scores[prefix + '_' + item.k] || '—';
                    const evidence = av.evid ? (av.evid[prefix + '_' + item.k] || '') : '';
                    
                    const evLines = evidence ? doc.splitTextToSize(evidence, contentWidth - 60) : [];
                    const rowH = Math.max(10, (evLines.length * 5) + 5);
                    
                    checkPage(rowH);
                    
                    doc.setDrawColor(border[0], border[1], border[2]);
                    doc.rect(margin, y, contentWidth, rowH);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                    doc.text(item.l, margin + 2, y + 6);
                    
                    // Nota com cor
                    if (score !== '—') {
                        const sNum = parseInt(score);
                        if (sNum >= 4) doc.setTextColor(13, 122, 95); // Verde
                        else if (sNum === 3) doc.setTextColor(180, 83, 9); // Âmbar
                        else doc.setTextColor(192, 57, 43); // Vermelho
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.text(String(score), margin + contentWidth - 10, y + 6, { align: 'right' });
                    
                    if (evidence) {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(8);
                        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
                        doc.text(evLines, margin + 50, y + 5);
                    }
                    
                    y += rowH;
                });
                y += 10;
            };

            drawTable('1. Competências', COMP, 'comp');
            drawTable('2. Performance', PERF, 'perf');

            // Diagnóstico e Observações
            const drawBlock = (title, text) => {
                if (!text) return;
                checkPage(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                doc.text(title, margin, y);
                y += 6;

                const lines = doc.splitTextToSize(text, contentWidth - 4);
                const h = (lines.length * 5) + 6;
                checkPage(h);
                
                doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
                doc.rect(margin, y, contentWidth, h, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(lines, margin + 2, y + 5);
                y += h + 8;
            };

            const diagD = av.diagSel ? DIAG.find(d => d.k === av.diagSel) : null;
            drawBlock('3. Diagnóstico Final', diagD ? diagD.l : '—');
            drawBlock('4. Pontos Fortes', av.fortes);
            drawBlock('5. Pontos de Melhoria', av.melhoria);
            drawBlock('6. Observações Adicionais', av.nsobs);

            // Assinatura
            checkPage(30);
            y += 10;
            doc.setDrawColor(textDark[0], textDark[1], textDark[2]);
            doc.line(margin + (contentWidth / 4), y + 15, margin + (3 * contentWidth / 4), y + 15);
            doc.setFontSize(9);
            doc.text('Assinatura do Formador', W / 2, y + 20, { align: 'center' });
            if (av.formador) {
                doc.setFont('helvetica', 'bold');
                doc.text(av.formador, W / 2, y + 13, { align: 'center' });
            }
        });

        // Paginação
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(textGray[0], textGray[1], textGray[2]);
            doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 10, { align: 'right' });
        }

        const pdfUri = doc.output('datauristring');
        document.getElementById('overlay').classList.remove('show');
        
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<html><head><title>Relatório de Avaliação</title></head><body style="margin:0"><iframe src="${pdfUri}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
            win.document.close();
        } else {
            const a = document.createElement('a');
            a.href = pdfUri;
            a.download = 'relatorio_avaliacao.pdf';
            a.click();
        }
    } catch (e) {
        console.error('Erro PDF:', e);
        document.getElementById('overlay').classList.remove('show');
        alert('Erro ao gerar PDF: ' + e.message);
    }
}
