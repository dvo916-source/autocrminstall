import React, { memo, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    MessageSquare, CheckCircle, Calendar as CalendarIcon,
    Clock, X, Archive, Trash2, Star, Phone, Car,
    TrendingUp, ChevronRight, Edit2, CreditCard, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── STATUS ─── */
const STATUS_STYLES = {
    'Venda Concluída': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    'Ganho': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    'Perdido': { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-400' },
    'Em Negociação': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
    'Agendado': { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
    'Novos Leads': { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
    'Primeiro Contato': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
    'Recontato': { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
    'Cancelado': { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' },
};
const getStatusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES['Cancelado'];

const ACCENT_COLORS = {
    'Venda Concluída': 'bg-emerald-400', 'Ganho': 'bg-emerald-400',
    'Perdido': 'bg-red-400', 'Em Negociação': 'bg-amber-400',
    'Agendado': 'bg-orange-400', 'Novos Leads': 'bg-cyan-400',
    'Primeiro Contato': 'bg-blue-400', 'Recontato': 'bg-purple-400',
    'Cancelado': 'bg-slate-500',
};
const getAccent = (s) => ACCENT_COLORS[s] || 'bg-slate-600';

const PORTAL_STYLES = {
    OLX: { text: 'text-[#f77e21]', bg: 'bg-[#f77e21]/15', border: 'border-[#f77e21]/30' },
    INSTAGRAM: { text: 'text-[#e1306c]', bg: 'bg-[#e1306c]/15', border: 'border-[#e1306c]/30' },
    FACEBOOK: { text: 'text-[#1877f2]', bg: 'bg-[#1877f2]/15', border: 'border-[#1877f2]/30' },
    SITE: { text: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
    INDICA: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
};
const getPortal = (p) => {
    const up = (p || '').toUpperCase();
    for (const k of Object.keys(PORTAL_STYLES)) if (up.includes(k)) return PORTAL_STYLES[k];
    return { text: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' };
};

/* avatar color by name hash */
const CHIP_COLORS = [
    'bg-amber-500/20 border-amber-500/40 text-amber-200',
    'bg-blue-500/20 border-blue-500/40 text-blue-200',
    'bg-purple-500/20 border-purple-500/40 text-purple-200',
    'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
    'bg-rose-500/20 border-rose-500/40 text-rose-200',
    'bg-sky-500/20 border-sky-500/40 text-sky-200',
    'bg-orange-500/20 border-orange-500/40 text-orange-200',
];
const AVATAR_COLORS = [
    'bg-amber-500/30 border-amber-400/50 text-amber-200',
    'bg-blue-500/30 border-blue-400/50 text-blue-200',
    'bg-purple-500/30 border-purple-400/50 text-purple-200',
    'bg-emerald-500/30 border-emerald-400/50 text-emerald-200',
    'bg-rose-500/30 border-rose-400/50 text-rose-200',
    'bg-sky-500/30 border-sky-400/50 text-sky-200',
    'bg-orange-500/30 border-orange-400/50 text-orange-200',
];
const colorIdx = (name = '') => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
    return Math.abs(h) % CHIP_COLORS.length;
};

/* ─── COMPONENT ─── */
const VisitListItem = memo(({
    v, index, status, dateStr, timeStr,
    sdrInitial, sdrName, patioInitial, patioName, tempIcon,
    isClosed, formatCurrency, getCleanVehicleName,
    setSelectedVisit, setIsVisitModalOpen,
    setActiveStatusDropdown, activeStatusDropdown,
    activeSdrDropdown, setActiveSdrDropdown,
    currentUser, handleDeleteClick, loadData, usuarios, performanceMode,
    daysSinceContact, totalCount, estoque
}) => {
    const canEditSdr = currentUser && ['admin', 'gerente', 'desenvolvedor'].includes((currentUser.role || '').toLowerCase());

    const [visitouLoading, setVisitouLoading] = useState(false);
    const [naoLoading, setNaoLoading] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [tempNotes, setTempNotes] = useState('');
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, openUp: false });
    const statusBtnRef = useRef(null);

    const handleStatusBtnClick = useCallback((e) => {
        e.stopPropagation();
        if (activeStatusDropdown === v.id) { setActiveStatusDropdown(null); return; }
        if (statusBtnRef.current) {
            const rect = statusBtnRef.current.getBoundingClientRect();
            const MENU_H = 340;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUp = spaceBelow < MENU_H + 16;
            setDropdownPos({
                left: rect.left,
                top: rect.bottom + 8,          // used when opening downward
                bottom: window.innerHeight - rect.top + 8,  // used when opening upward
                openUp,
            });
        }
        setActiveStatusDropdown(v.id);
    }, [activeStatusDropdown, v.id, setActiveStatusDropdown]);

    const jaVisitou = v.visitou_loja == 1;
    const naoCompareceu = v.nao_compareceu == 1;

    const handleSim = async (e) => {
        e.stopPropagation(); if (visitouLoading) return;
        try {
            setVisitouLoading(true);
            const { ipcRenderer } = window.require('electron');
            const val = jaVisitou ? 0 : 1;
            await ipcRenderer.invoke('update-visita-visitou-loja', { id: v.id, valor: val, lojaId: v.loja_id });
            if (val) window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: `✅ ${v.cliente} — Visita confirmada!`, type: 'success' } }));
            loadData();
        } catch (e) { console.error(e); } finally { setVisitouLoading(false); }
    };

    const handleNao = async (e) => {
        e.stopPropagation(); if (naoLoading) return;
        try {
            setNaoLoading(true);
            const { ipcRenderer } = window.require('electron');
            const val = naoCompareceu ? 0 : 1;
            await ipcRenderer.invoke('update-visita-nao-compareceu', { id: v.id, valor: val, lojaId: v.loja_id });
            if (val) window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: `⚠️ ${v.cliente} — Não compareceu registrado.`, type: 'warning' } }));
            loadData();
        } catch (e) { console.error(e); } finally { setNaoLoading(false); }
    };

    const handleSaveQuickNotes = async () => {
        if (tempNotes === (isClosed ? v.motivo_perda : v.negociacao)) { setIsEditingNotes(false); return; }
        try {
            const { ipcRenderer } = window.require('electron');
            const payload = { ...v };
            if (isClosed) payload.motivo_perda = tempNotes; else payload.negociacao = tempNotes;
            await ipcRenderer.invoke('update-visita-full', payload); loadData();
        } catch (e) { console.error(e); } finally { setIsEditingNotes(false); }
    };

    const ss = getStatusStyle(status);
    const accent = getAccent(status);
    const portal = getPortal(v.portal);
    const vehicleName = getCleanVehicleName(v.veiculo_interesse || '').split(' #')[0];
    const statusLabel = status === 'Ganho' ? 'VENDA CONCLUÍDA' : (status || 'PENDENTE');

    /* format phone */
    const digits = (v.telefone || '').replace(/\D/g, '');
    const fmtPhone = digits.length === 11 ? `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`
        : digits.length === 10 ? `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`
            : (v.telefone || '');

    /* payment — take only first value */
    const paymentLabel = (v.forma_pagamento || '').split(',')[0].trim();

    /* avatar chip colors */
    const sdrIdx = colorIdx(sdrName || '');
    const patioIdx = colorIdx(patioName || 'X');

    const animProps = performanceMode ? {} : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.15, delay: Math.min(index * 0.02, 0.2) }
    };

    return (
        <motion.div
            {...animProps}
            onClick={() => { setSelectedVisit(v); setIsVisitModalOpen(true); }}
            className={`group relative cursor-pointer mb-2 rounded-2xl border transition-all duration-200
                ${isClosed
                    ? 'bg-[#0c1420] border-white/[0.04] opacity-50'
                    : 'bg-[#0f1c2e] border-white/[0.07] hover:border-white/[0.15] hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:-translate-y-px'
                }
                ${activeStatusDropdown === v.id ? '!z-[100] !opacity-100' : 'z-10'}
            `}
            style={{ minHeight: '100px' }}
        >
            {/* Accent bar - adjusted to stay within rounded corners */}
            <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full z-20 ${accent} opacity-90`} />

            {/* ── FLEX ROW ── */}
            <div className="flex items-stretch" style={{ paddingLeft: '12px' }}>

                {/* ① DATE + PORTAL — 110px */}
                <div style={{ width: '110px', flexShrink: 0 }} className="flex flex-col justify-between py-3 pr-3">
                    {/* Portal TOP */}
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border w-fit ${portal.bg} ${portal.border} ${portal.text}`}>
                        {v.portal || 'LOJA'}
                    </div>
                    {/* Date */}
                    <div>
                        <div className={`text-[24px] font-black tabular-nums leading-none ${isClosed ? 'text-slate-600' : 'text-white'}`}>
                            {dateStr}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Clock size={10} className="text-slate-600 shrink-0" />
                            <span className="text-[11px] text-slate-500 tabular-nums">{timeStr || '--:--'}</span>
                        </div>
                    </div>
                    {/* Spacer bottom */}
                    <div />
                </div>

                {/* vertical divider */}
                <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />

                {/* ② CLIENT — 230px */}
                <div style={{ width: '230px', flexShrink: 0 }} className="flex flex-col justify-center gap-1.5 px-4 py-3">
                    {/* Name + temp */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-[15px] font-black leading-tight truncate ${isClosed ? 'text-slate-500' : 'text-white'}`}>
                            {v.cliente || 'Sem Nome'}
                        </span>
                        {tempIcon && <span className="text-[13px] shrink-0">{tempIcon}</span>}
                    </div>
                    {/* Phone */}
                    {fmtPhone ? (
                        <div className="flex items-center gap-1.5">
                            <Phone size={10} className="text-slate-600 shrink-0" />
                            <span className="text-[11px] text-slate-400 tabular-nums">{fmtPhone}</span>
                        </div>
                    ) : null}
                    {/* Vehicle */}
                    <div className="flex items-start gap-1.5 min-w-0">
                        <Car size={10} className="text-slate-600 shrink-0 mt-[3px]" />
                        <div className="flex flex-col min-w-0 pr-2">
                            {vehicleName ? (
                                <span className="text-[11px] text-slate-400 leading-tight">
                                    {vehicleName}
                                </span>
                            ) : (
                                <span className="text-[11px] text-slate-600 italic">Sem veículo</span>
                            )}

                            {/* Ano & Placa — lookup do estoque */}
                            {(() => {
                                const vi = (v.veiculo_interesse || '').toLowerCase().trim();
                                const match = (estoque || []).find(e => {
                                    const nome = (e.nome || '').toLowerCase().trim();
                                    return nome && vi && (nome === vi || vi.includes(nome) || nome.includes(vi));
                                });

                                const ano = match?.ano || v.ano || '';
                                const placa = match?.placa || v.placa || '';

                                if (!ano && !placa) return null;

                                return (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-black tracking-wider uppercase text-slate-500">
                                        {ano && <span>{ano}</span>}
                                        {ano && placa && <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />}
                                        {placa && <span className="text-slate-400">{placa}</span>}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    {/* Troca badge */}
                    {v.veiculo_troca ? (
                        <span className="text-[9px] font-black text-emerald-400 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            VEÍCULO NA TROCA
                        </span>
                    ) : null}
                    {/* STATUS BADGE — portal dropdown */}
                    <div className="mt-0.5" onClick={e => e.stopPropagation()}>
                        <button
                            ref={statusBtnRef}
                            onClick={handleStatusBtnClick}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all hover:brightness-125 active:scale-95 ${ss.bg} ${ss.border} ${ss.text}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ss.dot} animate-pulse`} />
                            {statusLabel}
                        </button>
                    </div>

                    {/* Portal: rendered into document.body to escape overflow/transform */}
                    {activeStatusDropdown === v.id && ReactDOM.createPortal(
                        <>
                            {/* Backdrop to close on outside click */}
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                                onClick={(e) => { e.stopPropagation(); setActiveStatusDropdown(null); }}
                            />
                            <AnimatePresence>
                                <motion.div
                                    key="status-portal"
                                    initial={{ opacity: 0, scale: 0.96, y: dropdownPos.openUp ? 8 : -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: dropdownPos.openUp ? 8 : -8 }}
                                    style={{
                                        position: 'fixed',
                                        left: dropdownPos.left,
                                        ...(dropdownPos.openUp
                                            ? { bottom: dropdownPos.bottom, top: 'auto' }
                                            : { top: dropdownPos.top }
                                        ),
                                        zIndex: 9999,
                                        minWidth: '210px',
                                        background: '#0b101e',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        boxShadow: '0 24px 60px rgba(0,0,0,0.95)',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        transformOrigin: dropdownPos.openUp ? 'bottom left' : 'top left',
                                    }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="px-4 py-2.5 flex justify-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#111827' }}>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Movimentar Lead</p>
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
                                                    const { ipcRenderer } = window.require('electron');
                                                    await ipcRenderer.invoke('update-visita-status', { id: v.id, status: st.id, pipeline: st.id });
                                                    loadData();
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
                        </>,
                        document.body
                    )}

                </div>

                {/* vertical divider */}
                <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />

                {/* ③ NOTES — flex-1, redesigned */}
                <div
                    className="flex-1 min-w-0 flex flex-col py-3 px-5 relative group/notes"
                    style={{ cursor: 'text' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isEditingNotes) {
                            setTempNotes(isClosed ? (v.motivo_perda || '') : (v.negociacao || ''));
                            setIsEditingNotes(true);
                        }
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-1 h-3 rounded-full ${isClosed ? 'bg-red-500/60' : 'bg-cyan-500/40'}`} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.18em]">
                            {isClosed ? 'MOTIVO' : 'NOTAS'}
                        </span>
                        <Edit2 size={8} className="text-slate-700 opacity-0 group-hover/notes:opacity-100 transition-opacity ml-auto" />
                    </div>
                    <div className="flex-1 flex flex-col items-start gap-2">
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
                                    className="w-full bg-white/[0.05] text-[12.5px] text-white outline-none resize-none leading-relaxed custom-scrollbar rounded-lg px-3 py-2 border-2 border-cyan-500/40 focus:border-cyan-500/60 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)] transition-all"
                                    style={{ height: '60px' }}
                                    placeholder="Escreva uma nota..."
                                />
                                <div className="flex items-center gap-2 self-end">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsEditingNotes(false); }}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                                    >
                                        <X size={12} />
                                        CANCELAR
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveQuickNotes(); }}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 transition-all border border-cyan-500/30"
                                    >
                                        <Check size={12} />
                                        SALVAR
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className={`text-[12.5px] font-medium leading-relaxed rounded-lg px-3 py-1.5 w-full ${isClosed
                                ? 'text-red-400/80 bg-red-500/[0.04]'
                                : (v.negociacao || v.motivo_perda)
                                    ? 'text-slate-300/90'
                                    : 'text-slate-600 italic'
                                }`}
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {(isClosed ? v.motivo_perda : v.negociacao) || 'Clique para adicionar nota...'}
                            </p>
                        )}
                    </div>
                </div>

                {/* ④ RIGHT PANEL — 320px, structured 3-band layout */}
                <div
                    className="flex flex-col h-full"
                    style={{ width: '320px', flexShrink: 0, background: 'rgba(255,255,255,0.025)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* BAND 1: Team — SDR + Consultor */}
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-2 flex-1 min-w-0 relative" onClick={e => e.stopPropagation()}>
                            {/* SDR chip */}
                            <div
                                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer hover:brightness-110 transition-all ${CHIP_COLORS[sdrIdx]}`}
                                onClick={(e) => {
                                    if (!canEditSdr) return;
                                    e.stopPropagation();
                                    setActiveSdrDropdown(activeSdrDropdown === v.id ? null : v.id);
                                    setActiveStatusDropdown(null);
                                }}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0 ${AVATAR_COLORS[sdrIdx]}`}>
                                    {sdrInitial || '?'}
                                </div>
                                <span className="truncate" style={{ maxWidth: '60px' }}>{sdrName ? sdrName.split(' ')[0].toUpperCase() : 'SDR'}</span>
                                {canEditSdr && <ChevronRight size={8} className="opacity-40 shrink-0" />}

                                {/* SDR Dropdown */}
                                <AnimatePresence>
                                    {activeSdrDropdown === v.id && (
                                        <motion.div
                                            {...(performanceMode ? {} : { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } })}
                                            className="absolute top-full left-0 mt-2 z-[200] min-w-[170px] rounded-xl overflow-hidden"
                                            style={{ background: '#0b101e', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.95)' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#111827' }}>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SDR Responsável</p>
                                            </div>
                                            <div className="py-1 max-h-48 overflow-y-auto">
                                                {(usuarios || []).filter(u => u.ativo !== 0 && u.role !== 'desenvolvedor').map(u => {
                                                    const init = (u.nome_completo || u.username).charAt(0).toUpperCase();
                                                    const name = (u.nome_completo || u.username).split(' ')[0];
                                                    const isSel = v.vendedor_sdr?.toLowerCase() === u.username.toLowerCase();
                                                    return (
                                                        <button key={u.username}
                                                            onClick={async (e) => {
                                                                e.stopPropagation(); setActiveSdrDropdown(null);
                                                                const { ipcRenderer } = window.require('electron');
                                                                await ipcRenderer.invoke('update-visita-sdr', { id: v.id, sdr: u.username, lojaId: v.loja_id });
                                                                loadData();
                                                            }}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold transition-colors hover:bg-purple-500/10 ${isSel ? 'text-purple-400' : 'text-slate-300'}`}
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[9px] font-black text-purple-300 shrink-0">{init}</div>
                                                            <span>{name}</span>
                                                            {isSel && <CheckCircle size={11} className="ml-auto text-purple-400" />}
                                                        </button>
                                                    );
                                                })}
                                                {v.vendedor_sdr && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation(); setActiveSdrDropdown(null);
                                                            const { ipcRenderer } = window.require('electron');
                                                            await ipcRenderer.invoke('update-visita-sdr', { id: v.id, sdr: null, lojaId: v.loja_id });
                                                            loadData();
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                                                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                                                    >
                                                        <Trash2 size={11} />
                                                        <span>Remover SDR</span>
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Consultor chip */}
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${CHIP_COLORS[patioIdx]}`}>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0 ${AVATAR_COLORS[patioIdx]}`}>
                                    {patioInitial || '?'}
                                </div>
                                <span className="truncate" style={{ maxWidth: '60px' }}>{patioName ? patioName.split(' ')[0].toUpperCase() : 'CONSULTOR'}</span>
                            </div>
                        </div>
                    </div>

                    {/* BAND 2: Price + Payment */}
                    <div className="flex items-center justify-between px-4 py-2.5 flex-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex flex-col gap-0.5">
                            <span className={`text-[18px] font-black tabular-nums tracking-tight leading-none ${isClosed ? 'text-slate-500' : 'text-white'}`}>
                                {formatCurrency(v.valor_proposta)}
                            </span>
                            {paymentLabel ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <CreditCard size={11} className="text-cyan-500/40 shrink-0" />
                                    <span className="text-[11px] text-cyan-400/60 font-semibold truncate" style={{ maxWidth: '140px' }}>
                                        {paymentLabel}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-700 italic mt-0.5">Sem proposta</span>
                            )}
                        </div>
                    </div>

                    {/* BAND 3: Actions — Compareceu + Trash */}
                    <div className="flex items-center justify-between px-4 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mr-0.5">Compareceu</span>

                            <button
                                onClick={handleSim}
                                disabled={visitouLoading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border
                                ${jaVisitou
                                        ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        : 'border-emerald-500/30 text-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50'}
                                ${naoCompareceu ? 'opacity-30' : ''}`}
                            >
                                {visitouLoading ? <div className="w-2.5 h-2.5 border border-t-emerald-400 rounded-full animate-spin" /> : <CheckCircle size={11} />}
                                SIM
                            </button>

                            <button
                                onClick={handleNao}
                                disabled={naoLoading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border
                                ${naoCompareceu
                                        ? 'bg-rose-500/30 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                                        : 'border-rose-500/30 text-rose-500/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/50'}
                                ${jaVisitou ? 'opacity-30' : ''}`}
                            >
                                {naoLoading ? <div className="w-2.5 h-2.5 border border-t-rose-400 rounded-full animate-spin" /> : <X size={11} />}
                                NÃO
                            </button>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(v.id); }}
                            title="Excluir"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 group/trash shrink-0"
                        >
                            <Trash2 size={15} className="group-hover/trash:scale-110 transition-transform opacity-60 group-hover:opacity-100" />
                        </button>
                    </div>

                </div>
            </div>
        </motion.div>
    );
});

export default VisitListItem;
