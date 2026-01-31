import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, Filter, Calendar as CalendarIcon, FileText, CheckCircle, Trash2, MessageSquare,
    User, Users, ArrowLeft, Car, Clock, Globe, Phone, Download, Printer, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PremiumSelect from '../components/PremiumSelect';
import PremiumDatePicker from '../components/PremiumDatePicker';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import NewVisitModal from '../components/NewVisitModal';
import { supabase } from '../lib/supabase';

const PIPELINE_STATUSES = [
    { id: 'Agendado', label: 'Agendado', color: 'blue' },
    { id: 'Negociação', label: 'Em Negociação', color: 'purple' },
    { id: 'Aguardando Aprovação', label: 'Aprovação', color: 'orange' },
    { id: 'Vendido', label: 'Vendido', color: 'green' },
    { id: 'Perdido', label: 'Perdido', color: 'red' },
    { id: 'Stand-by', label: 'Stand-by', color: 'gray' }
];

const TEMPERATURAS = [
    { value: 'Quente', label: '🔥 Quente' },
    { value: 'Morno', label: '☕ Morno' },
    { value: 'Frio', label: '🧊 Frio' }
];

const FORMAS_PAGAMENTO = [
    { value: 'À Vista', label: 'À Vista' },
    { value: 'Financiamento', label: 'Financiamento' },
    { value: 'Troca + Troco', label: 'Troca + Troco' },
    { value: 'Consórcio', label: 'Consórcio' },
    { value: 'Cartão', label: 'Cartão de Crédito' }
];

