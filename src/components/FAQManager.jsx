import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircleQuestion, Plus, Search, Edit2, Trash2, Save, X,
    TrendingUp, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Copy,
    HelpCircle, DollarSign, Car, MapPin, Calendar, FileText, Tag,
    ShieldQuestion, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Configuração de Categorias
const CATEGORY_CONFIG = {
    financiamento: {
        icon: DollarSign,
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        label: '💰 Financiamento',
        description: 'Perguntas sobre financiamento, entrada, parcelas, bancos, score'
    },
    troca: {
        icon: Car,
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        label: '🚗 Veículo de Troca',
        description: 'Perguntas sobre dar carro na troca, avaliação, valor'
    },
    preco: {
        icon: Tag,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        label: '💵 Preço e Negociação',
        description: 'Perguntas sobre desconto, valor, proposta, pagamento'
    },
    veiculo: {
        icon: FileText,
        color: 'text-purple-400',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        label: '📋 Sobre o Veículo',
        description: 'Perguntas sobre estado, documentação, garantia, procedência'
    },
    localizacao: {
        icon: MapPin,
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        label: '📍 Localização e Entrega',
        description: 'Perguntas sobre endereço, entrega, frete, horário'
    },
    agendamento: {
        icon: Calendar,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/20',
        border: 'border-cyan-500/30',
        label: '📅 Agendamento',
        description: 'Perguntas sobre visita, horário, reserva'
    },
    objecoes: {
        icon: ShieldQuestion,
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30',
        label: '🛡️ Objeções',
        description: 'Respostas para objeções comuns dos clientes'
    },
    documentacao: {
        icon: FileText,
        color: 'text-pink-400',
        bg: 'bg-pink-500/20',
        border: 'border-pink-500/30',
        label: '📄 Documentação',
        description: 'Perguntas sobre transferência, IPVA, multas, etc'
    },
    geral: {
        icon: HelpCircle,
        color: 'text-gray-400',
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30',
        label: '❓ Geral',
        description: 'Outras perguntas diversas'
    }
};

