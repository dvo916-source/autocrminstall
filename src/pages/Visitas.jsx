import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, Filter, Calendar as CalendarIcon, FileText, CheckCircle, Trash2, MessageSquare,
    User, Users, ArrowLeft, Car, Clock, Globe, Phone, Download, Printer, X, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PremiumSelect from '../components/PremiumSelect';
import PremiumDatePicker from '../components/PremiumDatePicker';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import NewVisitModal from '../components/NewVisitModal';
import { supabase } from '../lib/supabase';
import { toLocalISOString, getCleanPhone } from '../lib/utils';
import { useLoja } from '../context/LojaContext';

const PIPELINE_STATUSES = [
    { id: 'Agendado', label: 'Agendado', color: 'blue' },
    { id: 'Negociação', label: 'Em Negociação', color: 'purple' },
    { id: 'Aguardando Aprovação', label: 'Aprovação', color: 'orange' },
    { id: 'Vendido', label: 'Vendido', color: 'green' },
    { id: 'Perdido', label: 'Perdido', color: 'red' },
    { id: 'Stand-by', label: 'Stand-by', color: 'gray' }
];

const TEMPERATURAS = [
    { value: 'Quente', label: '🔥 Quente' },
    { value: 'Morno', label: '☕ Morno' },
    { value: 'Frio', label: '🧊 Frio' }
];

const FORMAS_PAGAMENTO = [
    { value: 'À Vista', label: 'À Vista' },
    { value: 'Financiamento', label: 'Financiamento' },
    { value: 'Troca + Troco', label: 'Troca + Troco' },
    { value: 'Consórcio', label: 'Consórcio' },
    { value: 'Cartão', label: 'Cartão de Crédito' }
];

