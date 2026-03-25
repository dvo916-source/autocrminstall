import React, { memo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../../context/LojaContext';
import { useUI } from '../../context/UIContext';
import { useLeads } from '../../context/LeadsContext';
import ReactDOM from 'react-dom';
import { parseVehicleInfo, getPhotoUrl, findCarInEstoque, formatPhone, getFirstName } from '../../lib/vehicleUtils';
import { formatCurrency as utilsFormatCurrency } from '../../lib/utils';
import {
    MessageSquare, CheckCircle, Calendar as CalendarIcon,
    Clock, X, Archive, Trash2, Star, Phone, Car,
    TrendingUp, Edit2, CreditCard, Check, AlertTriangle, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { electronAPI } from '@/lib/electron-api';

const STATUS_STYLES = {
    'Venda Concluída': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    'Ganho': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    'Perdido': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
    'Em Negociação': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    'Agendado': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
    'Novos Leads': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
    'Primeiro Contato': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
    'Recontato': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-400' },
    'Cancelado': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-400' },
};
const getStatusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES['Cancelado'];
const ACCENT_COLORS = { 'Venda Concluída': 'bg-emerald-500', 'Ganho': 'bg-emerald-500', 'Perdido': 'bg-red-500', 'Em Negociação': 'bg-amber-500', 'Agendado': 'bg-orange-500', 'Novos Leads': 'bg-cyan-500', 'Primeiro Contato': 'bg-blue-500', 'Recontato': 'bg-purple-500', 'Cancelado': 'bg-slate-500' };
const getAccent = (s) => ACCENT_COLORS[s] || 'bg-slate-600';
const PORTAL_STYLES = { OLX: { text: 'text-[#f77e21]', bg: 'bg-[#f77e21]/15', border: 'border-[#f77e21]/30' }, INSTAGRAM: { text: 'text-[#e1306c]', bg: 'bg-[#e1306c]/15', border: 'border-[#e1306c]/30' }, FACEBOOK: { text: 'text-[#1877f2]', bg: 'bg-[#1877f2]/15', border: 'border-[#1877f2]/30' }, SITE: { text: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/30' } };
const getPortal = (p) => { const up = (p || '').toUpperCase(); for (const k of Object.keys(PORTAL_STYLES)) if (up.includes(k)) return PORTAL_STYLES[k]; return { text: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' }; };

const VisitListItem = memo(({
    v, estoque: propEstoque, index, status, dateStr, timeStr,
    isClosed, getCleanVehicleName,
    setSelectedVisit, setIsVisitModalOpen,
    setActiveStatusDropdown, activeStatusDropdown,
    loadData, usuarios, handleDeleteClick,
    handleUpdateStatus
}) => {
    const navigate = useNavigate();
    const { currentLoja } = useLoja();
    const { performanceMode } = useUI();

    const [visitouLoading, setVisitouLoading] = useState(false);
    const [naoLoading, setNaoLoading] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [tempNotes, setTempNotes] = useState('');
    const [isAddingDetails, setIsAddingDetails] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [tempDetails, setTempDetails] = useState('');
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, openUp: false });
    const statusBtnRef = useRef(null);

    const formatCurrency = useCallback((val) => {
        if (!val) return null;
        const n = parseFloat(String(val).replace(/\D/g, '')) / 100;
        return isNaN(n) ? null : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    }, []);

    const handleStatusBtnClick = useCallback((e) => {
        e.stopPropagation();
        if (activeStatusDropdown === v.id) { setActiveStatusDropdown(null); return; }
        if (statusBtnRef.current) {
            const rect = statusBtnRef.current.getBoundingClientRect();
            setDropdownPos({ left: rect.left, top: rect.bottom + 8, bottom: window.innerHeight - rect.top + 8, openUp: (window.innerHeight - rect.bottom) < 356 });
        }
        setActiveStatusDropdown(v.id);
    }, [activeStatusDropdown, v.id, setActiveStatusDropdown]);

    const handleSim = async (e) => {
        e.stopPropagation(); if (visitouLoading) return;
        setVisitouLoading(true);

        const val = v.visitou_loja == 1 ? 0 : 1;
        await electronAPI.updateVisitaVisitouLoja({ id: v.id, valor: val, lojaId: v.loja_id });
        if (val) window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: `✅ Visita confirmada!`, type: 'success' } }));
        loadData(); setVisitouLoading(false);
    };

    const handleNao = async (e) => {
        e.stopPropagation(); if (naoLoading) return;
        setNaoLoading(true);

        const val = v.nao_compareceu == 1 ? 0 : 1;
        await electronAPI.updateVisitaNaoCompareceu({ id: v.id, valor: val, lojaId: v.loja_id });
        if (val) window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: `⚠️ Não compareceu registrado.`, type: 'warning' } }));
        loadData(); setNaoLoading(false);
    };

    const handleSaveQuickNotes = async () => {
        if (tempNotes === (isClosed ? v.motivo_perda : v.negociacao)) { setIsEditingNotes(false); return; }

        const payload = { ...v };
        if (isClosed) payload.motivo_perda = tempNotes; else payload.negociacao = tempNotes;
        await electronAPI.updateVisitaFull(payload); loadData(); setIsEditingNotes(false);
    };

    const handleWhatsAppClick = (e) => {
        e.stopPropagation();
        if (!v.telefone) return;

        let numeroLimpo = v.telefone.replace(/\D/g, '');
        if (numeroLimpo.length >= 8) {
            if (!numeroLimpo.startsWith('55')) numeroLimpo = '55' + numeroLimpo;
            navigate('/whatsapp', { state: { action: 'open-chat', phone: numeroLimpo } });
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: 'Encaminhando ao WhatsApp...', type: 'info' }
            }));
        }
    };

    const isSlaRisk = v.isSlaRisk;
    const ss = getStatusStyle(status);
    const accent = getAccent(status);
    const portal = getPortal(v.portal);
    const fmtPhone = formatPhone(v.telefone);

    const sdrObj = (usuarios || []).find(u => u.username?.toLowerCase() === (v.vendedor_sdr || '').toLowerCase());
    const patioObj = (usuarios || []).find(u => u.username?.toLowerCase() === (v.vendedor || '').toLowerCase());

    const sdrName = getFirstName(sdrObj?.nome_completo || sdrObj?.nome || sdrObj?.username || v.vendedor_sdr?.split('@')[0]);
    const patioName = getFirstName(patioObj?.nome_completo || patioObj?.nome || patioObj?.username || v.vendedor?.split('@')[0]);

    const { estoque: contextEstoque } = useLeads();
    const listaEstoque = propEstoque || contextEstoque || [];

    // Tenta achar pelo ID primeiro, se não tiver cai no nome (retrocompatibilidade)
    const targetCar = v.veiculo_id 
        ? (listaEstoque.find(c => c.id === v.veiculo_id) || findCarInEstoque(listaEstoque, v.veiculo_interesse))
        : findCarInEstoque(listaEstoque, v.veiculo_interesse);

    const vehicleName = targetCar?.nome || (v.veiculo_interesse || '').split(' #')[0].trim();
    const photoUrl = getPhotoUrl(targetCar) || v.foto_veiculo;
    const finalPrice = targetCar?.valor || formatCurrency(v.valor_proposta) || 'Consulte';

    return (
        <motion.div
            {...(performanceMode ? {} : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } })}
            onClick={() => { setSelectedVisit(v); setIsVisitModalOpen(true); }}
            className={`group relative cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-stretch
                ${isClosed
                    ? 'bg-[#0a101d] border-white/[0.04] opacity-60'
                    : isSlaRisk
                        ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-red-400'
                        : 'bg-[#111827] border-white/[0.08] hover:border-cyan-500/40 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:-translate-y-px'
                }
                ${activeStatusDropdown === v.id ? '!z-[100] !opacity-100' : 'z-10'}
            `}
        >
            <div className={`w-1.5 shrink-0 ${isSlaRisk ? 'bg-red-500 animate-pulse' : accent} opacity-90`} />

            {isSlaRisk && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-lg border-b border-l border-red-400 flex items-center gap-1.5 z-20">
                    <AlertTriangle size={12} /> Prazo Estourado
                </div>
            )}

            <div className="flex flex-col justify-between p-4 flex-1 min-w-[280px]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider ${portal.bg} ${portal.border} ${portal.text}`}>
                            {v.portal || 'LOJA'}
                        </span>
                        <span className={`text-[12px] font-black tabular-nums tracking-wider ${isClosed ? 'text-slate-500' : 'text-slate-300'}`}>
                            {dateStr} <span className="text-[10px] text-slate-500 ml-1">{timeStr || '--:--'}</span>
                        </span>
                    </div>
                    {v.temperatura === 'Quente' && (
                        <span className="text-sm px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 font-bold flex items-center gap-1">
                            🔥 Quente
                        </span>
                    )}
                    {v.temperatura === 'Morno' && (
                        <span className="text-sm px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 font-bold flex items-center gap-1">
                            ☀️ Morno
                        </span>
                    )}
                    {v.temperatura === 'Frio' && (
                        <span className="text-sm px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 font-bold flex items-center gap-1">
                            ❄️ Frio
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 min-w-0 mb-1">
                    <h3 className={`text-2xl font-black leading-tight truncate ${isSlaRisk ? 'text-red-100' : isClosed ? 'text-slate-400' : 'text-white'}`}>
                        {v.cliente || 'Sem Nome'}
                    </h3>
                </div>

                {fmtPhone && (
                    <button
                        onClick={handleWhatsAppClick}
                        className="flex items-center gap-1.5 mb-3 w-fit bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 px-2 py-1 rounded-md transition-all group"
                    >
                        <Phone size={12} className="text-green-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-green-400 font-bold tracking-wide tabular-nums">{fmtPhone}</span>
                    </button>
                )}

            </div>

            <div className="hidden md:block w-px bg-white/[0.05] my-4 shrink-0" />

            <div className="flex flex-col p-4 flex-1 min-w-[250px] border-t border-white/[0.05] md:border-none relative group/notes cursor-text"
                onClick={(e) => { e.stopPropagation(); if (status !== 'Perdido' && !isEditingNotes) { setTempNotes(isClosed ? (v.motivo_perda || '') : (v.negociacao || '')); setIsEditingNotes(true); } }}
            >
                {status === 'Perdido' ? (
                    <div className="pt-2">
                        {/* Header vermelho */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-red-500/10">
                            <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">
                                LEAD PERDIDO
                            </p>
                        </div>

                        {/* Seção única: DETALHES DO NÃO FECHAMENTO */}
                        <div>
                            <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-wider mb-1">
                                Detalhes do não fechamento:
                            </p>
                            {isEditingDetails ? (
                                <div className="w-full flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                                    <textarea
                                        autoFocus
                                        value={tempDetails}
                                        onChange={(e) => setTempDetails(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                handleUpdateStatus(v.id, 'Perdido', v.motivo_perda, tempDetails.trim());
                                                setIsEditingDetails(false);
                                            }
                                            if (e.key === 'Escape') setIsEditingDetails(false);
                                        }}
                                        placeholder="Descreva o motivo do não fechamento..."
                                        className="w-full bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-[13px] text-red-200 placeholder:text-red-900/30 focus:outline-none focus:border-red-500/30 min-h-[70px] resize-none transition-all leading-relaxed"
                                    />
                                    <div className="flex items-center gap-2 self-end">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsEditingDetails(false); }}
                                            className="px-3 py-1 rounded-md text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 border border-white/10"
                                        >CANCELAR</button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const val = tempDetails.trim();
                                                await handleUpdateStatus(v.id, 'Perdido', v.motivo_perda, val);
                                                setIsEditingDetails(false);
                                            }}
                                            className="px-3 py-1 rounded-md text-[10px] font-black bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                        >SALVAR</button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTempDetails(v.detalhes_perda || v.motivo_perda || '');
                                        setIsEditingDetails(true);
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 mb-2 opacity-60 hover:opacity-100 transition-opacity">
                                        <Edit2 size={10} className="text-red-400" />
                                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                            Clique para editar
                                        </span>
                                    </div>
                                    <p className={`text-base font-medium leading-relaxed ${(v.detalhes_perda || v.motivo_perda) ? 'text-red-200/80' : 'text-red-900/40 italic'}`}>
                                        {v.detalhes_perda || v.motivo_perda || 'Sem detalhes adicionados...'}
                                    </p>
                                </div>
                            )}
                        </div>


                    </div>


                ) : (status === 'Ganho' || status === 'Venda Concluída') ? (
                    <div className="pt-2">
                        {/* Header verde */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-500/10">
                            <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                                ✅ VENDA CONCLUÍDA
                            </p>
                        </div>

                        {v.negociacao || isEditingNotes ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-wider mb-1">
                                        Detalhes da Negociação:
                                    </p>
                                    {isEditingNotes ? (
                                        <div className="w-full flex flex-col gap-2">
                                            <textarea
                                                autoFocus
                                                value={tempNotes}
                                                onChange={(e) => setTempNotes(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveQuickNotes();
                                                    if (e.key === 'Escape') setIsEditingNotes(false);
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-[13px] text-emerald-200 placeholder:text-emerald-900/30 focus:outline-none focus:border-emerald-500/30 hover:border-emerald-500/20 min-h-[60px] resize-none transition-all leading-relaxed"
                                            />
                                            <div className="flex items-center gap-2 self-end">
                                                <button onClick={(e) => { e.stopPropagation(); setIsEditingNotes(false); }} className="px-3 py-1 rounded-md text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">CANCELAR</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleSaveQuickNotes(); }} className="px-3 py-1 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30">SALVAR</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={e => { e.stopPropagation(); setTempNotes(v.negociacao || ''); setIsEditingNotes(true); }}>
                                            <div className="flex items-center gap-1.5 mb-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                                                <Edit2 size={10} className="text-emerald-400" />
                                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Clique para editar</span>
                                            </div>
                                            <p className="text-base font-medium text-emerald-300 leading-relaxed">
                                                {v.negociacao}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); setTempNotes(''); setIsEditingNotes(true); }}
                                className="mt-2 w-full flex flex-col items-center justify-center gap-2 py-5 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-dashed border-emerald-500/20 hover:border-emerald-500/40 transition-all group/wonbtn"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover/wonbtn:bg-emerald-500/20 group-hover/wonbtn:border-emerald-500/40 flex items-center justify-center transition-all">
                                    <Plus size={14} className="text-emerald-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] font-black text-emerald-400/80 group-hover/wonbtn:text-emerald-300 uppercase tracking-widest transition-colors">
                                        Adicionar Detalhes
                                    </p>
                                </div>
                            </button>
                        )}
                    </div>

                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1 h-3 rounded-full bg-cyan-500/40" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">Observações</span>
                            </div>
                            <Edit2 size={10} className="text-slate-600 opacity-0 group-hover/notes:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex-1 flex flex-col items-start gap-2 h-full">
                            {isEditingNotes ? (
                                <div className="w-full flex flex-col gap-2 h-full">
                                    <textarea autoFocus value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveQuickNotes(); if (e.key === 'Escape') setIsEditingNotes(false); }} onClick={e => e.stopPropagation()} className="w-full h-full min-h-[60px] bg-black/30 text-[13px] text-white outline-none resize-none leading-relaxed custom-scrollbar rounded-xl px-3 py-2 border border-cyan-500/40 focus:border-cyan-500 shadow-inner transition-all" />
                                    <div className="flex items-center gap-2 self-end">
                                        <button onClick={(e) => { e.stopPropagation(); setIsEditingNotes(false); }} className="px-3 py-1 rounded-md text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">CANCELAR</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleSaveQuickNotes(); }} className="px-3 py-1 rounded-md text-[10px] font-black bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30">SALVAR</button>
                                    </div>
                                </div>
                            ) : (
                                <p className={`text-base font-medium leading-relaxed w-full ${v.negociacao ? 'text-slate-300' : 'text-slate-600 italic'}`} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {v.negociacao || 'Clique para adicionar uma observação rápida...'}
                                </p>
                            )}
                        </div>
                    </>
                )}


                {/* BOTÕES VISITA + STATUS — MOVIDOS DA COLUNA 1 */}
                <div className="mt-auto pt-4 border-t border-white/[0.05] flex flex-col gap-3">
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">
                            Visita:
                        </span>
                        <button
                            onClick={handleSim}
                            disabled={visitouLoading}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${v.visitou_loja == 1
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                                }`}
                        >
                            {visitouLoading ? '...' : '✓ SIM'}
                        </button>
                        <button
                            onClick={handleNao}
                            disabled={naoLoading}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${v.nao_compareceu == 1
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                                }`}
                        >
                            {naoLoading ? '...' : '✗ NÃO'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="hidden md:block w-px bg-white/[0.05] my-4 shrink-0" />

            <div className={`flex flex-col justify-between p-5 md:w-[340px] shrink-0 bg-black/20 border-t border-white/[0.05] md:border-none ${isSlaRisk ? 'pt-8' : ''}`}>
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-28 aspect-[4/3] rounded-xl bg-black/40 border border-white/10 overflow-hidden relative shrink-0 shadow-inner">
                        {photoUrl ? <img src={photoUrl} alt="Veículo" className="w-full h-full object-cover opacity-90" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-700"><Car size={28} strokeWidth={1} /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none mb-2">Interesse</span>
                        {(() => {
                            const { marcaModelo, motor, cambio } = parseVehicleInfo(vehicleName, targetCar);
                            return (
                                <>
                                    <span className="text-[13px] text-white font-black leading-tight mb-0.5">
                                        {marcaModelo}{motor ? ` ${motor}` : ''}{cambio ? ` ${cambio}` : ''}
                                    </span>
                                    {targetCar?.ano && (
                                        <span className="text-[11px] font-bold text-slate-500 mb-2">{targetCar.ano}</span>
                                    )}
                                </>
                            );
                        })()}
                        {targetCar?.placa && (
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded w-fit mb-2">
                                {targetCar.placa}
                            </span>
                        )}
                        <span className={`text-[17px] font-black tabular-nums tracking-tight leading-none ${isClosed ? 'text-slate-500' : 'text-green-400'}`}>
                            {finalPrice}
                        </span>
                        {v.veiculo_troca && <span className="text-[8px] font-black text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 uppercase tracking-widest mt-2 w-fit">C/ Troca</span>}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto border-t border-white/[0.05] pt-3" onClick={e => e.stopPropagation()}>
                    {/* SDR + Vendedor */}
                    <div className="flex items-center gap-1 flex-1">
                        <div className="flex flex-col items-center w-1/2">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.15em] mb-1">SDR</span>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-[9px] font-black text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                    {sdrName.charAt(0)}
                                </div>
                                <span className="text-[11px] font-bold text-slate-200 truncate">{sdrName}</span>
                            </div>
                        </div>
                        <div className="w-px h-7 bg-white/[0.05] shrink-0" />
                        <div className="flex flex-col items-center w-1/2">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.15em] mb-1">Vendedor</span>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0">
                                    {patioName.charAt(0)}
                                </div>
                                <span className="text-[11px] font-bold text-slate-400 truncate">{patioName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status + Lixeira — movidos para cá */}
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                        {status === 'Perdido' ? (
                            <div className="bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg">
                                <span className="text-red-400 font-black text-[10px] uppercase tracking-widest">PERDIDO</span>
                            </div>
                        ) : (
                            <button ref={statusBtnRef} onClick={handleStatusBtnClick} className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${ss.bg} ${ss.border} ${ss.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ss.dot} animate-pulse`} /> {status === 'Ganho' ? 'Venda' : (status || 'Pendente')}
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(v.id); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5 hover:border-red-500/20 group/trash shrink-0">
                            <Trash2 size={14} className="group-hover/trash:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {activeStatusDropdown === v.id && ReactDOM.createPortal(
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={(e) => { e.stopPropagation(); setActiveStatusDropdown(null); }} />
                    <AnimatePresence>
                        <motion.div
                            key="status-portal"
                            initial={{ opacity: 0, scale: 0.96, y: dropdownPos.openUp ? 8 : -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: dropdownPos.openUp ? 8 : -8 }}
                            style={{
                                position: 'fixed', left: dropdownPos.left,
                                ...(dropdownPos.openUp ? { bottom: dropdownPos.bottom, top: 'auto' } : { top: dropdownPos.top }),
                                zIndex: 9999, minWidth: '210px', background: '#0b101e', border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.95)', borderRadius: '16px', overflow: 'hidden',
                                transformOrigin: dropdownPos.openUp ? 'bottom left' : 'top left',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-4 py-2.5 flex justify-center border-b border-white/5 bg-[#111827]">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mover Lead</p>
                            </div>
                            <div className="py-1.5 max-h-80 overflow-y-auto custom-scrollbar">
                                {[
                                    { id: 'Novos Leads', label: 'Novos Leads', icon: <Star size={13} />, color: 'text-cyan-400', hover: 'hover:bg-cyan-500/10' },
                                    { id: 'Primeiro Contato', label: 'Primeiro Contato', icon: <MessageSquare size={13} />, color: 'text-blue-400', hover: 'hover:bg-blue-500/10' },
                                    { id: 'Em Negociação', label: 'Em Negociação', icon: <TrendingUp size={13} />, color: 'text-amber-400', hover: 'hover:bg-amber-500/10' },
                                    { id: 'Agendado', label: 'Agendado', icon: <CalendarIcon size={13} />, color: 'text-orange-400', hover: 'hover:bg-orange-500/10' },
                                    { id: 'Recontato', label: 'Recontato', icon: <Archive size={13} />, color: 'text-purple-400', hover: 'hover:bg-purple-500/10' },
                                    { id: 'Ganho', label: 'Venda Concluída', icon: <CheckCircle size={13} />, color: 'text-emerald-400', hover: 'hover:bg-emerald-500/10' },
                                    { id: 'Perdido', label: 'Lead Perdido', icon: <X size={13} />, color: 'text-red-400', hover: 'hover:bg-red-500/10' },
                                    { id: 'Cancelado', label: 'Cancelado', icon: <Trash2 size={13} />, color: 'text-slate-400', hover: 'hover:bg-slate-500/10' },
                                ].map(st => (
                                    <button key={st.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (status === st.id) return;
                                            setActiveStatusDropdown(null);

                                            if (handleUpdateStatus) {
                                                await handleUpdateStatus(v.id, st.id);
                                            } else {
                                                await electronAPI.updateVisitaStatus({ id: v.id, status: st.id, pipeline: st.id });
                                                loadData();
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap
                                            ${status === st.id ? `${st.color} bg-white/5 border-l-2 border-current` : `text-slate-500 opacity-40 hover:opacity-100 ${st.hover} hover:text-white`}`}
                                    >
                                        <span className={`shrink-0 ${status === st.id ? 'scale-110' : 'opacity-60'} transition-transform`}>{st.icon}</span>
                                        <span>{st.label}</span>
                                        {status === st.id && <CheckCircle size={11} className="ml-auto animate-pulse" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </>, document.body
            )}
        </motion.div>
    );
});

export default VisitListItem;
