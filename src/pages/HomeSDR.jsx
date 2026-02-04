import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, AlertCircle, TrendingUp, Trophy, Star, ChevronLeft, ChevronRight, Filter, FileText, UserPlus, X, Plus, ChevronDown, Check, Trash2 } from 'lucide-react';
import SDRCalendar from '../components/SDRCalendar';
import NewVisitModal from '../components/NewVisitModal';
import NewNoteModal from '../components/NewNoteModal';
import { getFirstName } from '../lib/utils';

const HomeSDR = ({ user }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [dailyNotes, setDailyNotes] = useState([]); // NEW: State for notes
    const [rankingData, setRankingData] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState({ show: false, task: null });
    const [stats, setStats] = useState({ tasks: 0, visits: 0, pending: 0 });
    const [allTasks, setAllTasks] = useState([]); // NEW: For monthly summary
    const [allNotes, setAllNotes] = useState([]); // NEW: For monthly summary

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
    const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

    // --- ADMIN / DEV SUPER VIEW ---
    const isAdmin = ['admin', 'master', 'developer'].includes(user.role);
    const [selectedUserView, setSelectedUserView] = useState(isAdmin ? 'ALL' : user.username);
    const [sdrUsers, setSdrUsers] = useState([]);

    useEffect(() => {
        if (isAdmin) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-list-users').then(users => {
                // Filter only SDRs or Sellers
                const sdrs = users.filter(u => ['sdr', 'vendedor'].includes(u.role));
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
            if (table === 'visitas' || table === 'agendamentos' || table === 'notas') loadData(false); // Silent update for refreshes
        };
        ipcRenderer.on('refresh-data', handleRefresh);
        return () => ipcRenderer.removeListener('refresh-data', handleRefresh);
    }, [selectedDate]);

    const loadData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const { ipcRenderer } = window.require('electron');

            // Format selected date for filtering (YYYY-MM-DD)
            const dateStr = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

            // Fetch correct data based on view
            const targetUser = selectedUserView === 'ALL' ? null : selectedUserView;

            // Parallel Data Fetching
            const [allAgendamentos, teamSummary, allNotes] = await Promise.all([
                ipcRenderer.invoke('get-agendamentos-detalhes', targetUser),
                ipcRenderer.invoke('get-agendamentos-resumo'),
                ipcRenderer.invoke('get-notas', targetUser)
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


            // Calculate Stats
            const statsCount = {
                tasks: tasksForDay.length,
                visits: tasksForDay.filter(t => t.status_pipeline === 'Agendado' || t.status_pipeline === 'Concluido').length,
                pending: tasksForDay.filter(t => !t.status_pipeline || t.status_pipeline === 'Agendado').length
            };

            setDailyTasks(tasksForDay);
            setDailyNotes(notesForDay); // Set notes
            setAllTasks(allAgendamentos || []); // Save all for summary
            setAllNotes(allNotes || []); // Save all for summary
            setRankingData(teamSummary || []);
            setStats(statsCount);

        } catch (err) {
            console.error('Error loading SDR Home data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getUserDisplayName = useCallback((username) => {
        if (!username) return 'SDR';
        const found = sdrUsers.find(u => u.username === username);
        if (found) return getFirstName(found.nome_completo || found.username);
        return username.split('@')[0];
    }, [sdrUsers]);

    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

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
                                <Filter size={16} className={`transition-colors duration-300 ${isTeamMenuOpen ? 'text-cyan-400' : 'text-gray-500'}`} />
                                <span className="text-white font-black text-[11px] uppercase tracking-[0.1em] pointer-events-none">
                                    {selectedUserView === 'ALL' ? 'Toda Equipe' : getUserDisplayName(selectedUserView)}
                                </span>
                                <ChevronDown size={14} className={`text-gray-600 transition-transform duration-300 ${isTeamMenuOpen ? 'rotate-180 text-cyan-400' : ''}`} />
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

            {/* --- MAIN GRID --- */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                {/* LEFT COL: AGENDA (2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">

                    {/* KPI CARDS (Mini) */}
                    <div className="grid grid-cols-3 gap-4 shrink-0">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-cyan-900/20 to-[#0f172a] border border-cyan-500/20 p-5 rounded-3xl relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Calendar size={48} className="text-cyan-400" />
                            </div>
                            <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">Tarefas</span>
                            <div className="text-3xl font-black text-white mt-1">{stats.tasks}</div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-orange-900/20 to-[#0f172a] border border-orange-500/20 p-5 rounded-3xl relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <MapPin size={48} className="text-orange-400" />
                            </div>
                            <span className="text-orange-400 font-bold text-xs uppercase tracking-widest">Visitas</span>
                            <div className="text-3xl font-black text-white mt-1">{stats.visits}</div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-purple-900/20 to-[#0f172a] border border-purple-500/20 p-5 rounded-3xl relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <AlertCircle size={48} className="text-purple-400" />
                            </div>
                            <span className="text-purple-400 font-bold text-xs uppercase tracking-widest">Pendentes</span>
                            <div className="text-3xl font-black text-white mt-1">{stats.pending}</div>
                        </motion.div>
                    </div>

                    {/* TIMELINE LIST */}
                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 flex flex-col min-h-0">
                        {/* TABS HEADER */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-6">
                                <h3 className="text-sm font-black text-white tracking-[0.3em] uppercase flex items-center gap-3">
                                    <Clock size={16} className="text-cyan-500" />
                                    Cronograma
                                </h3>

                                {/* CENTRAL DATE CONTROLS */}
                                <div className="flex items-center">
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 transition-all outline-none"
                                    >
                                        <Calendar size={14} className="text-gray-500" />
                                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                                            {getDateLabel()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* TABS CONTROL */}
                            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setActiveTab('agendamentos')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${activeTab === 'agendamentos' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Agendamentos
                                </button>
                                <button
                                    onClick={() => setActiveTab('notas')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${activeTab === 'notas' ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Notas
                                </button>
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
                                                {dailyTasks.length > 0 ? dailyTasks.map((task, i) => (
                                                    <div
                                                        key={i}
                                                        className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center gap-4 group"
                                                    >
                                                        {/* Time */}
                                                        <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-white/10 pr-4">
                                                            <span className="text-lg font-black text-white">
                                                                {task.data_agendamento ? new Date(task.data_agendamento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                            </span>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-white truncate">{task.cliente}</span>
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${task.temperatura === 'Quente' ? 'bg-orange-500/20 text-orange-400' :
                                                                    task.temperatura === 'Morno' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                        'bg-blue-500/20 text-blue-400'
                                                                    }`}>{task.temperatura}</span>
                                                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-gray-500 font-black uppercase">
                                                                    {getUserDisplayName(task.vendedor_sdr)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                                                <span className="truncate">{task.veiculo_interesse}</span>
                                                                {task.telefone && (
                                                                    <span className="text-cyan-500/60 bg-cyan-500/10 px-1.5 rounded">{task.telefone}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDelete({ show: true, task });
                                                                }}
                                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                                title="Excluir Agendamento"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            <button className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-black transition-colors">
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="py-12 flex flex-col items-center justify-center opacity-30">
                                                        <Calendar size={48} className="mb-4 text-gray-500" />
                                                        <p className="font-bold tracking-widest text-sm text-center">SEM AGENDAMENTOS</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="notas"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="space-y-3"
                                            >
                                                {dailyNotes.length > 0 ? dailyNotes.map((note, i) => (
                                                    <div
                                                        key={note.id || i}
                                                        className={`p-4 rounded-2xl border transition-all flex items-start gap-4 group ${note.concluido ? 'bg-green-500/5 border-green-500/10 opacity-60' : 'bg-white/5 border-white/5 hover:border-purple-500/30'}`}
                                                    >
                                                        {/* Checkbox */}
                                                        <button
                                                            onClick={() => {
                                                                const { ipcRenderer } = window.require('electron');
                                                                ipcRenderer.invoke('toggle-nota', { id: note.id, concluido: !note.concluido });
                                                            }}
                                                            className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${note.concluido ? 'bg-green-500 border-green-500 text-black' : 'border-white/20 hover:border-purple-400'}`}
                                                        >
                                                            {note.concluido && <X size={14} className="rotate-45" strokeWidth={4} />}
                                                        </button>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${note.concluido ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                                    {note.texto}
                                                                </p>
                                                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-gray-500 font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                                                    {getUserDisplayName(note.sdr_username)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                                    {new Date(note.data_nota).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                const { ipcRenderer } = window.require('electron');
                                                                if (confirm('Excluir esta nota?')) ipcRenderer.invoke('delete-nota', note.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-400 transition-all"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <div className="py-12 flex flex-col items-center justify-center opacity-30">
                                                        <FileText size={48} className="mb-4 text-gray-500" />
                                                        <p className="font-bold tracking-widest text-sm text-center">SEM NOTAS HOJE</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* BIG ADD BUTTON AT BOTTOM */}
                                <div className="pt-4 mt-2 border-t border-white/5 shrink-0">
                                    <button
                                        onClick={() => {
                                            setModalDate(selectedDate);
                                            setIsSelectionOpen(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-dashed border-white/20 text-gray-400 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 transition-all group active:scale-95"
                                    >
                                        <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                        <span className="font-black tracking-widest uppercase text-xs">Criar Novo</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: SIDEBAR (Calendar, Summary, Ranking) */}
                <div className="flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                    {/* CALENDAR SECTION */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-6 shrink-0">
                        <SDRCalendar
                            isOpen={true}
                            onClose={() => { }}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            onAddNote={(date) => {
                                setModalDate(date);
                                setIsNoteModalOpen(true);
                            }}
                        />

                        {/* RESUMO DO MÊS - MEMOIZED */}
                        <div className="border-t border-white/5 pt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Próximos no Mês</h4>
                            </div>

                            <div className="space-y-2">
                                {(() => {
                                    const currentMonth = selectedDate.getMonth();
                                    const currentYear = selectedDate.getFullYear();

                                    // Memoize the filtering logic to avoid re-calculating on every render
                                    const monthEventsData = useMemo(() => {
                                        const events = {};

                                        allTasks.forEach(task => {
                                            const d = new Date(task.data_agendamento);
                                            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                                                const day = d.getDate();
                                                if (!events[day]) events[day] = { tasks: 0, notes: 0, date: d };
                                                events[day].tasks++;
                                            }
                                        });

                                        allNotes.forEach(note => {
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
                                    }, [allTasks, allNotes, currentMonth, currentYear]);

                                    const { events, sorted } = monthEventsData;

                                    if (sorted.length === 0) {
                                        return <p className="text-[10px] text-gray-600 font-bold uppercase py-4">Nenhum evento este mês</p>;
                                    }

                                    return sorted.slice(0, 5).map(day => {
                                        const { tasks, notes, date } = events[day];
                                        const isSelected = selectedDate.getDate() === day;

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDate(date)}
                                                className={`
                                                    w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group
                                                    ${isSelected
                                                        ? 'bg-cyan-500/10 border-cyan-500/30'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                                        w-7 h-7 rounded-lg flex flex-col items-center justify-center
                                                        ${isSelected ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-400'}
                                                    `}>
                                                        <span className="text-[10px] font-black leading-none">{day}</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-bold text-white leading-tight">
                                                            {tasks + notes} {(tasks + notes) === 1 ? 'Evento' : 'Eventos'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={10} className={`transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-cyan-400' : 'text-gray-700'}`} />
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* RANKING SECTION (Compact) */}
                    <div className="bg-gradient-to-b from-[#0f172a] to-[#0f172a] border border-purple-500/20 rounded-[2.5rem] p-6 flex flex-col relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />

                        <h3 className="text-[10px] font-black text-white tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
                            <Trophy size={14} className="text-purple-400" />
                            Ranking Equipe
                        </h3>

                        <div className="space-y-2">
                            {rankingData.sort((a, b) => b.total - a.total).slice(0, 5).map((member, index) => (
                                <div key={index} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-colors">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] ${index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-white/5 text-gray-500'}`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-white truncate">
                                            {getFirstName(member.nome_completo || member.nome)}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black text-purple-400">{member.total}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONFIRM DELETE MODAL */}
            <AnimatePresence>
                {confirmDelete.show && (
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
                                            ipcRenderer.invoke('delete-visita', confirmDelete.task.id).then(() => {
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
                )}
            </AnimatePresence>

            {/* SELECTION MODAL (Visit vs Note) */}
            <AnimatePresence>
                {isSelectionOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectionOpen(false)} />

                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1e293b] border border-white/10 rounded-3xl p-8 relative z-10 w-full max-w-sm text-center shadow-2xl">
                            <h3 className="text-xl font-black text-white mb-2">O QUE DESEJA CRIAR?</h3>
                            <p className="text-gray-400 text-sm mb-8 font-medium">Selecione uma opção para o dia {modalDate?.getDate()}/{modalDate?.getMonth() + 1}</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => { setIsSelectionOpen(false); setIsNoteModalOpen(true); }}
                                    className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-500/10 hover:bg-purple-500 border border-purple-500/30 hover:border-purple-500 rounded-2xl group transition-all"
                                >
                                    <FileText size={32} className="text-purple-400 group-hover:text-white transition-colors" />
                                    <span className="text-xs font-black uppercase tracking-widest text-purple-200 group-hover:text-white">Criar Nota</span>
                                </button>

                                <button
                                    onClick={() => { setIsSelectionOpen(false); setIsModalOpen(true); }}
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
            </AnimatePresence>

            {/* NEW VISIT MODAL */}
            <NewVisitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    loadData();
                    setIsModalOpen(false);
                }}
                initialDate={modalDate}
                targetUser={selectedUserView === 'ALL' ? user.username : selectedUserView}
            />

            {/* NEW NOTE MODAL */}
            <NewNoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                onSuccess={() => {
                    loadData();
                    setIsNoteModalOpen(false);
                }}
                initialDate={modalDate}
                user={user}
                targetUser={selectedUserView === 'ALL' ? user.username : selectedUserView}
            />
        </div >
    );
};

export default HomeSDR;
