import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHomeSDR } from '../hooks/useHomeSDR';

// Components
import SDRHeader from '../components/SDR/SDRHeader';
import SDRStatsGrid from '../components/SDR/SDRStatsGrid';
import SDRSidebar from '../components/SDR/SDRSidebar';
import SDRTaskView from '../components/SDR/SDRTaskView';
import NewVisitModal from '../components/NewVisitModal';
import NewNoteModal from '../components/NewNoteModal';
import { AlertCircle, X, FileText, UserPlus } from 'lucide-react';
import { electronAPI } from '@/lib/electron-api';

const HomeVex = ({ user }) => {
    const {
        selectedDate, setSelectedDate,
        viewDate, setViewDate,
        loading,
        dailyTasks, dailyNotes,
        confirmDelete, setConfirmDelete,
        stats,
        eventDays, pendingDays,
        overdueRecontacts, dueTodayRecontacts,
        filterMode, setFilterMode,
        estoque, usuarios,
        selectedVisit, setSelectedVisit,
        isVisitModalOpen, setIsVisitModalOpen,
        activeStatusDropdown, setActiveStatusDropdown,
        activeTab, setActiveTab,
        isSelectionOpen, setIsSelectionOpen,
        isModalOpen, setIsModalOpen,
        isNoteModalOpen, setIsNoteModalOpen,
        modalDate, setModalDate,
        editingTask, setEditingTask,
        editingNote, setEditingNote,
        isTeamMenuOpen, setIsTeamMenuOpen,
        isAdmin, selectedUserView, setSelectedUserView, sdrUsers,
        loadData, handleDeleteClick, handleWhatsAppClick, isSameDate,
        performanceMode, currentLoja,
        formatCurrency, getUserDisplayName, getDateLabel,
        rankingData, nextTask
    } = useHomeSDR(user);

    const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const isViewingTomorrow = isSameDate(selectedDate, tomorrowDate);

    return (
        <div className="h-full flex flex-col font-inter overflow-hidden">

            <SDRHeader
                user={user}
                overdueRecontacts={overdueRecontacts}
                dueTodayRecontacts={dueTodayRecontacts}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                isAdmin={isAdmin}
                isTeamMenuOpen={isTeamMenuOpen}
                setIsTeamMenuOpen={setIsTeamMenuOpen}
                selectedUserView={selectedUserView}
                setSelectedUserView={setSelectedUserView}
                sdrUsers={sdrUsers}
                getUserDisplayName={getUserDisplayName}
                setModalDate={setModalDate}
                setEditingNote={setEditingNote}
                setEditingTask={setEditingTask}
                setIsNoteModalOpen={setIsNoteModalOpen}
                setIsModalOpen={setIsModalOpen}
            />

            <div className="flex-1 flex min-h-0 overflow-hidden">
                <SDRTaskView
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    stats={stats}
                    getDateLabel={getDateLabel}
                    overdueRecontacts={overdueRecontacts}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                    loading={loading}
                    dailyTasks={dailyTasks}
                    dailyNotes={dailyNotes}
                    formatCurrency={formatCurrency}
                    estoque={estoque}
                    usuarios={usuarios}
                    loadData={loadData}
                    performanceMode={performanceMode}
                    handleDeleteClick={handleDeleteClick}
                    handleWhatsAppClick={handleWhatsAppClick}
                    getUserDisplayName={getUserDisplayName}
                    isSameDate={isSameDate}
                    selectedDate={selectedDate}
                    tomorrowDate={tomorrowDate}
                    isViewingTomorrow={isViewingTomorrow}
                    setSelectedVisit={setSelectedVisit}
                    setIsVisitModalOpen={setIsVisitModalOpen}
                    setActiveStatusDropdown={setActiveStatusDropdown}
                    activeStatusDropdown={activeStatusDropdown}
                    setEditingNote={setEditingNote}
                    setIsNoteModalOpen={setIsNoteModalOpen}
                    setModalDate={setModalDate}
                    setIsSelectionOpen={setIsSelectionOpen}
                    setEditingTask={setEditingTask}
                    currentLoja={currentLoja}
                />

                <div className="w-[272px] shrink-0 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                    <SDRStatsGrid stats={stats} viewDate={viewDate} />
                    <SDRSidebar
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        viewDate={viewDate}
                        setViewDate={setViewDate}
                        eventDays={eventDays}
                        pendingDays={pendingDays}
                        rankingData={rankingData}
                        nextTask={nextTask}
                    />
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {confirmDelete.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setConfirmDelete({ show: false, task: null })}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <div className="flex flex-col items-center text-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                    <AlertCircle size={28} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Confirmar Exclusão</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Excluir agendamento de <span className="text-white font-bold">{confirmDelete.task?.cliente}</span>?
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button onClick={() => setConfirmDelete({ show: false, task: null })}
                                        className="py-3 rounded-xl bg-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                                        Cancelar
                                    </button>
                                    <button onClick={() => { electronAPI.deleteVisita({ id: confirmDelete.task.id, lojaId: currentLoja?.id }).then(() => { loadData(); setConfirmDelete({ show: false, task: null }); }); }}
                                        className="py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all">
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSelectionOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectionOpen(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 relative z-10 w-full max-w-xs text-center shadow-2xl">
                            <button onClick={() => setIsSelectionOpen(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                            <h3 className="text-lg font-black text-white mb-1">O que deseja criar?</h3>
                            <p className="text-slate-500 text-sm mb-6">Dia {modalDate?.getDate()}/{modalDate ? modalDate.getMonth() + 1 : ''}</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setIsSelectionOpen(false); setEditingNote(null); setIsNoteModalOpen(true); }}
                                    className="flex flex-col items-center gap-2.5 p-5 bg-purple-500/10 hover:bg-purple-500 border border-purple-500/30 hover:border-purple-500 rounded-xl group transition-all">
                                    <FileText size={28} className="text-purple-400 group-hover:text-white transition-colors" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-purple-300 group-hover:text-white">Nota</span>
                                </button>
                                <button onClick={() => { setIsSelectionOpen(false); setEditingTask(null); setIsModalOpen(true); }}
                                    className="flex flex-col items-center gap-2.5 p-5 bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/30 hover:border-cyan-500 rounded-xl group transition-all">
                                    <UserPlus size={28} className="text-cyan-400 group-hover:text-black transition-colors" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-cyan-300 group-hover:text-black">Agendar</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <NewVisitModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                onSuccess={() => { loadData(); setIsModalOpen(false); setEditingTask(null); }}
                initialDate={modalDate}
                editingTask={editingTask}
                targetUser={selectedUserView === 'ALL' ? user.username : selectedUserView}
            />
            <NewVisitModal
                isOpen={isVisitModalOpen}
                onClose={() => { setIsVisitModalOpen(false); setSelectedVisit(null); }}
                onSuccess={() => { loadData(); setIsVisitModalOpen(false); setSelectedVisit(null); }}
                editingTask={selectedVisit}
            />
            <NewNoteModal
                isOpen={isNoteModalOpen}
                onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }}
                onSuccess={() => { loadData(); setIsNoteModalOpen(false); setEditingNote(null); }}
                initialDate={modalDate}
                editingNote={editingNote}
                user={user}
                targetUser={selectedUserView === 'ALL' ? user.username : selectedUserView}
            />
        </div>
    );
};

export default HomeVex;
