import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Bot, Cpu, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

const AiConfigModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('identity');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado inicial padrão
    const [settings, setSettings] = useState({
        // Identidade da Loja
        store_name: '',
        store_address: '',
        store_phone: '',
        store_website: '',
        store_hours: '',

        // Persona da IA
        ai_name: 'Agente IA',
        ai_role: 'Consultor de Vendas Digital',
        ai_tone: 'consultative', // friendly, formal, aggressive, consultative
        ai_objective: 'agendar_visita',
        ai_master_prompt: 'Você é um vendedor experiente e carismático...',

        // Configurações Técnicas
        ai_model: 'gpt-4o',
        ai_temp: 0.7,
        ai_delay: 2000,
        ai_active: true
    });

    // Carregar configurações ao abrir
    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { ipcRenderer } = window.require('electron');
            const data = await ipcRenderer.invoke('get-all-settings');
            if (data && Object.keys(data).length > 0) {
                // Merge com defaults para garantir que campos novos não quebrem
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error("Erro ao carregar configs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('save-settings-batch', settings);

            // Notificação de sucesso (você pode integrar com seu sistema de toast)
            const event = new CustomEvent('show-notification', {
                detail: { message: 'Cérebro da IA atualizado com sucesso!', type: 'success' }
            });
            window.dispatchEvent(event);

            setTimeout(() => onClose(), 500);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            const event = new CustomEvent('show-notification', {
                detail: { message: 'Erro ao salvar configurações.', type: 'error' }
            });
            window.dispatchEvent(event);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Bot className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-rajdhani">Configuração Neural (IA Hub)</h2>
                                <p className="text-xs text-gray-400">Defina a identidade, comportamento e conhecimento do Agente IA.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Layout */}
                    <div className="flex flex-1 overflow-hidden">

                        {/* Sidebar Tabs */}
                        <div className="w-64 bg-[#0a0f1e] border-r border-white/5 p-4 flex flex-col gap-2">
                            <TabButton
                                active={activeTab === 'identity'}
                                onClick={() => setActiveTab('identity')}
                                icon={<Store size={18} />}
                                label="Identidade da Loja"
                            />
                            <TabButton
                                active={activeTab === 'persona'}
                                onClick={() => setActiveTab('persona')}
                                icon={<Bot size={18} />}
                                label="Persona & Prompt"
                            />
                            <TabButton
                                active={activeTab === 'advanced'}
                                onClick={() => setActiveTab('advanced')}
                                icon={<Cpu size={18} />}
                                label="Cérebro Técnico"
                            />
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#0f172a] to-[#0a0f1e]">

                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <RefreshCw className="animate-spin text-cyan-500" size={32} />
                                    <p>Sincronizando neurônios...</p>
                                </div>
                            ) : (
                                <>
                                    {/* TAB: IDENTIDADE DA LOJA */}
                                    {activeTab === 'identity' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <SectionHeader title="Dados da Empresa" desc="A IA usa esses dados para responder perguntas básicas." />

                                            <div className="grid grid-cols-2 gap-6">
                                                <InputGroup label="Nome da Loja" name="store_name" value={settings.store_name} onChange={handleChange} placeholder="Ex: IRW Motors" />
                                                <InputGroup label="Telefone / WhatsApp" name="store_phone" value={settings.store_phone} onChange={handleChange} placeholder="Ex: (11) 99999-9999" />
                                            </div>

                                            <InputGroup label="Endereço Completo" name="store_address" value={settings.store_address} onChange={handleChange} placeholder="Ex: Av. Brasil, 1500 - Jardins, São Paulo - SP" />

                                            <div className="grid grid-cols-2 gap-6">
                                                <InputGroup label="Website Oficial" name="store_website" value={settings.store_website} onChange={handleChange} placeholder="https://..." />
                                                <InputGroup label="Horário de Atendimento" name="store_hours" value={settings.store_hours} onChange={handleChange} placeholder="Seg-Sex: 09h-18h, Sab: 09h-13h" />
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: PERSONA & PROMPT */}
                                    {activeTab === 'persona' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <SectionHeader title="Personalidade do Agente" desc="Como a IA deve se comportar com os clientes." />

                                            <div className="grid grid-cols-2 gap-6">
                                                <InputGroup label="Nome do Agente" name="ai_name" value={settings.ai_name} onChange={handleChange} />
                                                <SelectGroup label="Tom de Voz" name="ai_tone" value={settings.ai_tone} onChange={handleChange}
                                                    options={[
                                                        { value: 'consultative', label: 'Consultivo (Profissional e Ajuda)' },
                                                        { value: 'friendly', label: 'Amigável (Descontraído e Emojis)' },
                                                        { value: 'formal', label: 'Formal (Sério e Direto)' },
                                                        { value: 'aggressive', label: 'Vendedor (Foca no fechamento)' }
                                                    ]}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-sm font-semibold text-gray-300">Instrução Mestre (Prompt do Sistema)</label>
                                                <p className="text-xs text-gray-500 mb-2">Escreva detalhadamente como a IA deve agir. Use variáveis como {'{nome_loja}'} se quiser.</p>
                                                <textarea
                                                    name="ai_master_prompt"
                                                    value={settings.ai_master_prompt}
                                                    onChange={handleChange}
                                                    className="w-full h-64 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all font-mono leading-relaxed resize-none"
                                                    placeholder="Você é um assistente virtual..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: ADVANCED */}
                                    {activeTab === 'advanced' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <SectionHeader title="Configurações do Motor" desc="Ajustes finos para desenvolvedores." />



                                            {/* META API CONFIG */}
                                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-6">
                                                <h4 className="text-emerald-400 font-bold text-sm font-rajdhani flex items-center gap-2 mb-4">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                                                    INTEGRAÇÃO OFICIAL META (WHATSAPP BUSINESS)
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <InputGroup label="Phone Number ID" name="meta_phone_id" value={settings.meta_phone_id} onChange={handleChange} placeholder="Ex: 362514..." />
                                                    <InputGroup label="Access Token (Permanent)" name="meta_access_token" value={settings.meta_access_token} onChange={handleChange} placeholder="EAAG..." type="password" />
                                                </div>
                                            </div>

                                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-4">
                                                <AlertCircle className="text-orange-500 shrink-0 mt-1" size={20} />
                                                <div>
                                                    <h4 className="text-orange-400 font-semibold text-sm">Atenção</h4>
                                                    <p className="text-xs text-orange-300/80 mt-1">Insira a chave correspondente ao modelo escolhido abaixo (começa com 'sk-' para OpenAI ou 'sk-ant-' para Claude).</p>
                                                </div>
                                            </div>

                                            <InputGroup label="API Key (Anthropic / OpenAI)" name="openai_api_key" value={settings.openai_api_key} onChange={handleChange} placeholder="sk-ant-api03..." type="password" />

                                            <div className="grid grid-cols-2 gap-6">
                                                <SelectGroup label="Modelo de IA" name="ai_model" value={settings.ai_model} onChange={handleChange}
                                                    options={[
                                                        { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Recomendado)' },
                                                        { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
                                                        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' }
                                                    ]}
                                                />
                                                <InputGroup label="Delay 'Humano' (ms)" name="ai_delay" type="number" value={settings.ai_delay} onChange={handleChange} />
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-sm font-semibold text-gray-300 flex justify-between">
                                                    <span>Temperatura (Criatividade)</span>
                                                    <span className="text-cyan-400">{settings.ai_temp}</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    name="ai_temp"
                                                    min="0" max="1" step="0.1"
                                                    value={settings.ai_temp}
                                                    onChange={handleChange}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 px-1">
                                                    <span>Preciso (0.0)</span>
                                                    <span>Equilibrado (0.5)</span>
                                                    <span>Criativo (1.0)</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Salvar Configurações
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// --- Subcomponents ---

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${active
            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        {icon}
        {label}
    </button>
);

const SectionHeader = ({ title, desc }) => (
    <div className="pb-4 border-b border-white/5">
        <h3 className="text-lg font-bold text-white font-rajdhani">{title}</h3>
        <p className="text-sm text-gray-400">{desc}</p>
    </div>
);

const InputGroup = ({ label, name, value, onChange, placeholder, type = "text" }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-300">{label}</label>
        <input
            type={type}
            name={name}
            value={value || ''}
            onChange={onChange}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all"
            placeholder={placeholder}
        />
    </div>
);

const SelectGroup = ({ label, name, value, onChange, options }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-300">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
        </div>
    </div>
);

export default AiConfigModal;
