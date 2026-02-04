import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Calendar, Clock, Target, AlertTriangle, RefreshCw, Car, CheckCircle, ChevronRight, User, MapPin, MessageCircle, Award, MousePointer, ArrowRight, Zap, PieChart, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// import { supabase } from '../lib/supabase'; // Not needed anymore
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

const ModernStatCard = ({ title, value, label, icon: Icon, color, delay }) => {
    const colorStyles = {
        blue: {
            bg: 'from-blue-500/10 to-transparent',
            border: 'border-blue-500/20 group-hover:border-blue-500/40',
            text: 'text-blue-400',
            glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-400'
        },
        purple: {
            bg: 'from-purple-500/10 to-transparent',
            border: 'border-purple-500/20 group-hover:border-purple-500/40',
            text: 'text-purple-400',
            glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
            iconBg: 'bg-purple-500/10',
            iconColor: 'text-purple-400'
        },
        emerald: {
            bg: 'from-emerald-500/10 to-transparent',
            border: 'border-emerald-500/20 group-hover:border-emerald-500/40',
            text: 'text-emerald-400',
            glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400'
        },
        orange: {
            bg: 'from-orange-500/10 to-transparent',
            border: 'border-orange-500/20 group-hover:border-orange-500/40',
            text: 'text-orange-400',
            glow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]',
            iconBg: 'bg-orange-500/10',
            iconColor: 'text-orange-400'
        }
    };

    const style = colorStyles[color];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay * 0.1, duration: 0.5 }}
            className={`relative bg-gradient-to-br ${style.bg} backdrop-blur-xl p-6 rounded-[2rem] border ${style.border} flex items-center gap-6 group transition-all duration-300 min-w-[200px] flex-1 overflow-hidden ${style.glow}`}
        >
            {/* Background Lines Decoration */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-[50px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${style.iconBg} border border-white/5 shadow-inner`}>
                <Icon size={28} className={`${style.iconColor} drop-shadow-md`} />
            </div>

            <div className="relative z-10">
                <p className="text-[10px] font-bold  tracking-[0.2em] text-gray-500 mb-1 font-rajdhani">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold text-white whitespace-nowrap font-rajdhani drop-shadow-lg`}>{value}</span>
                    <span className="text-[10px] font-bold text-gray-400  tracking-widest font-rajdhani">{label}</span>
                </div>
            </div>
        </motion.div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f172a] border border-white/10 p-4 rounded-xl shadow-2xl">
                <p className="text-gray-400 text-xs font-bold  tracking-widest mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-black flex items-center gap-2" style={{ color: entry.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState(7); // 7, 15, 30
    const [platform, setPlatform] = useState('todas');
    const [stats, setStats] = useState({ leads: 0, atendidos: 0, agendados: 0, vendas: 0, conversao: 0 });
    const [funnelData, setFunnelData] = useState([]);
    const [sourceData, setSourceData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [competition, setCompetition] = useState(null);

    // --- DATA FETCHING (REAL) ---
    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (!window.ipcRenderer) return;

                // Fetch stats and competition data in parallel
                const [data, competitionData] = await Promise.all([
                    window.ipcRenderer.invoke('get-stats', period),
                    window.ipcRenderer.invoke('get-competition')
                ]);

                setCompetition(competitionData);

                if (data) {
                    // 1. Update KPI Stats
                    const leads = data.leadsTotal || 0;
                    const ventas = data.leadsVendidos || 0;

                    setStats({
                        leads: leads,
                        atendidos: data.leadsAtendidos || 0,
                        agendados: data.leadsAgendados || 0,
                        vendas: ventas,
                        conversao: leads > 0 ? Math.round((ventas / leads) * 100) : 0
                    });

                    // 2. Build Funnel Data
                    setFunnelData([
                        { stage: 'Entrada (Leads)', value: leads, color: '#3b82f6', icon: Users },
                        { stage: 'Atendidos', value: data.leadsAtendidos || 0, color: '#8b5cf6', icon: MessageCircle },
                        { stage: 'Agendados', value: data.leadsAgendados || 0, color: '#10b981', icon: Calendar },
                        { stage: 'Vendas', value: ventas, color: '#f59e0b', icon: Award },
                    ]);

                    // 3. Build Source Data
                    setSourceData(data.leadsPorPortal || []);

                    // 4. Build Chart Data
                    setChartData(data.chartData || []);
                }
            } catch (error) {
                console.error("Erro ao buscar stats:", error);
            }
        };

        fetchStats();
    }, [period, platform]);


    return (
        <div className="h-full flex flex-col space-y-4 w-full">
            {/* Header with Advanced Filters */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 px-1">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white italic tracking-tight  leading-none flex items-center gap-3 font-rajdhani drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        Painel de Inteligência
                        <span className="bg-blue-600/20 text-blue-400 text-sm px-3 py-1 rounded-full not-italic tracking-widest border border-blue-500/20 font-rajdhani font-semibold shadow-[0_0_10px_rgba(59,130,246,0.2)]">PRO</span>
                    </h1>
                    <p className="text-sm font-bold text-gray-500  tracking-widest mt-2 font-rajdhani">Visão Estratégica & Performance Global</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Period Selector */}
                    <div className="bg-[#1e293b]/80 p-1.5 rounded-xl border border-white/10 flex gap-1">
                        {[7, 15, 30].map((d) => (
                            <button
                                key={d}
                                onClick={() => setPeriod(d)}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${period === d
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {d}D
                            </button>
                        ))}
                    </div>

                    {/* Platform Selector */}
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="bg-[#1e293b]/80 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/10 outline-none focus:border-blue-500/50 appearance-none min-w-[140px] cursor-pointer hover:bg-[#1e293b]"
                    >
                        <option value="todas">Todos os Canais</option>
                        <option value="olx">OLX</option>
                        <option value="icarros">iCarros</option>
                        <option value="site">Site Oficial</option>
                        <option value="instagram">Instagram</option>
                    </select>


                </div>
            </header>

            {/* KPI Cards Row - Adaptive Grid */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-3 shrink-0 px-1">
                <ModernStatCard title="Leads Totais" value={stats.leads} label="Novos" icon={Users} color="blue" delay={0} />
                <ModernStatCard title="Em Atendimento" value={stats.atendidos} label="Ativos" icon={MessageCircle} color="purple" delay={1} />
                <ModernStatCard title="Fechamentos" value={stats.vendas} label="Vendas" icon={Award} color="emerald" delay={2} />
                <ModernStatCard title="Taxa Global" value={`${stats.conversao}%`} label="Conversão" icon={TrendingUp} color="orange" delay={3} />
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
                                {competition.leaderboard.map((sdr, index) => (
                                    <div key={sdr.name} className={`relative p-3 rounded-xl border ${index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/40' : 'bg-white/5 border-white/5'} flex items-center justify-between gap-4`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold ${index === 0 ? 'text-white' : 'text-gray-300'}`}>{sdr.name}</p>
                                                <p className="text-[9px] text-gray-500  tracking-wider">{sdr.visitas} Visitas • {sdr.vendas} Vendas</p>
                                            </div>
                                        </div>

                                        <div className="w-24">
                                            <div className="flex justify-between text-[8px] font-bold text-gray-400 mb-1">
                                                <span>{sdr.progress}%</span>
                                                {sdr.completed && <span className="text-green-400">COMPLETO!</span>}
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${sdr.progress}%` }}
                                                    className={`h-full rounded-full ${sdr.completed ? 'bg-green-500' : index === 0 ? 'bg-yellow-500' : 'bg-blue-500'}`}
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
                                        <linearGradient id="colorAtend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                                        dy={10}
                                        interval={period > 15 ? 4 : 1}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                    <Area type="monotone" dataKey="atendimentos" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAtend)" />
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
