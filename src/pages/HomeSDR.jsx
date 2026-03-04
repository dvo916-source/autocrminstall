import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, MapPin, AlertCircle, TrendingUp, Trophy, Star, ChevronLeft, ChevronRight, Filter, FileText, UserPlus, X, Plus, ChevronDown, Check, Trash2, Edit2, CheckCircle2, MessageCircle, CornerDownRight, Percent, Target } from 'lucide-react';
import SDRCalendar from '../components/SDRCalendar';
import NewVisitModal from '../components/NewVisitModal';
import NewNoteModal from '../components/NewNoteModal';
import { getFirstName } from '../lib/utils';
import { useLoja } from '../context/LojaContext';
import { useMemo, useCallback } from 'react';

const HomeVex = ({ user }) => {
    const { currentLoja } = useLoja();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [dailyNotes, setDailyNotes] = useState([]); // NEW: State for notes
    const [allTasks, setAllTasks] = useState([]); // NEW: For monthly summary
    const [allNotes, setAllNotes] = useState([]); // NEW: For monthly summary
    const [rankingData, setRankingData] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState({ show: false, task: null });
    const [stats, setStats] = useState({ visits: 0, sales: 0, pending: 0, today: 0, tomorrow: 0 });
    const [eventDays, setEventDays] = useState([]); // Days that have appointments/notes
    const [pendingDays, setPendingDays] = useState([]); // Days with pending tasks (Red Dots)
    const [overdueRecontacts, setOverdueRecontacts] = useState([]); // Delayed tasks
    const [dueTodayRecontacts, setDueTodayRecontacts] = useState([]); // Pending for today
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'pending'

    // UI State
    const [activeTab, setActiveTab] = useState('agendamentos'); // 'agendamentos' | 'notas'

    // State for interactive features
    const dateInputRef = useRef(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Selection & Modals
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); // Visit Modal
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false); // Note Modal
    const [modalDate, setModalDate] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

    // --- ADMIN / DEV SUPER VIEW ---
    const isAdmin = ['admin', 'master', 'developer'].includes(user.role);
    const [selectedUserView, setSelectedUserView] = useState(isAdmin ? 'ALL' : user.username);
    const [sdrUsers, setSdrUsers] = useState([]);

    useEffect(() => {
        if (isAdmin) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-list-users', currentLoja?.id).then(users => {
                // Filter only SDRs or Sellers and hide system ghosts (roles)
                const sdrs = (users || []).filter(u =>
                    ['sdr', 'vendedor'].includes(u.role)
                );
                setSdrUsers(sdrs);
            });
        }
    }, []);

    useEffect(() => {
        // Prevent scroll bounce/jump when modals are open
        const anyModalOpen = isModalOpen || isNoteModalOpen || isSelectionOpen || confirmDelete.show || isTeamMenuOpen;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '8px'; // Compensate for scrollbar removal
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isModalOpen, isNoteModalOpen, isSelectionOpen, confirmDelete.show, isTeamMenuOpen]);

    useEffect(() => {
        loadData(true); // Initial load with full loading state

        // Listen for updates
        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, table) => {
            // Em Visitas.jsx usamos 'visitas', aqui deve ser o mesmo para sincronia total
            if (table === 'visitas' || table === 'notas') loadData(false);
        };
        ipcRenderer.on('refresh-data', handleRefresh);
        return () => ipcRenderer.removeListener('refresh-data', handleRefresh);
    }, [selectedDate, selectedUserView, currentLoja?.id, filterMode]);

    const loadData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const { ipcRenderer } = window.require('electron');

            // Format selected date for filtering (YYYY-MM-DD)
            const dateStr = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

            // Fetch correct data based on view
            const targetUser = selectedUserView === 'ALL' ? null : selectedUserView;

            // Parallel Data Fetching
            const storeId = currentLoja?.id || 'irw-motors-main';
            const [allAgendamentos, teamSummary, allNotes] = await Promise.all([
                ipcRenderer.invoke('get-agendamentos-detalhes', { username: targetUser, lojaId: storeId }),
                ipcRenderer.invoke('get-agendamentos-resumo', storeId),
                ipcRenderer.invoke('get-notas', { username: targetUser, lojaId: storeId })
            ]);

            // Filter VISITS for Selected Date
            const tasksForDay = (allAgendamentos || []).filter(item => {
                const itemDate = item.data_agendamento ? item.data_agendamento.substring(0, 10) : '';
                return itemDate === dateStr;
            });

            // Filter NOTES for Selected Date
            const notesForDay = (allNotes || []).filter(note => {
                const noteDate = note.data_nota ? note.data_nota.substring(0, 10) : '';
                return noteDate === dateStr;
            });


            // Calculate Stats (Current Month)
            const currentMonth = new Date().getMonth() + 1;
            const searchName = (targetUser || user?.username || '').toLowerCase().trim();

            const userInRanking = (teamSummary || []).find(u =>
                (u.nome || u.username || '').toLowerCase().trim() === searchName
            );

            // Card 1: Total de Visitas (Mês - Vem do Ranking/Resumo)
            const visitsTotal = selectedUserView === 'ALL'
                ? (teamSummary || []).reduce((acc, u) => acc + (u.total || u.count || 0), 0)
                : (userInRanking ? (userInRanking.total || userInRanking.count || 0) : 0);

            // Card 2: Total de Vendas (Mês - Status Vendido/Venda Concluída)
            const salesTotal = (allAgendamentos || []).filter(v => {
                const m = v.mes || (v.datahora ? new Date(v.datahora).getMonth() + 1 : null);
                const status = (v.status_pipeline || v.status || '').toLowerCase();
                return m === currentMonth && (status.includes('vendido') || status.includes('concluída'));
            }).length;

            // Alertas Críticos & Pendências (Baseado em DATA e HORA)
            const now = new Date();
            const todayISO = now.toISOString().split('T')[0];

            const pendingList = (allAgendamentos || []).filter(v => (v.status_pipeline || v.status || '').toLowerCase() === 'pendente');

            const overdue = [];
            const dueToday = [];

            pendingList.forEach(v => {
                const taskDateStr = v.data_agendamento || v.data_recontato || v.datahora;
                if (!taskDateStr) return;

                const taskDate = new Date(taskDateStr);
                const isOverdue = taskDate < now;
                const isToday = taskDate.toISOString().split('T')[0] === todayISO;

                // Segurança: Se for para o futuro (além de hoje), não pode ser overdue
                if (isOverdue && !isToday) {
                    overdue.push(v);
                } else if (isToday) {
                    dueToday.push(v);
                }
            });

            // Dashboard Intelligence: Categorize by Time
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const todayTasks = (allAgendamentos || []).filter(v => (v.data_agendamento || v.datahora || '').includes(todayISO));
            const tomorrowTasks = (allAgendamentos || []).filter(v => (v.data_agendamento || v.datahora || '').includes(tomorrowStr));

            // Calendar Intelligence: Identify days with activity vs pending
            const activeEventDays = new Set();
            const activePendingDays = new Set();

            (allAgendamentos || []).forEach(v => {
                const status = (v.status_pipeline || v.status || '').toLowerCase();
                const dStr = (v.data_agendamento || v.datahora || '').split('T')[0];
                if (!dStr) return;

                if (status === 'pendente') {
                    activePendingDays.add(dStr);
                } else {
                    activeEventDays.add(dStr);
                }
            });

            (allNotes || []).forEach(n => {
                const dStr = (n.data_nota || '').split('T')[0];
                if (dStr) activeEventDays.add(dStr);
            });

            setEventDays(Array.from(activeEventDays));
            setPendingDays(Array.from(activePendingDays));
            setOverdueRecontacts(overdue);
            setDueTodayRecontacts(dueToday);

            const pendingTotal = overdue.length + dueToday.length;

            // Lógica de Dash Inteligente
            let finalTasks = tasksForDay;
            if (filterMode === 'pending') {
                finalTasks = (allAgendamentos || []).filter(v => {
                    const status = (v.status_pipeline || v.status || '').toLowerCase();
                    const taskDateStr = v.data_agendamento || v.data_recontato || v.datahora;
                    if (!taskDateStr) return false;
                    const taskDate = new Date(taskDateStr);
                    // No modo pendente, mostramos tudo que está atrasado ou é para HOJE (vencendo ou vencido)
                    return status === 'pendente' && (taskDate < now || taskDate.toISOString().split('T')[0] === todayISO);
                });
            }

            setDailyTasks(finalTasks);
            setDailyNotes(notesForDay);
            setAllTasks(allAgendamentos || []);
            setAllNotes(allNotes || []);
            setRankingData((teamSummary || []).filter(u =>
                !['developer', 'master'].includes(u.role) &&
                (u.nome || u.username || '').toLowerCase() !== 'diego'
            ));
            setStats({
                visits: visitsTotal,
                sales: salesTotal,
                pending: pendingTotal,
                today: todayTasks.length,
                tomorrow: tomorrowTasks.length
            });

        } catch (err) {
            console.error('Error loading SDR Home data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getUserDisplayName = useCallback((username) => {
        if (!username) return 'VEX';
        const found = sdrUsers.find(u => u.username === username);
        if (found) return getFirstName(found.nome_completo || found.username);
        return username.split('@')[0];
    }, [sdrUsers]);



    // Helper for date header
    const getDateLabel = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const selStr = selectedDate.toDateString();
        if (selStr === today.toDateString()) return 'HOJE';
        if (selStr === tomorrow.toDateString()) return 'AMANHÃ';

        return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const isSameDate = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };


    // --- REFINED DATA PROCESSING (MOVED TO TOP LEVEL TO COMPLY WITH REACT HOOK RULES) ---
    const monthEventsData = useMemo(() => {
        const events = {};
        const currentMonth = selectedDate.getMonth();
        const currentYear = selectedDate.getFullYear();

        allTasks.forEach(task => {
            if (!task.data_agendamento) return;
            const d = new Date(task.data_agendamento);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const day = d.getDate();
                if (!events[day]) events[day] = { tasks: 0, notes: 0, date: d };
                events[day].tasks++;
            }
        });

        allNotes.forEach(note => {
            if (!note.data_nota) return;
            const d = new Date(note.data_nota);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const day = d.getDate();
                if (!events[day]) events[day] = { tasks: 0, notes: 0, date: d };
                events[day].notes++;
            }
        });

        const sorted = Object.keys(events)
            .map(Number)
            .sort((a, b) => a - b)
            .filter(day => {
                const today = new Date();
                if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                    return day >= today.getDate();
                }
                return true;
            });

        return { events, sorted };
    }, [allTasks, allNotes, selectedDate]);

    const { events, sorted } = monthEventsData;

    // Greeting helper
    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Bom dia';
        if (h < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const isViewingTomorrow = isSameDate(selectedDate, tomorrowDate);

    return (
        <div className="h-full flex flex-col font-inter overflow-hidden">

            {/* ── HEADER ─────────────────────────────────────────── */}
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

            {/* ── MAIN LAYOUT ────────────────────────────────────── */}
            <div className="flex-1 flex min-h-0 overflow-hidden">

                {/* LEFT: AGENDA */}
                <div className="flex-1 flex flex-col min-h-0 border-r border-white/[0.05]">

                    {/* Day nav + view toggle */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.05] shrink-0 bg-[#0d1526]/50">
                        <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
                            {[
                                { label: 'Hoje', action: () => { setSelectedDate(new Date()); setFilterMode('all'); }, active: isSameDate(selectedDate, new Date()) && filterMode === 'all', count: stats.today, color: 'cyan' },
                                { label: 'Amanhã', action: () => { setSelectedDate(tomorrowDate); setFilterMode('all'); }, active: isViewingTomorrow && filterMode === 'all', count: stats.tomorrow, color: 'cyan' },
                                { label: 'Pendentes', action: () => setFilterMode('pending'), active: filterMode === 'pending', count: stats.pending, color: 'red' },
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
                                        const status = (task.status_pipeline || '').toLowerCase();
                                        const isDone = status.includes('vendido') || status.includes('concluída') || status.includes('finalizado');
                                        const isPending = status === 'pendente';
                                        return (
                                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                                className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-default
                                                    ${isDone ? 'bg-green-500/[0.04] border-green-500/10 opacity-60' :
                                                        isPending ? 'bg-red-500/[0.05] border-red-500/15' :
                                                            'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'}`}>
                                                <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${isDone ? 'bg-green-500' : isPending ? 'bg-red-500' : 'bg-cyan-500/40'}`} />
                                                <div className="min-w-[52px] text-center pl-1">
                                                    <span className={`text-base font-black tabular-nums ${isDone ? 'text-green-500/40' : isPending ? 'text-red-400' : 'text-cyan-400'}`}>
                                                        {task.data_agendamento ? new Date(task.data_agendamento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </span>
                                                </div>
                                                <div className="w-px h-8 bg-white/[0.06] shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        {isDone && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                                                        <span className={`text-[13px] font-bold truncate ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>{task.cliente}</span>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0
                                                            ${task.temperatura === 'Quente' ? 'bg-orange-500/15 text-orange-400' :
                                                                task.temperatura === 'Morno' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                                            {task.temperatura}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                                                        <span className="truncate max-w-[160px]">{task.veiculo_interesse || 'Interesse geral'}</span>
                                                        {task.telefone && <span className="text-slate-600 shrink-0">{task.telefone}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isPending && (
                                                        <button onClick={e => { e.stopPropagation(); const p = task.telefone?.replace(/\D/g, ''); if (p) window.open(`https://wa.me/55${p}`, '_blank'); }}
                                                            className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500 hover:text-black transition-all" title="WhatsApp">
                                                            <MessageCircle size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={e => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }}
                                                        className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all" title="Editar">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setConfirmDelete({ show: true, task }); }}
                                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Excluir">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </motion.div>
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
                                            <button onClick={() => { const { ipcRenderer } = window.require('electron'); ipcRenderer.invoke('toggle-nota', { id: note.id, concluido: !note.concluido, lojaId: currentLoja?.id }); }}
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
                                                <button onClick={() => { const { ipcRenderer } = window.require('electron'); if (confirm('Excluir esta nota?')) ipcRenderer.invoke('delete-nota', { id: note.id, lojaId: currentLoja?.id }); }}
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

                {/* RIGHT: SIDEBAR */}
                <div className="w-[272px] shrink-0 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">

                    {/* Stats */}
                    <div className="p-4 border-b border-white/[0.05] shrink-0">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Mês atual</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Visitas', value: stats.visits, color: 'orange' },
                                { label: 'Vendas', value: stats.sales, color: 'green' },
                                { label: 'Pendentes', value: stats.pending, color: 'red', pulse: stats.pending > 0 },
                                { label: 'Conversão', value: `${stats.visits > 0 ? Math.round((stats.sales / stats.visits) * 100) : 0}%`, color: 'indigo' },
                            ].map(s => (
                                <div key={s.label} className={`bg-white/[0.03] border p-3 rounded-xl flex flex-col
                                    ${s.color === 'orange' ? 'border-orange-500/15' : s.color === 'green' ? 'border-green-500/15' : s.color === 'red' ? 'border-red-500/15' : 'border-indigo-500/15'}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1
                                        ${s.color === 'orange' ? 'text-orange-400' : s.color === 'green' ? 'text-green-400' : s.color === 'red' ? 'text-red-400' : 'text-indigo-400'}`}>
                                        {s.label}
                                    </span>
                                    <span className={`text-xl font-black ${s.pulse && stats.pending > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="p-4 border-b border-white/[0.05] shrink-0">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                            <CalendarIcon size={11} className="text-cyan-500" />
                            Calendário
                        </p>
                        <SDRCalendar
                            isOpen={true}
                            onClose={() => { }}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            eventDays={eventDays}
                            pendingDays={pendingDays}
                        />
                    </div>

                    {/* Ranking */}
                    <div className="p-4 flex-1">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                            <Trophy size={11} className="text-yellow-500" />
                            Ranking do Mês
                        </p>
                        <div className="space-y-2">
                            {rankingData.sort((a, b) => (b.total || b.count || 0) - (a.total || a.count || 0)).slice(0, 5).map((member, index) => {
                                const score = member.total || member.count || 0;
                                return (
                                    <motion.div key={index} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all
                                            ${index === 0 ? 'border-yellow-500/25 bg-yellow-500/[0.04]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0
                                            ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="flex-1 text-[12px] font-bold text-white truncate uppercase tracking-wide">
                                            {getFirstName(member.nome_completo || member.nome)}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                                <CalendarIcon size={9} className="text-blue-400" />
                                                <span className="text-[10px] font-black text-white">{score}</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">
                                                <CheckCircle2 size={9} className="text-emerald-400" />
                                                <span className="text-[10px] font-black text-emerald-400">{member.sales_month || 0}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MODALS ─────────────────────────────────────────── */}
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
                                    <button onClick={() => { const { ipcRenderer } = window.require('electron'); ipcRenderer.invoke('delete-visita', { id: confirmDelete.task.id, lojaId: currentLoja?.id }).then(() => { loadData(); setConfirmDelete({ show: false, task: null }); }); }}
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

