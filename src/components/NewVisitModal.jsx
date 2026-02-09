import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Car, Clock, Users, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
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
    { value: 'Financiamento', label: '🏦 Financiamento' },
    { value: 'À Vista', label: '💵 À Vista' },
    { value: 'Consórcio', label: '📝 Consórcio' },
    { value: 'Cartão', label: '💳 Crédito' },
    { value: 'Troca com Troco', label: '💰 Troca c/ Troco' }
];

const NewVisitModal = ({ isOpen, onClose, onSuccess, initialDate, initialPhone = '', targetUser }) => {
    const { currentLoja } = useLoja();
    const [loading, setLoading] = useState(true);
    const [portais, setPortais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [successState, setSuccessState] = useState(null); // { message: string }
    const [formData, setFormData] = useState({
        cliente: '', telefone: initialPhone || '', cpf_cliente: '',
        portal: '', temperatura: 'Morno',
        data_agendamento: '',
        veiculo_interesse: '', veiculo_troca: '', valor_proposta: '', forma_pagamento: '',
        vendedor_sdr: '',
        vendedor: '',
        negociacao: '', motivo_perda: '', status_pipeline: 'Agendado'
    });

    // Formatter helpers
    function maskPhone(val) {
        let v = val.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 10) return `(${v.substring(0, 2)}) ${v.substring(2, 3)} ${v.substring(3, 7)}-${v.substring(7)}`;
        if (v.length > 6) return `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
        if (v.length > 2) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
        return v;
    }

    function maskCPF(val) {
        let v = val.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 9) return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
        if (v.length > 6) return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
        if (v.length > 3) return `${v.substring(0, 3)}.${v.substring(3)}`;
        return v;
    }

    function maskCurrency(value) {
        if (!value) return 'R$ 0,00'; // Valor padrão
        const numeric = String(value).replace(/\D/g, '');
        if (!numeric) return 'R$ 0,00';
        const float = parseFloat(numeric) / 100;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(float);
    }

    function handleVehicleChange(val) {
        const vehicle = estoque.find(v => v.nome === val);
        if (!vehicle) {
            setFormData(prev => ({ ...prev, veiculo_interesse: val }));
            return;
        }

        let valStr = String(vehicle.valor || '0').replace('R$', '').trim();
        let num = 0;

        // Lógica Robusta de Parsing de Moeda
        if (valStr.includes(',') && valStr.includes('.')) {
            num = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
        } else if (valStr.includes(',')) {
            num = parseFloat(valStr.replace(',', '.'));
        } else if (valStr.includes('.')) {
            if (/\.\d{2}$/.test(valStr)) {
                num = parseFloat(valStr);
            } else {
                num = parseFloat(valStr.replace(/\./g, ''));
            }
        } else {
            num = parseFloat(valStr);
        }

        if (isNaN(num)) num = 0;
        const centsString = Math.round(num * 100).toString();

        setFormData(prev => ({
            ...prev,
            veiculo_interesse: val,
            valor_proposta: maskCurrency(centsString)
        }));
    }

    useEffect(() => {
        if (isOpen) {
            loadData();
            const storedUser = JSON.parse(localStorage.getItem('sdr_user') || '{"username":"SDR","role":"vendedor"}');
            setCurrentUser(storedUser);

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
                vendedor_sdr: targetUser || storedUser.username,
                vendedor: '',
                negociacao: '',
                motivo_perda: '',
                status_pipeline: 'Agendado'
            });
        }
    }, [isOpen, initialPhone, targetUser]);

    useEffect(() => {
        try {
            const { ipcRenderer } = window.require('electron');
            const handleRefresh = (event, table) => {
                if (['estoque', 'vendedores', 'portais'].includes(table)) {
                    loadData();
                }
            };
            ipcRenderer.on('refresh-data', handleRefresh);
            return () => ipcRenderer.removeListener('refresh-data', handleRefresh);
        } catch (e) { }
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
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
            setUsuarios((localUsers || []).filter(u => u.role === 'sdr' || !u.role));
        } catch (err) {
            console.error('Erro ao carregar dados do modal:', err);
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-400 mt-0.5 uppercase">
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
            const payload = {
                ...formData,
                mes: new Date().getMonth() + 1,
                datahora: new Date().toISOString(),
                status: 'Pendente',
                historico_log: formData.negociacao,
                loja_id: currentLoja?.id
            };

            await ipcRenderer.invoke('add-visita', payload);

            const repassMessage = `*📅 NOVO AGENDAMENTO SDR*
            
👤 *CLIENTE:* ${formData.cliente}
🚗 *CARRO:* ${formData.veiculo_interesse}
💰 *VALOR DO VEÍCULO:* ${formData.valor_proposta || 'Consulte'}
⏰ *DATA/HORA:* ${new Date(formData.data_agendamento).toLocaleString('pt-BR')}
👨‍💼 *CONSULTOR:* ${formData.vendedor}
🔄 *TROCA:* ${formData.veiculo_troca || ''}
📝 *NOTAS:* ${formData.negociacao || ''}`;

            setSuccessState({ repassMessage });
            setLoading(false);
        } catch (err) {
            alert('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
            setLoading(false);
        }
    };

    const handleSuccessAction = (shouldRepass) => {
        if (shouldRepass && successState?.repassMessage && typeof window.onAppointmentSaved === 'function') {
            window.onAppointmentSaved(successState.repassMessage);
        }
        setSuccessState(null);
        onClose();
        if (typeof onSuccess === 'function') onSuccess();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-5xl bg-[#0f172a]/95 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-3xl flex flex-col min-h-[600px]"
                    >
                        {successState ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-400 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                                >
                                    <CheckCircle size={48} strokeWidth={3} />
                                </motion.div>
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Agendamento Criado!</h2>
                                <p className="text-gray-400 text-lg mb-10 max-w-md">O cliente foi registrado com sucesso no sistema.</p>

                                <div className="flex gap-4 w-full max-w-md">
                                    <button
                                        onClick={() => handleSuccessAction(false)}
                                        className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                    >
                                        Fechar
                                    </button>
                                    <button
                                        onClick={() => handleSuccessAction(true)}
                                        className="flex-1 py-4 px-6 rounded-2xl font-bold text-white bg-green-600 hover:bg-green-500 hover:scale-105 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                                    >
                                        <Users size={20} />
                                        Repassar (Zap)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-10 py-7">
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter">Novo Agendamento</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
                                            <span className="text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase">Irw Motors • CRM Intelligence</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all group border border-white/5"
                                    >
                                        <X size={24} className="group-hover:rotate-90 transition-transform" />
                                    </button>
                                </div>

                                <div className="px-10 pb-10 overflow-y-auto custom-scrollbar">
                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Nome do Cliente</label>
                                                <input
                                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-base font-bold tracking-tight outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all placeholder:text-gray-600"
                                                    placeholder="Nome completo..."
                                                    value={formData.cliente}
                                                    onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">WhatsApp</label>
                                                <input
                                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-base font-bold font-mono tracking-tight outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all placeholder:text-gray-600"
                                                    placeholder="(00) 0 0000-0000"
                                                    value={formData.telefone}
                                                    onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Origem (Portal)</label>
                                                <PremiumSelect
                                                    options={portais.map(p => ({ value: p.nome, label: p.nome }))}
                                                    value={formData.portal}
                                                    onChange={val => setFormData({ ...formData, portal: val })}
                                                    placeholder="Selecione..."
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Carro de Interesse</label>
                                                <PremiumSelect
                                                    options={estoque.map(c => ({
                                                        value: c.nome,
                                                        label: c.nome,
                                                        data: c
                                                    }))}
                                                    value={formData.veiculo_interesse}
                                                    onChange={handleVehicleChange}
                                                    placeholder="Pesquisar estoque..."
                                                    searchable
                                                    itemRenderer={renderVehicleOption}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Pagamento</label>
                                                <PremiumSelect
                                                    options={FORMAS_PAGAMENTO}
                                                    value={formData.forma_pagamento}
                                                    onChange={val => setFormData({ ...formData, forma_pagamento: val })}
                                                    placeholder="Forma de pagto..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Valor do Veículo</label>
                                                <input
                                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-base font-bold tracking-tight outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all placeholder:text-gray-600"
                                                    placeholder="R$ 0,00"
                                                    value={formData.valor_proposta}
                                                    onChange={e => setFormData({ ...formData, valor_proposta: maskCurrency(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 rounded-[2rem] bg-white/[0.02] border border-white/5">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Data & Hora</label>
                                                <PremiumDatePicker
                                                    value={formData.data_agendamento}
                                                    onChange={val => setFormData({ ...formData, data_agendamento: val })}
                                                    allowPastDates={['admin', 'gerente', 'master', 'developer'].includes(currentUser?.role)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Vendedor</label>
                                                <PremiumSelect
                                                    options={vendedores.map(v => ({ value: v.nome, label: v.nome }))}
                                                    value={formData.vendedor}
                                                    onChange={val => setFormData({ ...formData, vendedor: val })}
                                                    placeholder="Responsável..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Temperatura</label>
                                                <div className="flex bg-black/20 p-1 rounded-2xl gap-1 h-14 items-center">
                                                    {TEMPERATURAS.map(t => (
                                                        <button
                                                            key={t.value}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, temperatura: t.value })}
                                                            className={`
                                                                flex-1 h-12 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all
                                                                ${formData.temperatura === t.value
                                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                                    : 'text-gray-500 hover:text-gray-300'
                                                                }
                                                            `}
                                                        >
                                                            {t.label.split(' ')[1]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="flex flex-col">
                                                <label className="text-[10px] text-gray-500 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Notas da Conversa</label>
                                                <textarea
                                                    className="w-full h-44 bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white text-sm font-medium outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all placeholder:text-gray-600 resize-none"
                                                    placeholder="Detalhes rápidos..."
                                                    value={formData.negociacao}
                                                    onChange={e => setFormData({ ...formData, negociacao: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex flex-col justify-between">
                                                {['admin', 'master', 'developer', 'gerente'].includes(currentUser?.role) && (
                                                    <div>
                                                        <label className="text-[10px] text-blue-400 font-black ml-1 mb-2 block tracking-[0.2em] uppercase">Monitoramento SDR</label>
                                                        <PremiumSelect
                                                            options={usuarios.map(u => ({ value: u.username, label: u.nome_completo || u.username }))}
                                                            value={formData.vendedor_sdr}
                                                            onChange={val => setFormData({ ...formData, vendedor_sdr: val })}
                                                            placeholder="SDR Responsável..."
                                                        />
                                                    </div>
                                                )}
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full h-20 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-black tracking-[0.3em] text-sm rounded-2xl transition-all shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] border-t border-white/20 uppercase flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                                                >
                                                    {loading ? (
                                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={22} className="group-hover:scale-110 transition-transform" />
                                                            Gravar Agendamento
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewVisitModal;