const Visitas = ({ user }) => {
    const { currentLoja } = useLoja();
    const [visitas, setVisitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'form', 'detail'
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [overdueVisits, setOverdueVisits] = useState([]);
    const [dueTodayVisits, setDueTodayVisits] = useState([]);

    // FIX: Get user from prop OR localStorage 'vexcore_user'. Default to placeholder if neither exists.
    const currentUser = user || JSON.parse(localStorage.getItem('vexcore_user') || '{"username":"VEX","role":"vendedor"}');

    // Data Lists
    const [portais, setPortais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [usuarios, setUsuarios] = useState([]); // List of system users

    useEffect(() => {
        const handleClickOutside = () => setActiveStatusDropdown(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);
    useEffect(() => {
        loadData();

        // IPC Listener for Realtime Refreshes
        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, table) => {
            if (table === 'visitas' || table === 'vendedores' || table === 'portais') {
                console.log(`[Visitas] Refreshing due to ${table} change...`);
                loadData();
            }
        };
        ipcRenderer.on('refresh-data', handleRefresh);

        return () => {
            ipcRenderer.removeListener('refresh-data', handleRefresh);
        };
    }, [currentUser.username, currentLoja?.id]); // Reload if username or store changes

    const [processedItems, setProcessedItems] = useState([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');

            const localVisitas = await ipcRenderer.invoke('get-visitas-secure', {
                role: currentUser.role,
                username: currentUser.username,
                lojaId: currentLoja?.id || 'irw-motors-main'
            });

            // Grouping by Month
            const items = [];
            let lastMonth = '';

            (localVisitas || []).forEach(v => {
                const date = new Date(v.data_agendamento || v.datahora);
                const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

                if (monthLabel !== lastMonth) {
                    items.push({ type: 'header', label: monthLabel });
                    lastMonth = monthLabel;
                }
                items.push({ type: 'visit', ...v });
            });

            console.log('🔍 [Visitas] Carregando dados para:', {
                role: currentUser.role,
                username: currentUser.username,
                lojaId: currentLoja?.id || 'irw-motors-main'
            });

            console.log('📦 [Visitas] Dados brutos recebidos:', localVisitas);

            setVisitas(localVisitas || []);
            setProcessedItems(items);

            // Dashboard Intelligence Synchronization (Pending Alerts)
            const now = new Date();
            const todayISO = now.toISOString().split('T')[0];
            const pendingList = (localVisitas || []).filter(v => (v.status_pipeline || v.status || '').toLowerCase() === 'pendente');

            const overdue = [];
            const dueToday = [];

            pendingList.forEach(v => {
                const taskDateStr = v.data_agendamento || v.data_recontato || v.datahora;
                if (!taskDateStr) return;

                const taskDate = new Date(taskDateStr);
                const isOverdue = taskDate < now;
                const isToday = taskDate.toISOString().split('T')[0] === todayISO;

                if (isOverdue && !isToday) overdue.push(v);
                else if (isToday) dueToday.push(v);
            });

            setOverdueVisits(overdue);
            setDueTodayVisits(dueToday);

            // Listas Auxiliares (Carregamento Paralelo)
            const storeId = currentLoja?.id || 'irw-motors-main';
            const [localPortais, localVendedores, localEstoque, localSdrs] = await Promise.all([
                ipcRenderer.invoke('get-list', { table: 'portais', lojaId: storeId }),
                ipcRenderer.invoke('get-list', { table: 'vendedores', lojaId: storeId }),
                ipcRenderer.invoke('get-list', { table: 'estoque', lojaId: storeId }),
                ipcRenderer.invoke('get-list-users', storeId)
            ]);

            setPortais((localPortais || []).filter(i => i.ativo));
            setVendedores((localVendedores || []).filter(i => i.ativo));
            setEstoque((localEstoque || []).filter(i => i.ativo));
            setUsuarios(localSdrs || []);

        } catch (err) {
            console.error('Falha ao carregar dados locais:', err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to safely format currency
    const formatCurrency = (value) => {
        if (!value) return 'R$ 0,00';
        try {
            // Remove 'R$', dots, and convert comma to dot if string
            let num = value;
            if (typeof value === 'string') {
                const cleanStr = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
                num = parseFloat(cleanStr);
            }
            if (isNaN(num)) return 'R$ 0,00';
            return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        } catch (e) {
            return 'R$ 0,00';
        }
    };

    const StatusBadge = ({ status, temperatura }) => {
        const getStyles = () => {
            switch (status) {
                case 'Vendido': return 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10 hover:bg-green-500/20';
                case 'Perdido': return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10 hover:bg-red-500/20';
                case 'Negociação': return 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10 hover:bg-amber-500/20';
                case 'Agendado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/10 hover:bg-blue-500/20';
                default: return 'bg-slate-700/30 text-slate-400 border-white/5 hover:bg-slate-700/50';
            }
        };

        const getTempIcon = () => {
            if (temperatura === 'Quente') return '🔥';
            if (temperatura === 'Morno') return '☕';
            if (temperatura === 'Frio') return '🧊';
            return '';
        };

        return (
            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${getStyles()}`}>
                {getTempIcon() && <span className="text-xs">{getTempIcon()}</span>}
                {status}
            </span>
        );
    };

    // Custom renderer for vehicle options (Rich Cards)
    const renderVehicleOption = (option) => {
        const v = option.data;
        if (!v) return <span className="text-sm">{option.label}</span>;

        // Parse photos if string
        let photoUrl = '';
        try {
            const fotos = typeof v.fotos === 'string' ? JSON.parse(v.fotos) : v.fotos;
            if (Array.isArray(fotos) && fotos.length > 0) photoUrl = fotos[0];
            else if (v.foto) photoUrl = v.foto;
        } catch (e) { photoUrl = v.foto || ''; }

        return (
            <div className="flex items-center gap-3 w-full group">
                {/* Photo Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 relative">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <Car size={16} />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold text-white truncate group-hover:text-amber-500 transition-colors">
                        {v.nome}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-black tracking-wider text-gray-400 uppercase">
                        {v.ano && <span>{v.ano}</span>}
                        {v.km && v.km !== 'Consulte' && (
                            <>
                                <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                <span>{v.km}</span>
                            </>
                        )}
                        {v.cambio && v.cambio !== 'Consulte' && (
                            <>
                                <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                <span className={v.cambio === 'Automático' ? 'text-blue-400' : 'text-orange-400'}>
                                    {v.cambio}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Price Badge */}
                {v.valor && v.valor !== 'Consulte' && (
                    <div className="text-xs font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
                        {v.valor}
                    </div>
                )}
            </div>
        );
    };

    const handleNewVisit = () => {
        setIsVisitModalOpen(true);
    };

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });

    const handleDeleteClick = (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const handleConfirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('delete-visita', { id: confirmModal.id, lojaId: currentLoja?.id });
            setConfirmModal({ isOpen: false, id: null });
            loadData();
        } catch (err) {
            setAlertModal({
                isOpen: true,
                title: 'ERRO AO EXCLUIR',
                message: err.message || "Não foi possível remover o registro."
            });
        }
    };

    const VisitRow = useCallback(({ index, style, data }) => {
        const item = data[index];

        if (item.type === 'header') {
            return (
                <div style={style} className="px-8 flex items-center">
                    <div className="flex items-center gap-4 w-full">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                        <span className="text-[11px] font-black tracking-[0.3em] text-cyan-400 bg-cyan-400/5 px-4 py-1.5 rounded-full border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                            {item.label}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                    </div>
                </div>
            );
        }

        const v = item;
        const sPipe = (v.status_pipeline || '').toLowerCase();

        // Lógica refinada: Somente estados FINAIS são "apagados"
        const isClosed = sPipe.includes('vendido') || sPipe.includes('perdido') || sPipe.includes('finalizado') || sPipe.includes('concluíd') || sPipe.includes('cancelado');

        return (
            <div style={style} className="px-2">
                <div
                    className={`flex items-center group transition-all duration-300 border-b border-white/5 py-2 h-[88px] relative cursor-pointer ${isClosed ? 'opacity-50 grayscale-[0.3]' : 'hover:bg-cyan-500/[0.03] hover:border-cyan-500/20'}`}
                    onClick={() => {
                        setSelectedVisit(v);
                        setIsVisitModalOpen(true);
                    }}
                    style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                >
                    {/* Hover Glow Edge */}
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_cyan]" />

                    <div className="w-[120px] px-6">
                        <div className="flex flex-col">
                            <span className="text-white font-bold tracking-tight text-xl leading-none">
                                {new Date(v.data_agendamento || v.datahora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span className="text-xs text-cyan-500/60 font-bold tracking-wider mt-1 uppercase">
                                {new Date(v.data_agendamento || v.datahora).toLocaleTimeString().slice(0, 5)} HS
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 px-4 min-w-0">
                        <div className="flex flex-col gap-0.5">
                            <span className={`text-white font-bold text-lg leading-tight group-hover:text-cyan-400 transition-colors tracking-tight truncate ${isClosed ? 'line-through decoration-gray-500 decoration-2' : ''}`}>
                                {v.cliente}
                            </span>
                            <div className="flex items-center gap-3">
                                {v.telefone && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const cleanNum = getCleanPhone(v.telefone);
                                            window.open(`https://wa.me/55${cleanNum}`, '_blank');
                                        }}
                                        className="flex items-center gap-1.5 text-gray-500 hover:text-green-400 text-[11px] font-bold transition-all"
                                    >
                                        <Phone size={10} strokeWidth={2.5} />
                                        {v.telefone}
                                    </button>
                                )}
                                <span className="text-[10px] font-black text-cyan-500/40 uppercase tracking-[0.1em]">
                                    {v.portal ? v.portal.toUpperCase() : 'LOJA'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="w-[200px] px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-cyan-300 font-bold text-sm tracking-wider truncate drop-shadow-sm ${isClosed ? 'line-through decoration-cyan-500/30' : ''}`}>
                                    {v.veiculo_interesse || 'S/ Veículo'}
                                </span>
                                {v.veiculo_troca && (
                                    <span className={`text-[10px] text-orange-400 font-bold truncate uppercase tracking-wider ${isClosed ? 'line-through opacity-50' : ''}`}>
                                        Troca: {v.veiculo_troca}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="w-[150px] px-4">
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-xs truncate">
                                {(() => {
                                    const usuario = usuarios.find(u => u.username?.toLowerCase() === v.vendedor_sdr?.toLowerCase());
                                    return usuario ? usuario.nome_completo : v.vendedor_sdr?.toUpperCase() || 'S/ SDR';
                                })()}
                            </span>
                            <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase truncate">
                                Vendedor: {v.vendedor || 'Pendente'}
                            </span>
                        </div>
                    </div>
                    <div className="w-[120px] px-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-green-400 font-black text-sm">
                                {v.valor_proposta ? Number(v.valor_proposta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                {v.forma_pagamento || 'S/ Forma'}
                            </span>
                        </div>
                    </div>
                    <div className="w-[180px] px-4 flex items-center justify-center gap-2 group/status">
                        {/* Seletor Rápido */}
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 opacity-0 group-hover/status:opacity-100 transition-all scale-90 translate-x-2 group-hover/status:translate-x-0">
                            {[
                                { id: 'Agendado', icon: <CalendarIcon size={12} />, color: 'text-blue-400', hover: 'hover:bg-blue-500/20' },
                                { id: 'Negociação', icon: <MessageSquare size={12} />, color: 'text-cyan-400', hover: 'hover:bg-cyan-500/20' },
                                { id: 'Vendido', icon: <CheckCircle size={12} />, color: 'text-green-400', hover: 'hover:bg-green-500/20' },
                                { id: 'Finalizado', icon: <X size={12} />, color: 'text-gray-400', hover: 'hover:bg-gray-500/20' }
                            ].map(st => (
                                <button
                                    key={st.id}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const { ipcRenderer } = window.require('electron');
                                        await ipcRenderer.invoke('update-visita-status', {
                                            id: v.id,
                                            status: st.id === 'Agendado' ? 'Pendente' : st.id,
                                            pipeline: st.id
                                        });
                                    }}
                                    className={`p-1.5 rounded-lg transition-all ${st.hover} ${v.status_pipeline === st.id ? 'bg-white/10 ' + st.color : 'text-gray-600'}`}
                                    title={st.id}
                                >
                                    {st.icon}
                                </button>
                            ))}
                        </div>

                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border shadow-lg whitespace-nowrap ${v.status_pipeline === 'Vendido' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5' :
                            v.status_pipeline === 'Perdido' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' :
                                v.status_pipeline === 'Negociação' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-cyan-500/5' :
                                    v.status_pipeline === 'Finalizado' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-gray-500/5' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                            }`}>
                            {v.temperatura === 'Quente' ? '🔥 ' : v.temperatura === 'Morno' ? '☕ ' : v.temperatura === 'Frio' ? '🧊 ' : ''}
                            {(v.status_pipeline || v.status || '').toUpperCase()}
                        </span>
                    </div>
                    <div className="w-[100px] px-4 text-center">
                        <div className="flex justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(v.id); }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all hover:scale-110">
                                <Trash2 size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [usuarios, currentLoja]);

    return (
        <div className="h-full flex flex-col overflow-hidden w-full relative">
            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 px-2 overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'list' && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl min-h-0 relative"
                        >
                            {/* Background Tech Details */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

                            {/* Page Header */}
                            <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-white/[0.01] backdrop-blur-sm z-10">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl border border-white/10 shadow-lg shadow-cyan-500/10">
                                            <CalendarIcon className="text-cyan-400" size={28} />
                                        </div>
                                        Controle de Visitas
                                    </h1>
                                    <p className="text-xs text-cyan-500/50 font-bold tracking-[0.2em] mt-2 uppercase ml-16">Gestão de Agenda & Pipeline Inteligente</p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(34, 211, 238, 0.5)", filter: "brightness(1.2)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleNewVisit}
                                    className="btn-cyber-primary text-sm flex items-center gap-2 group"
                                >
                                    <div className="bg-black/20 p-1 rounded-lg group-hover:bg-black/40 transition-colors">
                                        <Plus size={16} strokeWidth={3} />
                                    </div>
                                    <span className="font-bold tracking-wide">NOVO AGENDAMENTO</span>
                                </motion.button>
                            </div>

                            {/* Pendency Alert Banner - SYNCED WITH HOMESDR */}
                            {(overdueVisits.length > 0 || dueTodayVisits.length > 0) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className={`mx-8 mt-4 p-4 border rounded-2xl flex items-center justify-between group overflow-hidden relative ${overdueVisits.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}
                                >
                                    <div className={`absolute inset-0 ${overdueVisits.length > 0 ? 'bg-red-500/5' : 'bg-amber-500/5'} animate-pulse`} />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${overdueVisits.length > 0 ? 'bg-red-500/20 text-red-500 shadow-red-500/30' : 'bg-amber-500/20 text-amber-500 shadow-amber-500/30'}`}>
                                            <Phone className="animate-bounce" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-sm tracking-tight uppercase">
                                                {overdueVisits.length > 0 ? 'ALERTAS CRÍTICOS: PENDÊNCIAS VENCIDAS' : 'PENDÊNCIAS PARA HOJE'}
                                            </h4>
                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${overdueVisits.length > 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                                {overdueVisits.length > 0
                                                    ? `Existem ${overdueVisits.length} clientes aguardando retorno que já passaram do prazo.`
                                                    : `Você tem ${dueTodayVisits.length} clientes para retornar hoje.`}
                                            </p>
                                        </div>
                                    </div>
                                    {overdueVisits.length > 0 && (
                                        <div className="relative z-10 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-500/50">
                                            URGENTE
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Table Header - Using CSS Grid for alignment */}
                            {/* Table Header - Excel Like (Corrected Order) */}
                            <div className="grid grid-cols-[100px_3fr_120px_140px_120px_180px] gap-4 px-6 py-3 bg-black/40 border-b border-white/5 text-[11px] font-black tracking-widest text-cyan-500/60 uppercase z-10 sticky top-0 backdrop-blur-md">
                                <div className="pl-6">Data/Hora</div>
                                <div>Veículo de Interesse</div>
                                <div className="text-center">Valor</div>
                                <div className="text-center">SDR Resp.</div>
                                <div className="text-center">Vendedor</div>
                                <div className="text-center">Status</div>
                            </div>

                            {/* Standard List Container */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar z-10 p-2 space-y-1">
                                {processedItems.length > 0 ? (
                                    processedItems.map((item, index) => {
                                        if (item.type === 'header') {
                                            return (
                                                <div key={index} className="sticky top-0 z-20 pt-4 pb-2 bg-gradient-to-b from-[#0f172a] to-transparent pointer-events-none">
                                                    <div className="flex items-center gap-4 px-4">
                                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
                                                        <span className="text-[9px] font-black tracking-widest text-cyan-400/60 bg-[#0f172a] px-4 py-1 rounded-full border border-cyan-500/10 uppercase drop-shadow-md">
                                                            {item.label}
                                                        </span>
                                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const v = item;
                                        const status = v.status_pipeline || v.status;
                                        const sPipe = (status || '').toLowerCase();

                                        // Lógica refinada: Vendido/Concluído é SUCESSO e deve brilhar
                                        const isSold = sPipe.includes('vendido') || sPipe.includes('concluíd') || sPipe.includes('compr');
                                        const isNegotiation = sPipe.includes('negocia');
                                        const isPending = sPipe.includes('pendente') || sPipe.includes('agendado');
                                        const isClosed = !isSold && !isNegotiation && !isPending && (sPipe.includes('perdido') || sPipe.includes('finalizado') || sPipe.includes('cancelado') || sPipe.includes('encerrar'));

                                        const ledColor = isSold ? 'bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse' :
                                            isNegotiation ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' :
                                                isPending ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse' :
                                                    'bg-gray-600';

                                        return (
                                            <div
                                                key={index}
                                                onClick={() => { setSelectedVisit(v); setIsVisitModalOpen(true); }}
                                                className="group relative cursor-pointer"
                                            >
                                                <div className={`grid grid-cols-[100px_3fr_120px_140px_120px_180px] gap-4 items-center px-6 py-3 rounded-xl border transition-all duration-300 relative 
                                                ${isClosed ? 'border-transparent opacity-50 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' :
                                                        isSold ? 'bg-green-500/[0.05] border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)] hover:bg-green-500/10 hover:border-green-500/40' :
                                                            isNegotiation ? 'bg-cyan-500/[0.05] border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:bg-cyan-500/10 hover:border-cyan-500/40' :
                                                                isPending ? 'bg-red-500/[0.05] border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)] hover:bg-red-500/10 hover:border-red-500/40' :
                                                                    'border-transparent hover:border-cyan-500/20 hover:bg-white/[0.02]'}`}>

                                                    {/* Status LED Indicator */}
                                                    <div className={`absolute left-2 w-1 h-8 rounded-full ${ledColor} transition-all duration-500`} />

                                                    {/* Data/Hora */}
                                                    <div className="flex flex-col pl-6">
                                                        <span className="text-white font-bold text-sm">
                                                            {new Date(v.data_agendamento || v.datahora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                        <span className="text-xs text-cyan-500/50 font-medium">
                                                            {new Date(v.data_agendamento || v.datahora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Veículo & Cliente */}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`font-bold text-[13px] leading-tight truncate transition-colors uppercase 
                                                        ${isClosed ? 'text-cyan-100 line-through decoration-white/30' :
                                                                isSold ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                                                                    isNegotiation ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]' :
                                                                        isPending ? 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                                                            'text-cyan-100 group-hover:text-cyan-400'}`}>
                                                            {v.veiculo_interesse || '—'}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-xs font-semibold truncate uppercase 
                                                            ${isClosed ? 'text-gray-400 line-through decoration-gray-600' :
                                                                    isSold ? 'text-green-500/80' :
                                                                        isNegotiation ? 'text-cyan-500/80' :
                                                                            isPending ? 'text-red-500/80' :
                                                                                'text-gray-400'}`}>
                                                                {v.cliente}
                                                            </span>
                                                            {v.portal && (
                                                                <>
                                                                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                                                                        {v.portal}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Valor */}
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="text-[15px] font-black text-emerald-400 tabular-nums tracking-tight">
                                                            {formatCurrency(v.valor_proposta)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide truncate max-w-full">
                                                            {v.forma_pagamento || '—'}
                                                        </span>
                                                    </div>

                                                    {/* SDR */}
                                                    <div className="flex items-center justify-center gap-2">
                                                        {(() => {
                                                            const usuario = usuarios.find(u => u.username?.toLowerCase() === v.vendedor_sdr?.toLowerCase());
                                                            const fullName = usuario?.nome_completo;

                                                            let displayName = '—';
                                                            if (fullName) {
                                                                displayName = fullName;
                                                            } else if (v.vendedor_sdr) {
                                                                let name = v.vendedor_sdr;
                                                                if (name.includes('@')) name = name.split('@')[0];
                                                                name = name.replace(/[^a-zA-Z\s]/g, ' ').trim().split(' ')[0];
                                                                displayName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
                                                            }

                                                            const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';

                                                            return (
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20 shadow-indigo-500/5 flex-shrink-0">
                                                                        {initial}
                                                                    </div>
                                                                    <span className="text-sm font-bold text-gray-300 truncate uppercase">
                                                                        {displayName}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Vendedor */}
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-white font-bold text-sm truncate uppercase tracking-tight">
                                                            {v.vendedor || 'Pendente'}
                                                        </span>
                                                    </div>

                                                    {/* Status Dropdown */}
                                                    <div className="flex items-center justify-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveStatusDropdown(activeStatusDropdown === v.id ? null : v.id);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border shadow-lg uppercase w-full text-center transition-all hover:scale-105 active:scale-95 ${status === 'Vendido' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5' :
                                                                status === 'Perdido' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' :
                                                                    status === 'Negociação' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-cyan-500/5' :
                                                                        status === 'Finalizado' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-gray-500/5' :
                                                                            'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                                                                }`}
                                                        >
                                                            {status || 'PENDENTE'}
                                                        </button>

                                                        <AnimatePresence>
                                                            {activeStatusDropdown === v.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                    className="absolute bottom-full mb-2 z-50 min-w-[160px] bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-3xl"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="p-1 gap-1 flex flex-col">
                                                                        {[
                                                                            { id: 'Agendado', icon: <CalendarIcon size={14} />, color: 'text-blue-400', hover: 'hover:bg-blue-500/10', label: 'Agendar' },
                                                                            { id: 'Negociação', icon: <MessageSquare size={14} />, color: 'text-cyan-400', hover: 'hover:bg-cyan-500/10', label: 'Negociar' },
                                                                            { id: 'Vendido', icon: <CheckCircle size={14} />, color: 'text-green-400', hover: 'hover:bg-green-500/10', label: 'Vendido' },
                                                                            { id: 'Perdido', icon: <X size={14} />, color: 'text-red-400', hover: 'hover:bg-red-500/10', label: 'Perdido' },
                                                                            { id: 'Finalizado', icon: <Archive size={14} />, color: 'text-gray-400', hover: 'hover:bg-gray-500/10', label: 'Arquivar' },
                                                                            { id: 'DELETAR', icon: <Trash2 size={14} />, color: 'text-red-500', hover: 'hover:bg-red-500/10', label: 'Excluir' }
                                                                        ].map(st => (
                                                                            <button
                                                                                key={st.id}
                                                                                onClick={async (e) => {
                                                                                    setActiveStatusDropdown(null);
                                                                                    if (st.id === 'DELETAR') {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteClick(v.id);
                                                                                        return;
                                                                                    }
                                                                                    const { ipcRenderer } = window.require('electron');
                                                                                    await ipcRenderer.invoke('update-visita-status', {
                                                                                        id: v.id,
                                                                                        status: st.id === 'Agendado' ? 'Pendente' : st.id,
                                                                                        pipeline: st.id
                                                                                    });
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${st.color} ${st.hover} text-left`}
                                                                            >
                                                                                {st.icon}
                                                                                {st.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30 min-h-[400px]">
                                        <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)] relative">
                                            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-20" />
                                            <CalendarIcon size={40} className="text-cyan-400" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-white tracking-wide">AGENDA LIMPA</h3>
                                            <p className="text-[11px] font-medium text-cyan-200 tracking-widest uppercase">Nenhuma visita registrada no sistema</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals e Componentes de Overlay */}
            <NewVisitModal
                isOpen={isVisitModalOpen}
                editingTask={selectedVisit}
                onClose={() => {
                    setIsVisitModalOpen(false);
                    setSelectedVisit(null);
                    loadData();
                }}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Excluir Agendamento"
                message="Tem certeza que deseja remover este agendamento permanentemente? Esta ação não pode ser desfeita."
                confirmText="Sim, excluir"
                cancelText="Cancelar"
                isDestructive={true}
            />

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
            />
        </div>
    );
};

export default Visitas;
