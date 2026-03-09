import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar as CalendarIcon, FileText, Plus, Check, Edit2, Trash2 } from 'lucide-react';
import VisitListItem from '../CRM/VisitListItem';
import { electronAPI } from '@/lib/electron-api';

const SDRTaskView = ({
    activeTab,
    setActiveTab,
    stats,
    getDateLabel,
    overdueRecontacts,
    filterMode,
    setFilterMode,
    loading,
    dailyTasks,
    dailyNotes,
    formatCurrency,
    estoque,
    usuarios,
    loadData,
    performanceMode,
    handleDeleteClick,
    handleWhatsAppClick,
    getUserDisplayName,
    isSameDate,
    selectedDate,
    tomorrowDate,
    isViewingTomorrow,
    setSelectedVisit,
    setIsVisitModalOpen,
    setActiveStatusDropdown,
    activeStatusDropdown,
    setEditingNote,
    setIsNoteModalOpen,
    setModalDate,
    setIsSelectionOpen,
    setEditingTask,
    currentLoja
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0 border-r border-white/[0.05]">
            {/* Day nav + view toggle */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.05] shrink-0 bg-[#0d1526]/50">
                <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
                    {[
                        { label: 'Hoje', action: () => { setModalDate(new Date()); setFilterMode('all'); }, active: isSameDate(selectedDate, new Date()) && filterMode === 'all', count: stats.today, color: 'cyan' },
                        { label: 'Amanhã', action: () => { setModalDate(tomorrowDate); setFilterMode('all'); }, active: isViewingTomorrow && filterMode === 'all', count: stats.tomorrow, color: 'cyan' },
                        { label: 'Recontatos', action: () => setFilterMode('pending'), active: filterMode === 'pending', count: stats.pending, color: 'red' },
                    ].map(tab => (
                        <button key={tab.label} onClick={tab.action}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5
                                ${tab.active
                                    ? tab.color === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}>
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded min-w-[18px] text-center leading-none
                                    ${tab.active ? tab.color === 'red' ? 'bg-red-500/40 text-white' : 'bg-white/30 text-white'
                                        : tab.color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-300'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">{getDateLabel()}</span>
                    <div className="flex bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
                        <button onClick={() => setActiveTab('agendamentos')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'agendamentos' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-600 hover:text-white'}`}>
                            Lista
                        </button>
                        <button onClick={() => setActiveTab('notas')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'notas' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-600 hover:text-white'}`}>
                            Notas
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-2.5">
                {overdueRecontacts.length > 0 && filterMode !== 'pending' && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20 mb-1">
                        <AlertCircle size={14} className="text-red-400 shrink-0" />
                        <p className="text-[11px] font-bold text-red-300 flex-1">
                            {overdueRecontacts.length} recontato(s) vencido(s) — priorize agora!
                        </p>
                        <button onClick={() => setFilterMode('pending')} className="text-[10px] font-black text-red-400 hover:text-white uppercase tracking-wider shrink-0">
                            Ver →
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {activeTab === 'agendamentos' ? (
                        <motion.div key="agendamentos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                            {loading ? (
                                <div className="py-16 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                </div>
                            ) : dailyTasks.length > 0 ? dailyTasks.map((task, i) => {
                                const statusRaw = task.status_pipeline || task.status || 'Pendente';
                                const STATUS_MAP = { 'Pendente': 'Novos Leads', 'pendente': 'Novos Leads' };
                                const status = STATUS_MAP[statusRaw] || statusRaw;
                                const isClosed = ['Perdido', 'Cancelado', 'Ganho', 'Venda Concluída'].includes(status);
                                const dateObj = task.data_agendamento ? new Date(task.data_agendamento) : (task.datahora ? new Date(task.datahora) : null);
                                const dateStr = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--';
                                const timeStr = dateObj ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                                return (
                                    <VisitListItem
                                        key={task.id || i}
                                        v={task}
                                        estoque={estoque}
                                        index={i}
                                        status={status}
                                        dateStr={dateStr}
                                        timeStr={timeStr}
                                        isClosed={isClosed}
                                        getCleanVehicleName={(n) => (n || '').split(' #')[0].trim()}
                                        setSelectedVisit={setSelectedVisit}
                                        setIsVisitModalOpen={setIsVisitModalOpen}
                                        setActiveStatusDropdown={setActiveStatusDropdown}
                                        activeStatusDropdown={activeStatusDropdown}
                                        loadData={loadData}
                                        usuarios={usuarios}
                                        handleDeleteClick={handleDeleteClick}
                                    />
                                );
                            }) : (
                                <div className="py-16 flex flex-col items-center justify-center opacity-30 gap-3">
                                    <CalendarIcon size={36} className="text-slate-500" />
                                    <p className="text-[11px] font-bold tracking-widest uppercase text-center text-slate-500">Sem agendamentos</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="notas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                            {dailyNotes.length > 0 ? dailyNotes.map((note, i) => (
                                <motion.div key={note.id || i} layout
                                    className={`group relative flex gap-3 p-4 rounded-xl border transition-all
                                        ${note.concluido ? 'bg-emerald-500/[0.04] border-emerald-500/10 opacity-60' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'}`}>
                                    <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${note.concluido ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                    <button onClick={() => { electronAPI.toggleNota({ id: note.id, concluido: !note.concluido, lojaId: currentLoja?.id }); }}
                                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-lg border flex items-center justify-center transition-all
                                            ${note.concluido ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20 hover:border-purple-400 bg-black/20'}`}>
                                        {note.concluido ? <Check size={11} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${note.concluido ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                            {note.texto}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{getUserDisplayName(note.sdr_username)}</span>
                                            <span className="text-[10px] text-slate-700">{new Date(note.data_nota).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingNote(note); setIsNoteModalOpen(true); }}
                                            className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-all"><Edit2 size={13} /></button>
                                        <button onClick={() => { if (window.confirm('Excluir esta nota?')) electronAPI.deleteNota({ id: note.id, lojaId: currentLoja?.id }); }}
                                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={13} /></button>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="py-16 flex flex-col items-center justify-center opacity-30 gap-3">
                                    <FileText size={36} className="text-slate-500" />
                                    <p className="text-[11px] font-bold tracking-widest uppercase text-center text-slate-500">Sem notas para este dia</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <button onClick={() => { setModalDate(selectedDate); setEditingTask(null); setEditingNote(null); setIsSelectionOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 mt-1 rounded-xl border border-dashed border-white/[0.08] text-slate-600 hover:bg-cyan-500/[0.04] hover:border-cyan-500/25 hover:text-cyan-500 transition-all group">
                    <Plus size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold tracking-widest uppercase text-[11px]">Criar Novo</span>
                </button>
            </div>
        </div>
    );
};

export default SDRTaskView;
