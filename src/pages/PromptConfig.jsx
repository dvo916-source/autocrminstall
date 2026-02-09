import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLoja } from '../context/LojaContext';
import { ArrowLeft, ChevronDown, ChevronRight, Save, RotateCcw, MessageSquare, Sparkles, Shield, FileText, MessageCircleQuestion, Car, Clock, Image as ImageIcon, Zap, CheckCircle2, Cpu, Brain, Terminal, Activity, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FAQManager from '../components/FAQManager';

const PromptConfig = () => {
    const { currentLoja } = useLoja();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSection, setExpandedSection] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Initial States (Default)
    const [prompts, setPrompts] = useState({
        saudacao: { title: 'Prompt de Saudação', subtitle: 'GREETING_LOGIC', description: 'Define como a IA inicia a conversa e cumprimenta os leads.', icon: MessageSquare, color: 'cyan', value: '', mapping: 'saudacao_prompt' },
        vendas: { title: 'Prompt de Vendas', subtitle: 'CONVERSION_CORE', description: 'Estratégia neural de persuasão, negociação e fechamento tático.', icon: Sparkles, color: 'purple', value: '', mapping: 'sales_prompt' },
        apresentacao: { title: 'Apresentação de Veículos', subtitle: 'DISPLAY_ENGINE', description: 'Protocolo de descrição técnica e estética do inventário.', icon: Car, color: 'orange', value: '', mapping: 'apresentacao_prompt' },
        seguranca: { title: 'Prompt de Segurança', subtitle: 'COMPLIANCE_SHIELD', description: 'Regras de firewall comportamental e proteção de dados sensíveis.', icon: Shield, color: 'emerald', value: '', mapping: 'security_prompt' },
        followup: { title: 'Prompt de Follow-up', subtitle: 'RE_ENGAGEMENT', description: 'Algoritmo para reativação de leads em espera ou frios.', icon: FileText, color: 'amber', value: '', mapping: 'followup_prompt' }
    });

    const [humanSettings, setHumanSettings] = useState({
        maxPhotos: 10,
        typingDelay: true,
        useEmoji: true,
        responseSpeed: 'normal'
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');
            const rows = await ipcRenderer.invoke('get-all-settings', currentLoja?.id);
            const data = rows.filter(item => item.category === 'diego_ai');

            if (data && data.length > 0) {
                const settingsMap = {};
                data.forEach(item => settingsMap[item.key] = item.value);

                setPrompts(prev => ({
                    saudacao: { ...prev.saudacao, value: settingsMap['saudacao_prompt'] || prev.saudacao.value },
                    vendas: { ...prev.vendas, value: settingsMap['sales_prompt'] || settingsMap['system_prompt'] || prev.vendas.value },
                    apresentacao: { ...prev.apresentacao, value: settingsMap['apresentacao_prompt'] || prev.apresentacao.value },
                    seguranca: { ...prev.seguranca, value: settingsMap['security_prompt'] || prev.seguranca.value },
                    followup: { ...prev.followup, value: settingsMap['followup_prompt'] || prev.followup.value },
                }));

                setHumanSettings({
                    maxPhotos: settingsMap['max_photos'] || 10,
                    typingDelay: settingsMap['human_delay'] !== 'false',
                    useEmoji: settingsMap['use_emoji'] !== 'false',
                    responseSpeed: settingsMap['response_speed'] || 'normal'
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const upsertData = [
                { category: 'diego_ai', key: 'saudacao_prompt', value: prompts.saudacao.value },
                { category: 'diego_ai', key: 'system_prompt', value: prompts.vendas.value },
                { category: 'diego_ai', key: 'sales_prompt', value: prompts.vendas.value },
                { category: 'diego_ai', key: 'apresentacao_prompt', value: prompts.apresentacao.value },
                { category: 'diego_ai', key: 'security_prompt', value: prompts.seguranca.value },
                { category: 'diego_ai', key: 'followup_prompt', value: prompts.followup.value },
                { category: 'diego_ai', key: 'max_photos', value: String(humanSettings.maxPhotos) },
                { category: 'diego_ai', key: 'human_delay', value: String(humanSettings.typingDelay) },
                { category: 'diego_ai', key: 'use_emoji', value: String(humanSettings.useEmoji) },
                { category: 'diego_ai', key: 'response_speed', value: String(humanSettings.responseSpeed) }
            ];

            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('save-settings-batch', { settings: upsertData, lojaId: currentLoja?.id });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleSection = (key) => setExpandedSection(expandedSection === key ? null : key);

    const handlePromptChange = (key, value) => {
        setPrompts(prev => ({ ...prev, [key]: { ...prev[key], value: value } }));
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#050b1a] relative overflow-hidden font-inter">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,#050b1a_100%)]" />
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-0 pb-20">
                {/* Header Cyber */}
                <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.1, x: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/ia-chat')}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-cyan-400 group transition-all"
                        >
                            <ArrowLeft size={24} />
                        </motion.button>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tighter">
                                Neural<span className="text-cyan-400">Context</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <Terminal size={12} className="text-cyan-500" />
                                <span className="text-sm font-black text-gray-500 tracking-widest uppercase">Cognition Configuration Interface</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-br from-cyan-600 to-blue-600 px-8 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-cyan-500/20 active:shadow-none transition-all group"
                        >
                            {saving ? <Activity className="animate-spin text-white" /> : <Save size={20} className="text-white group-hover:scale-110 transition-transform" />}
                            <span className="text-sm font-black text-white tracking-widest uppercase">Commit Changes</span>
                        </motion.button>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto space-y-10">
                    {/* Global Synapse Monitoring */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Photos per Vehicle */}
                        <div className="group relative bg-[#0f172a]/50 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 hover:border-cyan-500/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-cyan-500/10 rounded-xl">
                                    <ImageIcon size={20} className="text-cyan-400" />
                                </div>
                                <div className="text-[11px] font-black text-gray-600 tracking-widest uppercase">Display Core</div>
                            </div>
                            <h3 className="text-lg font-black text-white tracking-tight mb-4 uppercase">Photos per Lead</h3>
                            <select
                                value={humanSettings.maxPhotos}
                                onChange={(e) => setHumanSettings({ ...humanSettings, maxPhotos: e.target.value })}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-cyan-400 font-bold outline-none focus:border-cyan-500/30 transition-all uppercase"
                            >
                                <option value="5">5 UNIDADES</option>
                                <option value="10">10 UNIDADES</option>
                                <option value="15">15 UNIDADES</option>
                                <option value="all">FULL GALLERY</option>
                            </select>
                        </div>

                        {/* Typing Delay */}
                        <div className="group relative bg-[#0f172a]/50 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 hover:border-purple-500/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <Clock size={20} className="text-purple-400" />
                                </div>
                                <div className="text-[11px] font-black text-gray-600 tracking-widest uppercase">Latency Engine</div>
                            </div>
                            <h3 className="text-lg font-black text-white tracking-tight mb-4 uppercase">Human Latency</h3>
                            <button
                                onClick={() => setHumanSettings({ ...humanSettings, typingDelay: !humanSettings.typingDelay })}
                                className="flex items-center justify-between w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-black tracking-widest uppercase"
                            >
                                <span className={humanSettings.typingDelay ? 'text-emerald-400' : 'text-gray-500'}>
                                    {humanSettings.typingDelay ? 'ENABLED' : 'DISABLED'}
                                </span>
                                <div className={`w-10 h-5 rounded-full transition-all relative ${humanSettings.typingDelay ? 'bg-emerald-500/40' : 'bg-gray-800'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${humanSettings.typingDelay ? 'right-1' : 'left-1'}`} />
                                </div>
                            </button>
                        </div>

                        {/* Model Speed */}
                        <div className="group relative bg-[#0f172a]/50 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 hover:border-blue-500/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <Zap size={20} className="text-blue-400" />
                                </div>
                                <div className="text-[11px] font-black text-gray-600 tracking-widest uppercase">Processing Power</div>
                            </div>
                            <h3 className="text-lg font-black text-white tracking-tight mb-4 uppercase">Inference Speed</h3>
                            <div className="flex gap-2">
                                {['fast', 'normal', 'slow'].map((speed) => (
                                    <button
                                        key={speed}
                                        onClick={() => setHumanSettings({ ...humanSettings, responseSpeed: speed })}
                                        className={`flex-1 py-3 rounded-xl text-[11px] font-black tracking-widest border transition-all uppercase ${humanSettings.responseSpeed === speed ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/20 border-white/5 text-gray-500'}`}
                                    >
                                        {speed}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Neural Modules (Prompts) */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Activity size={20} className="text-cyan-500" />
                            <h2 className="text-2xl font-black text-white uppercase">Cognitive Modules</h2>
                        </div>

                        {Object.entries(prompts).map(([key, prompt]) => {
                            const Icon = prompt.icon;
                            const isExpanded = expandedSection === key;
                            const colors = {
                                cyan: 'from-cyan-500 to-blue-500',
                                purple: 'from-purple-500 to-pink-500',
                                emerald: 'from-emerald-500 to-teal-500',
                                orange: 'from-orange-500 to-red-500',
                                amber: 'from-amber-500 to-yellow-500'
                            }[prompt.color];

                            return (
                                <div
                                    key={key}
                                    className={`group border transition-all duration-500 rounded-[2rem] overflow-hidden ${isExpanded ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                >
                                    <button
                                        onClick={() => toggleSection(key)}
                                        className="w-full p-8 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                <Icon size={30} className="text-white" />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-2xl font-black text-white tracking-tight">{prompt.title}</h3>
                                                    <div className="h-4 w-px bg-white/10" />
                                                    <span className="text-[11px] font-black text-cyan-500/60 tracking-widest uppercase">{prompt.subtitle}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium">{prompt.description}</p>
                                            </div>
                                        </div>
                                        <ChevronDown size={24} className={`text-gray-600 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/5"
                                            >
                                                <div className="p-8 pt-4">
                                                    <div className="relative group">
                                                        <div className="absolute top-4 left-4 text-cyan-500/20 group-focus-within:text-cyan-500 transition-colors">
                                                            <Terminal size={20} />
                                                        </div>
                                                        <textarea
                                                            value={prompt.value || ''}
                                                            onChange={(e) => handlePromptChange(key, e.target.value)}
                                                            rows={10}
                                                            className="w-full bg-black/40 rounded-[1.5rem] border border-white/5 p-10 pl-16 text-gray-200 text-sm font-medium leading-relaxed outline-none focus:border-cyan-500/30 transition-all font-mono"
                                                            placeholder="Inject neural instructions here..."
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </section>

                    {/* FAQ / Knowledge Base */}
                    <section className={`border transition-all duration-500 rounded-[2rem] overflow-hidden ${expandedSection === 'faqs' ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                        <button
                            onClick={() => toggleSection('faqs')}
                            className="w-full p-8 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Brain size={30} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-2xl font-black text-white tracking-tight">Knowledge Base</h3>
                                        <div className="h-4 w-px bg-white/10" />
                                        <span className="text-[11px] font-black text-indigo-400 tracking-widest uppercase">SEMANTIC_ANSWERS</span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">Configure perguntas e respostas específicas para agilizar a cognição da IA.</p>
                                </div>
                            </div>
                            <ChevronDown size={24} className={`text-gray-600 transition-transform duration-500 ${expandedSection === 'faqs' ? 'rotate-180 text-white' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'faqs' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/5"
                                >
                                    <div className="p-8">
                                        <FAQManager />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                </main>
            </div>

            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center gap-3"
                    >
                        <CheckCircle2 size={24} />
                        <span className="font-black tracking-widest text-sm uppercase">Neural Synapse Updated</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Glowing Effects */}
            <div className="absolute top-[40%] right-[-100px] w-96 h-96 bg-cyan-500/5 blur-[150px] rounded-full" />
            <div className="absolute bottom-[10%] left-[-100px] w-96 h-96 bg-purple-500/5 blur-[150px] rounded-full" />
        </div>
    );
};

export default PromptConfig;
