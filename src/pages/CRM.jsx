import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Settings, TrendingUp, Zap, Filter, UserCheck, ShieldAlert,
    RefreshCw, Database, Mail, Search, ChevronRight, MessageSquare,
    Clock, UserPlus, Target, GripVertical, Check, ChevronDown
} from 'lucide-react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUI } from '../context/UIContext';
import { useLoja } from '../context/LojaContext';
import NewVisitModal from '../components/NewVisitModal';

const CRM = ({ user }) => {
    const { performanceMode } = useUI();
    const { currentLoja } = useLoja();
    const [activeTab, setActiveTab] = useState('kanban');
    const [leads, setLeads] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros de Período Multi-Seleção
    const [periodFilter, setPeriodFilter] = useState(() => {
        const saved = localStorage.getItem('crm_period_filter');
        return saved ? JSON.parse(saved) : ['current_month'];
    });
    const [availableMonths, setAvailableMonths] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Roles permitidas para configurações
    const canManage = ['admin', 'master', 'developer'].includes(user?.role);

    useEffect(() => {
        // Salvar filtro no localStorage sempre que mudar
        if (periodFilter) {
            localStorage.setItem('crm_period_filter', JSON.stringify(periodFilter));
        }
    }, [periodFilter]);

    useEffect(() => {
        // Gerar meses a partir de Janeiro de 2026 + Meses que possuem leads
        const generateMonths = () => {
            const monthsMap = new Map();
            const startDate = new Date(2026, 0, 1); // Jan 2026
            const now = new Date();

            // 1. Adicionar meses do calendário (de Jan 2026 até hoje + 1 mês)
            let tempDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const futureLimit = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            while (tempDate <= futureLimit) {
                const id = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`;
                const label = tempDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                monthsMap.set(id, label);
                tempDate.setMonth(tempDate.getMonth() + 1);
            }

            // 2. Adicionar meses que possuem leads (mesmo que sejam no futuro distante)
            leads.forEach(lead => {
                const d = new Date(lead.data_agendamento || lead.datahora);
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
    }, [leads]);

    const tabs = [
        { id: 'kanban', label: 'Funil de Vendas', icon: Filter },
        { id: 'overview', label: 'Monitor de Leads', icon: TrendingUp },
        ...(canManage ? [{ id: 'config', label: 'Configurações & Fila', icon: Settings }] : []),
    ];

    const columns = [
        { id: 'Novos Leads', title: 'Novos Leads', color: 'border-cyan-500/50', glow: 'shadow-cyan-500/40', bg: 'bg-cyan-500' },
        { id: 'Primeiro Contato', title: 'Primeiro Contato', color: 'border-blue-500/50', glow: 'shadow-blue-500/40', bg: 'bg-blue-500' },
        { id: 'Em Negociação', title: 'Em Negociação', color: 'border-amber-500/50', glow: 'shadow-amber-500/40', bg: 'bg-amber-500' },
        { id: 'Agendado', title: 'Agendado', color: 'border-orange-500/50', glow: 'shadow-orange-500/40', bg: 'bg-orange-500' },
        { id: 'Recontato', title: 'Recontato', color: 'border-purple-500/50', glow: 'shadow-purple-500/40', bg: 'bg-purple-500' },
        { id: 'Ganho', title: 'Ganho', color: 'border-green-500/50', glow: 'shadow-green-500/40', bg: 'bg-green-500' },
        { id: 'Perdido', title: 'Perdido', color: 'border-red-500/50', glow: 'shadow-red-500/40', bg: 'bg-red-500' },
        { id: 'Cancelado', title: 'Cancelado', color: 'border-gray-500/50', glow: 'shadow-gray-500/40', bg: 'bg-gray-500' }
    ];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeId, setActiveId] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentLoja?.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');

            const visitas = await ipcRenderer.invoke('get-visitas-secure', {
                role: user.role,
                username: user.username,
                lojaId: currentLoja?.id
            });
            setLeads(visitas || []);

            if (canManage) {
                const users = await ipcRenderer.invoke('get-list-users', currentLoja?.id);
                const sdrList = (users || []).filter(u => ['sdr', 'vendedor'].includes(u.role));
                setVendedores(sdrList);
            }
        } catch (err) {
            console.error("Erro ao carregar dados do CRM:", err);
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Filtragem e Normalização
    const filteredLeads = leads.map(lead => {
        // Normalização de Status Legado
        let status = lead.status_pipeline || lead.status;
        if (status === 'Pendente') status = 'Novos Leads';
        if (status === 'Em Contato') status = 'Primeiro Contato';
        if (status === 'Em Negócio') status = 'Em Negociação';
        if (status === 'Agendados') status = 'Agendado';
        if (status === 'Recontatos') status = 'Recontato';

        // Detecção de Recontato (Duplicidade)
        const recontatos = leads.filter(l => l.telefone === lead.telefone && l.id !== lead.id);

        return {
            ...lead,
            status_pipeline: status,
            recontatoCount: recontatos.length,
            isRecontato: recontatos.length > 0
        };
    }).filter(lead => {
        if (periodFilter.includes('all')) return true;

        const leadDate = new Date(lead.data_agendamento || lead.datahora);
        const leadYearMonth = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`;

        if (periodFilter.includes('current_month')) {
            const now = new Date();
            const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (leadYearMonth === currentYearMonth) return true;

            // Allow open deals from previous months
            if (!['ganho', 'perdido', 'cancelado', 'vendido', 'finalizado'].includes(lead.status_pipeline?.toLowerCase())) {
                return true;
            }
        }

        return periodFilter.includes(leadYearMonth);
    });

    const handleUpdateLeadStatus = async (leadId, newStatus) => {
        try {
            const { ipcRenderer } = window.require('electron');
            const lead = leads.find(l => l.id === leadId);
            await ipcRenderer.invoke('update-visita-status', { id: leadId, status: newStatus, pipeline: newStatus });

            // Se mover para "Visitou a Loja", marcar a presença física automaticamente
            if (newStatus === 'Visitou a Loja') {
                await ipcRenderer.invoke('update-visita-visitou-loja', {
                    id: leadId,
                    valor: 1,
                    lojaId: lead?.loja_id
                });
            }

            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status_pipeline: newStatus, visitou_loja: newStatus === 'Visitou a Loja' ? 1 : l.visitou_loja } : l));
            loadData();
        } catch (err) {
            console.error("Erro ao atualizar status do lead:", err);
        }
    };

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

    const handleDragStart = (event) => setActiveId(event.active.id);

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const leadId = active.id;
        const overId = over.id;
        const isColumn = columns.some(c => c.id === overId);

        const targetStatus = isColumn ? overId : leads.find(l => l.id === overId)?.status_pipeline;
        const currentLead = leads.find(l => l.id === leadId);

        if (targetStatus && currentLead && currentLead.status_pipeline !== targetStatus) {
            await handleUpdateLeadStatus(leadId, targetStatus);
        }
    };

    const handleToggleFila = async (vendedorId, currentStatus) => {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('update-user-field', {
                userId: vendedorId,
                field: 'em_fila',
                value: !currentStatus
            });
            loadData();
        } catch (err) {
            console.error("Erro ao alternar status da fila:", err);
        }
    };

    const KanbanCard = ({ lead, isDragging }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({ id: lead.id });
        const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSorting ? 0.3 : 1, zIndex: isSorting ? 10 : 1 };

        // Formatar ID com zeros à esquerda
        const formattedId = String(lead.id).padStart(2, '0');

        // Calcular tempo no funil
        const entryDate = new Date(lead.datahora || lead.created_at);
        const daysInFunnel = Math.floor((new Date() - entryDate) / (1000 * 60 * 60 * 24));

        return (
            <div ref={setNodeRef} style={style} {...attributes} className={`group relative ${isDragging ? 'z-[9999]' : ''}`}>
                <motion.div
                    layout
                    whileHover={{ y: -4, borderColor: 'rgba(34, 211, 238, 0.4)' }}
                    onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}
                    className={`bg-[#1e293b]/80 border border-white/5 p-4 rounded-2xl cursor-pointer shadow-xl backdrop-blur-md transition-all mb-3 ${isDragging ? 'border-cyan-500/50 shadow-cyan-500/20 scale-105' : ''}`}
                >
                    {/* Cabeçalho do Card */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div {...listeners} className="p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
                                <GripVertical size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter mb-0.5">#{formattedId}</span>
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-1 rounded-md">{lead.portal || lead.origem || 'Manual'}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {lead.isRecontato && (
                                <div className="bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded text-[8px] font-black text-purple-400 uppercase tracking-wider animate-pulse">
                                    Reincidente ({lead.recontatoCount}x)
                                </div>
                            )}
                            <div className="flex gap-1 text-gray-500">
                                <Clock size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">{new Date(lead.data_agendamento || lead.datahora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <h4 className="text-sm font-black text-white uppercase truncate mb-1 pr-4">{lead.cliente}</h4>
                    <p className="text-[11px] font-bold text-gray-500 truncate mb-3 italic">{lead.veiculo_interesse || lead.veiculo || 'Interesse não definido'}</p>

                    {/* Rodapé do Card */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                <Users size={10} className="text-gray-400" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[80px]">{lead.vendedor_username || lead.vendedor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {lead.temperatura === 'Quente' && <span className="text-xs">🔥</span>}
                            {lead.temperatura === 'Morno' && <span className="text-xs">☕</span>}
                            <ChevronRight size={14} className="text-gray-500" />
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    const KanbanColumn = ({ col, children }) => {
        const itemCount = children.props.items.length;
        return (
            <div className="flex-1 min-w-[300px] flex flex-col group/col">
                <div className={`flex items-center justify-between mb-5 pb-4 border-b-2 ${col.color} transition-all group-hover/col:border-white/20`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.bg} ${col.glow} animate-pulse`} />
                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{col.title}</h3>
                    </div>
                    <div className={`${col.bg} ${col.glow} px-3 py-1 rounded-full flex items-center justify-center min-w-[32px] border border-white/20`}>
                        <span className="text-[11px] font-black text-white tabular-nums">{itemCount}</span>
                    </div>
                </div>
                <SortableContext id={col.id} items={children.props.items} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pt-2 pb-10">
                        <div className="min-h-[200px]">
                            {children}
                            {itemCount === 0 && (
                                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/[0.03] rounded-[2rem] opacity-20 group-hover/col:opacity-40 transition-opacity">
                                    <Database size={24} className="mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vazio</span>
                                </div>
                            )}
                        </div>
                    </div>
                </SortableContext>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pt-9 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter font-rajdhani flex items-center gap-3 leading-none">
                        CRM <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">Inteligente</span>
                        <Zap size={32} className="text-cyan-500/50" />
                    </h1>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 tracking-[0.2em] mt-2 font-rajdhani flex items-center gap-2 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                        Gestão de Fluxo e Distribuição
                    </p>
                </div>

                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-4 bg-[#1e293b]/40 p-3 px-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl hover:bg-white/10 transition-all w-[270px] justify-between group h-16"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-500/40 transition-all overflow-hidden relative">
                                <Clock size={19} className="text-cyan-400" />
                                <div className="absolute inset-0 bg-cyan-500/5 blur-md" />
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1.5 opacity-60 font-rajdhani">Filtro de Período</span>
                                <span className="text-[13px] font-black text-white uppercase tracking-wider block leading-none font-rajdhani truncate max-w-[130px]">
                                    {periodFilter.includes('all') ? 'VIDA TODA' :
                                        periodFilter.length === 1 && periodFilter[0] === 'current_month' ? 'MÊS ATUAL' :
                                            `${periodFilter.length} MESES SELEC.`}
                                </span>
                            </div>
                        </div>
                        <ChevronDown size={19} className={`text-gray-500 transition-transform duration-500 ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                className="absolute top-[calc(100%+8px)] right-0 w-full bg-[#0f172a]/98 border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl z-[1000] overflow-hidden p-3"
                            >
                                <div className="max-h-[400px] overflow-y-auto no-scrollbar py-2 space-y-2">
                                    <button
                                        onClick={() => togglePeriodFilter('current_month')}
                                        className={`w-full flex items-center justify-between p-4 px-6 rounded-3xl transition-all group ${periodFilter.includes('current_month') ? 'bg-cyan-500 text-white shadow-[0_10px_20px_rgba(6,182,212,0.3)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${periodFilter.includes('current_month') ? 'text-white' : 'text-gray-400'}`}>Mês Atual</span>
                                        {periodFilter.includes('current_month') && <Check size={16} className="text-white" />}
                                    </button>

                                    <div className="h-px bg-white/5 my-3 mx-4" />

                                    {availableMonths.map(m => {
                                        const isSelected = periodFilter.includes(m.id);
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => togglePeriodFilter(m.id)}
                                                className={`w-full flex items-center justify-between p-4 px-6 rounded-3xl transition-all group ${isSelected ? 'bg-purple-600 text-white shadow-[0_10px_20px_rgba(147,51,234,0.3)]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-gray-500'}`}>{m.label}</span>
                                                {isSelected && <Check size={16} className="text-white" />}
                                            </button>
                                        );
                                    })}

                                    <div className="h-px bg-white/5 my-3 mx-4" />

                                    <button
                                        onClick={() => togglePeriodFilter('all')}
                                        className={`w-full flex items-center justify-between p-4 px-6 rounded-3xl transition-all group ${periodFilter.includes('all') ? 'bg-amber-500 text-white shadow-[0_10px_20px_rgba(245,158,11,0.3)]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className={`text-[11px] font-black uppercase tracking-widest italic ${periodFilter.includes('all') ? 'text-white' : 'text-gray-500'}`}>Vida Toda (2026+)</span>
                                        {periodFilter.includes('all') && <Check size={16} className="text-white" />}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl border border-white/5 self-start shadow-xl backdrop-blur-xl shrink-0">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 relative ${activeTab === tab.id ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                        <tab.icon size={18} />
                        <span className="text-sm font-black uppercase tracking-widest">{tab.label}</span>
                        {activeTab === tab.id && !performanceMode && <motion.div layoutId="activeTabCrm" className="absolute inset-x-0 bottom-0 h-1 bg-white/20 rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[3rem] p-6 lg:p-8 overflow-hidden relative shadow-2xl flex flex-col">
                <AnimatePresence mode="wait">
                    {activeTab === 'kanban' && (
                        <div className="flex-1 overflow-hidden relative" key="kanban">
                            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                <div className="flex gap-8 h-full overflow-x-auto pb-4 custom-scrollbar px-2">
                                    {columns.map(col => {
                                        const colLeads = filteredLeads.filter(l => {
                                            const s = (l.status_pipeline || l.status || 'Novos Leads').toLowerCase();
                                            const cId = col.id.toLowerCase();
                                            if (cId === 'ganhos' || cId === 'ganho') return s === 'ganho' || s === 'vendido' || s === 'venda concluída';
                                            if (cId === 'perdidos' || cId === 'perdido') return s === 'perdido' || s === 'cancelado';
                                            return s === cId;
                                        });
                                        return (
                                            <KanbanColumn key={col.id} col={col}>
                                                <div items={colLeads}>
                                                    {colLeads.map(lead => <KanbanCard key={lead.id} lead={lead} />)}
                                                </div>
                                            </KanbanColumn>
                                        );
                                    })}
                                </div>
                                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                                    {activeId ? <KanbanCard lead={leads.find(l => l.id === activeId)} isDragging /> : null}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Total de Leads (Período)', value: filteredLeads.length, icon: Mail, color: 'text-cyan-400' },
                                    { label: 'Conversão em Venda', value: '0%', icon: TrendingUp, color: 'text-green-400' },
                                    { label: 'Tempo Médio de Atendimento', value: '--:--', icon: Zap, color: 'text-amber-400' }
                                ].map((s, i) => (
                                    <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:border-white/10 transition-all hover:bg-white/[0.07] group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-2xl bg-white/5 ${s.color}`}><s.icon size={24} /></div>
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">Global</span>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                                        <h3 className="text-3xl font-black text-white italic">{s.value}</h3>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-cyan-400" />
                                    Performance de Conversão
                                </h3>
                                <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-20">
                                    <div className="text-center">
                                        <Database size={48} className="mx-auto mb-4 text-gray-400" />
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Gráficos em Desenvolvimento</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'config' && canManage && (
                        <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 overflow-y-auto no-scrollbar">
                            <div className="max-w-4xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg"><UserCheck size={20} className="text-cyan-400" /></div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Gestão da Fila de Vendedores</h2>
                                </div>
                                <div className="bg-[#0f172a]/50 border border-white/5 rounded-3xl p-8 mb-8">
                                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
                                        <div>
                                            <h4 className="text-sm font-black text-white tracking-widest uppercase mb-1">Motor de Distribuição (Round Robin)</h4>
                                            <p className="text-xs font-medium text-gray-500 italic font-rajdhani">Os leads são atribuídos automaticamente seguindo a ordem da roleta.</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Ativo</span>
                                                <div className="w-10 h-5 bg-cyan-500/20 rounded-full relative cursor-pointer border border-cyan-500/30">
                                                    <div className="absolute right-1 top-1 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-4 mb-2">
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Vendedor</p>
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Status na Fila</p>
                                        </div>
                                        {vendedores.length > 0 ? vendedores.map((vend) => (
                                            <div key={vend.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-white/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black italic uppercase">{vend.username.charAt(0)}</div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white uppercase truncate tracking-tight max-w-[150px]">{vend.nome || vend.username}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_green]" />
                                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Online</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right hidden sm:block">
                                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Leads Hoje</p>
                                                            <span className="text-sm font-black text-white italic">{vend.leads_recebidos_total || 0}</span>
                                                        </div>
                                                        <button onClick={() => handleToggleFila(vend.username, vend.em_fila)} className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vend.em_fila ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>{vend.em_fila ? 'Em Fila' : 'Fora da Fila'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : <p className="text-center text-xs text-gray-600 py-10 uppercase tracking-widest font-black opacity-20 italic">Nenhum vendedor encontrado</p>}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {!performanceMode && <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />}
            </div>

            <NewVisitModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
                editingTask={editingLead}
                onSuccess={() => { loadData(); }}
            />
        </div>
    );
};

export default CRM;
