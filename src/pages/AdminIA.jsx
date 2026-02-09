import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Bot, MessageSquare, Key, Shield, Zap, CheckCircle2, AlertCircle, Phone, Settings, Brain, Clock, Globe, MessageCircleQuestion, Terminal, Activity, Cpu, ShieldCheck, Database, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLoja } from '../context/LojaContext';
import FAQManager from '../components/FAQManager';

const AdminIA = () => {
    const { currentLoja } = useLoja();
    const [metaConfig, setMetaConfig] = useState({
        phone_number: '',
        phone_id: '',
        access_token: '',
        api_version: 'v17.0'
    });

    const [diegoConfig, setDiegoConfig] = useState({
        system_prompt: '',
        temperature: '0.7',
        response_style: 'amigável',
        auto_response_delay: '5',
        business_hours: {},
        out_of_hours_message: '',
        max_response_length: '500',
        use_emoji: 'true',
        language: 'pt-BR'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [status, setStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('meta');

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            const { ipcRenderer } = window.require('electron');
            const data = await ipcRenderer.invoke('get-all-settings', currentLoja?.id);

            if (data && data.length > 0) {
                const metaSettings = {};
                const diegoSettings = {};
                data.forEach(setting => {
                    if (setting.category === 'meta_api') metaSettings[setting.key] = setting.value || '';
                    else if (setting.category === 'diego_ai') diegoSettings[setting.key] = setting.value || '';
                });
                setMetaConfig(prev => ({ ...prev, ...metaSettings }));
                setDiegoConfig(prev => ({ ...prev, ...diegoSettings }));
            }
        } catch (error) {
            console.error('Error:', error);
            setStatus({ type: 'error', message: 'Falha ao carregar configurações.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        try {
            const { ipcRenderer } = window.require('electron');
            const upserts = [];

            Object.entries(metaConfig).forEach(([key, value]) => {
                upserts.push({ category: 'meta_api', key, value });
            });
            Object.entries(diegoConfig).forEach(([key, value]) => {
                upserts.push({ category: 'diego_ai', key, value });
            });

            await ipcRenderer.invoke('save-settings-batch', { settings: upserts, lojaId: currentLoja?.id });

            setStatus({ type: 'success', message: 'Protocolos atualizados com sucesso.' });
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            setStatus({ type: 'error', message: 'Erro ao sincronizar protocolos.' });
        } finally {
            setSaving(false);
        }
    };

    const testMetaConnection = async () => {
        setTesting(true);
        try {
            const response = await fetch(`https://graph.facebook.com/${metaConfig.api_version}/${metaConfig.phone_id}`, {
                headers: { 'Authorization': `Bearer ${metaConfig.access_token}` }
            });
            if (response.ok) setStatus({ type: 'success', message: 'Link com Meta API Estabelecido.' });
            else setStatus({ type: 'error', message: 'Falha na autenticação Meta API.' });
        } catch (error) {
            setStatus({ type: 'error', message: 'Erro na conexão de rede.' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-[#020617]">
            <Activity className="animate-spin text-cyan-500" size={40} />
        </div>
    );

    return (
        <div className="h-full bg-[#050b1a] relative overflow-hidden font-inter">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,#050b1a_100%)]" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-0 pb-32">
                <header className="mb-12">
                    <div className="flex items-center gap-5 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                            <Settings className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic tracking-tighter  font-rajdhani">System<span className="text-cyan-400">Rules</span></h1>
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                <span className="text-sm font-black text-gray-500  tracking-widest font-rajdhani">Advanced Protocol Configuration [v2.5]</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex gap-4 mb-10 p-2 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/5">
                    {[
                        { id: 'meta', label: 'Meta API Interface', icon: Link, color: 'cyan' },
                        { id: 'diego', label: 'IA Identity', icon: Brain, color: 'purple' },
                        { id: 'faqs', label: 'Knowledge Base', icon: Database, color: 'emerald' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black  text-[10px] tracking-widest font-rajdhani transition-all ${activeTab === tab.id
                                ? `bg-gradient-to-br ${tab.color === 'cyan' ? 'from-cyan-600 to-blue-600' : tab.color === 'purple' ? 'from-purple-600 to-pink-600' : 'from-emerald-600 to-teal-600'} text-white shadow-xl`
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'meta' && (
                        <motion.div
                            key="meta"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10"
                        >
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-white font-rajdhani  tracking-tight">Meta Bridge</h2>
                                    <p className="text-sm text-gray-500 font-medium">Conectividade direta com o ecossistema Meta Business.</p>
                                </div>
                                <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 text-[9px] font-black  tracking-widest font-rajdhani">Status: Standby</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500  tracking-widest font-rajdhani ml-2">Phone Identifier</label>
                                    <input
                                        type="text"
                                        value={metaConfig.phone_number}
                                        onChange={e => setMetaConfig({ ...metaConfig, phone_number: e.target.value })}
                                        placeholder="+55..."
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-cyan-500/30 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500  tracking-widest font-rajdhani ml-2">Meta Phone ID</label>
                                    <input
                                        type="text"
                                        value={metaConfig.phone_id}
                                        onChange={e => setMetaConfig({ ...metaConfig, phone_id: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-cyan-500/30 transition-all font-mono"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500  tracking-widest font-rajdhani ml-2">System Access Token</label>
                                    <div className="relative">
                                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                                        <input
                                            type="password"
                                            value={metaConfig.access_token}
                                            onChange={e => setMetaConfig({ ...metaConfig, access_token: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-white text-sm outline-none focus:border-cyan-500/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={testMetaConnection}
                                disabled={testing}
                                className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-cyan-400 font-black  text-[10px] tracking-[0.3em] font-rajdhani transition-all flex items-center justify-center gap-4"
                            >
                                {testing ? <Activity className="animate-spin" size={18} /> : <Zap size={18} />}
                                Initialize Connection Diagnostic
                            </motion.button>
                        </motion.div>
                    )}

                    {activeTab === 'diego' && (
                        <motion.div
                            key="diego"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10">
                                <h2 className="text-2xl font-black text-white font-rajdhani  tracking-tight mb-8">Neural Personality</h2>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500  tracking-widest font-rajdhani ml-2">Core System Instruction</label>
                                        <div className="relative group">
                                            <Terminal className="absolute top-6 left-6 text-purple-500/20 group-focus-within:text-purple-500 transition-colors" size={20} />
                                            <textarea
                                                value={diegoConfig.system_prompt}
                                                onChange={e => setDiegoConfig({ ...diegoConfig, system_prompt: e.target.value })}
                                                rows={6}
                                                className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-10 pl-16 text-gray-200 text-sm outline-none focus:border-purple-500/30 transition-all leading-relaxed font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5">
                                            <div className="flex justify-between items-center mb-6">
                                                <label className="text-[11px] font-black text-white  tracking-widest font-rajdhani">Cognitive Entropy</label>
                                                <span className="text-xl font-black text-purple-400 font-rajdhani">{diegoConfig.temperature}</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="1" step="0.1"
                                                value={diegoConfig.temperature}
                                                onChange={e => setDiegoConfig({ ...diegoConfig, temperature: e.target.value })}
                                                className="w-full accent-purple-500"
                                            />
                                            <div className="flex justify-between text-[8px] text-gray-600 font-black  mt-3 tracking-widest font-rajdhani">
                                                <span>Precise Logic</span>
                                                <span>Creative Synth</span>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5">
                                            <label className="text-[11px] font-black text-white  tracking-widest font-rajdhani block mb-6">Respose Style Engine</label>
                                            <select
                                                value={diegoConfig.response_style}
                                                onChange={e => setDiegoConfig({ ...diegoConfig, response_style: e.target.value })}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-purple-500/30 font-rajdhani font-black  tracking-widest"
                                            >
                                                <option value="formal">LEGACY_FORMAL</option>
                                                <option value="casual">NEURAL_CASUAL</option>
                                                <option value="amigável">USER_FRIENDLY</option>
                                                <option value="profissional">EXPERT_TECH</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'faqs' && (
                        <motion.div
                            key="faqs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <FAQManager />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Sync */}
                <div className="fixed bottom-4 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
                    <div className="max-w-6xl w-full flex items-center justify-between pointer-events-auto bg-[#0a0f1e]/90 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                        <div>
                            {status && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center gap-3 text-sm font-black  tracking-widest font-rajdhani ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
                                >
                                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    {status.message}
                                </motion.div>
                            )}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-br from-cyan-600 to-purple-600 px-10 py-5 rounded-[1.5rem] text-white font-black  text-xs tracking-[0.3em] font-rajdhani shadow-2xl shadow-cyan-500/20 active:shadow-none flex items-center gap-4 group"
                        >
                            {saving ? <Activity className="animate-spin" size={20} /> : <Database size={20} className="group-hover:rotate-12 transition-transform" />}
                            Synchronize Core Database
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminIA;
