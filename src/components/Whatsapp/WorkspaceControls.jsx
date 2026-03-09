import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Calendar as CalendarIcon, Filter, Search, CircleDollarSign } from 'lucide-react';
import QuickVisitForm from '../QuickVisitForm';

export const WorkspaceControls = ({
    directPhone, setDirectPhone, handleStartDirectChat,
    isQuickVisitOpen, setIsQuickVisitOpen,
    searchEstoque, setSearchEstoque,
    priceLimit, setPriceLimit
}) => {
    return (
        <div className="flex flex-col shrink-0">
            {/* 🔥 ÁREAS 1 e 2: PAINEL DE AÇÕES RÁPIDAS (ZAP + VISITA) */}
            <div className="mb-5 relative p-4 rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden shrink-0">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-2 mb-3 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <MessageSquare size={10} className="text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Iniciar Conversa</span>
                </div>

                <form onSubmit={handleStartDirectChat} className="relative z-10 flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/40 text-[10px] font-black select-none">+55</span>
                        <input
                            type="text"
                            placeholder="DDD + Número"
                            value={directPhone}
                            onChange={(e) => setDirectPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                            className="w-full h-11 bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all font-mono font-medium shadow-inner"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={directPhone.length < 8}
                        className="h-11 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/5 disabled:text-gray-600 disabled:border border-white/5 text-black font-black rounded-2xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:shadow-none"
                    >
                        <Send size={14} className={directPhone.length >= 8 ? "translate-x-0.5" : ""} />
                    </button>
                </form>

                <div className="relative z-10 pt-3 border-t border-white/5">
                    <button
                        onClick={() => setIsQuickVisitOpen(!isQuickVisitOpen)}
                        className={`w-full h-10 flex items-center justify-center gap-2 text-[10px] rounded-xl transition-all border font-black tracking-[0.15em] uppercase ${isQuickVisitOpen ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                        {isQuickVisitOpen ? <><X size={14} /> Cancelar Agendamento</> : <><CalendarIcon size={13} className="text-amber-400" /> Agendar Nova Visita</>}
                    </button>

                    <AnimatePresence>
                        {isQuickVisitOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-2 bg-black/40 rounded-xl border border-white/5"
                            >
                                <div className="px-3 py-3">
                                    <QuickVisitForm onClose={() => setIsQuickVisitOpen(false)} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 🔥 ÁREA 3: CÁPSULA DE FILTROS */}
            <div className="mb-4 shrink-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <Filter size={10} className="text-gray-500" />
                    <span className="text-[9px] font-black text-gray-500 tracking-[0.2em] uppercase">Filtros do Estoque</span>
                </div>

                <div className="flex flex-col gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
                    <div className="relative group/input">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-orange-400 transition-colors" size={13} />
                        <input
                            type="text"
                            placeholder="Buscar veículo (Ex: Civic, 2022...)"
                            value={searchEstoque}
                            onChange={(e) => setSearchEstoque(e.target.value)}
                            className="w-full h-10 bg-black/20 text-[11px] text-white pl-9 pr-4 rounded-xl border border-transparent outline-none focus:border-orange-500/30 focus:bg-orange-500/5 transition-all placeholder:text-gray-600 font-medium"
                        />
                    </div>

                    <div className="relative group/input">
                        <CircleDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={13} />
                        <input
                            type="number"
                            placeholder="Até qual valor? (Opcional)"
                            value={priceLimit}
                            onChange={(e) => setPriceLimit(e.target.value)}
                            className="w-full h-10 bg-black/20 text-[11px] text-white pl-9 pr-4 rounded-xl border border-transparent outline-none focus:border-emerald-500/30 focus:bg-emerald-500/5 transition-all placeholder:text-gray-600 font-medium"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
