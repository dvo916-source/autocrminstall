import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Search, Filter, Calendar as CalendarIcon, FileText, CheckCircle, Trash2, MessageSquare,
    User, Users, ArrowLeft, Car, Clock, Globe, Phone, Download, Printer, X, Archive, Store,
    ChevronLeft, ChevronRight, AlertCircle, ChevronDown, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PremiumSelect from '../components/PremiumSelect';
import PremiumDatePicker from '../components/PremiumDatePicker';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import NewVisitModal from '../components/NewVisitModal';
// import { supabase } from '../lib/supabase'; // Unused, using IPC
import { toLocalISOString, getCleanPhone } from '../lib/utils';
import { useLoja } from '../context/LojaContext';
import { useUI } from '../context/UIContext';
import PendingAlert from '../components/Visitas/PendingAlert';
import MonthNavigator from '../components/Visitas/MonthNavigator';
import VisitListItem from '../components/Visitas/VisitListItem';
import ReportModal from '../components/ReportModal';

const getCleanVehicleName = (name) => {
    if (!name) return '';
    // Remove códigos como #924956 e limpa espaços extras
    let cleaned = name.replace(/#\d+/g, '').trim();
    // Separa por espaços, remove vazios e deleta palavras duplicadas consecutivas
    const words = cleaned.split(' ').filter(word => word.length > 0);
    const uniqueWords = words.filter((word, i) => i === 0 || word.toLowerCase() !== words[i - 1].toLowerCase());
    return uniqueWords.join(' ');
};

const PIPELINE_STATUSES = [
    { id: 'Novos Leads', label: 'Novos Leads', color: 'cyan', bg: 'bg-cyan-400', glow: 'shadow-cyan-400/40 border-cyan-400/20' },
    { id: 'Primeiro Contato', label: 'Primeiro Contato', color: 'blue', bg: 'bg-blue-400', glow: 'shadow-blue-400/40 border-blue-400/20' },
    { id: 'Em Negociação', label: 'Em Negociação', color: 'amber', bg: 'bg-amber-400', glow: 'shadow-amber-400/40 border-amber-400/20' },
    { id: 'Agendado', label: 'Agendado', color: 'orange', bg: 'bg-orange-400', glow: 'shadow-orange-400/40 border-orange-400/20' },
    { id: 'Recontato', label: 'Recontato', color: 'purple', bg: 'bg-purple-400', glow: 'shadow-purple-400/40 border-purple-400/20' },
    { id: 'Ganho', label: 'Ganho', color: 'green', bg: 'bg-green-400', glow: 'shadow-green-400/40 border-green-400/20' },
    { id: 'Perdido', label: 'Perdido', color: 'red', bg: 'bg-red-400', glow: 'shadow-red-400/40 border-red-400/20' },
    { id: 'Cancelado', label: 'Cancelado', color: 'gray', bg: 'bg-gray-400', glow: 'shadow-gray-400/40 border-gray-400/20' }
];

// Abas especiais que não são status de pipeline mas filtros inteligentes
const SMART_TABS = [
    { id: 'Visitou a Loja', label: 'Visitou a Loja', color: 'text-indigo-400', activeColor: 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]', icon: '🏢' },
    { id: 'Não Compareceu', label: 'Agendou e Não Veio', color: 'text-rose-400', activeColor: 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]', icon: '⚠️' },
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
    const { performanceMode } = useUI();
    const [visitas, setVisitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('TODOS');
    const [overdueVisits, setOverdueVisits] = useState([]);
    const [dueTodayVisits, setDueTodayVisits] = useState([]);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('desc');

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // Filtros de Período Multi-Seleção (Sincronizado com CRM)
    const [periodFilter, setPeriodFilter] = useState(() => {
        const saved = localStorage.getItem('crm_period_filter');
        return saved ? JSON.parse(saved) : ['current_month'];
    });
    const [availableMonths, setAvailableMonths] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = React.useRef(null);

    const currentUser = user || JSON.parse(localStorage.getItem('vexcore_user') || '{"username":"VEX","role":"vendedor"}');

    const [portais, setPortais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);
    const [activeSdrDropdown, setActiveSdrDropdown] = useState(null);

    useEffect(() => {
        const handleClickOutside = () => {
            setActiveStatusDropdown(null);
            setActiveSdrDropdown(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);



    useEffect(() => {
        loadData();
        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, table) => {
            if (table === 'vendedores' || table === 'portais') {
                loadData();
            }
        };
        const handleRealtimeUpdate = (event, { table, data, type }) => {
            if (table === 'visitas' && data) {
                setVisitas(prev => {
                    if (type === 'DELETE') {
                        return prev.filter(v => v.id !== data.id);
                    } else if (type === 'INSERT' || type === 'UPDATE') {
                        const idx = prev.findIndex(v => v.id === data.id);
                        if (idx >= 0) {
                            const newArr = [...prev];
                            newArr[idx] = { ...prev[idx], ...data };
                            return newArr;
                        } else {
                            return [data, ...prev];
                        }
                    }
                    return prev;
                });
            }
        };

        ipcRenderer.on('refresh-data', handleRefresh);
        ipcRenderer.on('realtime-update', handleRealtimeUpdate);

        return () => {
            ipcRenderer.removeListener('refresh-data', handleRefresh);
            ipcRenderer.removeListener('realtime-update', handleRealtimeUpdate);
        };
    }, [currentUser.username, currentLoja?.id]);

    useEffect(() => {
        // Gerar meses a partir de Janeiro de 2026
        const generateMonths = () => {
            const monthsMap = new Map();
            const startDate = new Date(2026, 0, 1);
            const now = new Date();
            let tempDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const futureLimit = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            while (tempDate <= futureLimit) {
                const id = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`;
                const label = tempDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                monthsMap.set(id, label);
                tempDate.setMonth(tempDate.getMonth() + 1);
            }

            visitas.forEach(v => {
                const d = new Date(v.data_agendamento || v.datahora);
                if (d && !isNaN(d.getTime()) && d.getFullYear() >= 2026) {
                    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (id !== currentId && !monthsMap.has(id)) {
                        const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        monthsMap.set(id, label);
                    }
                }
            });

            const sortedMonths = Array.from(monthsMap.entries())
                .map(([id, label]) => ({ id, label }))
                .sort((a, b) => b.id.localeCompare(a.id));

            setAvailableMonths(sortedMonths);
        };

        generateMonths();

        // Fechar dropdown ao clicar fora
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [visitas]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');

            const localVisitas = await ipcRenderer.invoke('get-visitas-secure', {
                role: currentUser.role,
                username: currentUser.username,
                lojaId: currentLoja?.id || 'irw-motors-main'
            });


            setVisitas(localVisitas || []);

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
            console.error("Erro ao obter visitas locais: ", err);
        } finally {
            setLoading(false);
        }
    };

    // ── CONTAGENS POR STATUS (filtradas só por período, nunca por aba) ──────────
    const tabCounts = useMemo(() => {
        const now = new Date();
        const counts = { TODOS: 0 };

        visitas.forEach(v => {
            let statusRaw = v.status_pipeline || v.status || '';
            if (statusRaw === 'Pendente') statusRaw = 'Novos Leads';
            if (statusRaw === 'Em Contato') statusRaw = 'Primeiro Contato';
            if (statusRaw === 'Em Negócio') statusRaw = 'Em Negociação';
            if (statusRaw === 'Agendados') statusRaw = 'Agendado';
            if (statusRaw === 'Recontatos') statusRaw = 'Recontato';
            const s = statusRaw.toLowerCase();

            // Filtragem só por período
            const isAll = periodFilter.includes('all');
            let matchesPeriod = isAll;
            if (!isAll) {
                const date = new Date(v.data_agendamento || v.datahora);
                const leadYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (periodFilter.includes('current_month')) {
                    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (leadYearMonth === currentYearMonth) matchesPeriod = true;
                    else if (!['ganho', 'perdido', 'cancelado', 'vendido', 'finalizado'].includes(s)) matchesPeriod = true;
                }
                if (!matchesPeriod && periodFilter.includes(leadYearMonth)) matchesPeriod = true;
            }
            if (!matchesPeriod) return;

            // Filtragem por Busca
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const cliente = (v.cliente || '').toLowerCase();
                const veiculo = (v.veiculo_interesse || v.veiculo_nome || v.veiculo || v.modelo || '').toLowerCase();
                const placa = (v.placa || '').toLowerCase();
                const telefone = (v.telefone || '').toLowerCase();
                if (!cliente.includes(term) && !veiculo.includes(term) && !placa.includes(term) && !telefone.includes(term)) {
                    return;
                }
            }

            // Incrementa contagem
            counts['TODOS'] = (counts['TODOS'] || 0) + 1;
            counts[statusRaw] = (counts[statusRaw] || 0) + 1;
        });

        return counts;
    }, [visitas, periodFilter]);

    // PROCESSAMENTO FRONTEND DOS LEADS DE VISITA
    const processedItems = useMemo(() => {
        localStorage.setItem('crm_period_filter', JSON.stringify(periodFilter));

        const now = new Date();
        const todayISO = now.toISOString().split('T')[0];

        const items = [];
        const overdue = [];
        const dueToday = [];

        visitas.forEach(v => {
            // Normalização de Status Legado
            let statusRaw = v.status_pipeline || v.status || '';
            if (statusRaw === 'Pendente') statusRaw = 'Novos Leads';
            if (statusRaw === 'Em Contato') statusRaw = 'Primeiro Contato';
            if (statusRaw === 'Em Negócio') statusRaw = 'Em Negociação';
            if (statusRaw === 'Agendados') statusRaw = 'Agendado';
            if (statusRaw === 'Recontatos') statusRaw = 'Recontato';
            const s = statusRaw.toLowerCase();

            // Lógica PENDING
            if (s === 'novos leads') {
                const taskDateStr = v.data_agendamento || v.data_recontato || v.datahora;
                if (taskDateStr) {
                    const taskDate = new Date(taskDateStr);
                    const isOverdue = taskDate < now;
                    const isToday = taskDate.toISOString().split('T')[0] === todayISO;
                    if (isOverdue && !isToday) overdue.push(v);
                    else if (isToday) dueToday.push(v);
                }
            }

            // Filtragem por Aba
            if (activeTab === 'Visitou a Loja') {
                if (v.visitou_loja != 1) return;
            } else if (activeTab === 'Não Compareceu') {
                if (v.nao_compareceu != 1) return;
            } else if (activeTab !== 'TODOS' && activeTab.toLowerCase() !== s) {
                return;
            }

            // Filtragem por Período
            const isAll = periodFilter.includes('all');

            let matchesPeriod = isAll;
            if (!isAll) {
                const date = new Date(v.data_agendamento || v.datahora);
                const leadYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (periodFilter.includes('current_month')) {
                    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (leadYearMonth === currentYearMonth) {
                        matchesPeriod = true;
                    } else if (!['ganho', 'perdido', 'cancelado', 'vendido', 'finalizado'].includes(s)) {
                        matchesPeriod = true;
                    }
                }

                if (!matchesPeriod && periodFilter.includes(leadYearMonth)) {
                    matchesPeriod = true;
                }
            }

            if (!matchesPeriod) return;

            // Filtragem por Busca
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const cliente = (v.cliente || '').toLowerCase();
                const veiculo = (v.veiculo_interesse || v.veiculo_nome || v.veiculo || v.modelo || '').toLowerCase();
                const placa = (v.placa || '').toLowerCase();
                const telefone = (v.telefone || '').toLowerCase();
                if (!cliente.includes(term) && !veiculo.includes(term) && !placa.includes(term) && !telefone.includes(term)) {
                    return;
                }
            }

            items.push({
                type: 'visit',
                ...v,
                status_pipeline: statusRaw
            });
        });

        // Ordenação
        items.sort((a, b) => {
            let valA, valB;
            if (sortField === 'date') {
                valA = new Date(a.data_agendamento || a.datahora || 0).getTime();
                valB = new Date(b.data_agendamento || b.datahora || 0).getTime();
            } else if (sortField === 'name') {
                valA = (a.cliente || '').toLowerCase();
                valB = (b.cliente || '').toLowerCase();
                return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sortField === 'status') {
                valA = (a.status_pipeline || '').toLowerCase();
                valB = (b.status_pipeline || '').toLowerCase();
                return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDir === 'asc' ? valA - valB : valB - valA;
        });

        return items;
    }, [visitas, activeTab, periodFilter, searchTerm, sortField, sortDir]);

    useEffect(() => {
        const now = new Date();
        const todayISO = now.toISOString().split('T')[0];
        const overdue = [];
        const dueToday = [];

        visitas.forEach(v => {
            let statusRaw = v.status_pipeline || v.status || '';
            if (statusRaw === 'Pendente') statusRaw = 'Novos Leads';
            if (statusRaw.toLowerCase() === 'novos leads') {
                const taskDateStr = v.data_agendamento || v.data_recontato || v.datahora;
                if (taskDateStr) {
                    const taskDate = new Date(taskDateStr);
                    const isOverdue = taskDate < now;
                    const isToday = taskDate.toISOString().split('T')[0] === todayISO;
                    if (isOverdue && !isToday) overdue.push(v);
                    else if (isToday) dueToday.push(v);
                }
            }
        });
        setOverdueVisits(overdue);
        setDueTodayVisits(dueToday);
    }, [visitas]);


    const togglePeriodFilter = (id) => {
        setPeriodFilter(prev => {
            if (id === 'all') return ['all'];
            let next = prev.filter(p => p !== 'all');
            if (next.includes(id)) {
                const filtered = next.filter(p => p !== id);
                return filtered.length === 0 ? ['current_month'] : filtered;
            }
            return [...next, id];
        });
    };

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0,00';
        try {
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

    const exportCSV = () => {
        const headers = ['Data', 'Cliente', 'Telefone', 'Veículo', 'Status', 'Vendedor SDR', 'Vendedor Pátio', 'Forma Pagamento', 'Valor', 'Observações'];
        const rows = processedItems.map(v => [
            v.data_agendamento ? new Date(v.data_agendamento).toLocaleDateString('pt-BR') : '',
            v.cliente || '',
            v.telefone || '',
            (v.veiculo_interesse || v.veiculo || '').replace(/,/g, ' '),
            v.status_pipeline || v.status || '',
            v.vendedor_sdr || '',
            v.vendedor || '',
            v.forma_pagamento || '',
            v.valor_veiculo || '',
            (v.negociacao || '').replace(/,/g, ' ').replace(/\n/g, ' ')
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `visitas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const StatusBadge = ({ status, temperatura }) => {
        const getStyles = () => {
            switch (status) {
                case 'Ganho': return 'bg-green-500/10 text-green-400 border-green-500/20';
                case 'Perdido': return 'bg-red-500/10 text-red-400 border-red-500/20';
                case 'Em Contato': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                case 'Agendados': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                case 'Novos Leads': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                case 'Visitou a Loja': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                case 'Recontatos': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                default: return 'bg-slate-700/30 text-slate-400 border-white/5';
            }
        };
        const getTempIcon = () => {
            if (temperatura === 'Quente') return '🔥';
            if (temperatura === 'Morno') return '☕';
            if (temperatura === 'Frio') return '🧊';
            return '';
        };
        return (
            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border uppercase flex items-center gap-1.5 ${getStyles()}`}>
                {getTempIcon() && <span className="text-xs">{getTempIcon()}</span>}
                {status}
            </span>
        );
    };

    const renderVehicleOption = (option) => {
        const v = option.data;
        if (!v) return <span className="text-sm">{option.label}</span>;
        let photoUrl = '';
        try {
            const fotos = typeof v.fotos === 'string' ? JSON.parse(v.fotos) : v.fotos;
            if (Array.isArray(fotos) && fotos.length > 0) photoUrl = fotos[0];
            else if (v.foto) photoUrl = v.foto;
        } catch (e) { photoUrl = v.foto || ''; }

        return (
            <div className="flex items-center gap-3 w-full group">
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <Car size={16} />
                        </div>
                    )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold text-white truncate">{v.nome}</span>
                    <div className="flex items-center gap-2 text-[11px] font-black tracking-wider text-gray-400 uppercase">
                        {v.ano && <span>{v.ano}</span>}
                        {v.km && v.km !== 'Consulte' && (<><span className="w-1 h-1 bg-gray-700 rounded-full" /><span>{v.km}</span></>)}
                    </div>
                </div>
                {v.valor && v.valor !== 'Consulte' && (
                    <div className="text-xs font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">{v.valor}</div>
                )}
            </div>
        );
    };

    const handleNewVisit = () => setIsVisitModalOpen(true);

    const handleAtender = async (e, v) => {
        e.stopPropagation();
        try {
            const { ipcRenderer } = window.require('electron');
            const cleanPhone = getCleanPhone(v.telefone);

            // 1. Abre WhatsApp
            if (cleanPhone) {
                window.open(`https://wa.me/55${cleanPhone}`, '_blank');
            }

            // 2. Evolui status para 'Em Contato' (primeiro contato feito, aguardando resposta)
            const now = new Date().toLocaleString('pt-BR');
            const newHistory = `[AUTO: PRIMEIRO CONTATO INICIADO EM ${now}]\n\n${v.negociacao || ''}`;

            await ipcRenderer.invoke('update-visita-full', {
                ...v,
                status_pipeline: 'Em Contato',
                negociacao: newHistory.trim(),
                historico_log: newHistory.trim()
            });

            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: "⚡ Contato iniciado! Lead movido para Em Contato.", type: 'success' }
            }));
        } catch (err) {
            console.error('Erro ao iniciar atendimento:', err);
        }
    };

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });

    const handleDeleteClick = (id) => setConfirmModal({ isOpen: true, id });

    const handleConfirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('delete-visita', { id: confirmModal.id, lojaId: currentLoja?.id });
            setConfirmModal({ isOpen: false, id: null });
            loadData();
        } catch (err) {
            setAlertModal({ isOpen: true, title: 'ERRO AO EXCLUIR', message: err.message || 'Não foi possível remover o registro.' });
        }
    };

    const getPortalStyles = (portal) => {
        const p = (portal || '').toUpperCase();
        if (p.includes('OLX')) return { bg: 'bg-[#f77e21]/10', border: 'border-[#f77e21]/20', text: 'text-[#f77e21]', icon: 'olx' };
        if (p.includes('INSTAGRAM')) return { bg: 'bg-[#e1306c]/10', border: 'border-[#e1306c]/20', text: 'text-[#e1306c]', icon: 'instagram' };
        if (p.includes('FACEBOOK')) return { bg: 'bg-[#1877f2]/10', border: 'border-[#1877f2]/20', text: 'text-[#1877f2]', icon: 'facebook' };
        if (p.includes('SITE')) return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'site' };
        if (p.includes('INDICA')) return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: 'indicacao' };
        return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', icon: 'loja' };
    };

    return (
        <div className="h-full flex flex-col overflow-hidden w-full relative">
            <div className="flex-1 flex flex-col min-h-0 px-2 overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'list' && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex-1 flex flex-col bg-[#0d1526] border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl min-h-0 relative"
                        >
                            {/* Subtle top glow */}
                            <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-cyan-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

                            {/* ── HEADER ─────────────────────────────────────────── */}
                            <div className="px-6 pt-9 pb-8 border-b border-white/[0.05] z-50 relative bg-[#0d1526]">
                                {/* Linha 1: título + ações */}
                                <div className="flex items-center justify-between mb-4 gap-6">
                                    <div className="flex items-center gap-3 shrink-0">
                                        <h1 className="text-xl font-bold text-white tracking-tight">Lista de Visitas</h1>
                                        {/* Filtro de período - ao lado do título */}
                                        <div className="relative" ref={filterRef}>
                                            <button
                                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                                className="flex items-center gap-2 bg-[#111827] px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all h-[30px]"
                                            >
                                                <CalendarIcon size={12} className="text-cyan-400" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                                    {periodFilter.includes('all')
                                                        ? 'Vida Toda'
                                                        : periodFilter.length === 1 && periodFilter[0] === 'current_month'
                                                            ? 'Mês Atual'
                                                            : periodFilter.length === 1
                                                                ? (availableMonths.find(m => m.id === periodFilter[0])?.label || 'Mês Atual')
                                                                : `${String(periodFilter.length).padStart(2, '0')} meses`}
                                                </span>
                                                <ChevronDown size={11} className={`text-slate-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isFilterOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                                        className="absolute top-[calc(100%+6px)] left-0 w-[210px] bg-[#0b101e] border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[1000] overflow-hidden p-1.5"
                                                    >
                                                        <div className="max-h-[280px] overflow-y-auto no-scrollbar space-y-0.5">
                                                            <button
                                                                onClick={() => togglePeriodFilter('current_month')}
                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                                                                    ${periodFilter.includes('current_month') ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                Mês Atual
                                                                {periodFilter.includes('current_month') && <Check size={12} />}
                                                            </button>
                                                            <div className="h-px bg-white/5 my-1" />
                                                            {availableMonths.map(m => {
                                                                const isSel = periodFilter.includes(m.id);
                                                                return (
                                                                    <button key={m.id}
                                                                        onClick={() => togglePeriodFilter(m.id)}
                                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                                                                            ${isSel ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                                                                    >
                                                                        {m.label}
                                                                        {isSel && <Check size={12} />}
                                                                    </button>
                                                                );
                                                            })}
                                                            <div className="h-px bg-white/5 my-1" />
                                                            <button
                                                                onClick={() => togglePeriodFilter('all')}
                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all italic
                                                                    ${periodFilter.includes('all') ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                Vida Toda (2026+)
                                                                {periodFilter.includes('all') && <Check size={12} />}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* ── BARRA DE PESQUISA CENTRAL ────────────────── */}
                                    <div className="flex-1 max-w-[500px] relative group/search">
                                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Busque por nome, veículo, placa ou telefone..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#111827] border border-white/[0.07] rounded-xl pl-10 pr-10 py-2 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 transition-all"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <motion.button
                                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                            onClick={() => setIsReportOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 hover:text-white transition-all text-[13px] font-semibold"
                                        >
                                            <FileText size={13} className="text-amber-400" />
                                            Relatório PDF
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                            onClick={handleNewVisit}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 transition-all text-[13px] font-semibold"
                                        >
                                            <Plus size={13} />
                                            Novo Agendamento
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Linha 2: tabs + período */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Pipeline tabs + smart tabs num único container */}
                                    <div className="flex items-center gap-1 bg-[#111827] p-0.5 rounded-lg border border-white/[0.05] flex-wrap">
                                        {['TODOS', ...PIPELINE_STATUSES.map(s => s.id)].map(tab => {
                                            const count = tabCounts[tab] || 0;
                                            return (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5
                                                        ${activeTab === tab
                                                            ? 'bg-[#0d1f35] text-white border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
                                                        }`}
                                                >
                                                    {tab}
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center leading-none tabular-nums
                                                        ${activeTab === tab
                                                            ? 'bg-cyan-500 text-white'
                                                            : count > 0
                                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20'
                                                                : 'bg-white/[0.04] text-slate-600'
                                                        }`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        <div className="w-px h-5 bg-white/[0.07] mx-0.5" />
                                        {SMART_TABS.map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1
                                                    ${activeTab === tab.id
                                                        ? tab.activeColor
                                                        : `${tab.color} hover:bg-white/[0.04]`
                                                    }`}
                                            >
                                                <span className="text-[11px]">{tab.icon}</span>
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pending alert banner */}
                            <PendingAlert
                                overdueCount={overdueVisits.length}
                                todayCount={dueTodayVisits.length}
                                performanceMode={performanceMode}
                            />

                            {/* List */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar z-10 px-3 py-2">
                                {processedItems.length > 0 ? (
                                    processedItems.map((item, index) => {
                                        if (item.type === 'header') return null;
                                        const v = item;
                                        const status = v.status_pipeline || v.status;
                                        const sPipe = (status || '').toLowerCase();
                                        const isClosed = sPipe.includes('perdido') || sPipe.includes('cancelado') || sPipe.includes('finalizado');

                                        const visitDate = v.data_agendamento || v.datahora;
                                        const dateStr = visitDate
                                            ? new Date(visitDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                            : '—';
                                        const timeStr = visitDate
                                            ? new Date(visitDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                            : '';

                                        const sdrUser = usuarios.find(u => u.username?.toLowerCase() === v.vendedor_sdr?.toLowerCase());
                                        const sdrName = sdrUser?.nome_completo || v.vendedor_sdr || null;
                                        const sdrInitial = sdrName ? sdrName.charAt(0).toUpperCase() : null;

                                        const patioUser = vendedores.find(u => u.nome?.toLowerCase() === v.vendedor?.toLowerCase());
                                        const patioName = patioUser?.nome || v.vendedor || null;
                                        const patioInitial = patioName ? patioName.charAt(0).toUpperCase() : null;

                                        const tempIcon = v.temperatura === 'Quente' ? '🔥'
                                            : v.temperatura === 'Morno' ? '☕'
                                                : v.temperatura === 'Frio' ? '🧊'
                                                    : null;

                                        // Calc dias sem contato
                                        const lastContact = v.updated_at || v.data_agendamento || v.datahora;
                                        const daysSinceContact = lastContact
                                            ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000)
                                            : null;

                                        return (
                                            <VisitListItem
                                                key={v.id || index}
                                                v={v}
                                                index={index}
                                                status={status}
                                                dateStr={dateStr}
                                                timeStr={timeStr}
                                                sdrInitial={sdrInitial}
                                                sdrName={sdrName}
                                                patioInitial={patioInitial}
                                                patioName={patioName}
                                                tempIcon={tempIcon}
                                                isClosed={isClosed}
                                                daysSinceContact={daysSinceContact}
                                                formatCurrency={formatCurrency}
                                                getCleanVehicleName={getCleanVehicleName}
                                                handleAtender={handleAtender}
                                                setSelectedVisit={setSelectedVisit}
                                                setIsVisitModalOpen={setIsVisitModalOpen}
                                                setActiveStatusDropdown={setActiveStatusDropdown}
                                                activeStatusDropdown={activeStatusDropdown}
                                                activeSdrDropdown={activeSdrDropdown}
                                                setActiveSdrDropdown={setActiveSdrDropdown}
                                                handleDeleteClick={handleDeleteClick}
                                                loadData={loadData}
                                                usuarios={usuarios}
                                                performanceMode={performanceMode}
                                                currentUser={currentUser}
                                                totalCount={visitas.length}
                                                estoque={estoque}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 min-h-[300px] opacity-40">
                                        <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/15">
                                            <CalendarIcon size={28} className="text-cyan-400" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-sm font-semibold text-white mb-1">Nenhuma visita encontrada</h3>
                                            <p className="text-[11px] text-slate-500">Tente ajustar os filtros ou adicione um novo agendamento</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                visitas={visitas}
                availableMonths={availableMonths}
                lojaName={currentLoja?.nome || 'IRW Motors'}
                usuarios={usuarios}
                estoque={estoque}
            />

            <NewVisitModal
                isOpen={isVisitModalOpen}
                editingTask={selectedVisit}
                onClose={() => {
                    setIsVisitModalOpen(false);
                    setSelectedVisit(null);
                    loadData();
                }}
                onSuccess={loadData}
                portais={portais}
                vendedores={vendedores}
                estoque={estoque}
                usuarios={usuarios}
                currentUser={user}
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
