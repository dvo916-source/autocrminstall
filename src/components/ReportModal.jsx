import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, FileText, Download, Check, ChevronDown, BarChart2, Users, CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ALL_STATUSES = [
    { id: 'all', label: 'Todos os Status' },
    { id: 'Novos Leads', label: 'Novos Leads' },
    { id: 'Em Contato', label: 'Em Contato' },
    { id: 'Em Negociação', label: 'Em Negociação' },
    { id: 'Agendados', label: 'Agendados' },
    { id: 'Visitou a Loja', label: 'Visitou a Loja' },
    { id: 'Recontatos', label: 'Recontatos' },
    { id: 'Ganho', label: 'Ganho' },
    { id: 'Perdido', label: 'Perdido' },
    { id: 'Cancelado', label: 'Cancelado' },
];

// Dropdown wrapper that closes on outside click
const Dropdown = ({ trigger, children, open, setOpen, others = [] }) => {
    const ref = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [setOpen]);
    return (
        <div className="relative" ref={ref}>
            {trigger}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[240px] overflow-y-auto custom-scrollbar"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ReportModal = ({ isOpen, onClose, visitas = [], availableMonths = [], lojaName = 'IRW Motors', usuarios = [], estoque = [] }) => {
    const [selectedMonth, setSelectedMonth] = useState('current_month');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedSdrs, setSelectedSdrs] = useState([]); // [] = todos; ou usernames[]
    const [generating, setGenerating] = useState(false);
    const [incluirObservacoes, setIncluirObservacoes] = useState(true);
    const [monthOpen, setMonthOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [sdrOpen, setSdrOpen] = useState(false);

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // SDR list derived from the users passed in
    const sdrList = useMemo(() => {
        return (usuarios || []).filter(u => u.ativo !== 0);
    }, [usuarios]);

    const monthLabel = useMemo(() => {
        if (selectedMonth === 'current_month') return 'Mês Atual';
        return availableMonths.find(m => m.id === selectedMonth)?.label || selectedMonth;
    }, [selectedMonth, availableMonths]);

    const sdrLabel = useMemo(() => {
        if (selectedSdrs.length === 0) return 'Toda a Equipe';
        if (selectedSdrs.length === 1) {
            const u = sdrList.find(u => u.username === selectedSdrs[0]);
            return (u?.nome_completo || u?.username || selectedSdrs[0]).split(' ')[0];
        }
        return `${selectedSdrs.length} SDRs`;
    }, [selectedSdrs, sdrList]);

    const toggleSdr = (username) => {
        setSelectedSdrs(prev =>
            prev.includes(username) ? prev.filter(s => s !== username) : [...prev, username]
        );
    };

    const filteredVisitas = useMemo(() => {
        return visitas.filter(v => {
            // Month filter
            const date = new Date(v.data_agendamento || v.datahora);
            const leadYM = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const matchMonth = selectedMonth === 'current_month'
                ? leadYM === currentYearMonth
                : leadYM === selectedMonth;
            if (!matchMonth) return false;

            // Status filter
            if (selectedStatus !== 'all') {
                const s = (v.status_pipeline || v.status || '').toLowerCase();
                const target = selectedStatus.toLowerCase();
                const match = s === target || (target === 'em negociação' && s === 'negociação');
                if (!match) return false;
            }

            // SDR filter
            if (selectedSdrs.length > 0) {
                const sdr = (v.vendedor_sdr || '').toLowerCase();
                if (!selectedSdrs.some(sel => sel.toLowerCase() === sdr)) return false;
            }

            return true;
        });
    }, [visitas, selectedMonth, selectedStatus, selectedSdrs, currentYearMonth]);

    // Stats
    const stats = useMemo(() => {
        const total = filteredVisitas.length;
        const visitou = filteredVisitas.filter(v => v.visitou_loja == 1).length;
        const ganho = filteredVisitas.filter(v => {
            const s = (v.status_pipeline || v.status || '').toLowerCase();
            return s.includes('ganho') || s.includes('vendid');
        }).length;
        const perdido = filteredVisitas.filter(v => {
            const s = (v.status_pipeline || v.status || '').toLowerCase();
            return s.includes('perdido');
        }).length;
        const cancelado = filteredVisitas.filter(v => {
            const s = (v.status_pipeline || v.status || '').toLowerCase();
            return s.includes('cancelado');
        }).length;
        const naoCompareceu = filteredVisitas.filter(v => v.nao_compareceu == 1).length;
        const taxa = total > 0 ? ((ganho / total) * 100).toFixed(1) : '0.0';
        const taxaVisita = total > 0 ? ((visitou / total) * 100).toFixed(1) : '0.0';
        // Comissões financeiras
        const receitaVisitas = visitou * 20;
        const receitaVendas = ganho * 100;
        const receitaTotal = receitaVisitas + receitaVendas;
        return { total, visitou, ganho, perdido, cancelado, naoCompareceu, taxa, taxaVisita, receitaVisitas, receitaVendas, receitaTotal };
    }, [filteredVisitas]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try { return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
        catch { return '—'; }
    };

    const formatPhone = (p) => {
        if (!p) return '—';
        return p.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    };

    const normalizeStatus = (v) => {
        const s = (v.status_pipeline || v.status || 'Novos Leads');
        if (s === 'Pendente') return 'Novos Leads';
        if (s === 'Em Contato') return 'Primeiro Contato';
        if (s === 'Em Negócio' || s === 'Negociação') return 'Em Negociação';
        if (s === 'Agendados') return 'Agendado';
        if (s === 'Recontatos') return 'Recontato';
        return s;
    };

    const getSdrDisplayName = (username) => {
        if (!username) return '—';
        const u = sdrList.find(u => u.username?.toLowerCase() === username?.toLowerCase());
        return (u?.nome_completo || username).split(' ')[0];
    };

    const generatePDF = async () => {
        setGenerating(true);
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            // ── PALETA ──────────────────────────────────────────────────────
            const C = {
                navy: [13, 27, 62],
                accent: [6, 182, 212],
                accent2: [99, 102, 241],
                green: [22, 163, 74],
                red: [220, 38, 38],
                amber: [217, 119, 6],
                gray1: [250, 251, 253],   // fundo página
                gray2: [244, 246, 250],   // linhas alternadas
                gray3: [214, 220, 232],   // bordas
                gray4: [100, 116, 139],   // texto secundário
                gray5: [30, 41, 59],      // texto principal
                white: [255, 255, 255],
                divider: [226, 232, 240],
            };

            const fill = (rgb) => doc.setFillColor(...rgb);
            const text = (rgb) => doc.setTextColor(...rgb);
            const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
            const marginL = 18, marginR = 14;
            const contentW = pageW - marginL - marginR;

            // ── CHROME DA PÁGINA 1 ───────────────────────────────────────────
            const drawPageChrome = () => {
                fill(C.gray1); doc.rect(0, 0, pageW, pageH, 'F');
                // Faixa superior navy
                fill(C.navy); doc.rect(0, 0, pageW, 18, 'F');
                // Linha accent sob o header
                fill(C.accent); doc.rect(0, 18, pageW, 0.8, 'F');
                // Logo
                font('bold', 11); text(C.white);
                doc.text('IRW MOTORS', marginL, 11);
                font('normal', 6.5); text([180, 195, 215]);
                doc.text('CRM VexCore  ·  Relatório Executivo de Visitas', marginL, 15.5);
                // Info direita
                font('bold', 8); text(C.white);
                doc.text(monthLabel.toUpperCase(), pageW - marginR, 9, { align: 'right' });
                font('normal', 5.8); text([180, 195, 215]);
                const sdrTxt = selectedSdrs.length === 0 ? 'Toda a Equipe' : selectedSdrs.map(s => getSdrDisplayName(s)).join(', ');
                doc.text(`SDR: ${sdrTxt}`, pageW - marginR, 13.5, { align: 'right' });
                doc.text(`Gerado: ${new Date().toLocaleString('pt-BR')}`, pageW - marginR, 17, { align: 'right' });
                // Rodapé
                fill(C.white); doc.rect(0, pageH - 7, pageW, 7, 'F');
                fill(C.divider); doc.rect(0, pageH - 7, pageW, 0.4, 'F');
                font('normal', 5.5); text(C.gray4);
                doc.text('IRW Motors  ·  CRM VexCore  ·  Relatório Confidencial', marginL, pageH - 2.5);
            };

            drawPageChrome();

            // ── KPI CARDS ────────────────────────────────────────────────────
            const kpiY = 23, kpiH = 19, gap = 2.5;
            const kpiW = (contentW - gap * 5) / 6;

            const kpis = [
                { label: 'TOTAL DE LEADS', value: stats.total, sub: 'leads cadastrados', dot: C.accent },
                { label: 'VISITARAM A LOJA', value: `${stats.visitou}`, sub: `${stats.taxaVisita}% do total`, dot: C.accent2 },
                { label: 'FECHAMENTOS', value: stats.ganho, sub: 'vendas realizadas', dot: C.green },
                { label: 'PERDIDOS', value: stats.perdido, sub: 'leads perdidos', dot: C.red },
                { label: 'NÃO COMPARECEU', value: stats.naoCompareceu, sub: 'sem comparecimento', dot: [244, 114, 182] },
                { label: 'CONVERSÃO', value: `${stats.taxa}%`, sub: 'taxa de fechamento', dot: C.amber },
            ];

            kpis.forEach((k, i) => {
                const x = marginL + i * (kpiW + gap);
                // Sombra card
                fill(C.divider); doc.roundedRect(x + 0.4, kpiY + 0.4, kpiW, kpiH, 1.5, 1.5, 'F');
                fill(C.white); doc.roundedRect(x, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
                // Borda superior colorida (3px)
                fill(k.dot); doc.roundedRect(x, kpiY, kpiW, 2.2, 1, 1, 'F');
                // Dot indicador
                fill(k.dot); doc.circle(x + 5, kpiY + 8.5, 1.2, 'F');
                // Valor (compacto e elegante)
                font('bold', 13); text(C.gray5);
                doc.text(String(k.value), x + kpiW / 2, kpiY + 10.5, { align: 'center' });
                // Label
                font('bold', 4.8); text(C.navy);
                doc.text(k.label, x + kpiW / 2, kpiY + 13.8, { align: 'center' });
                // Sub label
                font('normal', 4.5); text(C.gray4);
                doc.text(k.sub, x + kpiW / 2, kpiY + 17, { align: 'center' });
            });

            // ── CARDS FINANCEIROS ─────────────────────────────────────────────
            const finY = kpiY + kpiH + 2.5, finH = 12;
            const finW = (contentW - gap * 2) / 3;

            const fins = [
                { label: `Receita de Visitas  (${stats.visitou} × R$20)`, value: `R$ ${stats.receitaVisitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: C.accent2 },
                { label: `Receita de Vendas  (${stats.ganho} × R$100)`, value: `R$ ${stats.receitaVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: C.green },
                { label: 'Total do Período', value: `R$ ${stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: C.amber },
            ];

            fins.forEach((f, i) => {
                const x = marginL + i * (finW + gap);
                fill(C.divider); doc.roundedRect(x + 0.4, finY + 0.4, finW, finH, 1.5, 1.5, 'F');
                fill(C.white); doc.roundedRect(x, finY, finW, finH, 1.5, 1.5, 'F');
                // Barra lateral esquerda colorida
                fill(f.color); doc.roundedRect(x, finY, 2, finH, 1, 1, 'F');
                // Valor
                font('bold', 9.5); text(f.color);
                doc.text(f.value, x + finW / 2 + 1, finY + 6.5, { align: 'center' });
                // Label
                font('normal', 5); text(C.gray4);
                doc.text(f.label, x + finW / 2 + 1, finY + 10, { align: 'center' });
            });

            // ── HEADER DA TABELA ──────────────────────────────────────────────
            const tableHeaderY = finY + finH + 3;
            fill(C.navy); doc.rect(marginL, tableHeaderY, contentW, 5.5, 'F');
            font('bold', 6); text(C.white);
            doc.text('DETALHAMENTO DOS LEADS', marginL + 3, tableHeaderY + 3.7);
            font('normal', 5.5); text(C.accent);
            doc.text(`${filteredVisitas.length} registros`, pageW - marginR, tableHeaderY + 3.7, { align: 'right' });

            // ─── Tabela ────────────────────────────────────────────────────
            const statusColorMap = (raw) => {
                const s = (raw || '').toLowerCase();
                if (s.includes('ganho')) return C.green;
                if (s.includes('perdido')) return C.red;
                if (s.includes('cancelado')) return C.gray4;
                if (s.includes('agendado')) return [234, 88, 12];
                if (s.includes('visitou')) return C.accent2;
                if (s.includes('recontato')) return [147, 51, 234];
                if (s.includes('contato')) return [37, 99, 235];
                if (s.includes('negocia')) return C.amber;
                return C.accent;
            };

            // Mapa nome do veículo → placa (cruzamento estoque × veiculo_interesse)
            const placaMap = {};
            estoque.forEach(v => { if (v.nome && v.placa) placaMap[v.nome.toLowerCase().trim()] = v.placa; });

            const rows = filteredVisitas.map((v, i) => [
                String(i + 1),
                (v.cliente || '—').substring(0, 26),
                formatPhone(v.telefone),
                (v.veiculo_interesse || '—').substring(0, 22),
                (placaMap[(v.veiculo_interesse || '').toLowerCase().trim()] || v.placa || '').substring(0, 9),
                String(v.valor_proposta || '—'),
                normalizeStatus(v),
                v.visitou_loja == 1 ? 'SIM' : 'NÃO',
                (v.vendedor || '—').substring(0, 14),
                getSdrDisplayName(v.vendedor_sdr),
                (v.portal || '—').substring(0, 10),
                formatDate(v.data_agendamento || v.datahora),
            ]);

            autoTable(doc, {
                startY: tableHeaderY + 6,
                head: [['Nº', 'CLIENTE', 'WHATSAPP', 'VEÍCULO', 'PLACA', 'VALOR', 'STATUS', 'VISITOU', 'CONSULTOR', 'SDR', 'ORIGEM', 'DATA']],
                body: rows,
                theme: 'plain',
                styles: {
                    font: 'helvetica',
                    fontSize: 7.5,
                    textColor: C.gray5,
                    fillColor: C.white,
                    cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
                    lineColor: C.gray3,
                    lineWidth: 0.25,
                    valign: 'middle',
                    overflow: 'ellipsize',
                },
                headStyles: {
                    fillColor: C.navy,
                    textColor: C.white,
                    fontSize: 6.8,
                    fontStyle: 'bold',
                    cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
                    lineWidth: 0,
                },
                alternateRowStyles: { fillColor: C.gray2 },
                columnStyles: {
                    // Total colunas = 263mm (pageW 297 - marginL 20 - right 14)
                    // 0:Nº 1:Cliente 2:WhatsApp 3:Veículo 4:Placa 5:Valor 6:Status 7:Visitou 8:Consultor 9:SDR 10:Origem 11:Data
                    0: { halign: 'center', cellWidth: 12, textColor: C.gray4, fontStyle: 'bold' },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 26, textColor: C.gray4 },
                    3: { cellWidth: 39 },
                    4: { cellWidth: 12, halign: 'center', textColor: C.gray4, fontStyle: 'bold' },
                    5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
                    6: { cellWidth: 26, fontStyle: 'bold' },
                    7: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
                    8: { cellWidth: 22 },
                    9: { cellWidth: 18 },
                    10: { cellWidth: 18, textColor: C.gray4 },
                    11: { cellWidth: 17, halign: 'center', textColor: C.gray4 },
                },
                margin: { top: 30, left: marginL, right: marginR, bottom: 10 },
                willDrawCell: (data) => {
                    if (data.section === 'body') {
                        // Marca-texto verde claro para linhas "Ganho" (STATUS agora no índice 6)
                        const rowStatus = (data.row.cells[6]?.raw || '').toLowerCase();
                        if (rowStatus.includes('ganho') || rowStatus.includes('vendid')) {
                            data.cell.styles.fillColor = [220, 252, 231]; // verde muito suave
                        }
                        // Cores de texto por coluna
                        if (data.column.index === 6) {
                            doc.setTextColor(...statusColorMap(data.cell.raw));
                        } else if (data.column.index === 7) {
                            doc.setTextColor(...(data.cell.raw === 'SIM' ? C.green : C.gray4));
                        }
                    }
                },
                willDrawPage: () => {
                    const pgNum = doc.internal.getCurrentPageInfo().pageNumber;
                    if (pgNum > 1) {
                        // Chrome do novo estilo
                        fill(C.gray1); doc.rect(0, 0, pageW, pageH, 'F');
                        fill(C.navy); doc.rect(0, 0, pageW, 18, 'F');
                        fill(C.accent); doc.rect(0, 18, pageW, 0.8, 'F');
                        font('bold', 11); text(C.white);
                        doc.text('IRW MOTORS', marginL, 11);
                        font('normal', 6.5); text([180, 195, 215]);
                        doc.text('CRM VexCore  ·  Relatório Executivo de Visitas', marginL, 15.5);
                        font('bold', 8); text(C.white);
                        doc.text(monthLabel.toUpperCase(), pageW - marginR, 9, { align: 'right' });
                        font('normal', 5.8); text([180, 195, 215]);
                        const sdrLbl = selectedSdrs.length === 0 ? 'Toda a Equipe' : selectedSdrs.map(s => getSdrDisplayName(s)).join(', ');
                        doc.text(`SDR: ${sdrLbl}`, pageW - marginR, 13.5, { align: 'right' });
                        // Banner continuação
                        fill(C.navy); doc.rect(marginL, 22, contentW, 5, 'F');
                        font('bold', 6); text(C.white);
                        doc.text('DETALHAMENTO DOS LEADS  (cont.)', marginL + 3, 25.5);
                        font('normal', 5.5); text(C.accent);
                        doc.text(`${filteredVisitas.length} registros`, pageW - marginR, 25.5, { align: 'right' });
                    }
                },
                didDrawPage: () => {
                    // Rodapé após conteúdo
                    fill(C.white); doc.rect(0, pageH - 7, pageW, 7, 'F');
                    fill(C.divider); doc.rect(0, pageH - 7, pageW, 0.4, 'F');
                    font('normal', 5.5); text(C.gray4);
                    doc.text('IRW Motors  ·  CRM VexCore  ·  Relatório Confidencial', marginL, pageH - 2.5);
                },
            });

            // ── SEÇÃO DE OBSERVAÇÕES (opcional) ──────────────────────────────
            if (incluirObservacoes) {
                const obsLeads = filteredVisitas.filter(v => {
                    const s = (v.status_pipeline || v.status || '').toLowerCase();
                    return s.includes('ganho') || s.includes('perdido');
                });

                if (obsLeads.length > 0) {
                    // Nova página para observações
                    doc.addPage();
                    const pgObs = doc.internal.getCurrentPageInfo().pageNumber;

                    // Chrome da nova página (estilo profissional)
                    fill(C.gray1); doc.rect(0, 0, pageW, pageH, 'F');
                    fill(C.navy); doc.rect(0, 0, pageW, 18, 'F');
                    fill(C.accent); doc.rect(0, 18, pageW, 0.8, 'F');
                    font('bold', 11); text(C.white);
                    doc.text('IRW MOTORS', marginL, 11);
                    font('normal', 6.5); text([180, 195, 215]);
                    doc.text('CRM VexCore  ·  Relatório Executivo de Visitas', marginL, 15.5);
                    font('bold', 8); text(C.white);
                    doc.text(monthLabel.toUpperCase(), pageW - marginR, 9, { align: 'right' });
                    font('normal', 5.8); text([180, 195, 215]);
                    const sdrLabelObs = selectedSdrs.length === 0 ? 'Toda a Equipe' : selectedSdrs.map(s => getSdrDisplayName(s)).join(', ');
                    doc.text(`SDR: ${sdrLabelObs}`, pageW - marginR, 13.5, { align: 'right' });
                    // Rodapé
                    fill(C.white); doc.rect(0, pageH - 7, pageW, 7, 'F');
                    fill(C.divider); doc.rect(0, pageH - 7, pageW, 0.4, 'F');

                    // Título seção Observações
                    fill(C.navy); doc.rect(marginL, 22, contentW, 5, 'F');
                    font('bold', 6); text(C.white);
                    doc.text('OBSERVAÇÕES POR CLIENTE', marginL + 3, 25.5);
                    font('normal', 5.5); text(C.accent);
                    doc.text(`${obsLeads.length} registros com observação`, pageW - marginR, 25.5, { align: 'right' });

                    // Legenda compacta
                    let curY = 31;
                    fill(C.green); doc.circle(marginL + 2.5, curY + 2, 2, 'F');
                    fill(C.red); doc.circle(marginL + 14, curY + 2, 2, 'F');
                    font('normal', 5); text(C.gray4);
                    doc.text('Ganho / Fechado', marginL + 6, curY + 3);
                    doc.text('Perdido', marginL + 18, curY + 3);
                    curY += 7;

                    const obsRows = obsLeads.map((v, i) => {
                        const s = (v.status_pipeline || v.status || '').toLowerCase();
                        const isGanho = s.includes('ganho');
                        let obs = '';
                        if (isGanho) {
                            const partes = [];
                            if (v.forma_pagamento) partes.push(`Pagamento: ${v.forma_pagamento}`);
                            if (v.valor_proposta) partes.push(`Valor: ${v.valor_proposta}`);
                            if (v.negociacao) partes.push(`Obs: ${v.negociacao}`);
                            obs = partes.join('  |  ') || 'Venda concluída.';
                        } else {
                            obs = v.motivo_perda ? `Motivo da perda: ${v.motivo_perda}` : 'Motivo não informado.';
                        }
                        return [
                            String(i + 1),
                            (v.cliente || '—').substring(0, 28),
                            isGanho ? 'GANHO' : 'PERDIDO',
                            (v.vendedor || '—').substring(0, 18),
                            getSdrDisplayName(v.vendedor_sdr),
                            formatDate(v.data_agendamento || v.datahora),
                            obs.substring(0, 180),
                        ];
                    });

                    autoTable(doc, {
                        startY: curY,
                        head: [['Nº', 'CLIENTE', 'STATUS', 'CONSULTOR', 'SDR', 'DATA', 'OBSERVAÇÕES']],
                        body: obsRows,
                        theme: 'plain',
                        styles: {
                            font: 'helvetica', fontSize: 7,
                            textColor: C.gray5, fillColor: C.white,
                            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
                            lineColor: C.gray3, lineWidth: 0.25,
                            valign: 'middle',
                        },
                        headStyles: {
                            fillColor: C.navy, textColor: C.white,
                            fontSize: 6.2, fontStyle: 'bold',
                            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
                            lineWidth: 0,
                        },
                        alternateRowStyles: { fillColor: C.gray2 },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 12, textColor: C.gray4, fontStyle: 'bold' },
                            1: { cellWidth: 44 },
                            2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                            3: { cellWidth: 30 },
                            4: { cellWidth: 24 },
                            5: { cellWidth: 18, halign: 'center', textColor: C.gray4 },
                            6: { cellWidth: 115, overflow: 'linebreak' },
                        },
                        margin: { top: 38, left: marginL, right: marginR, bottom: 10 },
                        willDrawCell: (data) => {
                            if (data.section === 'body' && data.column.index === 2) {
                                doc.setTextColor(...(data.cell.raw === 'GANHO' ? C.green : C.red));
                            }
                        },
                        willDrawPage: () => {
                            // Chrome Observações no novo estilo
                            fill(C.gray1); doc.rect(0, 0, pageW, pageH, 'F');
                            fill(C.navy); doc.rect(0, 0, pageW, 18, 'F');
                            fill(C.accent); doc.rect(0, 18, pageW, 0.8, 'F');
                            font('bold', 11); text(C.white); doc.text('IRW MOTORS', marginL, 11);
                            font('normal', 6.5); text([180, 195, 215]);
                            doc.text('CRM VexCore  ·  Relatório Executivo de Visitas', marginL, 15.5);
                            fill(C.navy); doc.rect(marginL, 22, contentW, 5, 'F');
                            font('bold', 6); text(C.white);
                            doc.text('OBSERVAÇÕES POR CLIENTE  (cont.)', marginL + 3, 25.5);
                        },
                        didDrawPage: () => {
                            fill(C.white); doc.rect(0, pageH - 7, pageW, 7, 'F');
                            fill(C.divider); doc.rect(0, pageH - 7, pageW, 0.4, 'F');
                            font('normal', 5.5); text(C.gray4);
                            doc.text('IRW Motors  ·  CRM VexCore  ·  Relatório Confidencial', marginL, pageH - 2.5);
                        },
                    });
                }
            }

            // Numeração de todas as páginas
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                fill(C.white); doc.rect(pageW - 45, pageH - 7, 31, 6.5, 'F');
                font('bold', 5.5); text(C.navy);
                doc.text(`Pág. ${p} / ${totalPages}`, pageW - marginR, pageH - 2.5, { align: 'right' });
            }

            // ── SAVE ─────────────────────────────────────────────────────────
            const safePeriod = monthLabel
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_');
            const fileName = `Relatorio_Visitas_${safePeriod}_IRW.pdf`;

            const { ipcRenderer } = window.require('electron');
            const base64Data = doc.output('datauristring').split(',')[1];
            const result = await ipcRenderer.invoke('save-pdf', { base64Data, defaultFileName: fileName });

            if (result?.success) {
                window.dispatchEvent(new CustomEvent('show-notification', {
                    detail: { message: `✅ Relatório salvo com sucesso!`, type: 'success' }
                }));
            } else if (result && !result.canceled) {
                throw new Error(result?.error || 'Erro ao salvar arquivo');
            }
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: `❌ Erro ao gerar PDF: ${err.message}`, type: 'error' }
            }));
        } finally {
            setGenerating(false);
        }
    };



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.94, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.94, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                        className="relative w-full max-w-2xl bg-[#0b101e] border border-white/10 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                    <FileText size={18} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Gerar Relatório PDF</h2>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Relatório de Visitas • {lojaName}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all group">
                                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-5">

                            {/* Row 1: Month + Status */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Month */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">Período</label>
                                    <Dropdown
                                        open={monthOpen}
                                        setOpen={setMonthOpen}
                                        trigger={
                                            <button
                                                onClick={() => { setMonthOpen(p => !p); setStatusOpen(false); setSdrOpen(false); }}
                                                className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl px-4 flex items-center justify-between text-white hover:border-cyan-500/40 hover:bg-white/5 transition-all"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-cyan-400" />
                                                    <span className="text-sm font-bold">{monthLabel}</span>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-500 transition-transform ${monthOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                        }
                                    >
                                        {[{ id: 'current_month', label: 'Mês Atual' }, ...availableMonths].map(m => (
                                            <button key={m.id} onClick={() => { setSelectedMonth(m.id); setMonthOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-3 transition-all text-left hover:bg-white/5 ${selectedMonth === m.id ? 'text-cyan-400 bg-cyan-500/5' : 'text-gray-400'}`}>
                                                <span className="text-[11px] font-bold uppercase tracking-widest">{m.label}</span>
                                                {selectedMonth === m.id && <Check size={12} className="text-cyan-400" />}
                                            </button>
                                        ))}
                                    </Dropdown>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">Status do Lead</label>
                                    <Dropdown
                                        open={statusOpen}
                                        setOpen={setStatusOpen}
                                        trigger={
                                            <button
                                                onClick={() => { setStatusOpen(p => !p); setMonthOpen(false); setSdrOpen(false); }}
                                                className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl px-4 flex items-center justify-between text-white hover:border-purple-500/40 hover:bg-white/5 transition-all"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <BarChart2 size={14} className="text-purple-400" />
                                                    <span className="text-sm font-bold">{ALL_STATUSES.find(s => s.id === selectedStatus)?.label || 'Todos'}</span>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-500 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                        }
                                    >
                                        {ALL_STATUSES.map(s => (
                                            <button key={s.id} onClick={() => { setSelectedStatus(s.id); setStatusOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-3 transition-all text-left hover:bg-white/5 ${selectedStatus === s.id ? 'text-purple-400 bg-purple-500/5' : 'text-gray-400'}`}>
                                                <span className="text-[11px] font-bold uppercase tracking-widest">{s.label}</span>
                                                {selectedStatus === s.id && <Check size={12} className="text-purple-400" />}
                                            </button>
                                        ))}
                                    </Dropdown>
                                </div>
                            </div>

                            {/* Row 2: SDR multi-select (full width) */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">
                                    SDR Responsável <span className="text-gray-700">(multi-seleção)</span>
                                </label>
                                <Dropdown
                                    open={sdrOpen}
                                    setOpen={setSdrOpen}
                                    trigger={
                                        <button
                                            onClick={() => { setSdrOpen(p => !p); setMonthOpen(false); setStatusOpen(false); }}
                                            className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl px-4 flex items-center justify-between text-white hover:border-amber-500/40 hover:bg-white/5 transition-all"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <User size={14} className="text-amber-400 shrink-0" />
                                                {selectedSdrs.length === 0 ? (
                                                    <span className="text-sm font-bold">Toda a Equipe</span>
                                                ) : (
                                                    <div className="flex gap-1.5 flex-wrap overflow-hidden max-h-7">
                                                        {selectedSdrs.map(s => {
                                                            const u = sdrList.find(u => u.username === s);
                                                            const name = (u?.nome_completo || s).split(' ')[0];
                                                            return (
                                                                <span key={s} className="text-[10px] font-black px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300">
                                                                    {name}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {selectedSdrs.length > 0 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedSdrs([]); }}
                                                        className="text-[10px] text-gray-600 hover:text-red-400 font-bold uppercase tracking-wider transition-colors"
                                                    >
                                                        Limpar
                                                    </button>
                                                )}
                                                <ChevronDown size={14} className={`text-gray-500 transition-transform ${sdrOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>
                                    }
                                >
                                    {/* "Toda equipe" option */}
                                    <button
                                        onClick={() => { setSelectedSdrs([]); setSdrOpen(false); }}
                                        className={`w-full flex items-center justify-between px-4 py-3 transition-all text-left hover:bg-white/5 ${selectedSdrs.length === 0 ? 'text-amber-400 bg-amber-500/5' : 'text-gray-400'}`}
                                    >
                                        <span className="text-[11px] font-bold uppercase tracking-widest">Toda a Equipe</span>
                                        {selectedSdrs.length === 0 && <Check size={12} className="text-amber-400" />}
                                    </button>
                                    <div className="h-px bg-white/5 mx-3 my-1" />
                                    {sdrList.map(u => {
                                        const isSelected = selectedSdrs.includes(u.username);
                                        const name = u.nome_completo || u.username;
                                        const initial = name.charAt(0).toUpperCase();
                                        return (
                                            <button
                                                key={u.username}
                                                onClick={() => toggleSdr(u.username)}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 transition-all text-left hover:bg-white/5 ${isSelected ? 'text-amber-400 bg-amber-500/5' : 'text-gray-400'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0 ${isSelected ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                                        {initial}
                                                    </div>
                                                    <span className="text-[11px] font-bold uppercase tracking-widest">{name.split(' ')[0]}</span>
                                                    <span className="text-[9px] text-gray-600 font-bold uppercase">{u.role}</span>
                                                </div>
                                                {isSelected && <Check size={12} className="text-amber-400" />}
                                            </button>
                                        );
                                    })}
                                </Dropdown>
                            </div>

                            {/* Preview Stats */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Prévia do Relatório</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Total de Leads', value: stats.total, color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: <Users size={14} /> },
                                        { label: 'Visitaram a Loja', value: stats.visitou, color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: <Calendar size={14} /> },
                                        { label: 'Fechamentos', value: stats.ganho, color: 'text-green-400', bg: 'bg-green-500/10', icon: <CheckCircle size={14} /> },
                                        { label: 'Perdidos', value: stats.perdido, color: 'text-red-400', bg: 'bg-red-500/10', icon: <XCircle size={14} /> },
                                        { label: 'Cancelados', value: stats.cancelado, color: 'text-gray-400', bg: 'bg-gray-500/10', icon: <XCircle size={14} /> },
                                        { label: 'Taxa de Conversão', value: `${stats.taxa}%`, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <BarChart2 size={14} /> },
                                    ].map((s, i) => (
                                        <div key={i} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
                                            <span className={`${s.color} opacity-80`}>{s.icon}</span>
                                            <div>
                                                <p className={`${s.color} text-lg font-black leading-none`}>{s.value}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-700 mt-3 text-center font-bold">
                                    {filteredVisitas.length} registros serão incluídos no PDF
                                    {selectedSdrs.length > 0 && ` • ${selectedSdrs.length} SDR(s) selecionado(s)`}
                                </p>
                            </div>

                            {/* Toggle Observações */}
                            <button
                                onClick={() => setIncluirObservacoes(p => !p)}
                                className={`w-full h-12 flex items-center justify-between px-4 rounded-xl border transition-all ${incluirObservacoes
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-white/[0.03] border-white/10 text-gray-500'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${incluirObservacoes
                                        ? 'bg-emerald-500 border-emerald-400'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        {incluirObservacoes && <Check size={11} className="text-white" />}
                                    </div>
                                    <span className="text-sm font-bold">Incluir Observações no relatório</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                    {incluirObservacoes ? 'Ganhos + Perdidos' : 'Desativado'}
                                </span>
                            </button>

                            {/* Generate Button */}
                            <button
                                onClick={generatePDF}
                                disabled={generating || filteredVisitas.length === 0}
                                className="w-full h-14 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black tracking-[0.2em] text-sm rounded-xl transition-all shadow-xl shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase"
                            >
                                {generating ? (
                                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando PDF...</>
                                ) : (
                                    <><Download size={18} />Baixar Relatório PDF</>
                                )}
                            </button>

                            {filteredVisitas.length === 0 && (
                                <p className="text-center text-[11px] text-red-400/70 font-bold uppercase tracking-wider -mt-3">
                                    ⚠️ Nenhum registro encontrado para os filtros selecionados
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReportModal;
