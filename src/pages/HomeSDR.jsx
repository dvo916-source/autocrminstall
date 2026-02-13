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

    // changeDate, completedTasksCount, totalTasksCount removed as they were not used

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

    return (
        <div className="h-full flex flex-col gap-6 font-inter overflow-x-hidden">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        <span className="text-cyan-400">Meu Diário</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">
                        Gerencie suas atividades e acompanhe seu desempenho.
                    </p>
                </div>

                {/* Actions: ADD & CALENDAR */}
                <div className="flex items-center gap-3 relative">
                    {/* --- TEAM SELECTOR (Admin Only) --- */}
                    {isAdmin && (
                        <div className="relative" id="team-selector-container">
                            <button
                                onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
                                className={`
                                    flex items-center gap-3 bg-white/5 border px-4 py-2.5 rounded-2xl transition-all duration-300 group
                                    ${isTeamMenuOpen ? 'border-cyan-500 bg-white/10 ring-4 ring-cyan-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/10'}
`}
                            >
                                <Filter size={16} className={`transition-colors duration-300 ${isTeamMenuOpen ? 'text-cyan-400' : 'text-gray-500'} `} />
                                <span className="text-white font-black text-[11px] uppercase tracking-[0.1em] pointer-events-none">
                                    {selectedUserView === 'ALL' ? 'Toda Equipe' : getUserDisplayName(selectedUserView)}
                                </span>
                                <ChevronDown size={14} className={`text-gray-600 transition-transform duration-300 ${isTeamMenuOpen ? 'rotate-180 text-cyan-400' : ''} `} />
                            </button>

                            <AnimatePresence>
                                {isTeamMenuOpen && (
                                    <>
                                        {/* Overlay to close */}
                                        <div className="fixed inset-0 z-40" onClick={() => setIsTeamMenuOpen(false)} />

                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 top-full mt-3 w-64 bg-[#0f172a]/95 border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden z-50 p-2"
                                        >
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserView('ALL');
                                                        setIsTeamMenuOpen(false);
                                                    }}
                                                    className={`
w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1
                                                        ${selectedUserView === 'ALL' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
`}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Toda Equipe</span>
                                                    {selectedUserView === 'ALL' && <Check size={14} />}
                                                </button>

                                                <div className="h-px bg-white/5 my-2 mx-2" />

                                                {sdrUsers.map(u => (
                                                    <button
                                                        key={u.username}
                                                        onClick={() => {
                                                            setSelectedUserView(u.username);
                                                            setIsTeamMenuOpen(false);
                                                        }}
                                                        className={`
w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1
                                                            ${selectedUserView === u.username ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
`}
                                                    >
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{u.nome_completo || u.username}</span>
                                                            <span className="text-[9px] text-gray-600 font-bold">{u.username.split('@')[0]}</span>
                                                        </div>
                                                        {selectedUserView === u.username && <Check size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CRITICAL ALERTS --- */}
            <AnimatePresence>
                {(overdueRecontacts.length > 0 || dueTodayRecontacts.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`border rounded-2xl p-4 flex items-center gap-3 shadow-lg ${overdueRecontacts.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}
                    >
                        <AlertCircle size={24} className={overdueRecontacts.length > 0 ? 'text-red-400 shrink-0' : 'text-amber-400 shrink-0'} />
                        <div className="flex-1">
                            <h4 className={`font-bold text-sm ${overdueRecontacts.length > 0 ? 'text-red-300' : 'text-amber-300'}`}>
                                {overdueRecontacts.length > 0
                                    ? `Alertas Críticos: ${overdueRecontacts.length} Recontatos Vencidos!`
                                    : `Pendências para Hoje: Você tem ${dueTodayRecontacts.length} recontatos marcados.`}
                            </h4>
                            <p className={`text-xs mt-1 ${overdueRecontacts.length > 0 ? 'text-red-500' : 'text-amber-500/80'}`}>
                                {overdueRecontacts.length > 0
                                    ? `Você tem agendamentos pendentes que já passaram do horário. Priorize-os agora!`
                                    : `Fique atento aos horários de hoje para não perder nenhum contato.`}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedDate(new Date());
                                setFilterMode('pending');
                            }}
                            className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-colors ${overdueRecontacts.length > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                            Ver Pendências
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MAIN GRID --- */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

                {/* LEFT COL: AGENDA (3/4) */}
                <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">



                    {/* TIMELINE LIST */}
                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 flex flex-col min-h-0">
                        {/* TABS HEADER - DIÁRIO INTELIGENTE */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-white tracking-[0.3em] uppercase flex items-center gap-3">
                                    <Clock size={16} className="text-cyan-500" />
                                    Diário de Bordo
                                </h3>

                                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            setSelectedDate(today);
                                            setFilterMode('all'); // Reset filter mode
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase flex items-center gap-2 ${isSameDate(selectedDate, new Date()) && filterMode === 'all' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-white'} `}
                                    >
                                        Hoje
                                        {stats.today > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const tomorrow = new Date();
                                            tomorrow.setDate(tomorrow.getDate() + 1);
                                            setSelectedDate(tomorrow);
                                            setFilterMode('all'); // Reset filter mode
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase flex items-center gap-2 ${isSameDate(selectedDate, new Date(new Date().setDate(new Date().getDate() + 1))) && filterMode === 'all' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-white'} `}
                                    >
                                        Amanhã
                                        {stats.tomorrow > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                                    </button>
                                    <button
                                        onClick={() => setFilterMode('pending')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase flex items-center gap-2 ${filterMode === 'pending' ? 'bg-red-500/20 text-red-100 border border-red-500/50' : 'text-gray-500 hover:text-white'} `}
                                    >
                                        Pendentes
                                        {stats.pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon size={14} className="text-gray-500" />
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                        {getDateLabel()}
                                    </span>
                                </div>

                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 scale-90">
                                    <button
                                        onClick={() => setActiveTab('agendamentos')}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${activeTab === 'agendamentos' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-white'} `}
                                    >
                                        Lista
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('notas')}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${activeTab === 'notas' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-600 hover:text-white'} `}
                                    >
                                        Notas
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CONTAINER LADO A LADO */}
                        <div className="flex-1 flex gap-6 min-h-0 relative">
                            {/* COLUNA ESQUERDA: LISTA (Agendamentos/Notas) */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* List Container - flex-1 expands to push button down */}
                                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 space-y-3">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'agendamentos' ? (
                                            <motion.div
                                                key="agendamentos"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="space-y-3"
                                            >
                                                {dailyTasks.length > 0 ? dailyTasks.map((task, i) => {
                                                    const status = (task.status_pipeline || '').toLowerCase();
                                                    const isDone = status.includes('vendido') || status.includes('concluída') || status.includes('finalizado');
                                                    const isPending = status === 'pendente';

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`p-4 rounded-3xl border transition-all flex items-center gap-4 group relative overflow-hidden ${isDone ? 'bg-green-500/5 border-green-500/10 opacity-70' :
                                                                isPending ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]' :
                                                                    'bg-white/5 border-white/5 hover:bg-white/10'
                                                                } `}
                                                        >
                                                            {/* Status Indicator Bar */}
                                                            {isPending && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />}
                                                            {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}

                                                            {/* Time */}
                                                            <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-white/10 pr-4">
                                                                <span className={`text-lg font-black ${isDone ? 'text-green-400/50' : isPending ? 'text-red-400' : 'text-white'} `}>
                                                                    {task.data_agendamento ? new Date(task.data_agendamento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                </span>
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {isDone && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                                                                    <span className={`font-bold truncate ${isDone ? 'text-gray-500' : 'text-white'} `}>{task.cliente}</span>
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${task.temperatura === 'Quente' ? 'bg-orange-500/20 text-orange-400' :
                                                                        task.temperatura === 'Morno' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                            'bg-blue-500/20 text-blue-400'
                                                                        } `}>{task.temperatura}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                                    <span className="truncate max-w-[150px]">{task.veiculo_interesse || 'Interesse Geral'}</span>
                                                                    {task.telefone && (
                                                                        <span className="text-cyan-500/60 bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10">{task.telefone}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Automation & Actions */}
                                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {isPending && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const phone = task.telefone?.replace(/\D/g, '');
                                                                            if (phone) window.open(`https://wa.me/55${phone}`, '_blank');
                                                                        }}
                                                                        className="p-2.5 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500 hover:text-black transition-all"
                                                                        title="WhatsApp Rápido"
                                                                    >
                                                                        <MessageCircle size={16} />
                                                                    </button >
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingTask(task);
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                    className="p-2.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConfirmDelete({ show: true, task });
                                                                    }}
                                                                    className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div >
                                                        </div >
                                                    )
                                                }) : (
                                                    <div className="py-12 flex flex-col items-center justify-center opacity-30">
                                                        <CalendarIcon size={48} className="mb-4 text-gray-500" />
                                                        <p className="font-bold tracking-widest text-sm text-center">SEM AGENDAMENTOS</p>
                                                    </div>
                                                )}
                                            </motion.div >
                                        ) : (
                                            <motion.div
                                                key="notas"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="space-y-4 pb-4"
                                            >
                                                {dailyNotes.length > 0 ? dailyNotes.map((note, i) => (
                                                    <motion.div
                                                        key={note.id || i}
                                                        layout
                                                        className={`group relative p-5 rounded-[2rem] border transition-all ${note.concluido
                                                            ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70'
                                                            : 'bg-white/5 border-white/5 hover:border-purple-500/40 hover:bg-white/[0.07] shadow-lg'
                                                            }`}
                                                    >
                                                        {/* INDICADOR DE STATUS (LED) */}
                                                        <div className={`absolute top-6 left-0 w-1 h-8 rounded-r-full transition-all ${note.concluido ? 'bg-emerald-500' : 'bg-purple-500'
                                                            }`} />

                                                        <div className="flex gap-4">
                                                            {/* CHECKBOX CUSTOMIZADO */}
                                                            <button
                                                                onClick={() => {
                                                                    const { ipcRenderer } = window.require('electron');
                                                                    ipcRenderer.invoke('toggle-nota', { id: note.id, concluido: !note.concluido, lojaId: currentLoja?.id });
                                                                }}
                                                                className={`mt-1 shrink-0 w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${note.concluido
                                                                    ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                                    : 'border-white/20 hover:border-purple-400 bg-black/20'
                                                                    }`}
                                                            >
                                                                {note.concluido ? <Check size={14} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                                                            </button>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                                    <p className={`text-[13px] font-bold leading-relaxed whitespace-pre-wrap ${note.concluido ? 'text-gray-500 line-through decoration-emerald-500/30' : 'text-gray-100'
                                                                        }`}>
                                                                        {note.texto}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    {/* BADGE USUÁRIO */}
                                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 shadow-inner">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                                                                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                                                            {getUserDisplayName(note.sdr_username)}
                                                                        </span>
                                                                    </div>

                                                                    {/* HORÁRIO */}
                                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                                        <Clock size={10} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                                            {new Date(note.data_nota).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* AÇÕES FLUTUANTES (VISÍVEIS NO HOVER) */}
                                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingNote(note);
                                                                        setIsNoteModalOpen(true);
                                                                    }}
                                                                    className="p-2.5 bg-white/5 hover:bg-purple-500/20 text-gray-500 hover:text-purple-400 rounded-xl transition-all border border-transparent hover:border-purple-500/30"
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const { ipcRenderer } = window.require('electron');
                                                                        if (confirm(`Deseja excluir esta nota?\n\n"${note.texto.substring(0, 30)}..."`)) {
                                                                            ipcRenderer.invoke('delete-nota', { id: note.id, lojaId: currentLoja?.id });
                                                                        }
                                                                    }}
                                                                    className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )) : (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="py-24 flex flex-col items-center justify-center text-center px-10"
                                                    >
                                                        <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                                            <FileText size={40} className="text-gray-700" />
                                                        </div>
                                                        <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.3em] mb-2">Nada por aqui</h3>
                                                        <p className="text-[11px] font-bold text-gray-700 uppercase tracking-widest max-w-[200px] leading-relaxed">
                                                            Ainda não há notas para esta data. Que tal criar uma agora?
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence >
                                </div >

                                {/* BIG ADD BUTTON AT BOTTOM */}
                                < div className="pt-4 mt-2 border-t border-white/5 shrink-0" >
                                    <button
                                        onClick={() => {
                                            setModalDate(selectedDate);
                                            setEditingTask(null);
                                            setEditingNote(null);
                                            setIsSelectionOpen(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-dashed border-white/20 text-gray-400 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 transition-all group active:scale-95"
                                    >
                                        <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                        <span className="font-black tracking-widest uppercase text-xs">Criar Novo</span>
                                    </button>
                                </div >
                            </div >
                        </div >
                    </div >
                </div >

                {/* RIGHT COL: THE ARENA SIDEBAR (1/4) */}
                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0" >

                    {/* TOP STATS PANEL (Compact Stats) */}
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className="bg-[#111827] border border-orange-500/20 p-4 rounded-3xl flex flex-col">
                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Visitas</span>
                            <span className="text-2xl font-black text-white">{stats.visits}</span>
                        </div>
                        <div className="bg-[#111827] border border-green-500/20 p-4 rounded-3xl flex flex-col">
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-1">Vendas</span>
                            <span className="text-2xl font-black text-white">{stats.sales}</span>
                        </div>
                        <div className="bg-[#111827] border border-red-500/20 p-4 rounded-3xl flex flex-col">
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Pendente</span>
                            <span className={`text-2xl font-black ${stats.pending > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{stats.pending}</span>
                        </div>
                        <div className="bg-[#111827] border border-indigo-500/20 p-4 rounded-3xl flex flex-col">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Conversão</span>
                            <span className="text-2xl font-black text-white">
                                {stats.visits > 0 ? Math.round((stats.sales / stats.visits) * 100) : 0}%
                            </span>
                        </div>
                    </div>

                    {/* CALENDAR SECTION */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-4 shrink-0" >
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                            <CalendarIcon size={14} className="text-cyan-500" />
                            Explorador
                        </h4>
                        <SDRCalendar
                            isOpen={true}
                            onClose={() => { }}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            eventDays={eventDays}
                            pendingDays={pendingDays}
                        />
                    </div >

                    {/* THE ARENA: TEAM RANKING */}
                    <div className="flex-1 bg-gradient-to-b from-[#111827] to-[#0f172a] border border-purple-500/30 rounded-[2.5rem] p-6 flex flex-col relative overflow-hidden min-h-0" >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black text-white tracking-[0.3em] uppercase flex items-center gap-2">
                                <Trophy size={16} className="text-yellow-400" />
                                A Arena
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {rankingData.sort((a, b) => (b.total || b.count || 0) - (a.total || a.count || 0)).slice(0, 5).map((member, index) => {
                                const score = member.total || member.count || 0;
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`flex items-center gap-4 p-3 rounded-2xl bg-white/5 border transition-all ${index === 0 ? 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.05)]' : 'border-white/5'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-500 text-black' :
                                            'bg-white/5 text-gray-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-white truncate uppercase tracking-wider">
                                                {getFirstName(member.nome_completo || member.nome)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Visitas Card */}
                                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5 min-w-[38px] justify-center">
                                                <CalendarIcon size={10} className="text-blue-400" />
                                                <span className="text-[10px] font-black text-white">{score}</span>
                                            </div>
                                            {/* Vendas Card */}
                                            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 min-w-[38px] justify-center">
                                                <CheckCircle2 size={10} className="text-emerald-400" />
                                                <span className="text-[10px] font-black text-emerald-400">{member.sales_month || 0}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div >
                </div >
            </div >

            {/* CONFIRM DELETE MODAL */}
            < AnimatePresence >
                {
                    confirmDelete.show && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setConfirmDelete({ show: false, task: null })}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />

                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                        <AlertCircle size={32} />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Confirmar Exclusão</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed px-4">
                                            Deseja realmente excluir o agendamento de <span className="text-white font-bold">{confirmDelete.task?.cliente}</span>? Esta ação não pode ser desfeita.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 w-full pt-2">
                                        <button
                                            onClick={() => setConfirmDelete({ show: false, task: null })}
                                            className="py-4 rounded-xl bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => {
                                                const { ipcRenderer } = window.require('electron');
                                                ipcRenderer.invoke('delete-visita', { id: confirmDelete.task.id, lojaId: currentLoja?.id }).then(() => {
                                                    loadData();
                                                    setConfirmDelete({ show: false, task: null });
                                                });
                                            }}
                                            className="py-4 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all active:scale-95"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* SELECTION MODAL (Visit vs Note) */}
            < AnimatePresence >
                {isSelectionOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectionOpen(false)} />

                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1e293b] border border-white/10 rounded-3xl p-8 relative z-10 w-full max-w-sm text-center shadow-2xl">
                            <h3 className="text-xl font-black text-white mb-2">O QUE DESEJA CRIAR?</h3>
                            <p className="text-gray-400 text-sm mb-8 font-medium">Selecione uma opção para o dia {modalDate?.getDate()}/{modalDate?.getMonth() + 1}</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => { setIsSelectionOpen(false); setEditingNote(null); setIsNoteModalOpen(true); }}
                                    className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-500/10 hover:bg-purple-500 border border-purple-500/30 hover:border-purple-500 rounded-2xl group transition-all"
                                >
                                    <FileText size={32} className="text-purple-400 group-hover:text-white transition-colors" />
                                    <span className="text-xs font-black uppercase tracking-widest text-purple-200 group-hover:text-white">Criar Nota</span>
                                </button>

                                <button
                                    onClick={() => { setIsSelectionOpen(false); setEditingTask(null); setIsModalOpen(true); }}
                                    className="flex flex-col items-center justify-center gap-3 p-6 bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/30 hover:border-cyan-500 rounded-2xl group transition-all"
                                >
                                    <UserPlus size={32} className="text-cyan-400 group-hover:text-black transition-colors" />
                                    <span className="text-xs font-black uppercase tracking-widest text-cyan-200 group-hover:text-black">Agendar</span>
                                </button>
                            </div>

                            <button onClick={() => setIsSelectionOpen(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* NEW VISIT MODAL */}
            < NewVisitModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                onSuccess={() => {
                    loadData();
                    setIsModalOpen(false);
                    setEditingTask(null);
                }}
                initialDate={modalDate}
                editingTask={editingTask}
                targetUser={selectedUserView === 'ALL' ? user.username : selectedUserView}
            />

            {/* NEW NOTE MODAL */}
            <NewNoteModal
                isOpen={isNoteModalOpen}
                onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }}
                onSuccess={() => {
                    loadData();
                    setIsNoteModalOpen(false);
                    setEditingNote(null);
                }}
                initialDate={modalDate}
                editingNote={editingNote}
                user={user}
                targetUser={selectedUserView === 'ALL' ? user.username : selectedUserView}
            />
        </div >
    );
};

export default HomeVex;
