import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, ArrowRight, Power, PowerOff, Edit, Flame, Thermometer, Snowflake, TrendingUp } from 'lucide-react';

const Agendamentos = () => {
    const [teamData, setTeamData] = useState([]);
    const [tempStats, setTempStats] = useState({ quente: 0, morno: 0, frio: 0 });
    const [loading, setLoading] = useState(true);

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
                ipcRenderer.invoke('get-temperature-stats')
            ]);
            setTeamData(summary || []);
            setTempStats(temperatures || { quente: 0, morno: 0, frio: 0 });
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
                    <h1 className="text-4xl font-black text-white tracking-tight italic  font-rajdhani">
                        Gestão de <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">Agendamentos</span>
                    </h1>
                    <p className="text-gray-400 font-bold text-sm  tracking-widest flex items-center gap-2 mt-1">
                        <TrendingUp size={16} className="text-cyan-500" />
                        Produtividade do time em tempo real.
                    </p>
                </div>
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
                            <span className="text-xs font-black text-orange-400  tracking-[0.3em] font-rajdhani">Vendas Quentes</span>
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
                            <span className="text-xs font-black text-yellow-400  tracking-[0.3em] font-rajdhani">Vendas Mornas</span>
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
                            <span className="text-xs font-black text-blue-400  tracking-[0.3em] font-rajdhani">Vendas Frias</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white font-rajdhani drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                {tempStats.frio}
                            </span>
                            <span className="text-xs text-blue-500/50 font-bold  font-rajdhani">Hoje</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Lista de Membros do Time */}
            <h2 className="text-sm font-black text-white  tracking-[0.4em] mb-6 flex items-center gap-4">
                <Users size={18} className="text-purple-500" />
                Performance dos Usuários
                <div className="h-px flex-1 bg-gradient-to-r from-purple-500/20 to-transparent"></div>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-12">
                {teamData.map((member, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group relative overflow-hidden ${!member.ativo && 'opacity-60 grayscale'}`}
                    >
                        {!member.ativo && (
                            <div className="absolute top-4 right-4 px-3 py-1 bg-red-500/20 text-red-400 text-[8px] font-black  rounded-full tracking-tighter z-20">
                                Conta Pausada
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border group-hover:scale-110 transition-transform font-rajdhani ${member.ativo ? 'bg-purple-600/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'bg-gray-600/10 text-gray-500 border-white/5'}`}>
                                {(member.nome || '??').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className={`text-xl font-bold truncate font-rajdhani ${member.ativo ? 'text-white' : 'text-gray-500'}`}>
                                    {member.nome_completo || member.nome}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-bold  tracking-wider truncate">{member.email || 'SDR / Vendedor'}</p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[10px] text-gray-500 font-black  mb-1 tracking-widest">Agendamentos</p>
                                <p className={`text-4xl font-black font-rajdhani ${member.ativo ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'text-gray-600'}`}>{member.total}</p>
                            </div>

                            {isManager ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleUserStatus(member); }}
                                        className={`p-3 rounded-2xl transition-all ${member.ativo ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white'}`}
                                        title={member.ativo ? "Pausar SDR" : "Reativar SDR"}
                                    >
                                        {member.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                                    </button>
                                    <button
                                        className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl hover:bg-cyan-500 hover:text-white transition-all"
                                        title="Administrar Conta"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.hash = '#/usuarios';
                                        }}
                                    >
                                        <Edit size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 bg-white/5 rounded-2xl text-white/50 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                    <ArrowRight size={20} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {teamData.length === 0 && !loading && (
                    <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                        <Users size={48} className="mb-4 opacity-10" />
                        <p className="text-lg font-bold font-rajdhani  tracking-widest text-gray-600">Nenhum agendamento ativo</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agendamentos;
