import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Car, Clock, Users, Calendar as CalendarIcon, Edit2, Zap, DollarSign, Repeat, Target, Wallet, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toLocalISOString } from '../lib/utils';
import PremiumSelect from './PremiumSelect';
import PremiumDatePicker from './PremiumDatePicker';
import { useLoja } from '../context/LojaContext';

const TEMPERATURAS = [
    { value: 'Quente', label: '🔥 Quente' },
    { value: 'Morno', label: '☕ Morno' },
    { value: 'Frio', label: '🧊 Frio' }
];

const FORMAS_PAGAMENTO = [
    { value: 'A Vista', label: '💵 A Vista' },
    { value: 'Financiamento', label: '🏦 Financiamento' },
    { value: 'Veículo na Troca', label: '🚗 Veículo na Troca' },
    { value: 'Troca com Troco', label: '💰 Troca com Troco' },
    { value: 'Consórcio', label: '📝 Consórcio' },
    { value: 'Cartão de Crédito', label: '💳 Cartão de Crédito' },
    { value: 'PIX', label: '📲 PIX' },
    { value: 'Transferência Bancária', label: '🏦 Transferência Bancária' }
];

const QuickVisitForm = ({ onClose }) => {
    const { currentLoja } = useLoja();
    const [loading, setLoading] = useState(false);
    const [portais, setPortais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [formData, setFormData] = useState({
        cliente: '', telefone: '', cpf_cliente: '',
        portal: '', temperatura: 'Morno',
        data_agendamento: '',
        veiculo_interesse: '', veiculo_troca: '', valor_proposta: '', forma_pagamento: 'À Vista',
        vendedor_sdr: '',
        vendedor: '',
        negociacao: '', motivo_perda: '', status_pipeline: 'Agendado'
    });



    const toTitleCase = (str) => {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    };

    const maskPhone = (val) => {
        let v = val.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 10) return `(${v.substring(0, 2)}) ${v.substring(2, 3)} ${v.substring(3, 7)}-${v.substring(7)}`;
        if (v.length > 6) return `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
        if (v.length > 2) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
        return v;
    };

    const maskCPF = (val) => {
        let v = val.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 9) return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
        if (v.length > 6) return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
        if (v.length > 3) return `${v.substring(0, 3)}.${v.substring(3)}`;
        return v;
    };

    useEffect(() => {
        loadData();
        const storedUser = JSON.parse(localStorage.getItem('vexcore_user') || '{"username":"VEX"}');
        setCurrentUser(storedUser);

        const superRoles = ['admin', 'master', 'developer', 'gerente'];
        const isSuper = superRoles.includes((storedUser.role || '').toLowerCase());
        setIsAdmin(isSuper);

        setFormData(prev => ({
            ...prev,
            data_agendamento: toLocalISOString(new Date()),
            vendedor_sdr: storedUser.username
        }));
    }, []);

    const loadData = async () => {
        try {
            const { ipcRenderer } = window.require('electron');
            const [localPortais, localVendedores, localEstoque, localUsers] = await Promise.all([
                ipcRenderer.invoke('get-list', { table: 'portais', lojaId: currentLoja?.id }),
                ipcRenderer.invoke('get-list', { table: 'vendedores', lojaId: currentLoja?.id }),
                ipcRenderer.invoke('get-list', { table: 'estoque', lojaId: currentLoja?.id }),
                ipcRenderer.invoke('get-list-users', currentLoja?.id)
            ]);

            setPortais(localPortais ? localPortais.filter(i => i.ativo) : []);
            setVendedores(localVendedores ? localVendedores.filter(i => i.ativo) : []);
            setEstoque(localEstoque ? localEstoque.filter(i => i.ativo) : []);

            // Filter only SDRs for the assignment select
            const sdrs = (localUsers || []).filter(u => u.role === 'sdr' || !u.role);
            setUsuarios(sdrs);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        }
    };

    const handleAutofill = () => {
        window.dispatchEvent(new CustomEvent('whatsapp-request-chat-info'));
    };

    useEffect(() => {
        const handleCapturedInfo = (e) => {
            const { name, phone } = e.detail;
            setFormData(prev => ({
                ...prev,
                cliente: name || prev.cliente,
                telefone: phone ? maskPhone(phone) : prev.telefone
            }));
        };
        window.addEventListener('whatsapp-chat-info-captured', handleCapturedInfo);
        return () => window.removeEventListener('whatsapp-chat-info-captured', handleCapturedInfo);
    }, []);

    const handleSubmit = async (repass = false) => {
        if (!formData.cliente || !formData.veiculo_interesse || !formData.vendedor || !formData.data_agendamento) {
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: '⚠️ Preencha os campos obrigatórios (Cliente, Carro, Consultor, Data)', type: 'error' }
            }));
            return;
        }

        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');
            const selectedCar = estoque.find(c => c.nome === formData.veiculo_interesse);
            const carPrice = selectedCar?.valor || 'Consulte';

            const payload = {
                ...formData,
                mes: new Date().getMonth() + 1,
                datahora: new Date().toISOString(),
                status: 'Pendente',
                historico_log: formData.negociacao,
                loja_id: currentLoja?.id
            };

            await ipcRenderer.invoke('add-visita', payload);

            if (repass) {
                const repassMessage = `*📅 AGENDAMENTO REALIZADO*
                
👤 *CLIENTE:* ${formData.cliente}
🚗 *CARRO:* ${formData.veiculo_interesse}
💰 *PREÇO:* ${carPrice}
⏰ *HORÁRIO:* ${new Date(formData.data_agendamento).toLocaleString('pt-BR')}
👨‍💼 *CONSULTOR:* ${formData.vendedor}
🔄 *TROCA:* ${formData.veiculo_troca || 'Não informado'}
💵 *PROPOSTA:* ${formData.valor_proposta || 'Não inf.'}
📝 *NOTAS:* ${formData.negociacao || 'Sem observações'}`;

                window.dispatchEvent(new CustomEvent('whatsapp-send-text', { detail: repassMessage }));
            }

            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: '✅ Agendamento salvo com sucesso!', type: 'success' }
            }));

            onClose();
        } catch (err) {
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: '❌ Erro ao salvar: ' + err.message, type: 'error' }
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="overflow-visible mb-6"
        >
            <div className="bg-[#0f172a] border border-blue-500/30 rounded-[1.5rem] p-5 space-y-4 relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[50]">
                {/* Glow Background Layer */}
                <div className="absolute inset-0 bg-blue-500/[0.03] pointer-events-none rounded-[1.5rem]" />
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 blur-[60px] pointer-events-none" />

                {/* HEADER: Title & Capture */}
                <div className="flex items-center justify-between relative z-10 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <CalendarIcon size={14} className="text-blue-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-blue-400 tracking-[0.2em] uppercase">Lead Express</span>
                        </div>
                    </div>
                    <button
                        onClick={handleAutofill}
                        className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[9px] font-black transition-all border border-blue-500/20 font-rajdhani shadow-lg shadow-blue-900/10"
                    >
                        <Zap size={10} className="fill-blue-400" /> CAPTURAR
                    </button>
                </div>

                {/* SECTION 1: IDENTIFICATION */}
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400/50 tracking-[0.2em] uppercase">
                        <Users size={10} className="text-blue-500/50" /> Identificação
                    </div>
                    <input
                        placeholder="NOME DO CLIENTE"
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-4 text-white text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700 shadow-inner"
                        value={formData.cliente}
                        onChange={e => setFormData({ ...formData, cliente: toTitleCase(e.target.value) })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            placeholder="WHATSAPP"
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-white text-[10px] font-bold outline-none focus:border-blue-500/50 transition-all font-mono shadow-inner"
                            value={formData.telefone}
                            onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                        />
                        <input
                            placeholder="CPF (OPCIONAL)"
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-white text-[10px] font-bold outline-none focus:border-blue-500/50 transition-all font-mono shadow-inner"
                            value={formData.cpf_cliente}
                            onChange={e => setFormData({ ...formData, cpf_cliente: maskCPF(e.target.value) })}
                        />
                    </div>
                </div>

                {/* SECTION 2: INTEREST & NEGOTIATION */}
                <div className="space-y-2 relative z-[40]">
                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400/50 tracking-[0.2em] uppercase">
                        <Car size={10} className="text-blue-500/50" /> Negociação
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <PremiumSelect
                            options={portais.map(p => ({ value: p.nome, label: p.nome }))}
                            value={formData.portal}
                            onChange={val => setFormData({ ...formData, portal: val })}
                            placeholder="ORIGEM"
                            className="h-9"
                        />
                        <PremiumSelect
                            options={estoque.map(c => ({ value: c.nome, label: c.nome }))}
                            value={formData.veiculo_interesse}
                            onChange={val => setFormData({ ...formData, veiculo_interesse: val })}
                            placeholder="CARRO INTERESSE"
                            searchable
                            creatable
                            autoCapitalize={true}
                            className="h-9"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative group">
                            <Repeat size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                placeholder="TROCA?"
                                className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-8 pr-2 text-white text-[10px] font-bold outline-none focus:border-blue-500/50 transition-all shadow-inner"
                                value={formData.veiculo_troca}
                                onChange={e => setFormData({ ...formData, veiculo_troca: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="relative group">
                            <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                placeholder="PROPOSTA"
                                className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-8 pr-2 text-white text-[10px] font-bold outline-none focus:border-blue-500/50 transition-all font-mono shadow-inner"
                                value={formData.valor_proposta}
                                onChange={e => setFormData({ ...formData, valor_proposta: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 3: LOGISTICS & PAYMENT */}
                <div className="space-y-2 relative z-[30]">
                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400/50 tracking-[0.2em] uppercase">
                        <Target size={10} className="text-blue-500/50" /> Logística
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <PremiumSelect
                            options={vendedores.map(v => ({ value: v.nome, label: v.nome }))}
                            value={formData.vendedor}
                            onChange={val => setFormData({ ...formData, vendedor: val })}
                            placeholder="CONSULTOR"
                            className="h-9"
                        />
                        <PremiumDatePicker
                            value={formData.data_agendamento}
                            onChange={val => setFormData({ ...formData, data_agendamento: val })}
                            allowPastDates={true}
                            className="h-9"
                        />
                    </div>
                    {isAdmin && (
                        <div className="pt-1">
                            <div className="flex items-center gap-2 text-[9px] font-black text-blue-400/50 tracking-[0.2em] uppercase mb-1">
                                <Shield size={10} className="text-blue-500/50" /> Agendado Por
                            </div>
                            <PremiumSelect
                                options={usuarios.map(u => ({ value: u.username, label: u.nome_completo || u.username }))}
                                value={formData.vendedor_sdr}
                                onChange={val => setFormData({ ...formData, vendedor_sdr: val })}
                                placeholder="ESCOLHA O VENDEDOR"
                                searchable
                                className="h-9"
                            />
                        </div>
                    )}
                    <PremiumSelect
                        options={FORMAS_PAGAMENTO}
                        value={formData.forma_pagamento}
                        onChange={(val) => setFormData(prev => ({ ...prev, forma_pagamento: Array.isArray(val) ? val.join(', ') : val }))}
                        placeholder="MEIOS DE PAGAMENTO"
                        className="h-9 z-[20]"
                        multiSelect={true}
                    />
                </div>

                {/* Notas */}
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400/50 tracking-[0.2em] uppercase mb-1.5">
                        <Edit2 size={10} className="text-blue-500/50" /> Notas Internas
                    </div>
                    <textarea
                        placeholder="NEGOCIAÇÃO EM ANDAMENTO..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white text-[11px] font-medium outline-none h-16 resize-none focus:border-blue-500/50 transition-all placeholder:text-gray-800 shadow-inner"
                        value={formData.negociacao}
                        onChange={e => setFormData({ ...formData, negociacao: e.target.value })}
                    />
                </div>

                {/* TEMPERATURE SELECTOR */}
                <div className="flex gap-2 relative z-10 pt-1">
                    {TEMPERATURAS.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, temperatura: t.value })}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all border flex items-center justify-center gap-1.5 ${formData.temperatura === t.value
                                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white'
                                : 'bg-black/40 border-white/5 text-gray-600 hover:text-gray-400'
                                }`}
                        >
                            <span className={formData.temperatura === t.value ? 'scale-110 duration-300' : 'grayscale opacity-50'}>
                                {t.label.split(' ')[0]}
                            </span>
                            <span className="uppercase">{t.label.split(' ')[1]}</span>
                        </button>
                    ))}
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-3 pt-2 relative z-10">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="bg-slate-900/40 hover:bg-slate-800 text-gray-500 hover:text-white py-3.5 rounded-xl text-[10px] font-black transition-all active:scale-95 disabled:opacity-50 tracking-[0.2em] border border-white/5"
                    >
                        SÓ SALVAR
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-[10px] font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95 border-b-2 border-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 tracking-[0.2em]"
                    >
                        {loading ? '...' : (
                            <><Zap size={12} className="fill-white" /> AGENDAR & ZAP</>
                        )}
                    </button>
                </div>

                {/* CLOSE BUTTON */}
                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-[#1e293b] text-gray-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-white/5 shadow-2xl z-[100] group"
                >
                    <X size={16} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
};

export default QuickVisitForm;
