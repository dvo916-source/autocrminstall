// --- PÁGINA IA CHAT (DESIGN SISTÊMICO) ---
// Esta página é um exemplo de UI Futurista "Premium" usando Vanilla CSS e Framer Motion.
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, MessageSquare, Sparkles, Shield, Cpu, Activity,
    Zap, ChevronRight, Brain, ShieldCheck, Layers,
    Settings, Globe, BarChart3, Radio
} from 'lucide-react';
import { Link } from 'react-router-dom';

// 🧊 COMPONENTE DE ESTUDO: Glassmorphism
// Cria o efeito de "vidro" usando backdrop-blur e transparências.
const GlassCard = ({ children, className = "" }) => (
    <div className={`backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group ${className}`}>
        {/* Efeito de brilho interno que aparece no hover */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-colors duration-700" />
        {children}
    </div>
);

// 🌌 COMPONENTE DE ESTUDO: CyberBackground
// Cria o fundo dinâmico e animado sem usar vídeos ou imagens pesadas.
const CyberBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]">
        {/* Névoa dinâmica usando Framer Motion para animar gradientes */}
        <motion.div
            animate={{
                x: [-100, 100, -100],
                y: [-50, 50, -50],
                rotate: [0, 5, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-20 pointer-events-none"
            style={{
                background: 'radial-gradient(circle at 30% 30%, #1e40af 0%, transparent 40%), radial-gradient(circle at 70% 70%, #0e7490 0%, transparent 40%)',
                filter: 'blur(100px)'
            }}
        />

        {/* Linhas de Scanner (efeito de TV antiga/monitor CRT) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
    </div>
);

// 🗂️ COMPONENTE HubCard
// Exemplo de como usar React Router (Link) junto com Framer Motion (WhileHover)
const HubCard = ({ to, icon: Icon, title, subtitle, tags, status, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -8, transition: { duration: 0.3 } }}
        className="h-full"
    >
        <Link to={to} className="block h-full outline-none">
            <GlassCard className="h-full p-10 flex flex-col group-hover:border-white/20 group-hover:bg-white/[0.05] transition-all duration-500">
                <div className="flex justify-between items-start mb-12">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:text-white transition-all duration-500 shadow-2xl">
                        <Icon size={32} strokeWidth={1.5} />
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-3xl font-black text-white tracking-tighter italic mb-3 group-hover:translate-x-1 transition-transform duration-500">
                        {title}
                    </h3>
                    <p className="text-sm font-medium text-white/40 leading-relaxed mb-8 pr-12">
                        {subtitle}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2.5 mt-auto">
                    {tags.map((tag, i) => (
                        <span key={i} className="text-[9px] font-black text-white/30 border border-white/5 px-3 py-1.5 rounded-lg tracking-[0.15em] uppercase hover:border-cyan-500/30 hover:text-cyan-400 transition-colors">
                            {tag}
                        </span>
                    ))}
                </div>
            </GlassCard>
        </Link>
    </motion.div>
);

const IaChat = () => {
    const [stats, setStats] = useState({
        activeThreads: 0,
        latency: "14ms",
        uptime: "99.99%",
        systemLoad: 12
    });

    useEffect(() => {
        // Simular carregamento de stats reais no futuro
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                activeThreads: Math.floor(Math.random() * 50) + 850,
                latency: `${Math.floor(Math.random() * 8) + 12}ms`,
                systemLoad: Math.floor(Math.random() * 10) + 8
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col relative overflow-hidden font-inter text-white">
            <CyberBackground />

            {/* Main Content Layout */}
            <div className="relative z-10 flex-1 flex flex-col px-12 pt-8 pb-16 max-w-[1700px] mx-auto w-full h-full">

                {/* Minimalist Top Nav / Stats Bar */}
                <header className="flex justify-between items-center mb-16 px-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Radio size={14} className="text-cyan-500 animate-pulse" />
                            <span className="text-[10px] font-black text-cyan-400 tracking-[0.3em] uppercase">Neural Network Online</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter italic">
                            HYPERCORE <span className="opacity-20 font-normal not-italic ml-2">v3.0</span>
                        </h1>
                    </motion.div>

                    <div className="flex items-center gap-12">
                        <StatusIndicator label="Sistema" value="Estável" color="emerald" status="pulse" />
                        <StatusIndicator label="Latência" value={stats.latency} color="cyan" />
                        <StatusIndicator label="Uptime" value={stats.uptime} color="purple" />

                        <div className="w-px h-10 bg-white/10 mx-2" />

                        <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 hover:border-cyan-500/40 transition-all active:scale-95 group">
                            <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </header>

                {/* Hub Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 flex-1">
                    <HubCard
                        to="/crm-ia"
                        icon={Bot}
                        title="IRW CORE"
                        subtitle="Motor neural de conversão. Gerencia leads, qualifica intenções e executa o fechamento no WhatsApp de forma autônoma."
                        tags={["Conversão", "Automação", "WhatsApp"]}
                        delay={0.1}
                    />
                    <HubCard
                        to="/ia-prompts"
                        icon={Brain}
                        title="CAMADA NEURAL"
                        subtitle="Configuração de prompts e lógica comportamental. Ajuste a 'personalidade' e o conhecimento base da inteligência."
                        tags={["Cognição", "Instruções", "Contexto"]}
                        delay={0.2}
                    />
                    <HubCard
                        to="/admin-ia"
                        icon={ShieldCheck}
                        title="GATEWAY"
                        subtitle="Protocolos de segurança e integração Meta API. Controle fluxos de entrada, limites de banda e logs operacionais."
                        tags={["Segurança", "API Meta", "Logs"]}
                        delay={0.3}
                    />
                </div>

                {/* Futuristic Cockpit Footer */}
                <footer className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-16">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <Activity size={24} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/20 tracking-widest uppercase mb-1">Carga de Processamento</span>
                                <div className="flex items-center gap-4">
                                    <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${stats.systemLoad}%` }}
                                            className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]"
                                        />
                                    </div>
                                    <span className="text-sm font-black italic tabular-nums">{stats.systemLoad}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                <Layers size={21} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/20 tracking-widest uppercase mb-1">Modelo Ativo</span>
                                <p className="text-lg font-bold tracking-tight italic">Claude 3.5 <span className="text-purple-500/50 not-italic font-black text-[10px] ml-1">SONNET V2</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase mb-1">Sistemas Integrados</span>
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-xl bg-[#0f172a] border border-white/10 flex items-center justify-center shadow-2xl">
                                        <Globe size={14} className="text-white/20" />
                                    </div>
                                ))}
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-white/40">+12</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Esquina Inferior Direita - Decorativa */}
            <div className="absolute bottom-[-150px] right-[-150px] w-96 h-96 bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />
        </div>
    );
};

export default IaChat;
