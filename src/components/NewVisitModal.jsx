import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Phone, Car, DollarSign, Flame, Clock, MessageSquare } from 'lucide-react';
import { useLoja } from '../context/LojaContext';
import { electronAPI } from '@/lib/electron-api';
import { toLocalISOString, formatCurrency } from '@/lib/utils';

const NewVisitModal = ({ isOpen, onClose, onSuccess, initialDate, editingTask, targetUser }) => {
    const { currentLoja } = useLoja();
    const [estoque, setEstoque] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsVehicleDropdownOpen(false);
            }
        };

        if (isVehicleDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isVehicleDropdownOpen]);

    const [formData, setFormData] = useState({
        cliente: '',
        telefone: '',
        origem: 'OLX',
        veiculo_interesse: '',
        veiculo_id: '',
        pagamento: 'À Vista',
        valor_veiculo: '',
        data_agendamento: initialDate ? toLocalISOString(initialDate) : '',
        status_pipeline: 'Agendado',
        temperatura: 'Frio',
        sdr: targetUser || '',
        vendedor_patio: '',
        notas: ''
    });

    useEffect(() => {
        if (isOpen && currentLoja?.id) {
            electronAPI.getList('estoque', currentLoja.id).then(setEstoque);
            electronAPI.getListUsers(currentLoja.id).then(setUsuarios);
            electronAPI.getList('vendedores', currentLoja.id).then(setVendedores);
        }
    }, [isOpen, currentLoja]);

    useEffect(() => {
        if (editingTask) {
            setFormData({
                cliente: editingTask.cliente || '',
                telefone: editingTask.telefone || '',
                origem: editingTask.portal || editingTask.origem || 'OLX',
                veiculo_interesse: editingTask.veiculo_interesse || '',
                veiculo_id: editingTask.veiculo_id || '', 
                pagamento: editingTask.forma_pagamento || editingTask.pagamento || 'À Vista',
                valor_veiculo: editingTask.valor_proposta || editingTask.valor_veiculo || '',
                data_agendamento: editingTask.data_agendamento ? toLocalISOString(new Date(editingTask.data_agendamento)) : '',
                status_pipeline: editingTask.status_pipeline || 'Agendado',
                temperatura: editingTask.temperatura || 'Quente',
                sdr: editingTask.vendedor_sdr || editingTask.sdr || targetUser || '',
                vendedor_patio: editingTask.vendedor || '',
                notas: editingTask.historico_log || editingTask.notas || ''
            });

            if (editingTask.veiculo_id && estoque.length > 0) {
                const vehicle = estoque.find(v => v.id === editingTask.veiculo_id);
                if (vehicle) setSelectedVehicle(vehicle);
            } else if (editingTask.veiculo_interesse && estoque.length > 0) {
                const vehicle = estoque.find(v => v.nome === editingTask.veiculo_interesse);
                if (vehicle) setSelectedVehicle(vehicle);
            }
        } else {
            setFormData({
                cliente: '',
                telefone: '',
                origem: 'OLX',
                veiculo_interesse: '',
                veiculo_id: '',
                pagamento: 'À Vista',
                valor_veiculo: '',
                data_agendamento: initialDate ? toLocalISOString(initialDate) : '',
                status_pipeline: 'Agendado',
                temperatura: 'Frio',
                sdr: targetUser || '',
                vendedor_patio: '',
                notas: ''
            });
            setSelectedVehicle(null);
        }
    }, [editingTask, initialDate, targetUser, estoque]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        console.log('🚀 [handleSubmit] Iniciando salvamento...', formData);
        
        if (!currentLoja?.id) {
            console.error('❌ Loja não identificada');
            return;
        }

        // Validação manual
        if (!formData.cliente) return alert('Nome do cliente é obrigatório');
        if (!formData.telefone) return alert('WhatsApp é obrigatório');
        if (!formData.origem) return alert('Origem é obrigatória');
        if (!formData.veiculo_interesse && !selectedVehicle) return alert('Carro de interesse é obrigatório');
        if (!formData.pagamento) return alert('Forma de pagamento é obrigatória');
        if (!formData.valor_veiculo) return alert('Valor do veículo é obrigatório');
        if (!formData.data_agendamento) return alert('Data e hora são obrigatórios');
        if (!formData.sdr) return alert('Responsável pelo agendamento é obrigatório');
        if (!formData.vendedor_patio) return alert('Vendedor de pátio é obrigatório');

        console.log('✅ Validação manual passou');

        try {
            const base = editingTask || {};
            const payload = {
                cli_id: base.id,
                cliente: formData.cliente || '',
                telefone: formData.telefone || '',
                portal: formData.origem || base.portal || '',
                veiculo_interesse: selectedVehicle?.nome || formData.veiculo_interesse || '',
                veiculo_id: selectedVehicle?.id || formData.veiculo_id || null,
                veiculo_troca: base.veiculo_troca || '',
                vendedor: formData.vendedor_patio || base.vendedor || '',
                vendedor_sdr: formData.sdr || base.vendedor_sdr || '',
                negociacao: base.negociacao || '',
                data_agendamento: formData.data_agendamento || null,
                temperatura: formData.temperatura || null,
                status_pipeline: formData.status_pipeline || base.status_pipeline || 'Agendado',
                forma_pagamento: formData.pagamento || base.forma_pagamento || null,
                valor_proposta: formData.valor_veiculo || base.valor_proposta || null,
                historico_log: formData.notas || base.historico_log || null,
                motivo_perda: base.motivo_perda || null,
                status: base.status || 'Pendente',
                cpf_cliente: base.cpf_cliente || null,
                loja_id: currentLoja.id
            };

            console.log('📡 [handleSubmit] Enviando payload:', payload);

            if (editingTask) {
                await electronAPI.updateVisitaFull({ ...base, ...payload, id: editingTask.id });
            } else {
                await electronAPI.addVisita(payload);
            }
            console.log('✅ [handleSubmit] Sucesso!');

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Erro ao salvar agendamento:', err);
            alert('Erro ao salvar agendamento');
        }
    };

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData(prev => ({
            ...prev,
            veiculo_interesse: vehicle.nome,
            veiculo_id: vehicle.id,
            valor_veiculo: vehicle.valor || prev.valor_veiculo
        }));
        setIsVehicleDropdownOpen(false);
        setSearchTerm('');
    };

    const filteredVehicles = estoque.filter(v =>
        v.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* HEADER */}
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                    {editingTask ? 'Editar Agendamento' : 'Novo Agendamento'}
                                </h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                    {currentLoja?.nome || 'IRW MOTORS'} • CRM INTELLIGENCE
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* CLIENTE & TELEFONE */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} /> Nome do Cliente
                                </label>
                                <input
                                    type="text"
                                    value={formData.cliente}
                                    onChange={e => setFormData(prev => ({ ...prev, cliente: e.target.value.toUpperCase() }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                    placeholder="Digite o nome..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Phone size={12} /> WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={formData.telefone}
                                    onChange={e => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        {/* ORIGEM & VEÍCULO */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Origem (Portal)</label>
                                <select
                                    value={formData.origem}
                                    onChange={e => setFormData(prev => ({ ...prev, origem: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                >
                                    <option value="OLX" className="bg-[#1a1c23] text-white">OLX</option>
                                    <option value="WebMotors" className="bg-[#1a1c23] text-white">WebMotors</option>
                                    <option value="iCarros" className="bg-[#1a1c23] text-white">iCarros</option>
                                    <option value="Indicação" className="bg-[#1a1c23] text-white">Indicação</option>
                                    <option value="WhatsApp" className="bg-[#1a1c23] text-white">WhatsApp</option>
                                    <option value="Instagram" className="bg-[#1a1c23] text-white">Instagram</option>
                                    <option value="Outro" className="bg-[#1a1c23] text-white">Outro</option>
                                </select>
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Car size={12} /> Carro de Interesse
                                </label>
                                <div className="relative" ref={dropdownRef}>
                                    <input
                                        type="text"
                                        value={selectedVehicle ? selectedVehicle.nome : formData.veiculo_interesse}
                                        onChange={e => {
                                            setSearchTerm(e.target.value);
                                            setFormData(prev => ({ ...prev, veiculo_interesse: e.target.value, veiculo_id: null }));
                                            setSelectedVehicle(null);
                                            setIsVehicleDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsVehicleDropdownOpen(true)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                        placeholder="Digite ou selecione..."
                                    />
                                    {isVehicleDropdownOpen && filteredVehicles.length > 0 && (
                                        <div className="absolute z-[110] w-full mt-2 bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                            {filteredVehicles.map(vehicle => (
                                                <button
                                                    key={vehicle.id}
                                                    type="button"
                                                    onClick={() => handleVehicleSelect(vehicle)}
                                                    className="w-full px-4 py-3 text-left hover:bg-cyan-500/10 transition-colors border-b border-white/5 last:border-0 flex items-center gap-3"
                                                >
                                                    {vehicle.foto && (
                                                        <img src={vehicle.foto} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="text-white font-bold text-sm">{vehicle.nome}</p>
                                                        <p className="text-slate-500 text-xs">{vehicle.ano} • {formatCurrency(vehicle.valor)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PAGAMENTO & VALOR */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign size={12} /> Pagamento
                                </label>
                                <select
                                    value={formData.pagamento}
                                    onChange={e => setFormData(prev => ({ ...prev, pagamento: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                >
                                    <option value="À Vista" className="bg-[#1a1c23] text-white">À Vista</option>
                                    <option value="Financiamento" className="bg-[#1a1c23] text-white">Financiamento</option>
                                    <option value="Consórcio" className="bg-[#1a1c23] text-white">Consórcio</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Valor do Veículo</label>
                                <input
                                    type="text"
                                    value={formData.valor_veiculo}
                                    onChange={e => setFormData(prev => ({ ...prev, valor_veiculo: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                    placeholder="R$ 0,00"
                                />
                            </div>
                        </div>

                        {/* DATA & HORA */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} /> Data & Hora
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.data_agendamento}
                                    onChange={e => setFormData(prev => ({ ...prev, data_agendamento: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} /> Responsável pelo Agendamento
                                </label>
                                <select
                                    value={formData.sdr}
                                    onChange={e => setFormData(prev => ({ ...prev, sdr: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm uppercase"
                                >
                                    <option value="" className="bg-[#1a1c23] text-slate-400">SELECIONE UM RESPONSÁVEL</option>
                                    {usuarios.filter(u => u.ativo !== 0).map((u, idx) => (
                                        <option key={'usr-' + (u.id || u.username || idx)} value={u.username} className="bg-[#1a1c23] text-white">
                                            {u.nome_completo ? u.nome_completo.toUpperCase() : u.username.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* TEMPERATURA & ATENDIMENTO */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Flame size={12} /> Temperatura
                                </label>
                                <div className="flex gap-3">
                                    {['Frio', 'Morno', 'Quente'].map(temp => (
                                        <button
                                            key={temp}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, temperatura: temp }))}
                                            className={`flex-1 py-3 h-[46px] rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                                                formData.temperatura === temp
                                                    ? temp === 'Quente' ? 'bg-red-500 text-white'
                                                    : temp === 'Morno' ? 'bg-yellow-500 text-black'
                                                    : 'bg-blue-500 text-white'
                                                    : 'bg-white/5 text-slate-500 hover:bg-white/10'
                                            }`}
                                        >
                                            {temp}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} /> Atendimento Presencial Por:
                                </label>
                                <select
                                    value={formData.vendedor_patio}
                                    onChange={e => setFormData(prev => ({ ...prev, vendedor_patio: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-[46px] text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm uppercase"
                                >
                                    <option value="" className="bg-[#1a1c23] text-slate-400">NENHUM SELECIONADO</option>
                                    {vendedores.map((v, idx) => (
                                        <option key={'v-salao-' + (v.id || idx)} value={v.nome} className="bg-[#1a1c23] text-white">
                                            {v.nome} {v.sobrenome || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* NOTAS */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={12} /> Notas da Conversa
                            </label>
                            <textarea
                                value={formData.notas}
                                onChange={e => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm min-h-[100px] resize-none"
                                placeholder="Detalhes da conversa..."
                            />
                        </div>
                    </form>

                    {/* FOOTER */}
                    <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all"
                        >
                            {editingTask ? 'Salvar Alterações' : 'Salvar Agendamento'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewVisitModal;