import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Zap, Activity, Shield, Cpu, Globe, Settings,
    Radio, Play, Square, Link2, Key, Database,
    Server, Brain, RefreshCcw, Bell, History,
    ChevronRight, ExternalLink, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useLoja } from '../context/LojaContext';
import { useUI } from '../context/UIContext';

// --- AESTHETIC COMPONENTS ---

const GlassCard = ({ children, className = "", hover = true }) => {
    const { performanceMode } = useUI();
    return (
        <div className={`${performanceMode ? 'bg-[#0a0f1d]' : 'backdrop-blur-2xl bg-white/[0.03]'} border border-white/10 rounded-[2rem] ${performanceMode ? '' : 'shadow-2xl'} relative overflow-hidden group transition-all duration-500 ${hover ? 'hover:border-cyan-500/20 hover:bg-white/[0.05]' : ''} ${className}`}>
            {!performanceMode && <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors duration-700" />}
            {children}
        </div>
    );
};

const StatusIndicator = ({ label, value, color = "cyan", status = "static" }) => {
    const { performanceMode } = useUI();
    const colors = {
        cyan: performanceMode ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]",
        emerald: performanceMode ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]",
        purple: performanceMode ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_15px_rgba(192,132,252,0.1)]",
        amber: performanceMode ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]",
        red: performanceMode ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(248,113,113,0.1)]"
    };

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase">{label}</span>
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 transition-all ${colors[color]}`}>
                {status === "pulse" && <div className={`w-2 h-2 rounded-full ${performanceMode ? '' : 'animate-pulse'} ${color === "emerald" ? "bg-emerald-400" : "bg-cyan-400"}`} />}
                <span className="text-sm font-black italic tracking-tight">{value}</span>
            </div>
        </div>
    );
};

const CyberBackground = () => {
    const { performanceMode } = useUI();
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]">
            {!performanceMode && (
                <motion.div
                    animate={{
                        x: [-100, 100, -100],
                        y: [-50, 50, -50],
                        rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-20"
                    style={{
                        background: 'radial-gradient(circle at 30% 30%, #1e40af 0%, transparent 40%), radial-gradient(circle at 70% 70%, #0e7490 0%, transparent 40%)',
                        filter: 'blur(100px)'
                    }}
                />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] pointer-events-none opacity-30" />
        </div>
    );
};

// --- MAIN COMPONENT ---

const IaChat = () => {
    const { currentLoja } = useLoja();
    const { performanceMode } = useUI();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        ia_active: false,
        n8n_webhook_url: '',
        n8n_api_key: '',
        model_name: 'Claude 3.5 Sonnet'
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [stats, setStats] = useState({
        requests: 0,
        avgLatency: "142ms",
        lastSync: "Agora"
    });

    useEffect(() => {
        loadSettings();
    }, [currentLoja?.id]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');
            const rows = await ipcRenderer.invoke('get-all-settings', currentLoja?.id);
            const data = rows.filter(item => item.category === 'diego_ai');

            if (data && data.length > 0) {
                const settingsMap = {};
                data.forEach(item => settingsMap[item.key] = item.value);

                setConfig({
                    ia_active: settingsMap['ia_active'] === 'true',
                    n8n_webhook_url: settingsMap['n8n_webhook_url'] || '',
                    n8n_api_key: settingsMap['n8n_api_key'] || '',
                    model_name: settingsMap['model_name'] || 'Claude 3.5 Sonnet'
                });
            }
        } catch (error) {
            console.error('Error loading IA settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (overrides = {}) => {
        setSaving(true);
        try {
            const finalConfig = { ...config, ...overrides };
            const upsertData = [
                { category: 'diego_ai', key: 'ia_active', value: String(finalConfig.ia_active) },
                { category: 'diego_ai', key: 'n8n_webhook_url', value: finalConfig.n8n_webhook_url },
                { category: 'diego_ai', key: 'n8n_api_key', value: finalConfig.n8n_api_key },
                { category: 'diego_ai', key: 'model_name', value: finalConfig.model_name }
            ];

            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('save-settings-batch', { settings: upsertData, lojaId: currentLoja?.id });

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            // Se mudou o status da IA, dispara uma notificação pro n8n (opcional)
            if (overrides.hasOwnProperty('ia_active') && finalConfig.n8n_webhook_url) {
                // Aqui você pode disparar um fetch para o n8n se quiser avisar o sistema em tempo real
                console.log('IA Status Changed. Syncing with n8n...');
            }
        } catch (error) {
            console.error('Error saving IA config:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleIa = async () => {
        const newValue = !config.ia_active;
        setConfig(prev => ({ ...prev, ia_active: newValue }));
        await handleSave({ ia_active: newValue });
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#020617]">
                <Activity className="animate-spin text-cyan-500" size={40} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative overflow-hidden font-inter text-white">
            <CyberBackground />

            <div className="relative z-10 flex-1 flex flex-col px-12 pt-9 pb-12 max-w-[1600px] mx-auto w-full h-full space-y-8">

                {/* --- HEADER COCKPIT --- */}
                <header className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${config.ia_active ? `bg-emerald-500 ${performanceMode ? '' : 'animate-pulse'} shadow-[0_0_10px_#10b981]` : 'bg-red-500'}`} />
                            <span className={`text-[10px] font-black tracking-[0.3em] uppercase ${config.ia_active ? 'text-emerald-400' : 'text-red-400'}`}>
                                {config.ia_active ? 'AI Engine Linked' : 'AI Engine Offline'}
                            </span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter italic">
                            IA <span className="text-cyan-500">COCKPIT</span>
                            <span className="opacity-20 font-normal not-italic ml-4 text-2xl">v4.0</span>
                        </h1>
                    </div>

                    <div className="flex gap-6">
                        <StatusIndicator label="Latência n8n" value={stats.avgLatency} color="cyan" />
                        <StatusIndicator label="Carga" value="12%" color="purple" />
                        <StatusIndicator label="Status" value={config.ia_active ? "ATIVO" : "INATIVO"} color={config.ia_active ? "emerald" : "red"} status={config.ia_active ? "pulse" : "static"} />
                    </div>
                </header>

                <main className="flex-1 grid grid-cols-12 gap-8 min-h-0">

                    {/* --- LEFT COLUMN: MASTER CONTROLS --- */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">

                        {/* Master Activation */}
                        <GlassCard className="p-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black italic uppercase tracking-tight">Status da Automação</h3>
                                    <p className="text-xs font-medium text-white/40 uppercase tracking-widest leading-relaxed pr-8">
                                        Liga ou desliga todo o fluxo de resposta automática do n8n no WhatsApp.
                                    </p>
                                </div>
                                <motion.button
                                    {...(performanceMode ? {} : {
                                        whileHover: { scale: 1.05 },
                                        whileTap: { scale: 0.95 }
                                    })}
                                    onClick={toggleIa}
                                    className={`w-20 h-10 rounded-full p-1 transition-colors duration-500 relative shadow-2xl ${config.ia_active ? 'bg-emerald-500/50' : 'bg-red-500/20'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full bg-white shadow-lg transition-all duration-500 flex items-center justify-center ${config.ia_active ? 'ml-10' : 'ml-0'}`}>
                                        {config.ia_active ? <Play size={14} className="text-emerald-600 fill-current" /> : <Square size={14} className="text-red-600 fill-current" />}
                                    </div>
                                </motion.button>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Modelo Neural</span>
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <Brain size={14} />
                                        <span className="text-sm font-bold italic">{config.model_name}</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Agente Ativo</span>
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <Bot size={14} />
                                        <span className="text-sm font-bold italic">Diego SDR</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Integration Settings */}
                        <GlassCard className="p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Link2 size={18} />
                                </div>
                                <h3 className="text-lg font-black italic uppercase tracking-tight">Endpoint n8n</h3>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Webhook URL Production</label>
                                    <div className="relative group">
                                        <Globe size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={config.n8n_webhook_url}
                                            onChange={(e) => setConfig({ ...config, n8n_webhook_url: e.target.value })}
                                            placeholder="https://n8n.seu-servidor.com/webhook/..."
                                            className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-medium text-white/80 outline-none focus:border-cyan-500/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">API Security Key</label>
                                    <div className="relative group">
                                        <Key size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                                        <input
                                            type="password"
                                            value={config.n8n_api_key}
                                            onChange={(e) => setConfig({ ...config, n8n_api_key: e.target.value })}
                                            placeholder="••••••••••••••••••••••••"
                                            className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-medium text-white/80 outline-none focus:border-purple-500/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSave()}
                                className="w-full h-14 mt-8 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/20 active:shadow-none group transition-all"
                            >
                                <RefreshCcw size={18} className={`text-white ${saving ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                <span className="text-xs font-black text-white uppercase tracking-widest">Sincronizar Protocolos</span>
                            </motion.button>
                        </GlassCard>
                    </div>

                    {/* --- RIGHT COLUMN: ACTIVITY & LINKS --- */}
                    <div className="col-span-12 lg:col-span-7 grid grid-cols-2 grid-rows-2 gap-8">

                        {/* Live Log / Monitor */}
                        <GlassCard className="col-span-2 row-span-1 p-8 flex flex-col" hover={false}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                        <Activity size={18} />
                                    </div>
                                    <h3 className="text-lg font-black italic uppercase tracking-tight">Atividade em Tempo Real</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Socket Connected</span>
                                </div>
                            </div>

                            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[11px] overflow-y-auto space-y-4 custom-scrollbar">
                                <div className="flex gap-4">
                                    <span className="text-white/20">15:09:21</span>
                                    <span className="text-emerald-400">[SYSTEM]</span>
                                    <span className="text-white/60">n8n Engine initialization complete.</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-white/20">15:09:43</span>
                                    <span className="text-cyan-400">[WEBHOOK]</span>
                                    <span className="text-white/60">Configurações sincronizadas com sucesso.</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-white/20">15:10:02</span>
                                    <span className="text-amber-400">[INFO]</span>
                                    <span className="text-white/60">Aguardando novo evento de WhatsApp...</span>
                                </div>
                                <div className="animate-pulse flex gap-4">
                                    <span className="text-white/20">_ _ _ _</span>
                                    <span className="text-white/20">Listening for incoming synapse events...</span>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Fast Navigation */}
                        <GlassCard className="p-8 flex flex-col justify-between group/nav cursor-pointer" to="/ia-prompts">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover/nav:scale-110 group-hover/nav:text-white transition-all duration-500">
                                    <Brain size={28} />
                                </div>
                                <ExternalLink size={16} className="text-white/20 group-hover/nav:text-white transition-colors" />
                            </div>
                            <div className="mt-8">
                                <h4 className="text-xl font-black italic tracking-tight uppercase group-hover/nav:text-purple-400 transition-colors">Neural Context</h4>
                                <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mt-1">Configuração de Prompts e FAQs</p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-8 flex flex-col justify-between group/nav cursor-pointer">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover/nav:scale-110 group-hover/nav:text-white transition-all duration-500">
                                    <Settings size={28} />
                                </div>
                                <ExternalLink size={16} className="text-white/20 group-hover/nav:text-white transition-colors" />
                            </div>
                            <div className="mt-8">
                                <h4 className="text-xl font-black italic tracking-tight uppercase group-hover/nav:text-amber-400 transition-colors">Neural Admin</h4>
                                <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mt-1">Gateway & Logs de Segurança</p>
                            </div>
                        </GlassCard>

                    </div>
                </main>

                {/* --- FOOTER INFO --- */}
                <footer className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-3">
                            <Server size={14} className="text-white/20" />
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Loja: {currentLoja?.nome || 'Não Selecionada'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={14} className="text-emerald-500/40" />
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Protocolo: SSL Secured (GTS)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Integrated Intelligence by VexCORE</span>
                    </div>
                </footer>
            </div>

            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[1.5rem] shadow-[0_20px_40px_rgba(16,185,129,0.3)] flex items-center gap-4 border border-emerald-400/30"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                        <div>
                            <p className="font-black tracking-widest text-xs uppercase">Sincronização Completa</p>
                            <p className="text-[10px] font-bold text-white/70 uppercase">Protocolo n8n atualizado no banco neural.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default IaChat;
