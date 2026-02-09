import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, Calendar, Lock, Unlock, Save, Trophy, Medal, Zap, BarChart3, Rocket } from 'lucide-react';
import { useLoja } from '../context/LojaContext';

const ProgressBar = ({ value, max, label, color }) => {
    const percent = Math.min(Math.round((value / max) * 100), 100) || 0;

    let neonColor = 'rgba(34, 211, 238, 0.5)'; // default cyan
    let glowClass = 'shadow-[0_0_10px_rgba(34,211,238,0.5)]';
    let bgClass = 'bg-cyan-500';

    if (color === 'green') {
        neonColor = 'rgba(16, 185, 129, 0.5)';
        glowClass = 'shadow-[0_0_10px_rgba(16,185,129,0.5)]';
        bgClass = 'bg-emerald-500';
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[11px] font-black  tracking-[0.2em] text-gray-500 font-rajdhani">{label}</span>
                <span className={`text-base font-black font-rajdhani ${percent >= 100 ? 'text-white' : 'text-gray-300'}`}>
                    {value} <span className="text-xs text-gray-600">/ {max}</span>
                </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full relative ${bgClass} ${glowClass}`}
                >
                    {/* Efeito Shimmer Animado */}
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full"
                    />
                </motion.div>
            </div>
        </div>
    );
};

const SDRCard = ({ sdr, metas, rank }) => {
    const isChampion = rank === 0 && (sdr.vendas_mes > 0 || sdr.visitas_semana > 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.1 }}
            className={`relative p-8 rounded-[2rem] border bg-[#0f172a]/40 backdrop-blur-xl transition-all group overflow-hidden ${isChampion ? 'border-yellow-500/30' : 'border-white/5 hover:border-cyan-500/20'}`}
        >
            {/* Background Decorativo */}
            <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <BarChart3 size={180} className="text-white" />
            </div>

            {isChampion && (
                <div className="absolute top-0 right-0">
                    <div className="bg-yellow-500/10 text-yellow-500 px-4 py-1.5 rounded-bl-2xl border-l border-b border-yellow-500/20 text-[10px] font-black  tracking-widest flex items-center gap-2">
                        <Trophy size={12} strokeWidth={3} />
                        MVP do Mês
                    </div>
                </div>
            )}

            <div className="flex items-center gap-5 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl font-rajdhani border relative ${isChampion ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                    {(sdr.username || '??').substring(0, 2).toUpperCase()}
                    {isChampion && <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-2xl border-t border-yellow-500/40" />}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className={`text-xl font-bold truncate font-rajdhani ${isChampion ? 'text-yellow-400' : 'text-white'}`}>
                        {sdr.nome_completo || sdr.username}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500  tracking-[0.2em] font-rajdhani">SDR Executive</p>
                </div>
                {rank === 1 && <Medal size={24} className="text-slate-400 opacity-50" />}
                {rank === 2 && <Medal size={24} className="text-orange-900 opacity-50" />}
            </div>

            <div className="space-y-6">
                <ProgressBar value={sdr.visitas_semana} max={metas.visita_semanal} label="Visitas (Semana)" color="cyan" />
                <ProgressBar value={sdr.vendas_mes} max={metas.venda_mensal} label="Vendas (Mês)" color="green" />
            </div>

            {/* Percentual Geral */}
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-500  tracking-widest font-rajdhani">Eficiência de Fechamento</span>
                    <div className="flex items-center gap-2 mt-1.5">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-2 h-2 rounded-full ${isChampion ? 'bg-yellow-500' : 'bg-cyan-500'}`} />
                        <span className="text-xs text-gray-400 font-bold font-rajdhani  tracking-wider">Mês Corrente</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-4xl font-black italic font-rajdhani leading-none ${isChampion ? 'text-yellow-400' : 'text-white'}`}>
                        {Math.round((sdr.vendas_mes / (metas.venda_mensal || 1)) * 100)}%
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

const Metas = () => {
    const { currentLoja } = useLoja();
    const [metas, setMetas] = useState({ visita_semanal: 0, venda_mensal: 0 });
    const [performance, setPerformance] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [tempMetas, setTempMetas] = useState({ visita_semanal: 0, venda_mensal: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { ipcRenderer } = window.require('electron');
            const role = localStorage.getItem('userRole');
            setUserRole(role);

            const config = await ipcRenderer.invoke('get-config-meta', currentLoja?.id);
            setMetas(config);
            setTempMetas(config);

            const perf = await ipcRenderer.invoke('get-sdr-performance', currentLoja?.id);
            if (role !== 'admin' && role !== 'master' && role !== 'developer') {
                const myUser = localStorage.getItem('username');
                setPerformance(perf.filter(p => p.username === myUser));
            } else {
                setPerformance(perf);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('set-config-meta', {
                visita: tempMetas.visita_semanal,
                venda: tempMetas.venda_mensal,
                lojaId: currentLoja?.id
            });
            setMetas(tempMetas);
            setEditing(false);
            window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Metas atualizadas com sucesso!', type: 'success' } }));
        } catch (err) { console.error(err); }
    };

    const canEdit = ['master', 'developer', 'admin', 'gerente'].includes(userRole);

    return (
        <div className="h-full flex flex-col overflow-y-auto w-full p-6 bg-[#01091e]">
            {/* Header Cyberpunk */}
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight  font-rajdhani flex items-center gap-3">
                        Metas & <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">Performance</span>
                        <Zap size={32} className="text-yellow-400 fill-yellow-400/20" />
                    </h1>
                    <p className="text-gray-500 font-bold text-sm  tracking-widest mt-1 font-rajdhani">Monitoramento de KPIs em Tempo Real</p>
                </div>

                {canEdit && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => editing ? handleSave() : setEditing(true)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px]  tracking-widest font-rajdhani transition-all border ${editing ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'btn-cyber-primary'}`}
                    >
                        {editing ? <Save size={16} /> : <Target size={16} />}
                        {editing ? 'Confirmar Metas' : 'Ajustar Estratégia'}
                    </motion.button>
                )}
            </div>

            {/* Metas HUD (Cards Grandes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Meta Semanal */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                    className="relative group p-10 rounded-[2.5rem] bg-[#0f172a]/60 border border-cyan-500/20 backdrop-blur-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Calendar size={140} className="text-cyan-400" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-[2px] bg-cyan-500 shadow-[0_0_8px_#22d3ee]"></span>
                            <span className="text-xs font-black text-cyan-400  tracking-[0.3em] font-rajdhani">Meta Semanal</span>
                        </div>

                        <div className="flex items-end gap-6">
                            {editing ? (
                                <input
                                    type="number"
                                    className="bg-cyan-500/5 text-6xl font-black text-white w-32 border-b-2 border-cyan-500 outline-none font-rajdhani px-2"
                                    value={tempMetas.visita_semanal}
                                    onChange={e => setTempMetas({ ...tempMetas, visita_semanal: parseInt(e.target.value) || 0 })}
                                />
                            ) : (
                                <span className="text-7xl font-black text-white tracking-tighter font-rajdhani drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                                    {metas.visita_semanal}
                                </span>
                            )}
                            <div className="flex flex-col mb-2">
                                <span className="text-xl font-black text-white/40 font-rajdhani leading-none">VISITAS</span>
                                <span className="text-[10px] text-gray-600 font-black  tracking-widest font-rajdhani">Agendadas / Visita</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Meta Mensal */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                    className="relative group p-10 rounded-[2.5rem] bg-[#0f172a]/60 border border-emerald-500/20 backdrop-blur-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Rocket size={140} className="text-emerald-400" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                            <span className="text-xs font-black text-emerald-400  tracking-[0.3em] font-rajdhani">Meta Mensal de Vendas</span>
                        </div>

                        <div className="flex items-end gap-6">
                            {editing ? (
                                <input
                                    type="number"
                                    className="bg-emerald-500/5 text-6xl font-black text-white w-32 border-b-2 border-emerald-500 outline-none font-rajdhani px-2"
                                    value={tempMetas.venda_mensal}
                                    onChange={e => setTempMetas({ ...tempMetas, venda_mensal: parseInt(e.target.value) || 0 })}
                                />
                            ) : (
                                <span className="text-7xl font-black text-white tracking-tighter font-rajdhani drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                                    {metas.venda_mensal}
                                </span>
                            )}
                            <div className="flex flex-col mb-2">
                                <span className="text-xl font-black text-white/40 font-rajdhani leading-none">VENDAS</span>
                                <span className="text-[10px] text-gray-600 font-black  tracking-widest font-rajdhani">Fechamentos Confirmados</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* SDR Ranking Divider */}
            <div className="flex items-center gap-6 mb-10">
                <h2 className="text-sm font-black text-white  tracking-[0.4em] font-rajdhani flex items-center gap-3 whitespace-nowrap">
                    <Users size={18} className="text-cyan-500" />
                    Ranking de Performance Usuários
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
            </div>

            {/* Ranking Grid */}
            {performance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {performance.map((sdr, index) => (
                        <SDRCard key={sdr.username} sdr={sdr} metas={metas} rank={index} />
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] border border-dashed border-white/5 rounded-[3rem] opacity-30">
                    <BarChart3 size={64} className="mb-4" />
                    <p className="font-rajdhani  tracking-widest text-lg font-bold">Nenhum dado de performance disponível</p>
                </div>
            )}
        </div>
    );
};

export default Metas;
