import React, { memo } from 'react';
import { motion } from 'framer-motion';
import {
    Store, Pencil, Settings, Database,
    LogOut, ChevronRight, MapPin, Trash2
} from 'lucide-react';
import { SYSTEM_MODULES } from '../../constants/modules';
import * as LucideIcons from 'lucide-react';

const StoreCard = memo(({
    loja, currentLoja, editingId, editForm,
    setEditForm, handleStartEdit, handleSaveEdit,
    setConfigStore, handleAcessarLoja, switchLoja,
    handleDelete, navigate
}) => {

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        }
    };

    const isCurrent = currentLoja?.id === loja.id;

    return (
        <motion.div
            layout
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`group relative p-6 rounded-[2.5rem] border transition-all duration-700 overflow-hidden ${isCurrent
                ? 'bg-[#0f172a]/80 border-blue-500/30 shadow-[0_20px_50px_-20px_rgba(59,130,246,0.3)]'
                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                }`}
        >
            {/* Side Status Bar */}
            <div className={`absolute left-0 top-[20%] bottom-[20%] w-1.5 rounded-r-3xl transition-all duration-700 ${isCurrent ? 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] opacity-100' : 'bg-slate-800 opacity-10 group-hover:bg-blue-500 group-hover:opacity-100'}`} />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border transition-all duration-700 bg-black/60 backdrop-blur-md ${isCurrent
                        ? 'border-blue-500/50 shadow-[0_10px_30px_rgba(59,130,246,0.25)]'
                        : 'border-white/5 group-hover:border-white/20'
                        }`}>
                        {loja.logo_url ? (
                            <div className="relative group/logo w-full h-full flex items-center justify-center p-3.5">
                                <img src={loja.logo_url} className="w-full h-full object-contain relative z-10 filter brightness-110" alt={loja.nome} />
                                <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <Store size={28} className={isCurrent ? "text-blue-400" : "text-slate-600"} />
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <button
                                onClick={() => handleStartEdit(loja)}
                                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                                title="Editar"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => setConfigStore(loja)}
                                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                                title="Configurar"
                            >
                                <Settings size={14} />
                            </button>
                            <button
                                onClick={() => navigate(`/migrar-supabase/${loja.id}`)}
                                className="p-2.5 rounded-xl hover:bg-cyan-500/20 text-slate-500 hover:text-cyan-400 transition-all text-cyan-500/40"
                                title="Migrar/Configurar Supabase"
                            >
                                <Database size={14} />
                            </button>
                        </div>
                        {isCurrent && (
                            <div className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-3 py-1.5 rounded-lg tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                SESSÃO ATIVA
                            </div>
                        )}
                    </div>
                </div>

                <div className="mb-6 min-h-[110px] flex flex-col justify-center">
                    {editingId === loja.id ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-3 p-4 bg-white/5 rounded-[2rem] border border-white/10 shadow-inner"
                        >
                            <div className="relative">
                                <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] ml-2 mb-1.5 block">NOME DA UNIDADE</label>
                                <input
                                    value={editForm.nome}
                                    onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-black text-xs outline-none focus:border-blue-500/50 transition-all font-inter"
                                    placeholder="Nome da Loja"
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] ml-2 mb-1.5 block">DASHBOARD LOGO URL</label>
                                <input
                                    value={editForm.logo_url}
                                    onChange={e => setEditForm({ ...editForm, logo_url: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-bold text-[9px] outline-none focus:border-blue-500/50 transition-all font-mono"
                                    placeholder="URL da Logo"
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h3
                                className="text-3xl font-black text-white italic tracking-tighter uppercase leading-[0.8] group-hover:text-blue-400 transition-colors duration-500 cursor-pointer drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                                onClick={() => handleStartEdit(loja)}
                            >
                                {loja.nome}
                            </h3>

                            <div className="flex items-center gap-2 mt-4">
                                {loja.slug && (
                                    <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-[0.2em] bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 shadow-sm">
                                        @{loja.slug}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-500/80 tracking-widest uppercase">Cloud Sinc</span>
                                </div>
                            </div>

                            {/* Module Indicators (Quick Look) */}
                            <div className="mt-6 flex flex-wrap gap-2 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                                {(() => {
                                    let mods = typeof loja.modulos === 'string' ? JSON.parse(loja.modulos || '[]') : (loja.modulos || []);
                                    if (!Array.isArray(mods)) mods = [];

                                    return SYSTEM_MODULES.filter(m => mods.includes(m.id)).map(mod => {
                                        const IconComponent = LucideIcons[mod.icon];
                                        return (
                                            <div key={mod.id} className="p-1.5 rounded-lg border border-blue-500/30 text-blue-400 bg-blue-500/5" title={mod.label}>
                                                {IconComponent && <IconComponent size={10} strokeWidth={3} />}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {loja.endereco && (
                                <div className="mt-5 flex items-center gap-3 text-slate-500 group-hover:text-slate-400 transition-colors">
                                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                        <MapPin size={10} />
                                    </div>
                                    <p className="text-[10px] font-bold tracking-tight truncate leading-none">
                                        {loja.endereco}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-8">
                    {isCurrent ? (
                        <>
                            <button
                                onClick={() => handleAcessarLoja(loja)}
                                className="flex-[4] relative group/btn flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                ESTA UNIDADE
                            </button>
                            <button
                                onClick={() => switchLoja(null)}
                                className="flex-1 flex items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-inter"
                                title="Sair desta Loja"
                            >
                                <LogOut size={18} strokeWidth={2} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => handleAcessarLoja(loja)}
                                className="flex-[5] relative group/btn flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] transition-all duration-700 overflow-hidden bg-white text-black hover:bg-blue-600 hover:text-white hover:scale-[1.02] shadow-[0_15px_30px_-10px_rgba(255,255,255,0.1)] active:scale-95"
                            >
                                <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 font-inter" />
                                <span className="relative z-10 flex items-center gap-3 font-inter">
                                    ACESSAR PAINEL
                                    <ChevronRight size={18} strokeWidth={4} className="group-hover/btn:translate-x-1 transition-transform" />
                                </span>
                            </button>

                            <button
                                onClick={() => handleDelete(loja.id)}
                                className={`flex-1 flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-700 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all duration-300 ${loja.id === 'irw-motors-main' ? 'opacity-0 pointer-events-none' : ''
                                    }`}
                            >
                                <Trash2 size={18} strokeWidth={2} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

export default StoreCard;
