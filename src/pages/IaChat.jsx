import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Settings, Search, MessageSquare, AlertCircle } from 'lucide-react';
import { useLoja } from '../context/LojaContext';
import AiConfigModal from '../components/AiConfigModal';

const IaChat = ({ user }) => {
    const { currentLoja } = useLoja();
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white overflow-hidden p-6 gap-6">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                        <Bot className="text-cyan-400" size={32} />
                        VEX A.I
                    </h1>
                    <p className="text-slate-400 font-medium mt-1 uppercase tracking-widest text-xs">
                        Central de Inteligência Artificial VexCORE
                    </p>
                </div>
                
                <button 
                    onClick={() => setIsConfigOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-xl transition-all font-bold text-sm"
                >
                    <Settings size={18} className="text-cyan-400" />
                    CONFIGURAR IA
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                <div className="w-1/3 flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex-shrink-0 relative overflow-hidden">
                    <div className="relative z-10 font-bold mb-2">Monitoramento de Conversas</div>
                    <div className="flex items-center justify-center flex-1 opacity-50 text-sm text-center px-4">
                        O painel de chats em tempo real da IA aparecerá aqui em breve.
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 opacity-70">
                        <Bot size={64} className="text-slate-600 drop-shadow-2xl" />
                        <h2 className="text-2xl font-bold font-rajdhani">Hub Neural Online</h2>
                        <p className="text-sm text-center text-slate-400 max-w-sm">
                            A estrutura de dados Padrão Vex A.I está conectada. Clique no botão de configurações no canto superior para configurar a sua chave da Meta e prompt de comportamento!
                        </p>
                    </div>
                </div>
            </div>

            <AiConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
        </div>
    );
};

export default IaChat;
