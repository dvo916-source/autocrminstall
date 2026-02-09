import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useLoja } from '../context/LojaContext';
import { MessageSquare, Send, User, Bot, PauseCircle, PlayCircle, Check, Clock, Trash2, Search, Car, ChevronLeft, ChevronRight, X, Cpu, Zap, Activity, Shield, Sparkles, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ChatCRM = () => {
    const { currentLoja } = useLoja();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Sidebar States
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('whatsapp-sidebar-toggle', {
            detail: { isOpen: isSidebarOpen, width: 400 }
        }));
    }, [isSidebarOpen]);
    const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'veiculos'
    const [scripts, setScripts] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [searchEstoque, setSearchEstoque] = useState('');

    const messagesEndRef = useRef(null);

    // 1. Carregar Conversas
    useEffect(() => {
        if (!currentLoja?.id) return;
        fetchConversations();

        const sub = supabase
            .channel(`crm_conversations_${currentLoja.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'crm_conversations',
                filter: `loja_id=eq.${currentLoja.id}`
            }, (payload) => {
                fetchConversations();
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [currentLoja?.id]);

    // 2. Carregar Dados Auxiliares (Scripts e Estoque) via Electron
    useEffect(() => {
        if (!currentLoja?.id) return;
        const loadAuxData = async () => {
            try {
                if (!window.require) return;
                const { ipcRenderer } = window.require('electron');
                const username = localStorage.getItem('username');

                const [scriptsData, estoqueData] = await Promise.all([
                    ipcRenderer.invoke('get-scripts', { username, lojaId: currentLoja.id }),
                    ipcRenderer.invoke('get-list', { table: 'estoque', lojaId: currentLoja.id })
                ]);

                if (scriptsData) setScripts(scriptsData);
                if (estoqueData) setEstoque(estoqueData);
            } catch (err) {
                console.error("Erro ao carregar dados auxiliares:", err);
            }
        };
        loadAuxData();
    }, [currentLoja?.id]);

    // 3. Carregar Mensagens ao selecionar Chat
    useEffect(() => {
        if (!activeChat) return;
        fetchMessages(activeChat.id);

        const sub = supabase
            .channel(`crm_messages_${activeChat.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'crm_messages',
                filter: `conversation_id=eq.${activeChat.id}`
            }, (payload) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
                scrollToBottom();
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [activeChat?.id]);

    const fetchConversations = async () => {
        if (!currentLoja?.id) return;
        const { data, error } = await supabase
            .from('crm_conversations')
            .select('*')
            .eq('loja_id', currentLoja.id)
            .order('last_message_at', { ascending: false });

        if (data) {
            setConversations(data);
            if (activeChat) {
                const updated = data.find(c => c.id === activeChat.id);
                if (!updated) {
                    setActiveChat(null);
                } else if (updated.ai_status !== activeChat.ai_status || updated.last_message_at !== activeChat.last_message_at) {
                    setActiveChat(updated);
                }
            }
        }
        setLoading(false);
    };

    const fetchMessages = async (convId) => {
        const { data, error } = await supabase
            .from('crm_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const msgText = newMessage.trim();
        if (!msgText || !activeChat) return;

        setNewMessage('');
        setSending(true);

        try {
            let cleanPhone = activeChat.phone.replace(/\D/g, '');
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                cleanPhone = '55' + cleanPhone;
            }

            // CRITICAL: Quando enviamos uma mensagem humana, pausamos a IA imediatamente
            if (activeChat.ai_status !== 'paused') {
                console.log("⏸️ [Neural Hub] Intervenção Humana detectada. Pausando IA...");
                await supabase
                    .from('crm_conversations')
                    .update({ ai_status: 'paused' })
                    .eq('id', activeChat.id);
                setActiveChat(prev => ({ ...prev, ai_status: 'paused' }));
            }

            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    to: cleanPhone,
                    text: msgText,
                    conversation_id: activeChat.id,
                    loja_id: currentLoja?.id
                }
            });

        } catch (error) {
            console.error('❌ Erro:', error);
            setNewMessage(msgText);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteChat = async () => {
        if (!activeChat || !confirm(`Tem certeza que deseja apagar a conversa com ${activeChat.name}?`)) return;
        try {
            await supabase.from('crm_conversations').delete().eq('id', activeChat.id);
            setActiveChat(null);
            fetchConversations();
        } catch (err) { console.error(err); }
    };

    const toggleAI = async () => {
        if (!activeChat) return;
        const newStatus = activeChat.ai_status === 'active' ? 'paused' : 'active';
        try {
            await supabase.from('crm_conversations').update({ ai_status: newStatus }).eq('id', activeChat.id);
            setActiveChat(prev => ({ ...prev, ai_status: newStatus }));
        } catch (err) { console.error(err); }
    };

    const filteredEstoque = useMemo(() => {
        const query = (searchEstoque || "").toLowerCase();
        return (estoque || []).filter(car =>
            car.nome && car.nome.toLowerCase().includes(query) && car.ativo !== 0
        );
    }, [estoque, searchEstoque]);

    const addToInput = (text) => {
        setNewMessage(prev => (prev ? `${prev}\n${text}` : text));
    };

    return (
        <div className="flex h-screen bg-[#020617] text-white overflow-hidden font-inter relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/5 blur-[120px] pointer-events-none" />

            {/* SIDEBAR ESQUERDA - LISTA DE CONVERSAS */}
            <aside className="w-96 flex flex-col bg-[#0a0f1e]/80 backdrop-blur-2xl border-r border-white/5 shrink-0 z-30">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                            <Bot size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter  font-rajdhani italic">IRW<span className="text-cyan-400">CORE</span></h1>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-gray-500  tracking-widest font-rajdhani">Neural Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Pesquisar Cognição..."
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 transition-all font-rajdhani tracking-widest"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2">
                    {loading && <div className="text-center py-10"><Activity className="animate-spin mx-auto text-cyan-500" /></div>}
                    {conversations.map(conv => {
                        const initial = (conv.name || conv.phone || '?')?.charAt(0)?.toUpperCase() || '?';
                        const isActive = activeChat?.id === conv.id;
                        return (
                            <motion.div
                                key={conv.id}
                                whileHover={{ x: 5 }}
                                onClick={() => setActiveChat(conv)}
                                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${isActive
                                    ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/30 shadow-2xl'
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl border border-white/10 relative ${initial >= 'A' && initial <= 'F' ? 'bg-gradient-to-br from-blue-600 to-cyan-500' : 'bg-gradient-to-br from-purple-600 to-pink-500'}`}>
                                        {initial}
                                        {conv.ai_status === 'active' && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#020617] rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm font-black text-white truncate font-rajdhani tracking-tight">{conv.name || conv.phone}</h3>
                                            <span className="text-[10px] font-bold text-gray-500 font-rajdhani">{conv.last_message_at && format(new Date(conv.last_message_at), 'HH:mm')}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mb-3">{conv.last_message || 'Iniciando conexão...'}</p>
                                        <div className="flex items-center justify-between">
                                            <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-black  tracking-widest font-rajdhani ${conv.ai_status === 'active' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                                {conv.ai_status === 'active' ? 'Autonomous AI' : 'Human Control'}
                                            </div>
                                            {conv.unread_count > 0 && (
                                                <span className="w-5 h-5 bg-cyan-500 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg shadow-cyan-500/30">{conv.unread_count}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </aside>

            {/* ÁREA CENTRAL - OPERAÇÕES */}
            <main className="flex-1 flex flex-col relative z-20">
                <AnimatePresence mode="wait">
                    {activeChat ? (
                        <motion.div
                            key={activeChat.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col h-full"
                        >
                            {/* Chat Header */}
                            <header className="p-6 bg-[#0a0f1e]/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-2xl text-cyan-400 font-rajdhani italic">
                                        {(activeChat.name || activeChat.phone || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white italic tracking-tighter font-rajdhani ">{activeChat.name || activeChat.phone}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500 font-rajdhani tracking-widest">{activeChat.phone}</span>
                                            <div className="h-3 w-px bg-white/10" />
                                            <div className="flex items-center gap-1.5">
                                                <Activity size={12} className="text-emerald-500" />
                                                <span className="text-[10px] font-black text-emerald-500  tracking-widest font-rajdhani">Link Established</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">

                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={toggleAI}
                                        className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl font-black  text-[10px] tracking-widest font-rajdhani transition-all ${activeChat.ai_status === 'active'
                                            ? 'bg-orange-600/10 border border-orange-600/30 text-orange-400 hover:bg-orange-600/20'
                                            : 'bg-cyan-600/10 border border-cyan-600/30 text-cyan-400 hover:bg-cyan-600/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                                            }`}
                                    >
                                        {activeChat.ai_status === 'active' ? <><PauseCircle size={16} /> Override AI</> : <><PlayCircle size={16} /> Engage AI</>}
                                    </motion.button>

                                    <button
                                        onClick={handleDeleteChat}
                                        className="p-3 bg-white/5 border border-white/5 hover:border-red-500/30 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-2xl transition-all"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </header>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar relative">
                                {/* Neural Background Pattern */}
                                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                                {messages.map((msg) => {
                                    const isMe = msg.direction === 'outbound';
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`relative max-w-[75%] group`}>
                                                <div className={`p-6 rounded-[2rem] shadow-2xl ${isMe
                                                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-br-none'
                                                    : 'bg-white/5 backdrop-blur-3xl border border-white/10 text-gray-200 rounded-bl-none'
                                                    }`}>
                                                    <p className="text-[14px] font-medium leading-[1.6]">{msg.body}</p>

                                                    <div className={`mt-4 flex items-center justify-end gap-2 text-[9px] font-black  tracking-widest ${isMe ? 'text-white/60' : 'text-gray-500'}`}>
                                                        <Clock size={10} />
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                        {isMe && <Check size={12} className="text-cyan-300" />}
                                                    </div>
                                                </div>
                                                {/* Glow Effect for AI messages */}
                                                {!isMe && msg.sender_role === 'ai' && (
                                                    <div className="absolute -inset-1 bg-cyan-500/10 blur-xl rounded-[2rem] -z-10" />
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-8 bg-[#0a0f1e]/60 backdrop-blur-3xl border-t border-white/5">
                                <form onSubmit={handleSendMessage} className="relative flex gap-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            autoFocus
                                            disabled={sending}
                                            placeholder={activeChat.ai_status === 'active' ? "NEURAL INTERVENTION REQUIRED TO SEND..." : "Communicate with lead..."}
                                            className={`w-full bg-white/5 border border-white/5 rounded-3xl py-5 px-8 text-white placeholder-gray-600 outline-none transition-all font-rajdhani tracking-widest text-lg ${sending ? 'opacity-50' : 'focus:border-cyan-500/30 focus:bg-white/[0.08]'}`}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                            <span className="text-[9px] font-black text-gray-700 tracking-[0.4em]  hidden xl:block">Encryption AES-256</span>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={sending || !newMessage.trim()}
                                        className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                                    >
                                        {sending ? <Activity className="animate-spin" /> : <Send size={24} />}
                                    </motion.button>
                                </form>
                                {activeChat.ai_status === 'active' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center justify-center gap-3 mt-4 text-orange-400/60 font-black text-[9px]  tracking-[0.3em] font-rajdhani"
                                    >
                                        <Shield size={12} /> Warning: AI Autonomous Mode Active. Sending message will pause neural routing.
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center text-center p-20"
                        >
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full" />
                                <div className="w-32 h-32 rounded-[3rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 flex items-center justify-center relative z-10">
                                    <Terminal size={60} className="text-cyan-500/40" />
                                </div>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-4 border border-dashed border-cyan-500/20 rounded-full"
                                />
                            </div>
                            <h2 className="text-4xl font-black text-white italic tracking-tighter  font-rajdhani mb-4">Neural Hub <span className="text-cyan-400">Standby</span></h2>
                            <p className="text-gray-500 max-w-sm font-medium tracking-tight leading-relaxed">Selecione uma sinapse conversacional para iniciar o monitoramento tático em tempo real.</p>

                            <div className="mt-12 flex items-center gap-8">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-700  tracking-widest">Global Status</span>
                                    {(() => {
                                        const activeNodes = conversations.filter(c => c.ai_status === 'active').length;
                                        const status = activeNodes > 0 ? 'OPERATIONAL' : (conversations.length > 0 ? 'IDLE' : 'OFFLINE');
                                        const colorClass = activeNodes > 0
                                            ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                                            : (conversations.length > 0 ? 'text-orange-500 border-orange-500/20 bg-orange-500/5' : 'text-gray-500 border-gray-500/20 bg-gray-500/5');

                                        return (
                                            <div className={`px-4 py-1.5 border rounded-xl text-[10px] font-black tracking-widest ${colorClass}`}>
                                                {status}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="h-10 w-px bg-white/5" />
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-700  tracking-widest">Active Nodes</span>
                                    <span className="text-2xl font-black text-white font-rajdhani italic">
                                        {conversations.filter(c => c.ai_status === 'active').length} <span className="text-gray-600 text-sm not-italic">/ {conversations.length}</span>
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOTÃO TOGGLE SIDEBAR (NA DIREITA) */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute top-1/2 -translate-y-1/2 right-0 z-50 w-10 h-32 bg-[#0a1120] border-y border-l border-white/10 flex flex-col items-center justify-center gap-4 rounded-l-3xl hover:bg-cyan-500/10 transition-colors group"
                >
                    <div className="w-1 h-8 bg-cyan-700 group-hover:bg-cyan-400 rounded-full transition-colors" />
                    <div className="flex flex-col items-center gap-1">
                        <Cpu size={14} className="text-gray-600 group-hover:text-cyan-500" />
                        <span className="text-[8px] font-black text-gray-800 group-hover:text-cyan-900  rotate-90 whitespace-nowrap tracking-widest">Database</span>
                    </div>
                </button>

                {/* SIDEBAR DIREITA - NEURAL DATA */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute right-0 top-0 bottom-0 w-[400px] bg-[#020617] border-l border-white/5 z-40 shadow-[-50px_0_100px_rgba(0,0,0,0.5)] flex flex-col"
                        >
                            <div className="p-8 border-b border-white/5">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-white italic tracking-tighter  font-rajdhani">Data<span className="text-cyan-400">Library</span></h2>
                                    <button onClick={() => setIsSidebarOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="bg-white/5 p-1.5 rounded-2xl flex gap-1.5 border border-white/5">
                                    <button
                                        onClick={() => setActiveTab('templates')}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px]  tracking-widest transition-all font-rajdhani flex items-center justify-center gap-2 ${activeTab === 'templates'
                                            ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-xl'
                                            : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        <Terminal size={12} /> Scripts
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('veiculos')}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px]  tracking-widest transition-all font-rajdhani flex items-center justify-center gap-2 ${activeTab === 'veiculos'
                                            ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl'
                                            : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        <Car size={12} /> Inventory
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {activeTab === 'templates' ? (
                                    <>
                                        {scripts.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => addToInput(item.mensagem)}
                                                className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/20 transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[11px] font-black text-white font-rajdhani tracking-widest  group-hover:text-cyan-400">{item.titulo}</span>
                                                    <Sparkles size={12} className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <p className="text-xs text-gray-500 group-hover:text-gray-400 line-clamp-3 leading-relaxed">"{item.mensagem}"</p>
                                            </motion.div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <div className="relative mb-6">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search Units..."
                                                value={searchEstoque}
                                                onChange={(e) => setSearchEstoque(e.target.value)}
                                                className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-xs text-white focus:border-purple-500/30 outline-none font-rajdhani tracking-widest"
                                            />
                                        </div>
                                        {filteredEstoque.map((car) => (
                                            <motion.div
                                                key={car.id || car.nome}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                onClick={() => addToInput(`*${car.nome}*\n📅 ${car.ano || 'N/A'}\n💰 ${car.valor || 'Consulte'}\n⚙️ ${car.cambio || ''}\n🛣️ ${car.km || ''}`)}
                                                className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all cursor-pointer flex gap-4"
                                            >
                                                <div className="w-20 h-16 bg-black/40 rounded-xl overflow-hidden shrink-0 border border-white/5">
                                                    {car.foto ? (
                                                        <img src={car.foto} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-800"><Car size={20} /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-[11px] font-black text-white  truncate font-rajdhani tracking-tight">{car.nome}</h4>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[9px] rounded-lg border border-cyan-500/20 font-black">{car.valor}</span>
                                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] rounded-lg border border-purple-500/20 font-black">{car.ano}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ChatCRM;
