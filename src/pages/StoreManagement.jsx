// --- PÁGINA DE GESTÃO DE UNIDADES (CENTRAL DE LOJAS) ---
// Esta página lida com a criação, edição e exclusão de lojas no sistema multitenant.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../context/LojaContext';
import {
    Plus, Store, ExternalLink, Trash2, CheckCircle2, X, LayoutGrid, Search,
    ChevronRight, ChevronLeft, Loader2, Settings, Shield, Pencil, Save,
    MapPin, User, Lock, Image as ImageIcon, Key, Database, MessageSquare, Car, Users, Target, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Importamos o ipcRenderer para falar com o Electron
const { ipcRenderer } = window.require('electron');
import ConnectionStatus from '../components/ConnectionStatus';

// Módulos que podem ser ativados para cada loja individualmente
const AVAILABLE_MODULES = [
    { id: 'diario', label: 'Meu Diário' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'estoque', label: 'Tabela/Estoque' },
    { id: 'visitas', label: 'Visitas' },
    { id: 'metas', label: 'Metas' },
    { id: 'portais', label: 'Portais' },
    { id: 'ia-chat', label: 'IA Chat' },
    { id: 'usuarios', label: 'Usuários' },
];

const StoreManagement = () => {
    // 🔗 useLoja: Puxamos as lojas e funções globais do Contexto
    const { lojas, currentLoja, switchLoja, refreshLojas } = useLoja();
    const navigate = useNavigate();

    // 🧠 ESTADOS LOCAIS (React useState)
    // Controlam o que aparece na tela neste momento
    const [isAdding, setIsAdding] = useState(false); // Abre/Fecha o modal de nova loja
    const [wizardStep, setWizardStep] = useState(1); // Controla em qual passo do Wizard estamos
    const [configStore, setConfigStore] = useState(null); // Loja que está sendo configurada
    const [editingId, setEditingId] = useState(null); // ID da loja em edição inline
    const [editForm, setEditForm] = useState({ nome: '', logo_url: '' }); // Formulário de edição rápida

    // Dados para a NOVA loja (Wizard)
    const [newStore, setNewStore] = useState({
        nome: '',
        endereco: '',
        logo_url: '',
        modulos: ['dashboard', 'diario', 'whatsapp', 'estoque', 'visitas', 'metas', 'portais', 'ia-chat', 'usuarios']
    });

    // Dados para o PRIMEIRO Administrador da nova loja
    const [newAdmin, setNewAdmin] = useState({
        nome_completo: '',
        cpf: '',
        email: '',
        password: ''
    });

    const [cpfError, setCpfError] = useState(''); // Mensagem de erro de CPF ja existente
    const [loading, setLoading] = useState(false); // Estado de "carregando" (spinner)
    const [searchTerm, setSearchTerm] = useState(''); // Texto da busca

    // 🔍 FILTRAGEM DINÂMICA
    // Filtra a lista de lojas conforme o usuário digita na busca
    const filteredLojas = lojas.filter(l =>
        l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 🎭 MÁSCARA DE CPF
    // Transforma "12345678900" em "123.456.789-00" enquanto digita
    const maskCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    // 🚀 SALVAR NOVA LOJA + ADMIN (Atomic Transaction)
    // Esta função é o coração do Wizard. Ela cria tudo de uma vez.
    const handleAddStore = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setCpfError('');

        try {
            // 🛑 PASSO 1: Validar CPF apenas se foi fornecido
            if (newAdmin.cpf && newAdmin.cpf.trim()) {
                const cpfVal = await ipcRenderer.invoke('validate-cpf', newAdmin.cpf);
                if (!cpfVal.valid) {
                    setCpfError(cpfVal.message);
                    setWizardStep(2);
                    setLoading(false);
                    return;
                }
            }

            // 🛑 PASSO 2: Criar a loja e o admin vinculado
            const result = await ipcRenderer.invoke('create-store-with-admin', {
                loja: newStore,
                admin: newAdmin
            });

            if (result.success) {
                await refreshLojas(); // Recarrega a lista do Contexto
                setIsAdding(false); // Fecha o modal
                setWizardStep(1); // Reseta o wizard
                // Limpa os campos
                setNewStore({
                    nome: '', endereco: '', logo_url: '',
                    modulos: ['dashboard', 'diario', 'whatsapp', 'estoque', 'visitas', 'metas', 'portais', 'ia-chat', 'usuarios']
                });
                setNewAdmin({ nome_completo: '', cpf: '', email: '', password: '' });
                alert(result.message);
            }
        } catch (err) {
            console.error("Erro ao criar loja e admin:", err);
            alert("Erro ao criar loja: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ✏️ EDIDÇÃO RÁPIDA (Inline)
    // Prepara o estado para editar o nome ou logo direto no card
    const handleStartEdit = (loja) => {
        setEditingId(loja.id);
        setEditForm({ nome: loja.nome, logo_url: loja.logo_url || '' });
    };

    // Salva as alterações da edição rápida
    const handleSaveEdit = async (lojaId) => {
        setLoading(true);
        try {
            const originalLoja = lojas.find(l => l.id === lojaId);
            await ipcRenderer.invoke('update-store', {
                ...originalLoja,
                nome: editForm.nome,
                logo_url: editForm.logo_url,
                ativo: originalLoja.ativo === 0 ? false : true
            });
            await refreshLojas();
            setEditingId(null);
        } catch (err) {
            console.error("Erro ao salvar edição:", err);
        } finally {
            setLoading(false);
        }
    };

    // ⚙️ ATUALIZAÇÃO DE MÓDULOS
    // Altera quais funções (ex: WhatsApp, Metas) estão ativas para aquela loja
    const handleUpdateModules = async (lojaId, modules) => {
        setLoading(true);
        try {
            const loja = lojas.find(l => l.id === lojaId);
            await ipcRenderer.invoke('update-store', {
                ...loja,
                modulos: modules, // Módulos são processados pelo db.js
                ativo: loja.ativo === 0 ? false : true
            });
            await refreshLojas();
            setConfigStore(null);
        } catch (err) {
            console.error("Erro ao atualizar módulos:", err);
        } finally {
            setLoading(false);
        }
    };

    // 🗑️ EXCLUSÃO DE LOJA
    const handleDelete = async (id) => {
        // Impede deletar a loja principal do sistema por segurança
        if (id === 'irw-motors-main') return;

        const confirm = window.confirm("Deseja realmente excluir esta loja? Todos os dados vinculados serão inacessíveis.");
        if (confirm) {
            try {
                await ipcRenderer.invoke('delete-store', id);
                await refreshLojas();
            } catch (err) {
                console.error("Erro ao excluir:", err);
            }
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

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

    return (
        <div className="relative min-h-screen bg-[#0f172a] overflow-x-hidden selection:bg-blue-500/30">
            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header Section - ESCALA REDUZIDA */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden group">
                                <LayoutGrid size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none">
                                CENTRAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">DE LOJAS</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 pl-1">
                            <div className="w-8 h-[2px] bg-blue-500/40 rounded-full" />
                            <p className="text-slate-500 font-black text-[9px] uppercase tracking-[0.4em]">
                                Gestão Multitenant VexCORE
                            </p>
                        </div>
                    </motion.div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group flex-grow md:flex-grow-0">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="LOCALIZAR UNIDADE..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-72 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black tracking-widest text-white focus:border-blue-500/30 focus:bg-slate-900/80 transition-all outline-none placeholder:text-slate-700"
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsAdding(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-[0.2em] flex items-center gap-3 transition-all shadow-xl shadow-blue-900/20"
                        >
                            <Plus size={16} strokeWidth={4} />
                            CADASTRAR LOJA
                        </motion.button>
                    </div>
                </header>

                {/* Connection Status Indicator - Central de Lojas */}
                <div className="absolute top-6 right-8 opacity-50 hover:opacity-100 transition-opacity">
                    <ConnectionStatus />
                </div>

                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredLojas.map((loja) => (
                            <motion.div
                                layout
                                key={loja.id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                className={`group relative p-6 rounded-[2.5rem] border transition-all duration-700 overflow-hidden ${currentLoja?.id === loja.id
                                    ? 'bg-[#0f172a]/80 border-blue-500/30 shadow-[0_20px_50px_-20px_rgba(59,130,246,0.3)]'
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                    }`}
                            >
                                {/* Side Status Bar - Sleek Modern Design */}
                                <div className={`absolute left-0 top-[20%] bottom-[20%] w-1.5 rounded-r-3xl transition-all duration-700 ${currentLoja?.id === loja.id ? 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] opacity-100' : 'bg-slate-800 opacity-10 group-hover:bg-blue-500 group-hover:opacity-100'}`} />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border transition-all duration-700 bg-black/60 backdrop-blur-md ${currentLoja?.id === loja.id
                                            ? 'border-blue-500/50 shadow-[0_10px_30px_rgba(59,130,246,0.25)]'
                                            : 'border-white/5 group-hover:border-white/20'
                                            }`}>
                                            {loja.logo_url ? (
                                                <div className="relative group/logo w-full h-full flex items-center justify-center p-3.5">
                                                    <img src={loja.logo_url} className="w-full h-full object-contain relative z-10 filter brightness-110" alt={loja.nome} />
                                                    <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                                                </div>
                                            ) : (
                                                <Store size={28} className={currentLoja?.id === loja.id ? "text-blue-400" : "text-slate-600"} />
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
                                            {currentLoja?.id === loja.id && (
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
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-black text-xs outline-none focus:border-blue-500/50 transition-all"
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
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <h3
                                                    className="text-3xl font-black text-white italic tracking-tighter uppercase leading-[0.8] font-rajdhani group-hover:text-blue-400 transition-colors duration-500 cursor-pointer drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                                                    onClick={() => handleStartEdit(loja)}
                                                >
                                                    {loja.nome}
                                                </h3>

                                                <div className="flex items-center gap-2 mt-4">
                                                    {loja.slug && (
                                                        <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-[0.2em] bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 shadow-sm font-rajdhani">
                                                            @{loja.slug}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                                                        <span className="text-[9px] font-black text-emerald-500/80 tracking-widest uppercase font-rajdhani">Cloud Sinc</span>
                                                    </div>
                                                </div>

                                                {/* Module Indicators (Quick Look) */}
                                                <div className="mt-6 flex flex-wrap gap-2 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                                                    {(() => {
                                                        const mods = typeof loja.modulos === 'string' ? JSON.parse(loja.modulos || '[]') : (loja.modulos || []);
                                                        return (
                                                            <>
                                                                <div className={`p-1.5 rounded-lg border ${mods.includes('whatsapp') ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-white/5 text-white/10'}`} title="WhatsApp">
                                                                    <MessageSquare size={10} strokeWidth={3} />
                                                                </div>
                                                                <div className={`p-1.5 rounded-lg border ${mods.includes('estoque') ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' : 'border-white/5 text-white/10'}`} title="Estoque">
                                                                    <Car size={10} strokeWidth={3} />
                                                                </div>
                                                                <div className={`p-1.5 rounded-lg border ${mods.includes('visitas') ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' : 'border-white/5 text-white/10'}`} title="Visitas">
                                                                    <Users size={10} strokeWidth={3} />
                                                                </div>
                                                                <div className={`p-1.5 rounded-lg border ${mods.includes('metas') ? 'border-purple-500/30 text-purple-400 bg-purple-500/5' : 'border-white/5 text-white/10'}`} title="Metas">
                                                                    <Target size={10} strokeWidth={3} />
                                                                </div>
                                                            </>
                                                        )
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
                                        {currentLoja?.id === loja.id ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        navigate('/');
                                                    }}
                                                    className="flex-[4] relative group/btn flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    ESTA UNIDADE
                                                </button>
                                                <button
                                                    onClick={() => switchLoja(null)}
                                                    className="flex-1 flex items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                                    title="Sair desta Loja"
                                                >
                                                    <LogOut size={18} strokeWidth={2} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        switchLoja(loja);
                                                        navigate('/');
                                                    }}
                                                    className="flex-[5] relative group/btn flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] transition-all duration-700 overflow-hidden bg-white text-black hover:bg-blue-600 hover:text-white hover:scale-[1.02] shadow-[0_15px_30px_-10px_rgba(255,255,255,0.1)] active:scale-95"
                                                >
                                                    <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700" />
                                                    <span className="relative z-10 flex items-center gap-3">
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
                        ))}
                    </AnimatePresence>
                    {filteredLojas.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="col-span-full py-32 flex flex-col items-center justify-center text-center relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />
                            <div className="relative">
                                <div className="w-32 h-32 bg-slate-900 border border-white/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                    <Search size={48} className="text-slate-700 group-hover:text-blue-500/50 transition-all duration-500 group-hover:scale-110" />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border border-dashed border-white/10 rounded-full scale-150 opacity-20"
                                    />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4 italic tracking-tighter uppercase">ARQUIVO <span className="text-blue-500">INDISPONÍVEL</span></h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">
                                Nenhum registro encontrado para este critério. <br />
                                Aguardando nova digitalização ou comando...
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </div >

            {/* Modal de Configuração de Módulos - ESCALA REDUZIDA */}
            < AnimatePresence >
                {configStore && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setConfigStore(null)}
                            className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-slate-900/40 border border-white/10 p-8 rounded-[3rem] shadow-3xl overflow-hidden backdrop-blur-2xl"
                        >
                            <button onClick={() => setConfigStore(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
                                <X size={20} />
                            </button>

                            <div className="mb-8 flex items-center gap-5">
                                <div className="p-4 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl">
                                    <Shield className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                                        CONTROLE <span className="text-blue-400">DE ACESSOS</span>
                                    </h2>
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2">UNIDADE: {configStore.nome}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                                {AVAILABLE_MODULES.map((mod) => {
                                    const modulosAtuais = configStore.modulos ? (typeof configStore.modulos === 'string' ? JSON.parse(configStore.modulos) : configStore.modulos) : [];
                                    const isEnabled = modulosAtuais.includes(mod.id);

                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => {
                                                const newMods = isEnabled
                                                    ? modulosAtuais.filter(id => id !== mod.id)
                                                    : [...modulosAtuais, mod.id];
                                                setConfigStore({ ...configStore, modulos: newMods });
                                            }}
                                            className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isEnabled
                                                ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-lg'
                                                : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/[0.08]'
                                                }`}
                                        >
                                            <span className="text-[10px] font-black tracking-widest uppercase">{mod.label}</span>
                                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all duration-300 ${isEnabled
                                                ? 'bg-blue-500 border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                                : 'border-white/10 group-hover:border-white/20'
                                                }`}>
                                                {isEnabled && <CheckCircle2 size={12} className="text-white" strokeWidth={4} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setConfigStore(null)}
                                    className="flex-1 py-4 font-black text-slate-600 hover:text-white transition-all uppercase text-[10px] tracking-[0.3em]"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={() => handleUpdateModules(configStore.id, configStore.modulos)}
                                    disabled={loading}
                                    className="flex-[2] relative group bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 overflow-hidden"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <Save size={16} />
                                            ATUALIZAR CONFIGURAÇÕES
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* Modal de Adição (WIZARD ESCALA REDUZIDA) */}
            < AnimatePresence >
                {isAdding && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsAdding(false);
                                setWizardStep(1);
                                setCpfError('');
                            }}
                            className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="relative w-full max-w-2xl bg-slate-900/40 border border-white/10 p-10 rounded-[4rem] shadow-4xl overflow-hidden backdrop-blur-2xl"
                        >
                            {/* Step Indicator */}
                            <div className="flex items-center justify-center gap-3 mb-12">
                                {[1, 2, 3].map(step => (
                                    <React.Fragment key={step}>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all duration-500 border ${wizardStep >= step
                                                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                                : 'bg-white/5 border-white/5 text-slate-700'
                                                }`}>
                                                {wizardStep > step ? <CheckCircle2 size={18} strokeWidth={3} /> : <span className="text-sm italic">{step}</span>}
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest ${wizardStep >= step ? 'text-blue-400' : 'text-slate-800'}`}>
                                                {step === 1 ? 'UNIDADE' : step === 2 ? 'ADMIN' : 'RECURSOS'}
                                            </span>
                                        </div>
                                        {step < 3 && (
                                            <div className={`w-12 h-[1px] mb-6 transition-all duration-700 ${wizardStep > step ? 'bg-blue-600' : 'bg-white/5'
                                                }`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            <button onClick={() => setIsAdding(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
                                <X size={20} />
                            </button>

                            <AnimatePresence mode="wait">
                                {wizardStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">NOVA <span className="text-blue-400">UNIDADE</span></h2>
                                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3">Cadastro de Estabelecimento</p>
                                        </div>

                                        <div className="space-y-4 max-w-md mx-auto">
                                            <div className="relative group">
                                                <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">NOME COMERCIAL</label>
                                                <div className="relative">
                                                    <Store className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30" size={18} />
                                                    <input
                                                        autoFocus required
                                                        value={newStore.nome}
                                                        onChange={e => setNewStore({ ...newStore, nome: e.target.value })}
                                                        className="w-full bg-black/30 border border-white/5 rounded-2xl px-14 py-4 text-white font-black text-xs outline-none focus:border-blue-500/30 focus:bg-black/50 transition-all placeholder:text-slate-800"
                                                        placeholder="NOME DA LOJA"
                                                    />
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">LOCALIZAÇÃO</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30" size={18} />
                                                    <input
                                                        value={newStore.endereco}
                                                        onChange={e => setNewStore({ ...newStore, endereco: e.target.value })}
                                                        className="w-full bg-black/30 border border-white/5 rounded-2xl px-14 py-4 text-white font-black text-xs outline-none focus:border-blue-500/30 focus:bg-black/50 transition-all placeholder:text-slate-800"
                                                        placeholder="CIDADE - UF"
                                                    />
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">LOGOMARCA URL</label>
                                                <div className="relative">
                                                    <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30" size={18} />
                                                    <input
                                                        value={newStore.logo_url}
                                                        onChange={e => setNewStore({ ...newStore, logo_url: e.target.value })}
                                                        className="w-full bg-black/30 border border-white/5 rounded-2xl px-14 py-4 text-white font-mono text-[10px] outline-none focus:border-blue-500/30 focus:bg-black/50 transition-all placeholder:text-slate-800"
                                                        placeholder="HTTPS://..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-6 max-w-md mx-auto">
                                            <button
                                                onClick={() => setIsAdding(false)}
                                                className="flex-1 py-4 font-black text-slate-700 hover:text-white transition-all uppercase text-[9px] tracking-[0.4em]"
                                            >
                                                CANCELAR
                                            </button>
                                            <button
                                                disabled={!newStore.nome}
                                                onClick={() => setWizardStep(2)}
                                                className="flex-[2] bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] tracking-[0.3em] transition-all shadow-xl hover:bg-blue-500 hover:text-white flex items-center justify-center gap-2"
                                            >
                                                PRÓXIMA ETAPA
                                                <ChevronRight size={16} strokeWidth={4} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">ADMIN<span className="text-blue-400">ISTRADOR</span></h2>
                                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3">Responsável pela Unidade</p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                                            <div>
                                                <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">NOME COMPLETO</label>
                                                <div className="relative">
                                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30" size={18} />
                                                    <input
                                                        required
                                                        value={newAdmin.nome_completo}
                                                        onChange={e => setNewAdmin({ ...newAdmin, nome_completo: e.target.value })}
                                                        className="w-full bg-black/30 border border-white/5 rounded-2xl px-14 py-4 text-white font-black text-xs outline-none focus:border-blue-500/30 transition-all"
                                                        placeholder="NOME DO ADMIN"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">CPF (LOGIN)</label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30" size={18} />
                                                        <input
                                                            type="text"
                                                            value={newAdmin.cpf}
                                                            onChange={e => setNewAdmin({ ...newAdmin, cpf: maskCPF(e.target.value) })}
                                                            className={`w-full bg-black/30 border rounded-2xl px-14 py-4 text-white font-black text-xs outline-none transition-all ${cpfError ? 'border-red-500/50 animate-shake' : 'border-white/5 focus:border-blue-500/30'
                                                                }`}
                                                            placeholder="000.000.000-00 (Opcional)"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">SENHA MASTER</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30" size={18} />
                                                        <input
                                                            type="password" required
                                                            value={newAdmin.password}
                                                            onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                                            className="w-full bg-black/30 border border-white/5 rounded-2xl px-14 py-4 text-white font-black text-xs outline-none focus:border-blue-500/30 transition-all"
                                                            placeholder="******"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {cpfError && <p className="text-red-400 text-[8px] font-black mt-1 ml-3 uppercase tracking-widest">{cpfError}</p>}
                                        </div>

                                        <div className="flex gap-4 pt-6 max-w-md mx-auto">
                                            <button
                                                onClick={() => setWizardStep(1)}
                                                className="flex-1 py-4 font-black text-slate-700 hover:text-white transition-all uppercase text-[9px] tracking-[0.4em] flex items-center justify-center gap-2"
                                            >
                                                <ChevronLeft size={16} strokeWidth={4} />
                                                VOLTAR
                                            </button>
                                            <button
                                                disabled={!newAdmin.nome_completo || !newAdmin.password || newAdmin.password.length < 4}
                                                onClick={async () => {
                                                    setLoading(true);
                                                    // Valida CPF apenas se foi fornecido
                                                    if (newAdmin.cpf && newAdmin.cpf.trim()) {
                                                        const val = await ipcRenderer.invoke('validate-cpf', newAdmin.cpf);
                                                        setLoading(false);
                                                        if (!val.valid) {
                                                            setCpfError(val.message);
                                                            return;
                                                        }
                                                    } else {
                                                        setLoading(false);
                                                    }
                                                    setCpfError('');
                                                    setWizardStep(3);
                                                }}
                                                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                                    <>
                                                        CONTINUAR
                                                        <ChevronRight size={16} strokeWidth={4} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">RECURSOS <span className="text-blue-400">ATIVOS</span></h2>
                                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3">Módulos do Sistema</p>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-white/5 max-w-lg mx-auto">
                                            {AVAILABLE_MODULES.map((mod) => {
                                                const isEnabled = newStore.modulos.includes(mod.id);
                                                return (
                                                    <button
                                                        key={mod.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const newMods = isEnabled
                                                                ? newStore.modulos.filter(id => id !== mod.id)
                                                                : [...newStore.modulos, mod.id];
                                                            setNewStore({ ...newStore, modulos: newMods });
                                                        }}
                                                        className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${isEnabled
                                                            ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-lg'
                                                            : 'bg-white/5 border-white/5 text-slate-800 hover:bg-white/[0.08]'
                                                            }`}
                                                    >
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{mod.label}</span>
                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-300 ${isEnabled
                                                            ? 'bg-blue-500 border-blue-400'
                                                            : 'border-white/5 group-hover:border-white/10'
                                                            }`}>
                                                            {isEnabled && <CheckCircle2 size={10} className="text-white" strokeWidth={5} />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-2xl max-w-md mx-auto">
                                            <p className="text-blue-400/60 text-center text-[8px] font-black uppercase tracking-[0.3em] leading-relaxed">
                                                Setup finalizado. A unidade será criada com os recursos selecionados.
                                            </p>
                                        </div>

                                        <div className="flex gap-4 pt-4 max-w-md mx-auto">
                                            <button
                                                onClick={() => setWizardStep(2)}
                                                className="flex-1 py-4 font-black text-slate-700 hover:text-white transition-all uppercase text-[9px] tracking-[0.4em] flex items-center justify-center gap-2"
                                            >
                                                <ChevronLeft size={16} strokeWidth={4} />
                                                VOLTAR
                                            </button>
                                            <button
                                                disabled={loading || newStore.modulos.length === 0}
                                                onClick={handleAddStore}
                                                className="flex-[2] relative group bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.4em] transition-all shadow-2xl overflow-hidden"
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-3">
                                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                                        <>
                                                            CRIAR UNIDADE
                                                            <CheckCircle2 size={18} strokeWidth={4} />
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </div >
    );
};

export default StoreManagement;
