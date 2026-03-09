import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getFirstName } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../context/LojaContext';
import { useUI } from '../context/UIContext';
import { electronAPI } from '@/lib/electron-api';

export const useHomeSDR = (user) => {
    const navigate = useNavigate();
    const { currentLoja, lojas } = useLoja();
    const { performanceMode } = useUI();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [dailyNotes, setDailyNotes] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [allNotes, setAllNotes] = useState([]);
    const [rankingData, setRankingData] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState({ show: false, task: null });
    const [stats, setStats] = useState({ visits: 0, sales: 0, pending: 0, today: 0, tomorrow: 0, visitsConfirmed: 0 });
    const [nextTask, setNextTask] = useState(null);
    const [eventDays, setEventDays] = useState([]);
    const [pendingDays, setPendingDays] = useState([]);
    const [overdueRecontacts, setOverdueRecontacts] = useState([]);
    const [dueTodayRecontacts, setDueTodayRecontacts] = useState([]);
    const [filterMode, setFilterMode] = useState('all');
    const [estoque, setEstoque] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);

    const [activeTab, setActiveTab] = useState('agendamentos');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [modalDate, setModalDate] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

    const isAdmin = ['admin', 'master', 'developer'].includes(user?.role);
    const [selectedUserView, setSelectedUserView] = useState(isAdmin ? 'ALL' : user?.username);
    const [sdrUsers, setSdrUsers] = useState([]);

    const loadData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
                        const dateStr = selectedDate.toLocaleDateString('en-CA');
            const targetUser = selectedUserView === 'ALL' ? null : selectedUserView;
            // Developer sem loja selecionada usa a primeira loja disponível
            const storeId = currentLoja?.id || (lojas && lojas.length > 0 ? lojas[0].id : 'irw-motors-main');

            const [allAgendamentos, teamSummary, allNotesData, estoqueData, usuariosData] = await Promise.all([
                electronAPI.getAgendamentosDetalhes({ username: targetUser, lojaId: storeId }),
                electronAPI.getAgendamentosResumo(storeId),
                electronAPI.getNotas({ username: targetUser, lojaId: storeId }),
                electronAPI.getList('estoque', storeId),
                electronAPI.getListUsers(storeId)
            ]);

            setEstoque(estoqueData || []);
            setUsuarios(usuariosData || []);

            const tasksForDay = (allAgendamentos || []).filter(item => {
                const itemDate = item.data_agendamento ? item.data_agendamento.substring(0, 10) : '';
                return itemDate === dateStr;
            });

            const notesForDay = (allNotesData || []).filter(note => {
                const noteDate = note.data_nota ? note.data_nota.substring(0, 10) : '';
                return noteDate === dateStr;
            });

            const currentMonth = new Date().getMonth() + 1;
            const searchName = (targetUser || user?.username || '').toLowerCase().trim();
            const userInRanking = (teamSummary || []).find(u => (u.nome || u.username || '').toLowerCase().trim() === searchName);

            const visitsTotal = selectedUserView === 'ALL'
                ? (teamSummary || []).reduce((acc, u) => acc + (u.total || u.count || 0), 0)
                : (userInRanking ? (userInRanking.total || userInRanking.count || 0) : 0);

            const salesTotal = (allAgendamentos || []).filter(v => {
                const m = v.mes || (v.datahora ? new Date(v.datahora).getMonth() + 1 : null);
                const status = (v.status_pipeline || v.status || '').toLowerCase();
                return m === currentMonth && (status.includes('vendido') || status.includes('concluída'));
            }).length;

            // Visitas confirmadas no mês (visitou_loja = 1)
            const visitsConfirmed = (allAgendamentos || []).filter(v => {
                const m = v.mes || (v.datahora ? new Date(v.datahora).getMonth() + 1 : null);
                return m === currentMonth && (v.visitou_loja === 1 || v.visitou_loja === true);
            }).length;

            const now = new Date();
            const todayISO = now.toISOString().split('T')[0];

            // Próximo compromisso do dia (agendamento futuro mais próximo)
            const upcomingToday = (allAgendamentos || [])
                .filter(v => {
                    if (!v.data_agendamento) return false;
                    const d = new Date(v.data_agendamento);
                    return d >= now && d.toISOString().split('T')[0] === todayISO;
                })
                .sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento));
            setNextTask(upcomingToday[0] || null);
            const pendingList = (allAgendamentos || []).filter(v => (v.status_pipeline || v.status || '').toLowerCase() === 'pendente');

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

            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const todayTasks = (allAgendamentos || []).filter(v => (v.data_agendamento || v.datahora || '').includes(todayISO));
            const tomorrowTasks = (allAgendamentos || []).filter(v => (v.data_agendamento || v.datahora || '').includes(tomorrowStr));

            const activeEventDays = new Set();
            const activePendingDays = new Set();

            (allAgendamentos || []).forEach(v => {
                const status = (v.status_pipeline || v.status || '').toLowerCase();
                const dStr = (v.data_agendamento || v.datahora || '').split('T')[0];
                if (!dStr) return;
                if (status === 'pendente') activePendingDays.add(dStr);
                else activeEventDays.add(dStr);
            });

            (allNotesData || []).forEach(n => {
                const dStr = (n.data_nota || '').split('T')[0];
                if (dStr) activeEventDays.add(dStr);
            });

            setEventDays(Array.from(activeEventDays));
            setPendingDays(Array.from(activePendingDays));
            setOverdueRecontacts(overdue);
            setDueTodayRecontacts(dueToday);

            const pendingTotal = overdue.length + dueToday.length;

            let finalTasks = tasksForDay;
            if (filterMode === 'pending') {
                finalTasks = (allAgendamentos || []).filter(v => {
                    const status = (v.status_pipeline || v.status || '').toLowerCase();
                    const taskDateStr = v.data_agendamento || v.data_recontato || v.datahora;
                    if (!taskDateStr) return false;
                    const taskDate = new Date(taskDateStr);
                    return status === 'pendente' && (taskDate < now || taskDate.toISOString().split('T')[0] === todayISO);
                });
            }

            setDailyTasks(finalTasks);
            setDailyNotes(notesForDay);
            setAllTasks(allAgendamentos || []);
            setAllNotes(allNotesData || []);
            setRankingData((teamSummary || []).filter(u => !['developer', 'master'].includes(u.role) && (u.nome || u.username || '').toLowerCase() !== 'diego'));
            setStats({ visits: visitsTotal, sales: salesTotal, pending: pendingTotal, today: todayTasks.length, tomorrow: tomorrowTasks.length, visitsConfirmed });
        } catch (err) {
            console.error("HomeSDR Load Error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, selectedUserView, currentLoja?.id, filterMode, user?.username]);

    useEffect(() => {
        if (isAdmin) {
                        const sdrStoreId = currentLoja?.id || (lojas && lojas.length > 0 ? lojas[0].id : 'irw-motors-main');
            electronAPI.getListUsers(sdrStoreId).then(users => {
                const sdrs = (users || []).filter(u => ['sdr', 'vendedor', 'admin', 'master', 'gerente'].includes(u.role));
                setSdrUsers(sdrs);
            });
        }
    }, [isAdmin, currentLoja?.id]);

    useEffect(() => {
        const anyModalOpen = isModalOpen || isNoteModalOpen || isSelectionOpen || confirmDelete.show || isTeamMenuOpen;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '8px';
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        return () => { document.body.style.overflow = ''; document.body.style.paddingRight = ''; };
    }, [isModalOpen, isNoteModalOpen, isSelectionOpen, confirmDelete.show, isTeamMenuOpen]);

    useEffect(() => {
        loadData(true);
                const handleRefresh = (event, table) => {
            if (table === 'visitas' || table === 'notas') loadData(false);
        };
        electronAPI.onRefreshData(handleRefresh);
        const unsub = electronAPI.onRefreshData(handleRefresh);
            return () => { if (unsub) unsub(); };
    }, [loadData]);

    const handleDeleteClick = (id) => {
        const task = dailyTasks.find(t => t.id === id);
        if (task) setConfirmDelete({ show: true, task });
    };

    const handleWhatsAppClick = (e, task) => {
        e.stopPropagation();
        if (!task.telefone) return;
        const cleanPhone = task.telefone.replace(/\D/g, '');
        const modulosRaw = currentLoja?.modulos;
        let hasWaModule = false;
        try {
            const modulosArray = typeof modulosRaw === 'string' ? JSON.parse(modulosRaw) : (modulosRaw || []);
            hasWaModule = Array.isArray(modulosArray) && modulosArray.includes('whatsapp');
        } catch (err) { }

        if (hasWaModule) {
            navigate('/whatsapp');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-whatsapp-click', { detail: task.id }));
            }, 500);
        } else {
            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
        }
    };

    const isSameDate = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

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
        const sorted = Object.keys(events).map(Number).sort((a, b) => a - b).filter(day => {
            const today = new Date();
            if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) return day >= today.getDate();
            return true;
        });
        return { events, sorted };
    }, [allTasks, allNotes, selectedDate]);

    const formatCurrency = (val) => {
        if (!val) return null;
        const n = parseFloat(String(val).replace(/\D/g, '')) / 100;
        return isNaN(n) ? null : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    };

    const getUserDisplayName = useCallback((username) => {
        if (!username) return 'VEX';
        const found = sdrUsers.find(u => u.username === username);
        if (found) {
            return getFirstName(found.nome_completo || found.username);
        }
        return username.split('@')[0];
    }, [sdrUsers]);

    const getDateLabel = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const selStr = selectedDate.toDateString();
        if (selStr === today.toDateString()) return 'HOJE';
        if (selStr === tomorrow.toDateString()) return 'AMANHÃ';

        return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return {
        selectedDate, setSelectedDate,
        loading,
        dailyTasks, dailyNotes,
        allTasks, allNotes,
        rankingData,
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
        isCalendarOpen, setIsCalendarOpen,
        isSelectionOpen, setIsSelectionOpen,
        isModalOpen, setIsModalOpen,
        isNoteModalOpen, setIsNoteModalOpen,
        modalDate, setModalDate,
        editingTask, setEditingTask,
        editingNote, setEditingNote,
        isTeamMenuOpen, setIsTeamMenuOpen,
        isAdmin, selectedUserView, setSelectedUserView, sdrUsers,
        loadData, handleDeleteClick, handleWhatsAppClick, isSameDate,
        monthEventsData,
        performanceMode,
        currentLoja,
        formatCurrency,
        getUserDisplayName,
        getDateLabel,
        nextTask
    };
};
