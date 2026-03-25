import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLoja } from './LojaContext';
import { electronAPI } from '@/lib/electron-api';

const LeadsContext = createContext();

export function LeadsProvider({ children, user }) {
    const { currentLoja } = useLoja();
    const [leads, setLeads] = useState([]);
    const [notas, setNotas] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const isAdmin = ['admin', 'master', 'developer'].includes(user?.role);
    const [selectedUserView, setSelectedUserView] = useState(isAdmin ? 'ALL' : user?.username);

    const [periodFilter, setPeriodFilter] = useState(() => {
        const saved = localStorage.getItem('crm_period_filter');
        return saved ? JSON.parse(saved) : ['current_month'];
    });

    useEffect(() => {
        localStorage.setItem('crm_period_filter', JSON.stringify(periodFilter));
    }, [periodFilter]);

    // 🔥 1. CARREGAMENTO BLINDADO (Se uma tabela falhar, as outras carregam)
    const loadData = async (showLoading = true) => {
        if (!user || !currentLoja?.id) return;
        if (showLoading) setLoading(true);

        try {
            
            const targetUser = selectedUserView === 'ALL' ? null : selectedUserView;

            let localVisitas = [];
            let localNotas = [];
            let localEstoque = [];

            // Tenta buscar visitas (Se falhar, não quebra o resto)
            try {
                localVisitas = await electronAPI.getVisitas(user.role, selectedUserView === 'ALL' ? null : (selectedUserView || user.username), currentLoja.id);
            } catch (e) { console.error("Falha ao buscar visitas", e); }

            // Tenta buscar notas
            try {
                localNotas = await electronAPI.getNotas({
                    username: targetUser,
                    lojaId: currentLoja.id
                });
            } catch (e) { console.error("Falha ao buscar notas", e); }

            // Tenta buscar estoque
            try {
                localEstoque = await electronAPI.getList('estoque', currentLoja.id);
            } catch (e) { console.error("Falha ao buscar estoque", e); }

            setLeads(localVisitas || []);
            setNotas(localNotas || []);
            setEstoque(localEstoque || []);
        } catch (err) {
            console.error("Erro fatal no Motor de Leads:", err);
        } finally {
            setLoading(false);
        }
    };

    // 🚀 O ÚNICO CARREGAMENTO QUE IMPORTA (Reativo a tudo que precisa)
    useEffect(() => {
        console.log('🔥 [LeadsContext] Reatividade Avaliada! Loja:', currentLoja?.id, 'User:', user?.username);
        if (user && currentLoja?.id) {
            console.log('🚀 [LeadsContext] Disparando FETCH das tabelas...');
            loadData(true);
        } else {
            console.log('⏳ [LeadsContext] Aguardando Loja e User estarem prontos...');
        }
    }, [currentLoja?.id, selectedUserView, user?.username, user?.role]); // ← DEPENDÊNCIAS BLINDADAS (user estava faltando!)

    // 2. COMUNICAÇÃO EM TEMPO REAL
    useEffect(() => {
        

        const handleRealtimeUpdate = (event, { table, data, type }) => {
            if (table === 'visitas' && data) {
                setLeads(prev => {
                    if (type === 'DELETE') return prev.filter(v => v.id !== data.id);
                    const idx = prev.findIndex(v => v.id === data.id);

                    if (type === 'INSERT' && !idx) {
                        window.dispatchEvent(new CustomEvent('show-notification', {
                            detail: { message: `Novo Lead Recebido: ${data.cliente}`, type: 'success' }
                        }));
                    }

                    if (idx >= 0) {
                        const newArr = [...prev];
                        newArr[idx] = { ...prev[idx], ...data };
                        return newArr;
                    }
                    return [data, ...prev];
                });
            }
            if (table === 'notas' || table === 'estoque') loadData(false);
        };

        const handleRefresh = (e, table) => {
            if (table === 'visitas' || table === 'notas' || table === 'estoque' || table === 'all') loadData(false);
        };

        // electronAPI.onRealtimeUpdate(handleRealtimeUpdate);
        electronAPI.onRefreshData(handleRefresh);

        return () => {
            // Managed by electronAPI cleanup;
            // Managed by electronAPI.onRefreshData unsubscribe;
        };
    }, [currentLoja?.id]);

    // 3. INTELIGÊNCIA CENTRALIZADA
    const processedData = useMemo(() => {
        const now = new Date();
        const getSafeDate = (d) => {
            if (!d) return null;
            const date = new Date(d);
            return isNaN(date.getTime()) ? null : date;
        };

        const getISODate = (d) => {
            const date = getSafeDate(d);
            return date ? date.toISOString().split('T')[0] : null;
        };

        const todayISO = getISODate(now);

        let overdue = [];
        let dueToday = [];
        let slaRisks = [];
        let filteredLeads = [];

        if (!leads || !Array.isArray(leads)) {
            return { filteredLeads: [], overdueRecontacts: [], dueTodayRecontacts: [], slaRisks: [], rawLeads: [], estoque: estoque || [] };
        }

        leads.forEach(lead => {
            try {
                let status = lead.status_pipeline || lead.status || '';
                if (status === 'Pendente') status = 'Novos Leads';
                if (status === 'Em Contato') status = 'Primeiro Contato';
                if (status === 'Em Negócio') status = 'Em Negociação';
                if (status === 'Agendados') status = 'Agendado';
                if (status === 'Recontatos') status = 'Recontato';

                const isClosed = ['ganho', 'perdido', 'cancelado', 'vendido', 'venda concluída', 'finalizado'].includes(status.toLowerCase());

                let tempCalculada = 'Quente';
                const lastAction = getSafeDate(lead.updated_at || lead.datahora || lead.created_at) || now;
                const hoursInactive = (now - lastAction) / (1000 * 60 * 60);

                if (!isClosed) {
                    if (hoursInactive > 24) tempCalculada = 'Frio';
                    else if (hoursInactive > 4) tempCalculada = 'Morno';
                    else tempCalculada = 'Quente';
                } else {
                    tempCalculada = lead.temperatura || 'Frio';
                }

                let isSlaRisk = false;
                if (!isClosed) {
                    if (status.toLowerCase() === 'novos leads') {
                        const minutesSinceCreation = (now - lastAction) / (1000 * 60);
                        if (minutesSinceCreation >= 8 && !lead.data_agendamento) {
                            isSlaRisk = true;
                        }
                    }

                    const taskDate = getSafeDate(lead.data_agendamento || lead.data_recontato);
                    if ((!taskDate || taskDate < now) && hoursInactive > 24) {
                        isSlaRisk = true;
                    }
                }

                const normalizedLead = {
                    ...lead,
                    status_pipeline: status,
                    temperatura: tempCalculada,
                    isSlaRisk
                };

                if (isSlaRisk) slaRisks.push(normalizedLead);

                if (!isClosed) {
                    const taskDate = getSafeDate(lead.data_agendamento || lead.data_recontato);
                    if (taskDate) {
                        const isOverdue = taskDate < now;
                        const taskISO = getISODate(taskDate);
                        const isToday = taskISO === todayISO;

                        if (isOverdue && !isToday) overdue.push(normalizedLead);
                        else if (isToday) dueToday.push(normalizedLead);
                    }
                }

                if (periodFilter.includes('all')) {
                    filteredLeads.push(normalizedLead);
                    return;
                }

                if (!isClosed) {
                    filteredLeads.push(normalizedLead);
                    return;
                }

                const leadDateObj = getSafeDate(lead.created_at || lead.datahora);
                if (!leadDateObj) {
                    filteredLeads.push(normalizedLead);
                    return;
                }

                const leadYearMonth = `${leadDateObj.getFullYear()}-${String(leadDateObj.getMonth() + 1).padStart(2, '0')}`;

                if (periodFilter.includes('current_month')) {
                    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (leadYearMonth === currentYearMonth) {
                        filteredLeads.push(normalizedLead);
                    }
                } else if (periodFilter.includes(leadYearMonth)) {
                    filteredLeads.push(normalizedLead);
                }
            } catch (err) {
                console.error("Erro ao processar lead:", lead.id, err);
            }
        });

        return {
            filteredLeads,
            overdueRecontacts: overdue,
            dueTodayRecontacts: dueToday,
            slaRisks,
            rawLeads: leads,
            estoque
        };
    }, [leads, periodFilter, estoque]);

    return (
        <LeadsContext.Provider value={{
            ...processedData,
            notas,
            loading,
            periodFilter,
            setPeriodFilter,
            selectedUserView,
            setSelectedUserView,
            refreshData: loadData
        }}>
            {children}
        </LeadsContext.Provider>
    );
}

export const useLeads = () => useContext(LeadsContext);
