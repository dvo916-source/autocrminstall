import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, ChevronRight, MessageSquare } from 'lucide-react';

const LostLeadModal = ({ lead, onConfirm, onCancel }) => {
    const [motivo, setMotivo] = useState('');
    const [detalhes, setDetalhes] = useState('');

    const motivos = [
        'Preço alto',
        'Comprou concorrente',
        'Sem interesse',
        'Não respondeu',
        'Financiamento negado',
        'Veículo vendido',
        'Outro'
    ];

    if (!lead) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-red-500/10 to-transparent">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight">
                                    Confirmar Perda do Lead
                                </h3>
                            </div>
                            <button
                                onClick={onCancel}
                                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/60 text-sm">
                            Por que <span className="text-white font-medium">{lead.cliente}</span> foi marcado como perdido?
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Motivos Grid */}
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                                Motivo Principal
                            </label>
                            <div className="space-y-2">
                                {motivos.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMotivo(m)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${motivo === m
                                            ? 'bg-red-500/20 border-red-500/50 text-white'
                                            : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{m}</span>
                                        {motivo === m && <ChevronRight className="w-4 h-4 text-red-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Detalhes (Condicional ou Permanente) */}
                        <AnimatePresence>
                            {(motivo === 'Outro' || motivo !== '') && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" />
                                        Detalhes Adicionais
                                    </label>
                                    <textarea
                                        value={detalhes}
                                        onChange={(e) => setDetalhes(e.target.value)}
                                        placeholder={motivo === 'Outro' ? "Descreva o motivo detalhadamente..." : "Opcional: Adicione um comentário..."}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 min-h-[100px] resize-none text-sm transition-all"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl font-medium text-sm transition-all"
                        >
                            CANCELAR
                        </button>
                        <button
                            onClick={() => {
                                console.log('📤 Modal Confirmar Perda:', { motivo, detalhes });
                                onConfirm(motivo, detalhes);
                            }}
                            disabled={!motivo || (motivo === 'Outro' && !detalhes.trim())}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-900/30 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm shadow-lg shadow-red-900/20 transition-all"
                        >
                            CONFIRMAR PERDA
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LostLeadModal;