const FAQManager = () => {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});
    const [showEditor, setShowEditor] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    const [status, setStatus] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        category: 'geral',
        keywords: '',
        question: '',
        answer: '',
        priority: 5,
        is_active: true
    });

    // Load FAQs
    useEffect(() => {
        loadFaqs();
    }, []);

    // Expand all categories by default
    useEffect(() => {
        const expanded = {};
        Object.keys(CATEGORY_CONFIG).forEach(cat => {
            expanded[cat] = true;
        });
        setExpandedCategories(expanded);
    }, []);

    const loadFaqs = async () => {
        try {
            const { data, error } = await supabase
                .from('diego_faq')
                .select('*')
                .order('priority', { ascending: false });

            if (error) throw error;
            setFaqs(data || []);
        } catch (error) {
            console.error('Erro ao carregar FAQs:', error);
            setStatus({ type: 'error', message: 'Erro ao carregar FAQs. Execute a migration primeiro!' });
        } finally {
            setLoading(false);
        }
    };

    // FAQs grouped by category
    const faqsByCategory = useMemo(() => {
        const grouped = {};

        // Initialize all categories
        Object.keys(CATEGORY_CONFIG).forEach(cat => {
            grouped[cat] = [];
        });

        // Filter and group
        faqs.forEach(faq => {
            const matchesSearch = search === '' ||
                faq.question.toLowerCase().includes(search.toLowerCase()) ||
                faq.answer.toLowerCase().includes(search.toLowerCase()) ||
                faq.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()));

            if (matchesSearch) {
                const category = faq.category || 'geral';
                if (grouped[category]) {
                    grouped[category].push(faq);
                } else {
                    grouped.geral.push(faq);
                }
            }
        });

        return grouped;
    }, [faqs, search]);

    // Stats
    const stats = useMemo(() => {
        const total = faqs.length;
        const active = faqs.filter(f => f.is_active).length;
        const totalUsage = faqs.reduce((sum, f) => sum + (f.usage_count || 0), 0);
        return { total, active, totalUsage };
    }, [faqs]);

    // Toggle category expansion
    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Handlers
    const handleNew = (category = 'geral') => {
        setEditingFaq(null);
        setFormData({
            category: category,
            keywords: '',
            question: '',
            answer: '',
            priority: 5,
            is_active: true
        });
        setShowEditor(true);
    };

    const handleEdit = (faq) => {
        setEditingFaq(faq);
        setFormData({
            category: faq.category,
            keywords: faq.keywords?.join(', ') || '',
            question: faq.question,
            answer: faq.answer,
            priority: faq.priority,
            is_active: faq.is_active
        });
        setShowEditor(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta FAQ?')) return;

        try {
            const { error } = await supabase
                .from('diego_faq')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setFaqs(faqs.filter(f => f.id !== id));
            setStatus({ type: 'success', message: 'FAQ excluída!' });
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            setStatus({ type: 'error', message: 'Erro ao excluir FAQ' });
        }
    };

    const handleSave = async () => {
        if (!formData.question.trim() || !formData.answer.trim()) {
            setStatus({ type: 'error', message: 'Preencha a pergunta e resposta!' });
            return;
        }

        setSaving(true);
        setStatus(null);

        try {
            const keywordsArray = formData.keywords
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 0);

            const faqData = {
                category: formData.category,
                keywords: keywordsArray,
                question: formData.question.trim(),
                answer: formData.answer.trim(),
                priority: parseInt(formData.priority),
                is_active: formData.is_active
            };

            if (editingFaq) {
                const { error } = await supabase
                    .from('diego_faq')
                    .update(faqData)
                    .eq('id', editingFaq.id);

                if (error) throw error;
                setFaqs(faqs.map(f => f.id === editingFaq.id ? { ...f, ...faqData } : f));
                setStatus({ type: 'success', message: 'FAQ atualizada!' });
            } else {
                const { data, error } = await supabase
                    .from('diego_faq')
                    .insert(faqData)
                    .select()
                    .single();

                if (error) throw error;
                setFaqs([...faqs, data]);
                setStatus({ type: 'success', message: 'FAQ criada!' });
            }

            setShowEditor(false);
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            console.error('Erro ao salvar FAQ:', error);
            setStatus({ type: 'error', message: 'Erro ao salvar FAQ' });
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setStatus({ type: 'success', message: 'Copiado!' });
        setTimeout(() => setStatus(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white flex items-center gap-3">
                    <Clock className="animate-spin" size={24} />
                    Carregando FAQs...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header com Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-2xl p-4">
                    <div className="text-3xl font-black text-cyan-400">{stats.total}</div>
                    <div className="text-xs text-gray-400 font-bold ">Total FAQs</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-4">
                    <div className="text-3xl font-black text-green-400">{stats.active}</div>
                    <div className="text-xs text-gray-400 font-bold ">Ativas</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-4">
                    <div className="text-3xl font-black text-yellow-400">{stats.totalUsage}</div>
                    <div className="text-xs text-gray-400 font-bold ">Usos Totais</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por pergunta, resposta ou palavra-chave..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
            </div>

            {/* Status Message */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl ${status.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}
                    >
                        {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {status.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Categories with FAQs */}
            <div className="space-y-4">
                {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
                    const categoryFaqs = faqsByCategory[categoryKey] || [];
                    const Icon = config.icon;
                    const isExpanded = expandedCategories[categoryKey];

                    return (
                        <motion.div
                            key={categoryKey}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`border ${config.border} rounded-2xl overflow-hidden`}
                        >
                            {/* Category Header */}
                            <div
                                className={`${config.bg} p-4 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all`}
                                onClick={() => toggleCategory(categoryKey)}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={config.color} size={24} />
                                    <div>
                                        <h3 className={`font-bold text-lg ${config.color}`}>
                                            {config.label}
                                        </h3>
                                        <p className="text-xs text-gray-400">{config.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.bg} ${config.color}`}>
                                        {categoryFaqs.length} FAQs
                                    </span>

                                    {/* Add Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNew(categoryKey);
                                        }}
                                        className={`p-2 rounded-lg ${config.bg} ${config.color} hover:brightness-125 transition-all`}
                                        title={`Adicionar FAQ em ${config.label}`}
                                    >
                                        <Plus size={18} />
                                    </button>

                                    {isExpanded ? (
                                        <ChevronDown className="text-gray-400" size={20} />
                                    ) : (
                                        <ChevronRight className="text-gray-400" size={20} />
                                    )}
                                </div>
                            </div>

                            {/* FAQs List */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-black/20 p-4 space-y-3">
                                            {categoryFaqs.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <MessageCircleQuestion size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Nenhuma FAQ nesta categoria</p>
                                                    <button
                                                        onClick={() => handleNew(categoryKey)}
                                                        className={`mt-3 px-4 py-2 rounded-lg ${config.bg} ${config.color} text-sm font-bold hover:brightness-125 transition-all`}
                                                    >
                                                        <Plus size={14} className="inline mr-1" />
                                                        Adicionar primeira FAQ
                                                    </button>
                                                </div>
                                            ) : (
                                                categoryFaqs.map((faq) => (
                                                    <div
                                                        key={faq.id}
                                                        className={`bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all ${!faq.is_active ? 'opacity-50' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs text-gray-500">
                                                                        Prioridade: {faq.priority}
                                                                    </span>
                                                                    {faq.usage_count > 0 && (
                                                                        <span className="text-xs text-cyan-400 flex items-center gap-1">
                                                                            <TrendingUp size={12} />
                                                                            {faq.usage_count}x
                                                                        </span>
                                                                    )}
                                                                    {!faq.is_active && (
                                                                        <span className="text-xs text-red-400">(Inativa)</span>
                                                                    )}
                                                                </div>

                                                                <h4 className="text-white font-bold mb-2">{faq.question}</h4>
                                                                <p className="text-gray-400 text-sm whitespace-pre-wrap">{faq.answer}</p>

                                                                {faq.keywords?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                                        {faq.keywords.map((kw, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400"
                                                                            >
                                                                                {kw}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex flex-col gap-1">
                                                                <button
                                                                    onClick={() => copyToClipboard(faq.answer)}
                                                                    className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                                                                    title="Copiar resposta"
                                                                >
                                                                    <Copy size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEdit(faq)}
                                                                    className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(faq.id)}
                                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Editor Modal */}
            <AnimatePresence>
                {showEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowEditor(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingFaq ? 'Editar FAQ' : 'Nova FAQ'}
                                </h2>
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="p-2 text-gray-500 hover:text-white rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* Category */}
                                <div>
                                    <label className="text-sm text-gray-400 font-bold mb-2 block">
                                        Categoria
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                                    >
                                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Question */}
                                <div>
                                    <label className="text-sm text-gray-400 font-bold mb-2 block">
                                        Pergunta
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.question}
                                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                        placeholder="Ex: Vocês financiam 100%?"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>

                                {/* Answer */}
                                <div>
                                    <label className="text-sm text-gray-400 font-bold mb-2 block">
                                        Resposta do Agente IA
                                    </label>
                                    <textarea
                                        value={formData.answer}
                                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                        placeholder="Escreva a resposta que o Agente IA vai usar..."
                                        rows={6}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                                    />
                                </div>

                                {/* Keywords */}
                                <div>
                                    <label className="text-sm text-gray-400 font-bold mb-2 block">
                                        Palavras-chave (separadas por vírgula)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.keywords}
                                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                        placeholder="financiam, financiamento, parcela, financia"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        O Agente IA usa essas palavras para encontrar a resposta certa
                                    </p>
                                </div>

                                {/* Priority & Active */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 font-bold mb-2 block">
                                            Prioridade (1-10)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Maior = mais importante
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 font-bold mb-2 block">
                                            Status
                                        </label>
                                        <button
                                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                            className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${formData.is_active
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}
                                        >
                                            {formData.is_active ? '✓ Ativa' : '✗ Inativa'}
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowEditor(false)}
                                        className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                        {saving ? 'Salvando...' : 'Salvar FAQ'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FAQManager;
