// src/pages/CRM.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, FileText,
    LayoutGrid, List as ListIcon, Calendar as CalendarIcon,
    Check, ChevronDown, Zap, X, Target
} from 'lucide-react';
import {
    DndContext, closestCorners, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects,
    useDroppable
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { useUI } from '../context/UIContext';
import { useLoja } from '../context/LojaContext';
import { useLeads } from '../context/LeadsContext';
import NewVisitModal from '../components/NewVisitModal';
import ReportModal from '../components/ReportModal';
import VisitListItem from '../components/CRM/VisitListItem';
import PendingAlert from '../components/CRM/PendingAlert';
import KanbanCard from '../components/CRM/KanbanCard';
import LostLeadModal from '../components/CRM/LostLeadModal';
import { electronAPI } from '@/lib/electron-api';

export const PIPELINE_STATUSES = [
    { id: 'Novos Leads', label: 'Novos Leads', color: 'border-cyan-500/50', glow: 'shadow-cyan-500/40', bg: 'bg-cyan-500' },
    { id: 'Primeiro Contato', label: 'Primeiro Contato', color: 'border-blue-500/50', glow: 'shadow-blue-500/40', bg: 'bg-blue-500' },
    { id: 'Em Negociação', label: 'Em Negociação', color: 'border-amber-500/50', glow: 'shadow-amber-500/40', bg: 'bg-amber-500' },
    { id: 'Agendado', label: 'Agendado', color: 'border-orange-500/50', glow: 'shadow-orange-500/40', bg: 'bg-orange-500' },
    { id: 'Recontato', label: 'Recontato', color: 'border-purple-500/50', glow: 'shadow-purple-500/40', bg: 'bg-purple-500' },
    { id: 'Ganho', label: 'Ganho', color: 'border-green-500/50', glow: 'shadow-green-500/40', bg: 'bg-green-500' },
    { id: 'Perdido', label: 'Perdido', color: 'border-red-500/50', glow: 'shadow-red-500/40', bg: 'bg-red-500' },
    { id: 'Cancelado', label: 'Cancelado', color: 'border-gray-500/50', glow: 'shadow-gray-500/40', bg: 'bg-gray-500' },
];

export default function CRM({ user }) {
    const { performanceMode } = useUI();
    const { currentLoja } = useLoja();
    const { filteredLeads, estoque, overdueRecontacts, dueTodayRecontacts, periodFilter, setPeriodFilter, refreshData } = useLeads();

    const [usuarios, setUsuarios] = useState([]);
    useEffect(() => {
        if (!currentLoja?.id) return;
        const fetch = async () => {
            try {
                const res = await electronAPI.getListUsers(currentLoja.id);
                setUsuarios(res || []);
            } catch (e) { }
        };
        fetch();
    }, [currentLoja?.id]);

    const [viewMode, setViewMode] = useState(() => localStorage.getItem('crm-view-mode') || 'kanban');
    const setViewModePersisted = (mode) => { setViewMode(mode); localStorage.setItem('crm-view-mode', mode); };
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('TODOS');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [lostLeadModal, setLostLeadModal] = useState({ open: false, lead: null, targetStatus: null });
    const filterRef = useRef(null);
    const statusRef = useRef(null);

    useEffect(() => { if (viewMode === 'kanban') setActiveTab('TODOS'); }, [viewMode]);

    useEffect(() => {
        const handler = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false);
            if (statusRef.current && !statusRef.current.contains(e.target)) setIsStatusMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const availableMonths = useMemo(() => {
        const map = new Map();
        const now = new Date();
        const limit = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Busca a data mais antiga dos leads carregados para não hardcodar o ano
        let oldest = new Date(now.getFullYear(), now.getMonth() - 6, 1); // fallback: 6 meses atrás
        if (filteredLeads && filteredLeads.length > 0) {
            const dates = filteredLeads
                .map(l => new Date(l.created_at || l.datahora || now))
                .filter(d => !isNaN(d.getTime()));
            if (dates.length > 0) {
                const min = new Date(Math.min(...dates));
                oldest = new Date(min.getFullYear(), min.getMonth(), 1);
            }
        }

        let d = new Date(oldest);
        while (d <= limit) {
            const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            map.set(id, d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
            d.setMonth(d.getMonth() + 1);
        }
        return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => b.id.localeCompare(a.id));
    }, [filteredLeads]);

    const togglePeriodFilter = (id) => {
        setPeriodFilter(prev => {
            if (id === 'all') return ['all'];
            let next = prev.filter(p => p !== 'all');
            if (next.includes(id)) {
                const f = next.filter(p => p !== id);
                return f.length === 0 ? ['current_month'] : f;
            }
            return [...next, id];
        });
        setIsFilterOpen(false);
    };

    const displayLeads = useMemo(() => filteredLeads.filter(lead => {
        if (viewMode === 'list' && activeTab !== 'TODOS') {
            if ((lead.status_pipeline || '').toLowerCase() !== activeTab.toLowerCase()) return false;
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const hay = `${lead.cliente || ''} ${lead.veiculo_interesse || ''} ${lead.telefone || ''} ${lead.placa || ''}`.toLowerCase();
            if (!hay.includes(term)) return false;
        }
        return true;
    }), [filteredLeads, activeTab, searchTerm, viewMode]);

    const tabCounts = useMemo(() => {
        const c = { TODOS: filteredLeads.length };
        filteredLeads.forEach(v => { const s = v.status_pipeline || ''; c[s] = (c[s] || 0) + 1; });
        return c;
    }, [filteredLeads]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleUpdateLeadStatus = async (leadId, newStatus, motivo = null, detalhes = null) => {
        try {
            const lead = filteredLeads.find(l => l.id === leadId);
            if (!lead) return;

            if (newStatus === 'Perdido' && !motivo) {
                setLostLeadModal({ open: true, lead, targetStatus: newStatus });
                return;
            }

            console.log('📝 [CRM.jsx] handleUpdateLeadStatus Payload:', {
                id: leadId,
                status: newStatus,
                motivo_perda: motivo,
                detalhes_perda: detalhes
            });

            await electronAPI.updateVisitaStatus({
                id: leadId,
                status: newStatus,
                pipeline: newStatus,
                motivo_perda: motivo,
                detalhes_perda: detalhes
            });
            refreshData();

            if (newStatus === 'Perdido') {
                window.dispatchEvent(new CustomEvent('show-notification', {
                    detail: { message: 'Lead arquivado como perdido.', type: 'info' }
                }));
            }
        } catch (err) { console.error(err); }
    };

    const handleConfirmLost = async (motivo, detalhes) => {
        const { lead, targetStatus } = lostLeadModal;
        console.log('✅ [CRM.jsx] handleConfirmLost Modal confirmed:', { motivo, detalhes, leadId: lead?.id });
        await handleUpdateLeadStatus(lead.id, targetStatus, motivo, detalhes);
        setLostLeadModal({ open: false, lead: null, targetStatus: null });
    };

    const handleDeleteLead = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este lead permanentemente?')) {
            try {
                await electronAPI.deleteVisita({ id, lojaId: currentLoja?.id });
                refreshData();
                window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Lead excluído!', type: 'success' } }));
            } catch (err) { console.error(err); }
        }
    };

    const handleDragStart = (e) => setActiveId(e.active.id);
    const handleDragEnd = async ({ active, over }) => {
        setActiveId(null);
        if (!over) return;
        let targetStatus = PIPELINE_STATUSES.find(c => c.id === over.id)?.id;
        if (!targetStatus) {
            const overLead = filteredLeads.find(l => l.id === over.id);
            if (overLead) targetStatus = overLead.status_pipeline;
        }
        const currentLead = filteredLeads.find(l => l.id === active.id);
        if (targetStatus && currentLead && currentLead.status_pipeline !== targetStatus) {
            await handleUpdateLeadStatus(active.id, targetStatus);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#0f172a] z-0">

            {/* HEADER */}
            <div className={`px-8 lg:px-12 pt-12 pb-8 border-b border-white/[0.05] z-50 relative bg-[#0a101d] shrink-0 transition-all duration-500
                ${!performanceMode ? 'backdrop-blur-xl bg-[#0a101d]/95 hover:bg-[#0a101d] shadow-[0_12px_50px_rgba(0,0,0,0.7)]' : 'bg-[#0a101d]'}
            `}>
                {/* Subtle Glow Effect below border in non-performance mode */}
                {!performanceMode && <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />}

                <div className="flex flex-col lg:flex-row lg:items-center items-center justify-between gap-10">

                    <div className="flex items-center gap-10 shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="w-2.5 h-12 bg-cyan-500 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.7)]" />
                            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                                Leads <Zap size={28} className="text-cyan-500 hidden sm:block drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                            </h1>
                        </div>
                        <div className={`flex bg-black/40 p-2 rounded-2xl border border-white/10 shadow-inner transition-all flex-row items-center ${!performanceMode ? 'hover:border-cyan-500/20' : ''}`}>
                            <button onClick={() => setViewModePersisted('kanban')} className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,181,212,0.5)]' : 'text-slate-500 hover:text-white'}`}>
                                <LayoutGrid size={18} /> Kanban
                            </button>
                            <button onClick={() => setViewModePersisted('list')} className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,181,212,0.5)]' : 'text-slate-500 hover:text-white'}`}>
                                <ListIcon size={18} /> Lista
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-2xl relative group/search mx-auto lg:mx-0 flex items-center">
                        <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors" />
                        <input type="text" placeholder="Buscar lead, telefone, veículo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full bg-black/30 border border-white/[0.07] rounded-3xl pl-16 pr-14 py-5 text-base text-white outline-none transition-all shadow-inner
                                ${!performanceMode ? 'focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'focus:border-cyan-500/50'}
                            `} />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"><X size={22} /></button>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-6 shrink-0 h-full">
                        <AnimatePresence>
                            {viewMode === 'list' && (
                                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-3 overflow-visible">

                                    {/* Status filter */}
                                    <div className="relative" ref={statusRef}>
                                        <button onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)} className="flex items-center gap-2 bg-[#111827] px-4 py-3 rounded-xl border border-white/[0.07] hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all whitespace-nowrap">
                                            <Filter size={14} className="text-cyan-400" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">Status: <span className="text-white ml-1">{activeTab}</span></span>
                                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {isStatusMenuOpen && (
                                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                                    className="absolute top-[calc(100%+8px)] right-0 w-[240px] bg-[#0b101e] border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[1000] overflow-hidden p-2">
                                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                                        {['TODOS', ...PIPELINE_STATUSES.map(s => s.id)].map(tab => (
                                                            <button key={tab} onClick={() => { setActiveTab(tab); setIsStatusMenuOpen(false); }}
                                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                                                <div className="flex items-center gap-2">{tab}{activeTab === tab && <Check size={14} />}</div>
                                                                <span className={`px-2 py-0.5 rounded-md tabular-nums ${activeTab === tab ? 'bg-black/20 text-black' : 'bg-white/5 text-slate-500'}`}>{tabCounts[tab] || 0}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Period filter */}
                                    <div className="relative hidden sm:block" ref={filterRef}>
                                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 bg-[#111827] px-4 py-3 rounded-xl border border-white/[0.07] hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all whitespace-nowrap">
                                            <CalendarIcon size={14} className="text-cyan-400" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">
                                                {periodFilter.includes('all') ? 'Todos os Leads' : periodFilter.length === 1 && periodFilter[0] === 'current_month' ? 'Mês Atual' : 'Período'}
                                            </span>
                                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {isFilterOpen && (
                                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                                    className="absolute top-[calc(100%+8px)] right-0 w-[220px] bg-[#0b101e] border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[1000] overflow-hidden p-2">
                                                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
                                                        <button onClick={() => togglePeriodFilter('current_month')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${periodFilter.includes('current_month') ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                                            Mês Atual {periodFilter.includes('current_month') && <Check size={14} />}
                                                        </button>
                                                        <div className="h-px bg-white/5 my-2" />
                                                        {availableMonths.map(m => (
                                                            <button key={m.id} onClick={() => togglePeriodFilter(m.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${periodFilter.includes(m.id) ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                                                                {m.label} {periodFilter.includes(m.id) && <Check size={14} />}
                                                            </button>
                                                        ))}
                                                        <div className="h-px bg-white/5 my-2" />
                                                        <button onClick={() => togglePeriodFilter('all')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all italic ${periodFilter.includes('all') ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                                                            Todos os Leads {periodFilter.includes('all') && <Check size={14} />}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setIsReportOpen(true)}
                                        className="hidden md:flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 hover:text-white transition-all text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                                        <FileText size={16} className="text-amber-400" /> PDF
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { setEditingLead(null); setIsVisitModalOpen(true); }}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap
                                ${!performanceMode ? 'shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.4)]' : 'shadow-lg'}
                            `}>
                            <Plus size={18} /> Novo Lead
                        </motion.button>
                    </div>
                </div>

                {(overdueRecontacts.length > 0 || dueTodayRecontacts.length > 0) && (
                    <div className="pt-4 shrink-0">
                        <PendingAlert overdueCount={overdueRecontacts.length} todayCount={dueTodayRecontacts.length} performanceMode={performanceMode} />
                    </div>
                )}
            </div>

            {/* CONTEÚDO */}
            <div className="flex-1 min-h-0 relative w-full bg-[#0d1526]">
                <AnimatePresence mode="wait">

                    {viewMode === 'kanban' && (
                        <motion.div key="kanban" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                            className="absolute inset-0 flex items-stretch overflow-x-auto overflow-y-hidden gap-6 md:gap-10 pb-10 px-8 lg:px-12 pt-8">
                            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                {PIPELINE_STATUSES.map(col => {
                                    const colLeads = displayLeads.filter(l => (l.status_pipeline || '').toLowerCase() === col.id.toLowerCase());
                                    return (
                                        <KanbanColumn key={col.id} col={col} leads={colLeads} totalLeads={displayLeads.length}>
                                            {colLeads.map(lead => (
                                                <KanbanCard key={lead.id} lead={lead} estoque={estoque} usuarios={usuarios}
                                                    onClick={() => { setEditingLead(lead); setIsVisitModalOpen(true); }} />
                                            ))}
                                        </KanbanColumn>
                                    );
                                })}
                                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                                    {activeId ? (
                                        <div className="rotate-2 scale-105 opacity-95 shadow-[0_20px_60px_rgba(6,182,212,0.3)] ring-2 ring-cyan-500/50 rounded-2xl">
                                            <KanbanCard lead={displayLeads.find(l => l.id === activeId)} estoque={estoque} usuarios={usuarios} isDragging />
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </motion.div>
                    )}

                    {viewMode === 'list' && (
                        <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="absolute inset-0 overflow-y-auto custom-scrollbar w-full pb-10 pt-10">
                            <div className="px-8 lg:px-12 space-y-6 max-w-[1800px] mx-auto">
                                {displayLeads.length > 0 ? displayLeads.map((v, index) => {
                                    const isClosed = ['ganho', 'perdido', 'cancelado'].includes((v.status_pipeline || '').toLowerCase());
                                    return (
                                        <VisitListItem key={v.id || index} v={v} index={index}
                                            status={v.status_pipeline} isClosed={isClosed}
                                            dateStr={v.data_agendamento ? new Date(v.data_agendamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                                            timeStr={v.data_agendamento ? new Date(v.data_agendamento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            setSelectedVisit={setEditingLead} setIsVisitModalOpen={setIsVisitModalOpen}
                                            getCleanVehicleName={(name) => name}
                                            activeStatusDropdown={activeStatusDropdown} setActiveStatusDropdown={setActiveStatusDropdown}
                                            usuarios={usuarios} loadData={refreshData}
                                            handleDeleteClick={handleDeleteLead}
                                            handleUpdateStatus={handleUpdateLeadStatus}
                                        />
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[300px] opacity-40">
                                        <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/15">
                                            <Target size={28} className="text-cyan-400" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-sm font-semibold text-white mb-1">Nenhum lead encontrado</h3>
                                            <p className="text-[11px] text-slate-500 uppercase tracking-widest">Altere os filtros ou adicione um novo lead</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} visitas={filteredLeads} availableMonths={availableMonths} lojaName={currentLoja?.nome || 'IRW Motors'} />
            <NewVisitModal isOpen={isVisitModalOpen} editingTask={editingLead} onClose={() => { setIsVisitModalOpen(false); setEditingLead(null); }} onSuccess={refreshData} />

            <LostLeadModal
                lead={lostLeadModal.lead}
                onConfirm={handleConfirmLost}
                onCancel={() => setLostLeadModal({ open: false, lead: null, targetStatus: null })}
            />
        </div>
    );
}

function KanbanColumn({ col, leads, children, totalLeads }) {
    const { setNodeRef } = useDroppable({ id: col.id, data: { type: 'Column', col } });
    const pct = totalLeads > 0 ? Math.round((leads.length / totalLeads) * 100) : 0;
    return (
        <div className="w-[85vw] sm:w-[350px] shrink-0 h-full flex flex-col group/col">
            <div className="mb-4 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${col.bg} shadow-lg animate-pulse`} />
                        <h3 className="text-[12px] font-black text-white uppercase tracking-widest">{col.label}</h3>
                    </div>
                    <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tabular-nums border ${col.color} bg-white/5`}>
                        {leads.length}
                    </div>
                </div>
                <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${col.bg}`}
                        style={{ width: `${pct}%`, opacity: 0.8 }}
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                <SortableContext id={col.id} items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div ref={setNodeRef} className="absolute inset-0 overflow-y-auto custom-scrollbar pb-10 space-y-3 pr-2">
                        {children}
                        {leads.length === 0 && (
                            <div className="h-24 border border-dashed border-white/[0.07] rounded-2xl flex flex-col items-center justify-center gap-2 opacity-40 hover:opacity-60 transition-opacity">
                                <div className={`w-6 h-6 rounded-full border-2 border-dashed ${col.color} flex items-center justify-center`}>
                                    <Plus size={10} className="text-slate-400" />
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Arraste um lead aqui</span>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}