const Visitas = ({ user }) => {
    const [visitas, setVisitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'form', 'detail'
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

    // FIX: Get user from prop OR localStorage 'sdr_user'. Default to placeholder if neither exists.
    const currentUser = user || JSON.parse(localStorage.getItem('sdr_user') || '{"username":"SDR","role":"vendedor"}');

    // Data Lists
    const [portais, setPortais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estoque, setEstoque] = useState([]);

    useEffect(() => {
        loadData();

        // IPC Listener for Realtime Refreshes
        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, table) => {
            if (table === 'visitas' || table === 'vendedores' || table === 'portais') {
                console.log(`[Visitas] Refreshing due to ${table} change...`);
                loadData();
            }
        };
        ipcRenderer.on('refresh-data', handleRefresh);

        return () => {
            ipcRenderer.removeListener('refresh-data', handleRefresh);
        };
    }, [currentUser.username]); // Reload if username changes

    const loadData = async () => {
        try {
            // ☁️ BUSCA NO SUPABASE (NUVEM)
            let query = supabase.from('visitas').select('*');

            const userRole = currentUser.role || 'vendedor';

            if (userRole !== 'admin' && userRole !== 'master' && userRole !== 'developer') {
                query = query.eq('vendedor_sdr', currentUser.username);
            }

            const [{ data: v, error: errV }, { data: p, error: errP }, { data: vend, error: errVend }, { data: est, error: errEst }] = await Promise.all([
                query.order('datahora', { ascending: false }),
                supabase.from('portais').select('*'),
                supabase.from('vendedores').select('*'),
                supabase.from('estoque').select('*')
            ]);

            if (errV) throw errV;
            if (errP) throw errP;
            if (errVend) throw errVend;
            if (errEst) throw errEst;

            setVisitas(v || []);
            setPortais((p || []).filter(item => item.ativo));
            setVendedores((vend || []).filter(item => item.ativo));
            setEstoque((est || []).filter(item => item.ativo));

        } catch (err) {
            console.warn('Erro Supabase (Nuvem Off?), buscando Local...', err);
            try {
                const { ipcRenderer } = window.require('electron');
                const localVisitas = await ipcRenderer.invoke('get-visitas-secure', { role: currentUser.role, username: currentUser.username });
                setVisitas(localVisitas || []);

                const localPortais = await ipcRenderer.invoke('get-list', 'portais');
                setPortais(localPortais.filter(i => i.ativo));

                const localVendedores = await ipcRenderer.invoke('get-list', 'vendedores');
                setVendedores(localVendedores.filter(i => i.ativo));

                const localEstoque = await ipcRenderer.invoke('get-list', 'estoque');
                setEstoque(localEstoque.filter(i => i.ativo));
            } catch (localErr) {
                console.error('Falha Total (Nuvem + Local):', localErr);
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper to get Local ISO String (YYYY-MM-DDTHH:mm) correctly
    const toLocalISOString = (date) => {
        const d = date || new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Custom renderer for vehicle options (Rich Cards)
    const renderVehicleOption = (option) => {
        const v = option.data;
        if (!v) return <span className="text-sm">{option.label}</span>;

        // Parse photos if string
        let photoUrl = '';
        try {
            const fotos = typeof v.fotos === 'string' ? JSON.parse(v.fotos) : v.fotos;
            if (Array.isArray(fotos) && fotos.length > 0) photoUrl = fotos[0];
            else if (v.foto) photoUrl = v.foto;
        } catch (e) { photoUrl = v.foto || ''; }

        return (
            <div className="flex items-center gap-3 w-full group">
                {/* Photo Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 relative">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <Car size={16} />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold text-white truncate group-hover:text-amber-500 transition-colors">
                        {v.nome}
                    </span>
                    <div className="flex items-center gap-2 text-[9px] font-black  tracking-wider text-gray-500">
                        {v.ano && <span>{v.ano}</span>}
                        {v.km && v.km !== 'Consulte' && (
                            <>
                                <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                <span>{v.km}</span>
                            </>
                        )}
                        {v.cambio && v.cambio !== 'Consulte' && (
                            <>
                                <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                <span className={v.cambio === 'Automático' ? 'text-blue-400' : 'text-orange-400'}>
                                    {v.cambio}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Price Badge */}
                {v.valor && v.valor !== 'Consulte' && (
                    <div className="text-xs font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
                        {v.valor}
                    </div>
                )}
            </div>
        );
    };

    const handleNewVisit = () => {
        setIsVisitModalOpen(true);
    };

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });

    const handleDeleteClick = (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const handleConfirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('delete-visita', confirmModal.id);
            setConfirmModal({ isOpen: false, id: null });
            loadData();
        } catch (err) {
            setAlertModal({
                isOpen: true,
                title: 'ERRO AO EXCLUIR',
                message: err.message || "Não foi possível remover o registro."
            });
        }
    };

    const VisitRow = useCallback(({ index, style, data }) => {
        const v = data[index];
        return (
            <div style={style} className="px-2">
                <div
                    className="flex items-center group transition-all duration-300 border-b border-white/5 hover:bg-cyan-500/[0.03] py-2 h-[88px] relative hover:border-cyan-500/20"
                    style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                >
                    {/* Hover Glow Edge */}
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_cyan]" />

                    <div className="w-[120px] px-6">
                        <div className="flex flex-col">
                            <span className="text-white font-bold tracking-tight text-xl font-rajdhani leading-none">
                                {new Date(v.data_agendamento || v.datahora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span className="text-xs text-cyan-500/60  font-bold tracking-wider font-rajdhani mt-1">
                                {new Date(v.data_agendamento || v.datahora).toLocaleTimeString().slice(0, 5)} HS
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 px-4 min-w-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-white font-bold text-lg leading-tight group-hover:text-cyan-400 transition-colors  tracking-tight truncate font-rajdhani">
                                {v.cliente}
                            </span>
                            {v.telefone && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const cleanNum = v.telefone.replace(/\D/g, '');
                                        window.open(`https://wa.me/55${cleanNum}`, '_blank');
                                    }}
                                    className="flex items-center gap-1.5 text-gray-500 hover:text-green-400 text-xs font-bold transition-all  font-rajdhani"
                                >
                                    <Phone size={12} strokeWidth={2.5} />
                                    {v.telefone}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="w-[200px] px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-cyan-300 font-bold text-sm  tracking-wider truncate font-rajdhani drop-shadow-sm">
                                    {v.veiculo_interesse || 'S/ Veículo'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold  truncate font-rajdhani">SDR: <span className="text-white">{v.vendedor_sdr}</span></span>
                            </div>
                        </div>
                    </div>
                    <div className="w-[80px] px-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/40 border border-white/10 group-hover:scale-110 transition-transform shadow-inner">
                            {v.temperatura === 'Quente' ? '🔥' : v.temperatura === 'Morno' ? '☕' : v.temperatura === 'Frio' ? '🧊' : '❔'}
                        </div>
                    </div>
                    <div className="w-[140px] px-4 text-center">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold  tracking-widest border shadow-lg font-rajdhani ${v.status_pipeline === 'Vendido' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5' :
                            v.status_pipeline === 'Perdido' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' :
                                v.status_pipeline === 'Negociação' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5' :
                                    'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                            }`}>
                            {v.status_pipeline || v.status}
                        </span>
                    </div>
                    <div className="w-[100px] px-4 text-center">
                        <div className="px-2 py-1 rounded bg-white/5 border border-white/5 inline-block">
                            <span className="text-[10px] font-bold text-gray-400 font-rajdhani  tracking-wider">
                                {v.portal ? v.portal.slice(0, 10).toUpperCase() : 'LOJA'}
                            </span>
                        </div>
                    </div>
                    <div className="w-[100px] px-4 text-center">
                        <div className="flex justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(v.id); }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all hover:scale-110">
                                <Trash2 size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, []);

    return (
        <div className="h-full flex flex-col overflow-hidden w-full">
            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 px-2 overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'list' && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl min-h-0 relative"
                        >
                            {/* Background Tech Details */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

                            {/* Table Actions Header */}
                            <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-white/[0.01] backdrop-blur-sm z-10">
                                <div>
                                    <h1 className="text-4xl font-black italic tracking-tight text-white  font-rajdhani drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] flex items-center gap-3">
                                        <CalendarIcon className="text-cyan-400" size={32} />
                                        Controle de Visitas
                                    </h1>
                                    <p className="text-sm text-cyan-500/50 font-bold  tracking-widest font-rajdhani mt-1 ml-11">Gestão de Agenda & Pipeline</p>
                                </div>

                                <motion.button
                                    whileHover={{
                                        scale: 1.05,
                                        boxShadow: "0 0 25px rgba(34, 211, 238, 0.5)",
                                        filter: "brightness(1.2)"
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={handleNewVisit}
                                    className="btn-cyber-primary text-sm flex items-center gap-2"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    <span className="font-rajdhani">Novo Agendamento</span>
                                </motion.button>
                            </div>

                            {/* Table Header Wrapper */}
                            <div className="flex-none bg-black/20 border-b border-white/5 text-cyan-500/60 text-xs font-bold  tracking-[0.2em] flex items-center py-4 px-2 font-rajdhani z-10">
                                <div className="w-[120px] px-6">Data/Hora</div>
                                <div className="flex-1 px-4">Cliente / Contato</div>
                                <div className="w-[200px] px-4">Veículo de Interesse</div>
                                <div className="w-[80px] px-4 text-center">Temp.</div>
                                <div className="w-[140px] px-4 text-center">Status</div>
                                <div className="w-[100px] px-4 text-center">Origem</div>
                                <div className="w-[100px] px-4 text-center">Ações</div>
                            </div>

                            {/* Virtualized List - Contained in a flex-1 min-h-0 wrapper */}
                            <div className="flex-1 min-h-0 z-10">
                                {visitas.length > 0 ? (
                                    <AutoSizer>
                                        {({ height, width }) => (
                                            <List
                                                height={height || 600}
                                                itemCount={visitas.length}
                                                itemSize={88}
                                                width={width || '100%'}
                                                itemData={visitas}
                                                className="custom-scrollbar"
                                            >
                                                {VisitRow}
                                            </List>
                                        )}
                                    </AutoSizer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30">
                                        <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)] relative">
                                            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-20" />
                                            <CalendarIcon size={40} className="text-cyan-400" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-white font-rajdhani tracking-wide">AGENDA LIMPA</h3>
                                            <p className="text-xs font-medium text-cyan-200  tracking-widest font-rajdhani">Nenhuma visita registrada no sistema</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals e Componentes de Overlay */}
            <NewVisitModal
                isOpen={isVisitModalOpen}
                onClose={() => {
                    setIsVisitModalOpen(false);
                    loadData();
                }}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Excluir Agendamento"
                message="Tem certeza que deseja remover este agendamento permanentemente? Esta ação não pode ser desfeita."
                confirmText="Sim, excluir"
                cancelText="Cancelar"
                isDestructive={true}
            />

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
            />
        </div>
    );
};

export default Visitas;
