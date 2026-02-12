
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Calendar, Clock, Target, AlertTriangle, RefreshCw, Car, CheckCircle, ChevronRight, User, MapPin, MessageCircle, Award, MousePointer, ArrowRight, Zap, PieChart, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../context/LojaContext';
// import { supabase } from '../lib/supabase'; // Not needed anymore
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

const ModernStatCard = ({ title, value, label, icon: Icon, color, delay, compareValue }) => {
    const colorStyles = {
        blue: {
            bg: 'from-blue-500/10 to-transparent',
            border: 'border-blue-500/20 group-hover:border-blue-500/40',
            text: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-400'
        },
        purple: {
            bg: 'from-purple-500/10 to-transparent',
            border: 'border-purple-500/20 group-hover:border-purple-500/40',
            text: 'text-purple-400',
            iconBg: 'bg-purple-500/10',
            iconColor: 'text-purple-400'
        },
        emerald: {
            bg: 'from-emerald-500/10 to-transparent',
            border: 'border-emerald-500/20 group-hover:border-emerald-500/40',
            text: 'text-emerald-400',
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400'
        },
        orange: {
            bg: 'from-orange-500/10 to-transparent',
            border: 'border-orange-500/20 group-hover:border-orange-500/40',
            text: 'text-orange-400',
            iconBg: 'bg-orange-500/10',
            iconColor: 'text-orange-400'
        }
    };

    const style = colorStyles[color];

    // Calcula a diferença percentual se houver comparação
    const renderComparison = () => {
        if (compareValue === undefined || compareValue === null) return null;

        // Remove '%' e converte para número se for string
        const val = typeof value === 'string' ? parseFloat(value) : value;
        const cVal = typeof compareValue === 'string' ? parseFloat(compareValue) : compareValue;

        if (cVal === 0) return null;

        const diff = ((val - cVal) / cVal) * 100;
        const isUp = diff >= 0;

        return (
            <div className={`flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'} text-[10px] font-black mt-1`}>
                {isUp ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
                {isUp ? '+' : ''}{Math.round(diff)}% vs anterior
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay * 0.1, duration: 0.5 }}
            className={`relative bg-gradient-to-br ${style.bg} backdrop-blur-xl p-6 rounded-[2rem] border ${style.border} flex items-center gap-6 group transition-all duration-300 min-w-[200px] flex-1 overflow-hidden`}
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${style.iconBg} border border-white/5 shadow-inner`}>
                <Icon size={28} className={`${style.iconColor} drop-shadow-md`} />
            </div>

            <div className="relative z-10">
                <p className="text-[10px] font-bold  tracking-[0.2em] text-gray-500 mb-1 font-rajdhani">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold text-white whitespace-nowrap font-rajdhani drop-shadow-lg`}>{value}</span>
                    <span className="text-[10px] font-bold text-gray-400  tracking-widest font-rajdhani">{label}</span>
                </div>
                {renderComparison()}
            </div>
        </motion.div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[150px]">
                <p className="text-gray-400 text-[10px] font-black  tracking-widest mb-3 uppercase">Dia {label}</p>
                <div className="space-y-2">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{entry.name}</span>
                            </div>
                            <span className="text-xs font-black text-white">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const Dashboard = ({ user }) => {
    const { currentLoja } = useLoja();
    const navigate = useNavigate();

    // Estados de Data
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return { month: now.getMonth() + 1, year: now.getFullYear() };
    });
    const [compareMonth, setCompareMonth] = useState(null);
    const [isCompareMode, setIsCompareMode] = useState(false);

    const [platform, setPlatform] = useState('todas');
    const [stats, setStats] = useState({
        leads: 0,
        atendidos: 0,
        agendados: 0,
        vendas: 0,
        conversao: 0,
        compare: null // { leads, atendidos, vendas, conversao }
    });
    const [funnelData, setFunnelData] = useState([]);
    const [sourceData, setSourceData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [competition, setCompetition] = useState(null);

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const years = [2024, 2025, 2026];

    // --- DATA FETCHING (REAL) ---
    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (!window.ipcRenderer) return;

                const targetLojaId = currentLoja?.id || user?.loja_id;

                console.log("🚀 [Dashboard] Fetching Stats...");
                console.log(" -> Month:", selectedMonth.month, "Year:", selectedMonth.year);
                console.log(" -> Target Loja ID:", targetLojaId);
                console.log(" -> Current User:", user);
                console.log(" -> Current Loja Context:", currentLoja);

                // Busca dados do mês selecionado
                const [data, competitionData] = await Promise.all([
                    window.ipcRenderer.invoke('get-stats', {
                        month: selectedMonth.month,
                        year: selectedMonth.year,
                        lojaId: targetLojaId
                    }),
                    window.ipcRenderer.invoke('get-competition', targetLojaId)
                ]);

                setCompetition(competitionData);

                let compareData = null;
                if (isCompareMode && compareMonth) {
                    compareData = await window.ipcRenderer.invoke('get-stats', {
                        month: compareMonth.month,
                        year: compareMonth.year,
                        lojaId: targetLojaId
                    });
                }

                if (data) {
                    const leads = data.leadsTotal || 0;
                    const ventas = data.leadsVendidos || 0;

                    const currentStats = {
                        leads: leads,
                        atendidos: data.leadsAtendidos || 0,
                        agendados: data.leadsAgendados || 0,
                        vendas: ventas,
                        conversao: leads > 0 ? Math.round((ventas / leads) * 100) : 0
                    };

                    let comparisonResult = null;
                    let mergedChartData = data.chartData || [];

                    if (compareData) {
                        const cLeads = compareData.leadsTotal || 0;
                        const cVendas = compareData.leadsVendidos || 0;
                        comparisonResult = {
                            leads: cLeads,
                            atendidos: compareData.leadsAtendidos || 0,
                            vendas: cVendas,
                            conversao: cLeads > 0 ? Math.round((cVendas / cLeads) * 100) : 0
                        };

                        // Mescla os dados do gráfico para comparação
                        // Usamos o índice do dia (1 a 31) como base
                        const cChart = compareData.chartData || [];
                        mergedChartData = mergedChartData.map((item, index) => {
                            const cItem = cChart[index];
                            return {
                                ...item,
                                leadsOriginal: item.leads,
                                leadsCompare: cItem ? cItem.leads : 0,
                                vendasOriginal: item.vendas,
                                vendasCompare: cItem ? cItem.vendas : 0,
                                // Chaves compatíveis com o Tooltip atual
                                leads: item.leads,
                                atendimentos: item.atendimentos
                            };
                        });
                    }

                    setStats({
                        ...currentStats,
                        compare: comparisonResult
                    });

                    // 2. Build Funnel Data
                    setFunnelData([
                        { stage: 'Entrada (Leads)', value: leads, color: '#3b82f6', icon: Users },
                        { stage: 'Atendidos', value: data.leadsAtendidos || 0, color: '#8b5cf6', icon: MessageCircle },
                        { stage: 'Agendados', value: data.leadsAgendados || 0, color: '#10b981', icon: Calendar },
                        { stage: 'Vendas', value: ventas, color: '#f59e0b', icon: Award },
                    ]);

                    setSourceData(data.leadsPorPortal || []);
                    setChartData(mergedChartData);
                }
            } catch (error) {
                console.error("Erro ao buscar stats:", error);
            }
        };

        fetchStats();
    }, [selectedMonth, compareMonth, isCompareMode, platform, currentLoja?.id]);


    return (
        <div className="h-full flex flex-col space-y-4 w-full">

            {/* Header with Monthly Selection and Comparison */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 px-1">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white italic tracking-tight  leading-none flex items-center gap-3 font-rajdhani drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        Painel de Inteligência
                        <span className="bg-blue-600/20 text-blue-400 text-sm px-3 py-1 rounded-full not-italic tracking-widest border border-blue-500/20 font-rajdhani font-semibold shadow-[0_0_10px_rgba(59,130,246,0.2)]">PRO</span>
                    </h1>
                    <p className="text-sm font-bold text-gray-500  tracking-widest mt-2 font-rajdhani text-blue-400/80">Dashboard Estratégico Mensal</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filtro Mês Principal */}
                    <div className="flex items-center gap-2 bg-[#1e293b]/80 p-1.5 rounded-2xl border border-white/10 group hover:border-blue-500/30 transition-all">
                        <Calendar size={16} className="text-blue-400 ml-2" />
                        <select
                            value={selectedMonth.month}
                            onChange={(e) => setSelectedMonth({ ...selectedMonth, month: parseInt(e.target.value) })}
                            className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i + 1} className="bg-[#0f172a]">{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedMonth.year}
                            onChange={(e) => setSelectedMonth({ ...selectedMonth, year: parseInt(e.target.value) })}
                            className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y} value={y} className="bg-[#0f172a]">{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botão Comparar */}
                    <button
                        onClick={() => {
                            setIsCompareMode(!isCompareMode);
                            if (!isCompareMode && !compareMonth) {
                                // Define o mês anterior como padrão para comparação
                                const prev = new Date(selectedMonth.year, selectedMonth.month - 2, 1);
                                setCompareMonth({ month: prev.getMonth() + 1, year: prev.getFullYear() });
                            }
                        }}
                        className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCompareMode
                            ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        <RefreshCw size={14} className={isCompareMode ? 'animate-spin-slow' : ''} />
                        {isCompareMode ? 'Comparando...' : 'Comparar'}
                    </button>

                    {/* Filtro Mês Comparação (Apenas se ativo) */}
                    <AnimatePresence>
                        {isCompareMode && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-2 bg-emerald-500/10 p-1.5 rounded-2xl border border-emerald-500/20"
                            >
                                <Users size={16} className="text-emerald-400 ml-2" />
                                <span className="text-[10px] font-black text-gray-500 uppercase mr-1">Vs</span>
                                <select
                                    value={compareMonth?.month}
                                    onChange={(e) => setCompareMonth({ ...compareMonth, month: parseInt(e.target.value) })}
                                    className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
                                >
                                    {months.map((m, i) => (
                                        <option key={m} value={i + 1} className="bg-[#0f172a]">{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={compareMonth?.year}
                                    onChange={(e) => setCompareMonth({ ...compareMonth, year: parseInt(e.target.value) })}
                                    className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y} className="bg-[#0f172a]">{y}</option>
                                    ))}
                                </select>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* KPI Cards Row - Adaptive Grid */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-3 shrink-0 px-1">
                <ModernStatCard title="Leads Totais" value={stats.leads} label="Novos" icon={Users} color="blue" delay={0} compareValue={stats.compare?.leads} />
                <ModernStatCard title="Em Atendimento" value={stats.atendidos} label="Ativos" icon={MessageCircle} color="purple" delay={1} compareValue={stats.compare?.atendidos} />
                <ModernStatCard title="Fechamentos" value={stats.vendas} label="Vendas" icon={Award} color="emerald" delay={2} compareValue={stats.compare?.vendas} />
                <ModernStatCard title="Taxa Global" value={`${stats.conversao}%`} label="Conversão" icon={TrendingUp} color="orange" delay={3} compareValue={stats.compare?.conversao} />
            </div>

            {/* Main Content Areas - Adaptive Stacking */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 w-full px-1 overflow-y-auto">

                {/* 1. The Sales Funnel (Left - Larger) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-7 bg-[#1e293b]/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 flex flex-col shadow-2xl overflow-hidden relative"
                >
                    <div className="p-8 pb-4 flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-bold text-white  tracking-wider flex items-center gap-3 font-rajdhani drop-shadow-md">
                                <Zap className="text-yellow-500 fill-yellow-500" size={24} />
                                Funil de Vendas
                            </h3>
                            <p className="text-gray-500 text-xs font-semibold  tracking-[0.2em] mt-1 font-rajdhani">Jornada do Cliente: Do Lead à Venda</p>
                        </div>
                    </div>

                    <div className="flex-1 p-8 pt-4 flex flex-col justify-center gap-6">
                        {funnelData.map((step, index) => {
                            const prevValue = index > 0 ? funnelData[index - 1].value : step.value;
                            const dropOff = index > 0 && prevValue > 0 ? Math.round(((prevValue - step.value) / prevValue) * 100) : 0;
                            // Safe percentage calculation to avoid NaN
                            const percentage = funnelData[0].value > 0 ? Math.round((step.value / funnelData[0].value) * 100) : 0;

                            return (
                                <div key={step.stage} className="relative group">
                                    {/* Connection Line */}
                                    {index < funnelData.length - 1 && (
                                        <div className="absolute left-[26px] top-10 bottom-[-20px] w-0.5 border-l-2 border-dashed border-white/10 z-0" />
                                    )}

                                    <div className="flex items-center gap-6 relative z-10">
                                        {/* Icon Bubble */}
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 shadow-lg shrink-0"
                                            style={{ backgroundColor: `${step.color}15`, color: step.color }}
                                        >
                                            <step.icon size={24} />
                                        </div>

                                        {/* Bar & Info */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-bold text-gray-300">{step.stage}</span>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-white block leading-none">{step.value}</span>
                                                    {index > 0 && (
                                                        <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded ml-2">
                                                            -{dropOff}% Quebra
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Visual Bar */}
                                            <div className="h-4 bg-gray-800/50 rounded-full overflow-hidden border border-white/5 relative">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                                                    className="h-full rounded-full relative"
                                                    style={{ backgroundColor: step.color }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* 2. Source Intelligence & Trends (Right - Stacked) */}
                <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">

                    {/* Source Breakdown OR Competition Widget (If Active) */}
                    {competition && competition.campaign ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1 bg-gradient-to-br from-yellow-900/20 to-[#1e293b]/50 backdrop-blur-xl rounded-[2.5rem] border border-yellow-500/30 p-8 flex flex-col shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Award size={120} className="text-yellow-500" />
                            </div>

                            <div className="mb-6 z-10">
                                <h3 className="text-base font-bold text-yellow-500  tracking-widest flex items-center gap-2 mb-1 font-rajdhani">
                                    <Award size={18} /> {competition.campaign.title || 'Campanha de Vendas'}
                                </h3>
                                <p className="text-3xl font-bold text-white font-rajdhani drop-shadow-md">{competition.campaign.prize || 'Prêmio Surpresa'}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[10px] font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded border border-white/5">
                                        Meta: {competition.campaign.goal_visits} Visitas
                                    </span>
                                    <span className="text-[10px] font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded border border-white/5">
                                        + {competition.campaign.goal_sales} Vendas
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 z-10 pr-2">
                                {competition.leaderboard.map((vendedor, index) => (
                                    <div key={vendedor.name} className={`relative p-3 rounded-xl border ${index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/40' : 'bg-white/5 border-white/5'} flex items-center justify-between gap-4`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold ${index === 0 ? 'text-white' : 'text-gray-300'}`}>{vendedor.name}</p>
                                                <p className="text-[9px] text-gray-500  tracking-wider">{vendedor.visitas} Visitas • {vendedor.vendas} Vendas</p>
                                            </div>
                                        </div>

                                        <div className="w-24">
                                            <div className="flex justify-between text-[8px] font-bold text-gray-400 mb-1">
                                                <span>{vendedor.progress}%</span>
                                                {vendedor.completed && <span className="text-green-400">COMPLETO!</span>}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${vendedor.progress}%` }}
                                                    className={`h-full rounded-full ${vendedor.completed ? 'bg-green-500' : index === 0 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1 bg-[#1e293b]/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col shadow-xl"
                        >
                            <div className="mb-6 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white  tracking-widest flex items-center gap-2 font-rajdhani drop-shadow-md">
                                    <MousePointer size={18} className="text-blue-400" /> Origem dos Leads
                                </h3>

                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-4">
                                {sourceData.slice(0, 4).map((source, i) => (
                                    <div key={source.name} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 truncate w-full" title={source.name}>{source.name}</span>
                                            {i === 0 && <span className="text-[8px] font-black bg-emerald-500 text-teal-950 px-1.5 py-0.5 rounded shrink-0">TOP 1</span>}
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-2xl font-black text-white">{source.value}</span>
                                            <span className="text-[10px] text-gray-500 mb-1">leads</span>
                                        </div>
                                        <div className="mt-2 text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {source.sales || 0} Vendas ({source.value > 0 ? Math.round(((source.sales || 0) / source.value) * 100) : 0}%)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Timeline Graph */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="h-[280px] bg-[#1e293b]/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col shadow-xl relative overflow-hidden"
                    >
                        <h3 className="text-lg font-bold text-white  tracking-widest flex items-center gap-2 mb-6 font-rajdhani drop-shadow-md">
                            <Target size={18} className="text-purple-400" /> Performance Cronológica
                        </h3>

                        <div className="flex-1 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCompare" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <Tooltip content={<CustomTooltip />} />

                                    {!isCompareMode ? (
                                        <>
                                            <Area name="Leads" type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorLeads)" />
                                            <Area name="Atendimentos" type="monotone" dataKey="atendimentos" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="none" strokeDasharray="5 5" />
                                        </>
                                    ) : (
                                        <>
                                            <Area name="Mês Atual" type="monotone" dataKey="leadsOriginal" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorLeads)" />
                                            <Area name="Mês Ant." type="monotone" dataKey="leadsCompare" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompare)" strokeDasharray="5 5" />
                                        </>
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
