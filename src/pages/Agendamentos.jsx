import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, ArrowRight, Power, PowerOff, Edit, Flame, Thermometer, Snowflake, TrendingUp, Plus, Clock, Phone, Car } from 'lucide-react';
import NewVisitModal from '../components/NewVisitModal';

const Agendamentos = () => {
    const [teamData, setTeamData] = useState([]);
    const [tempStats, setTempStats] = useState({ quente: 0, morno: 0, frio: 0 });
    const [loading, setLoading] = useState(true);
    const [agendamentosDetalhes, setAgendamentosDetalhes] = useState([]);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

    useEffect(() => {
        loadData();

        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, table) => {
            if (table === 'visitas' || table === 'usuarios') {
                loadData();
            }
        };
        ipcRenderer.on('refresh-data', handleRefresh);

        return () => {
            ipcRenderer.removeListener('refresh-data', handleRefresh);
        };
    }, []);

    const loadData = async () => {
        try {
            const { ipcRenderer } = window.require('electron');
            const [summary, temperatures] = await Promise.all([
                ipcRenderer.invoke('get-agendamentos-resumo'),
                ipcRenderer.invoke('get-temperature-stats'),
                ipcRenderer.invoke('get-agendamentos-detalhes')
            ]);
            setTeamData(summary || []);
            setTempStats(temperatures || { quente: 0, morno: 0, frio: 0 });
            setAgendamentosDetalhes(detalhes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserStatus = async (userObj) => {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('update-user', {
                ...userObj,
                username: userObj.nome, // username no BD é o campo .nome aqui
                ativo: !userObj.ativo
            });
            loadData();
        } catch (err) { console.error(err); }
    };

    const currentUser = JSON.parse(localStorage.getItem('sdr_user') || '{}');
    const isManager = ['master', 'admin', 'gerente', 'developer'].includes(currentUser.role);

    return (
        <div className="h-full flex flex-col w-full">
            {/* Header com Contexto */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Gestão de <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">Agendamentos</span>
                    </h1>
                    <p className="text-gray-400 font-bold text-sm  tracking-widest flex items-center gap-2 mt-1">
                        <TrendingUp size={16} className="text-cyan-500" />
                        Produtividade do time em tempo real.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(34, 211, 238, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsVisitModalOpen(true)}
                    className="h-14 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-white font-black flex items-center gap-3 shadow-xl border-t border-white/20 tracking-tighter"
                >
                    <Plus size={24} strokeWidth={3} />
                    NOVO AGENDAMENTO
                </motion.button>
            </div>

            {/* MAPA DE TEMPERATURA (LEAD HEATMAP) - PREMIUM HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="relative group p-8 rounded-[2.5rem] bg-[#0f172a]/60 border border-orange-500/20 backdrop-blur-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Flame size={120} className="text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-[2px] bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
                            <span className="text-xs font-black text-orange-400 tracking-[0.3em] uppercase">Vendas Quentes</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white font-rajdhani drop-shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                                {tempStats.quente}
                            </span>
                            <span className="text-xs text-orange-500/50 font-bold  font-rajdhani">Hoje</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="relative group p-8 rounded-[2.5rem] bg-[#0f172a]/60 border border-yellow-500/20 backdrop-blur-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Thermometer size={120} className="text-yellow-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-[2px] bg-yellow-500 shadow-[0_0_8px_#eab308]"></span>
                            <span className="text-xs font-black text-yellow-400 tracking-[0.3em] uppercase">Vendas Mornas</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white font-rajdhani drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                                {tempStats.morno}
                            </span>
                            <span className="text-xs text-yellow-500/50 font-bold  font-rajdhani">Hoje</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="relative group p-8 rounded-[2.5rem] bg-[#0f172a]/60 border border-blue-500/20 backdrop-blur-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Snowflake size={120} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
                            <span className="text-xs font-black text-blue-400 tracking-[0.3em] uppercase">Vendas Frias</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                {tempStats.frio}
                            </span>
                            <span className="text-xs text-blue-500/50 font-bold">Hoje</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* NOVA SEÇÃO: AGENDA DO DIA (TIMELINE) */}
            <div className="flex flex-col lg:flex-row gap-8 mb-12 flex-1 min-h-0">
                <div className="flex-[2] flex flex-col min-h-0">
                    <h2 className="text-sm font-black text-white tracking-[0.4em] mb-6 flex items-center gap-4">
                        <Clock size={18} className="text-cyan-500" />
                        Próximas Visitas (Timeline)
                        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 to-transparent"></div>
                    </h2>

                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col p-6 min-h-[400px]">
                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {agendamentosDetalhes.length > 0 ? agendamentosDetalhes.map((v, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center gap-6 p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all group"
                                >
                                    <div className="flex flex-col items-center justify-center w-20 border-r border-white/10 pr-6">
                                        <span className="text-sm font-black text-cyan-400">
                                            {new Date(v.data_agendamento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                                            {new Date(v.data_agendamento).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-black text-white tracking-tight truncate group-hover:text-cyan-400 transition-colors">
                                                {v.cliente}
                                            </span>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${v.temperatura === 'Quente' ? 'bg-orange-500/20 text-orange-400' :
                                                v.temperatura === 'Morno' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {v.temperatura}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold tracking-wide">
                                            <div className="flex items-center gap-1">
                                                <Car size={12} className="text-gray-500" />
                                                <span className="truncate max-w-[150px]">{v.veiculo_interesse}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users size={12} className="text-gray-500" />
                                                <span className="text-gray-300">{v.vendedor_sdr}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {v.telefone && (
                                            <button
                                                onClick={() => window.open(`https://wa.me/55${v.telefone.replace(/\D/g, '')}`, '_blank')}
                                                className="p-3 bg-green-500/10 text-green-400 rounded-2xl hover:bg-green-500 hover:text-white transition-all shadow-lg"
                                            >
                                                <Phone size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => window.location.hash = '#/visitas'}
                                            className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl hover:bg-cyan-500 hover:text-white transition-all shadow-lg"
                                        >
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                                    <Calendar size={48} className="text-gray-500 mb-4" />
                                    <p className="text-sm font-black text-gray-500 tracking-[0.3em] uppercase">AGENDA LIVRE HOJE</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* PERFORMANCE DO TIME (MOVIDO PARA LATERAL) */}
                <div className="flex-1 flex flex-col min-h-0">
                    <h2 className="text-sm font-black text-white tracking-[0.4em] mb-6 flex items-center gap-4">
                        <Users size={18} className="text-purple-500" />
                        Time
                        <div className="h-px flex-1 bg-gradient-to-r from-purple-500/20 to-transparent"></div>
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {teamData.map((member, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white/[0.02] border border-white/5 p-4 rounded-3xl hover:bg-white/[0.04] transition-all group relative flex items-center justify-between ${!member.ativo && 'opacity-50 grayscale'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border ${member.ativo ? 'bg-purple-600/10 text-purple-400 border-purple-500/20' : 'bg-gray-600/10 text-gray-500 border-white/5'}`}>
                                        {(member.nome || '??').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white truncate w-24">
                                            {member.nome_completo || member.nome}
                                        </h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-purple-400 leading-none">{member.total}</span>
                                            <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">Visitas</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isManager && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleUserStatus(member); }}
                                            className="p-2 bg-orange-500/10 text-orange-400 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                                        >
                                            {member.ativo ? <PowerOff size={14} /> : <Power size={14} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setAgendamentosDetalhes(agendamentosDetalhes.filter(a => a.vendedor_sdr === member.nome))}
                                        className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500 hover:text-white transition-all"
                                    >
                                        <Calendar size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <NewVisitModal
                isOpen={isVisitModalOpen}
                onClose={() => {
                    setIsVisitModalOpen(false);
                    loadData();
                }}
            />
        </div>
    );
};

export default Agendamentos;
