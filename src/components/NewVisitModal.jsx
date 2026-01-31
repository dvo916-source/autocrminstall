import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Car, Clock, Users, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from './PremiumSelect';
import PremiumDatePicker from './PremiumDatePicker';

const TEMPERATURAS = [
    { value: 'Quente', label: '🔥 Quente' },
    { value: 'Morno', label: '☕ Morno' },
    { value: 'Frio', label: '🧊 Frio' }
];

const FORMAS_PAGAMENTO = [
    { value: 'Financiamento', label: '🏦 Financiamento' },
    { value: 'À Vista', label: '💵 À Vista' },
    { value: 'Consórcio', label: '📝 Consórcio' },
    { value: 'Cartão', label: '💳 Crédito' },
    { value: 'Troca com Troco', label: '💰 Troca c/ Troco' }
];

const NewVisitModal = ({ isOpen, onClose, initialPhone = '' }) => {
    const [loading, setLoading] = useState(true);
    const [portais, setPortais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [formData, setFormData] = useState({
        cliente: '', telefone: initialPhone || '', cpf_cliente: '',
        portal: '', temperatura: 'Morno',
        data_agendamento: '',
        veiculo_interesse: '', veiculo_troca: '', valor_proposta: '', forma_pagamento: '',
        vendedor_sdr: '',
        vendedor: '',
        negociacao: '', motivo_perda: '', status_pipeline: 'Agendado'
    });

    // Helper: Local ISO String
    const toLocalISOString = (date) => {
        const d = date || new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            // Initialize User & Date
            const storedUser = JSON.parse(localStorage.getItem('sdr_user') || '{"username":"SDR","role":"vendedor"}');
            setCurrentUser(storedUser);

            // FULL RESET: Clear all fields to ensure a fresh start
            setFormData({
                cliente: '',
                telefone: initialPhone || '',
                cpf_cliente: '',
                portal: '',
                temperatura: 'Morno',
                data_agendamento: toLocalISOString(new Date()),
                veiculo_interesse: '',
                veiculo_troca: '',
                valor_proposta: '',
                forma_pagamento: '',
                vendedor_sdr: storedUser.username,
                vendedor: '',
                negociacao: '',
                motivo_perda: '',
                status_pipeline: 'Agendado'
            });
        }
    }, [isOpen, initialPhone]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');

            // Parallel fetch for speed
            const [localPortais, localVendedores, localEstoque] = await Promise.all([
                ipcRenderer.invoke('get-list', 'portais'),
                ipcRenderer.invoke('get-list', 'vendedores'),
                ipcRenderer.invoke('get-list', 'estoque')
            ]);

            setPortais(localPortais ? localPortais.filter(i => i.ativo) : []);
            setVendedores(localVendedores ? localVendedores.filter(i => i.ativo) : []);
            setEstoque(localEstoque ? localEstoque.filter(i => i.ativo) : []);
        } catch (err) {
            console.error('Erro ao carregar dados do modal:', err);
        } finally {
            setLoading(false);
        }
    };

    // Render Custom Vehicle Option
    const renderVehicleOption = (option) => {
        const v = option.data;
        if (!v) return <span className="text-sm">{option.label}</span>;

        let photoUrl = '';
        try {
            const fotos = typeof v.fotos === 'string' ? JSON.parse(v.fotos) : v.fotos;
            if (Array.isArray(fotos) && fotos.length > 0) photoUrl = fotos[0];
            else if (v.foto) photoUrl = v.foto;
        } catch (e) { photoUrl = v.foto || ''; }

        return (
            <div className="flex items-center gap-3 w-full group py-0.5">
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 relative">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <Car size={14} />
                        </div>
                    )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                        {v.nome}
                    </span>
                    <div className="flex items-center gap-2 text-[8px] font-black  tracking-wider text-gray-500 mt-0.5">
                        {v.placa && <span className="text-gray-400">{v.placa}</span>}
                        {v.cor && <span>{v.cor}</span>}
                        {v.ano && <span>{v.ano}</span>}
                    </div>
                </div>
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation - Mandatory Fields
        const required = {
            cliente: 'Nome do Cliente',
            portal: 'Origem',
            telefone: 'WhatsApp',
            veiculo_interesse: 'Carro Desejado',
            vendedor: 'Consultor',
            data_agendamento: 'Data & Hora'
        };

        const missing = Object.entries(required)
            .filter(([key]) => !formData[key])
            .map(([_, label]) => label);

        if (missing.length > 0) {
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: {
                    message: `⚠️ Campos obrigatórios faltando: ${missing.join(', ')}`,
                    type: 'error'
                }
            }));
            return;
        }

        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');

            // Get car price for the repass message
            const selectedCar = estoque.find(c => c.nome === formData.veiculo_interesse);
            const carPrice = selectedCar?.valor || 'Consulte';

            const payload = {
                ...formData,
                mes: new Date().getMonth() + 1,
                datahora: new Date().toISOString(),
                status: 'Pendente',
                historico_log: formData.negociacao
            };

            await ipcRenderer.invoke('add-visita', payload);

            // Generate Repass Message
            const repassMessage = `*📅 NOVO AGENDAMENTO SDR*
            
👤 *CLIENTE:* ${formData.cliente}
🚗 *CARRO:* ${formData.veiculo_interesse}
💰 *PREÇO:* ${carPrice}
⏰ *DATA/HORA:* ${new Date(formData.data_agendamento).toLocaleString('pt-BR')}
👨‍💼 *CONSULTOR:* ${formData.vendedor}
🔄 *TROCA:* ${formData.veiculo_troca || ''}
📝 *NOTAS:* ${formData.negociacao || ''}`;

            // Success feedback with Repass option
            const confirmed = window.confirm('Agendamento salvo com sucesso!\n\nDeseja repassar os dados para o WhatsApp agora?');

            if (confirmed && typeof window.onAppointmentSaved === 'function') {
                window.onAppointmentSaved(repassMessage);
            }

            onClose();

            // Reset form
            setFormData({
                cliente: '', telefone: '', cpf_cliente: '',
                portal: '', temperatura: 'Morno',
                data_agendamento: '',
                veiculo_interesse: '', veiculo_troca: '', valor_proposta: '', forma_pagamento: '',
                vendedor_sdr: currentUser?.username || '',
                vendedor: '',
                negociacao: '', motivo_perda: '', status_pipeline: 'Agendado'
            });

        } catch (err) {
            alert('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-6xl bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header Compacto */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter  leading-none">Novo Agendamento</h2>
                                <p className="text-blue-400 font-bold text-[10px] mt-1.5  tracking-widest flex items-center gap-2">
                                    <span className="w-6 h-px bg-blue-500/50"></span>
                                    Sincronização em Tempo Real
                                </p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Conteúdo Ajustado para não rolar */}
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* 1. DADOS DO CLIENTE */}
                                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col h-full">
                                    <h3 className="text-[10px] font-black text-blue-400  mb-4 flex items-center gap-2 tracking-widest">
                                        <Users size={14} /> Dados do Cliente
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 flex-1">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Nome do Cliente</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold  tracking-wider outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                                                    placeholder="Ex: João Silva"
                                                    value={formData.cliente}
                                                    onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Origem</label>
                                                <PremiumSelect
                                                    options={portais.map(p => ({ value: p.nome, label: p.nome }))}
                                                    value={formData.portal}
                                                    onChange={val => setFormData({ ...formData, portal: val })}
                                                    placeholder="..."
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">WhatsApp</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold font-mono  tracking-wider outline-none focus:border-blue-500/50 placeholder:text-gray-500"
                                                    placeholder="(00) 0.0000-0000"
                                                    value={formData.telefone}
                                                    onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">CPF (Opcional)</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold  tracking-wider outline-none focus:border-blue-500/50 placeholder:text-gray-500"
                                                    placeholder="000.000.000-00"
                                                    value={formData.cpf_cliente}
                                                    onChange={e => setFormData({ ...formData, cpf_cliente: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. ATENDIMENTO (TOP RIGHT) */}
                                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col h-full">
                                    <h3 className="text-[10px] font-black text-orange-400  mb-4 flex items-center gap-2 tracking-widest">
                                        <Clock size={14} /> Atendimento
                                    </h3>
                                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Consultor</label>
                                                <PremiumSelect
                                                    options={vendedores.map(v => ({ value: v.nome, label: v.nome }))}
                                                    value={formData.vendedor}
                                                    onChange={val => setFormData({ ...formData, vendedor: val })}
                                                    placeholder="Responsável..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Data & Hora</label>
                                                <PremiumDatePicker
                                                    value={formData.data_agendamento}
                                                    onChange={val => setFormData({ ...formData, data_agendamento: val })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Temperatura</label>
                                            <div className="flex gap-2">
                                                {TEMPERATURAS.map(t => (
                                                    <button
                                                        key={t.value}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, temperatura: t.value })}
                                                        className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all border ${formData.temperatura === t.value
                                                            ? 'bg-blue-600/20 border-blue-500/50 text-white shadow-lg'
                                                            : 'bg-white/5 border-white/5 text-gray-600 grayscale hover:grayscale-0'
                                                            }`}
                                                    >
                                                        <span className="text-sm">{t.label.split(' ')[0]}</span>
                                                        <span className="text-[8px] font-black ">{t.label.split(' ')[1]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. INTERESSE & NEGÓCIO (BOTTOM LEFT) */}
                                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col h-full">
                                    <h3 className="text-[10px] font-black text-purple-400  mb-4 flex items-center gap-2 tracking-widest">
                                        <Car size={14} /> Interesse & Negócio
                                    </h3>
                                    <div className="space-y-3 flex-1">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Carro Desejado</label>
                                            <PremiumSelect
                                                options={estoque.map(c => ({
                                                    value: c.nome,
                                                    label: c.nome,
                                                    data: c
                                                }))}
                                                value={formData.veiculo_interesse}
                                                onChange={val => setFormData({ ...formData, veiculo_interesse: val })}
                                                placeholder="Pesquisar estoque..."
                                                searchable
                                                itemRenderer={renderVehicleOption}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Veículo na Troca</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold  tracking-wider outline-none focus:border-purple-500/50 placeholder:text-gray-500"
                                                    placeholder="Algum carro?"
                                                    value={formData.veiculo_troca}
                                                    onChange={e => setFormData({ ...formData, veiculo_troca: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black  ml-1 mb-1 block tracking-widest">Forma Pagto</label>
                                                <PremiumSelect
                                                    options={FORMAS_PAGAMENTO}
                                                    value={formData.forma_pagamento}
                                                    onChange={val => setFormData({ ...formData, forma_pagamento: val })}
                                                    placeholder="Selecione..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. NOTAS DA NEGOCIAÇÃO (BOTTOM RIGHT) */}
                                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col h-full">
                                    <h3 className="text-[10px] font-black text-emerald-400  mb-4 flex items-center gap-2 tracking-widest">
                                        <Edit2 size={14} /> Notas da Negociação
                                    </h3>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm font-medium outline-none focus:border-emerald-500/50 flex-1 resize-none transition-all placeholder:text-gray-500"
                                        placeholder="Detalhes rápidos da conversa..."
                                        value={formData.negociacao}
                                        onChange={e => setFormData({ ...formData, negociacao: e.target.value })}
                                    />
                                </div>

                                {/* Botão Final */}
                                <div className="md:col-span-2 pt-2">
                                    <button
                                        type="submit"
                                        className="w-full h-12 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-black  tracking-[0.2em] text-[11px] rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.99] border-t border-white/20"
                                    >
                                        <CheckCircle size={18} /> Gravar Agendamento
                                    </button>
                                </div>

                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewVisitModal;
