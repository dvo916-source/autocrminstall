import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Filter, ChevronDown, Check, FileText, Plus } from 'lucide-react';
import { getGreeting, getFirstName } from '../../lib/utils';

const SDRHeader = ({
    user,
    overdueRecontacts,
    dueTodayRecontacts,
    filterMode,
    setFilterMode,
    isAdmin,
    isTeamMenuOpen,
    setIsTeamMenuOpen,
    selectedUserView,
    setSelectedUserView,
    sdrUsers,
    getUserDisplayName,
    setModalDate,
    setEditingNote,
    setEditingTask,
    setIsNoteModalOpen,
    setIsModalOpen
}) => {
    return (
        <div className="px-6 pt-9 pb-6 border-b border-white/[0.05] bg-[#0d1526] shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-white tracking-tight">
                                {getGreeting()},{' '}
                                <span className="text-cyan-400">
                                    {getFirstName(user?.nome_completo || user?.nome || user?.username)}
                                </span>
                            </h1>
                            {overdueRecontacts.length > 0 && (
                                <button onClick={() => setFilterMode('pending')}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    <AlertCircle size={10} />
                                    {overdueRecontacts.length} vencido{overdueRecontacts.length > 1 ? 's' : ''}
                                </button>
                            )}
                            {overdueRecontacts.length === 0 && dueTodayRecontacts.length > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                                    <AlertCircle size={10} />
                                    {dueTodayRecontacts.length} para hoje
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <div className="relative" id="team-selector-container">
                            <button onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[13px] font-semibold
                                    ${isTeamMenuOpen ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' : 'bg-white/[0.04] border-white/[0.07] text-slate-300 hover:text-white hover:bg-white/[0.08]'}`}>
                                <Filter size={13} className={isTeamMenuOpen ? 'text-cyan-400' : 'text-slate-500'} />
                                {selectedUserView === 'ALL' ? 'Toda Equipe' : getUserDisplayName(selectedUserView)}
                                <ChevronDown size={12} className={`text-slate-500 transition-transform ${isTeamMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isTeamMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsTeamMenuOpen(false)} />
                                        <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                            className="absolute right-0 top-full mt-2 w-56 bg-[#0b101e] border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden p-1.5">
                                            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-0.5">
                                                <button onClick={() => { setSelectedUserView('ALL'); setIsTeamMenuOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all
                                                        ${selectedUserView === 'ALL' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                                    Toda Equipe {selectedUserView === 'ALL' && <Check size={12} />}
                                                </button>
                                                <div className="h-px bg-white/5 my-1" />
                                                {sdrUsers.map(u => (
                                                    <button key={u.username} onClick={() => { setSelectedUserView(u.username); setIsTeamMenuOpen(false); }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all
                                                            ${selectedUserView === u.username ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                                        {u.nome_completo || u.username}
                                                        {selectedUserView === u.username && <Check size={12} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    <button onClick={() => { setModalDate(new Date()); setEditingNote(null); setIsNoteModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 hover:text-white transition-all text-[13px] font-semibold">
                        <FileText size={13} className="text-purple-400" />
                        Nova Nota
                    </button>
                    <button onClick={() => { setModalDate(new Date()); setEditingTask(null); setIsModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 transition-all text-[13px] font-semibold">
                        <Plus size={13} />
                        Novo Agendamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SDRHeader;
