import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Car, Power, PowerOff, ExternalLink, Image as ImageIcon, CheckCircle, AlertTriangle, X, MessageSquare, Send, Trash2, Calendar, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { supabase } from '../lib/supabase';
import { parsePrice, cleanVehicleName } from '../lib/utils';
import { useLoja } from '../context/LojaContext';
import { useUI } from '../context/UIContext';
import { get, set } from 'idb-keyval'; // ⚡ Cache Local
import { electronAPI } from '@/lib/electron-api';

const Estoque = ({ user }) => {
    const { currentLoja } = useLoja();
    const { performanceMode } = useUI();
    const currentUser = user || JSON.parse(localStorage.getItem('vexcore_user') || '{"username":"VEX","role":"vendedor"}');
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [stats, setStats] = useState({});
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleVisits, setVehicleVisits] = useState([]);
    const [loadingVisits, setLoadingVisits] = useState(false);
    const [search, setSearch] = useState('');
    const [priceLimit, setPriceLimit] = useState('');

    // Share Features
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedVehicleForShare, setSelectedVehicleForShare] = useState(null);
    const [clients, setClients] = useState([]);
    const [clientSearch, setClientSearch] = useState('');



    const loadClients = async () => {
        try {

            // Assuming get-visitas returns all history, we extract unique clients
            const visitas = await electronAPI.getVisitas('admin', null, currentLoja?.id);

            const uniqueMap = new Map();
            visitas.forEach(v => {
                // Safety check and String conversion to prevent crash if telephone is number
                if (v.cliente && v.telefone) {
                    const phoneStr = String(v.telefone);
                    const key = phoneStr.replace(/\D/g, '');
                    if (key.length >= 10 && !uniqueMap.has(key)) {
                        uniqueMap.set(key, { nome: v.cliente, telefone: phoneStr });
                    }
                }
            });
            setClients(Array.from(uniqueMap.values()));
        } catch (err) { console.error("Error loading clients for share:", err); }
    };

    const handleShare = (vehicle) => {
        setSelectedVehicleForShare(vehicle);
        setClientSearch('');
        setIsShareModalOpen(true);
    };

    const handleConfirmShare = (client) => {
        // Navigate to Whatsapp page with state to trigger auto-send
        navigate('/whatsapp', {
            state: {
                action: 'share-vehicle',
                vehicle: selectedVehicleForShare,
                client: client
            }
        });
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    const loadStats = async () => {
        try {

            const data = await electronAPI.getVehiclesStats(currentLoja?.id);
            setStats(data || {});
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        loadItems();
        loadStats();
        loadClients();

        // Ouvi atualizações automáticas do Main Process

        const handleRefresh = (event, payload) => {
            const table = typeof payload === 'string' ? payload : payload?.table;
            if (table === 'estoque' || !table) {
                console.log(`[Estoque] Atualização recebida para: ${table || 'estoque'}`);
                loadItems();
                loadStats();
            }
        };
        electronAPI.onSyncStatus(handleRefresh);
        electronAPI.onRefreshData(handleRefresh);
        return () => {
            // Managed by electronAPI cleanup;
            // Managed by electronAPI.onRefreshData unsubscribe;
        };
    }, []);

    const loadItems = async (force = false) => {
        try {
            setLoading(true);

            const lojaId = currentLoja?.id || 'irw-motors-main';

            // ⚡ CACHE LOCAL (Stale-While-Revalidate)
            if (!force) {
                try {
                    const cached = await get(`estoque-cache-${lojaId}`);
                    if (cached && Array.isArray(cached) && cached.length > 0) {
                        console.log(`⚡ [Cache] Mostrando ${cached.length} veículos do cache`);
                        setItems(prev => {
                            if (JSON.stringify(prev) === JSON.stringify(cached)) return prev;
                            return cached;
                        });
                        setLoading(false); // Libera a UI imediatamente
                    }
                } catch (e) { console.warn('Erro cache:', e); }
            }

            // 🏠 BUSCA NO BANCO LOCAL (Sincronizado a cada 5 min)
            const localData = await electronAPI.getList('estoque', lojaId);

            let finalItems = [];

            if (Array.isArray(localData) && localData.length > 0) {
                console.log(`[Estoque] Carregados ${localData.length} itens do banco local`);
                // Garante que o status 'ativo' seja interpretado corretamente
                finalItems = localData.filter(i => i && (i.ativo === 1 || i.ativo === true || i.ativo === undefined));
            } else {
                console.log(`[Estoque] Banco local vazio ou erro, tentando Supabase...`);
                const { data, error } = await supabase
                    .from('estoque')
                    .select('*')
                    .eq('ativo', true)
                    .order('nome');

                if (!error && data) finalItems = data;
            }

            if (finalItems.length > 0) {
                setItems(prev => {
                    // Evita setar os mesmos items causando re-render massivo que limpa scroll
                    if (JSON.stringify(prev) === JSON.stringify(finalItems)) return prev;
                    return finalItems;
                });
                // 💾 Salva no cache para a próxima
                set(`estoque-cache-${lojaId}`, finalItems).catch(console.error);
            }

        } catch (err) {
            console.error('Erro ao buscar estoque:', err);
            // Se falhar tudo e não tiver cache, items fica vazio (ou mantém o cache se já setou)
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReport = async (vehicleName) => {
        setSelectedVehicle(vehicleName);
        setLoadingVisits(true);
        try {

            const data = await electronAPI.getVisitsByVehicle(vehicleName, currentLoja?.id);
            setVehicleVisits(data || []);
        } catch (err) {
            console.error(err);
            setVehicleVisits([]);
            showToast("Erro ao carregar visitas", "error");
        } finally {
            setLoadingVisits(false);
        }
    };

    const handleSync = async () => {
        if (syncing) return;
        setSyncing(true);
        try {

            const res = await electronAPI.syncXml(currentLoja?.id);

            if (res.success) {
                showToast(res.message, 'success');
            } else {
                showToast("Erro: " + res.message, 'error');
            }

            loadItems();
            loadStats();
        } catch (err) {
            showToast("Erro ao sincronizar: " + err, 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleMigrateAll = async () => {
        if (syncing) return;
        setSyncing(true);
        try {

            const res = await electronAPI.migrateAll();
            if (res.success) {
                showToast(res.message, 'success');
            } else {
                showToast(res.message, 'error');
            }
        } catch (err) {
            showToast("Erro ao migrar histórico: " + err, 'error');
        } finally {
            setSyncing(false);
        }
    };


    // Função de deletar removida para manter automação total conforme solicitado pelo usuário.
    // O sistema agora limpa o lixo da nuvem automaticamente no sync.

    // ... toggleAtivo removed or kept as hidden feature? User asked to remove explicit button, but functionality might still be needed in admin.
    // User said "não precisa ter a opção oculatar", so we remove the button.

    const openLink = async (url) => {
        if (!url) return;
        try {
            await electronAPI.openExternal(url);
        } catch (err) { console.error(err); }
    };



    const filtered = useMemo(() => {
        const query = (search || "").toLowerCase();
        const limit = parseInt(priceLimit);

        return (items || []).filter(i => {
            if (!i || !i.nome) return false;
            const matchesSearch = i.nome.toLowerCase().includes(query);
            const carPrice = parsePrice(i.valor);
            const matchesPrice = !priceLimit || isNaN(limit) || carPrice <= limit;

            // Debug pontual (comentar em prod)
            // if (priceLimit && i.nome.includes('Onix')) console.log(`🔍 Filtrando ${i.nome}: Preço=${carPrice}, Limite=${limit}, Passou=${matchesPrice}`);

            return matchesSearch && matchesPrice;
        });
    }, [items, search, priceLimit, parsePrice]);

    // Agrupar por marca
    const grouped = useMemo(() => {
        return filtered.reduce((acc, item) => {
            const brand = item.nome.split(' ')[0] || 'Outros';
            if (!acc[brand]) acc[brand] = [];
            acc[brand].push(item);
            return acc;
        }, {});
    }, [filtered]);

    const VehicleRow = useCallback(({ index, style, data }) => {
        const item = data && data[index];
        if (!item) return null;
        return (
            <div style={{ ...style, paddingBottom: '16px' }} className="px-1">
                <div
                    className={`bg-glass-100 border p-3 rounded-2xl flex gap-4 transition-all duration-300 h-[104px] overflow-hidden ${item.ativo ? 'border-white/5' : 'border-red-500/20 bg-red-900/10 opacity-70'}`}
                    style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                >
                    {/* Imagem do Carro */}
                    <div className="w-32 h-20 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 relative border border-white/5 cursor-pointer" onClick={() => handleOpenReport(item.nome)}>
                        {item.foto ? (
                            <img src={item.foto} alt={item.nome} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <ImageIcon size={32} />
                            </div>
                        )}
                        {!item.ativo && (
                            <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center text-xs font-bold text-red-100  tracking-tighter">Inativo</div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                            <h4
                                className="font-semibold text-sm leading-none truncate cursor-pointer hover:text-cyan-400 transition-colors text-white"
                                onClick={() => handleOpenReport(item.nome)}
                            >
                                {cleanVehicleName(item.nome)}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-1  font-bold tracking-widest">{item.ativo ? 'Em Loja' : 'Indisponível'}</p>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                            {item.link && (
                                <button onClick={() => openLink(item.link)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20">
                                    <ExternalLink size={12} /> SITE
                                </button>
                            )}
                            <button onClick={() => handleOpenReport(item.nome)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-black border border-purple-500/20">
                                <Car size={12} /> {(stats[item.nome] || 0)} VISITAS
                            </button>
                            <button onClick={() => handleShare(item)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-[10px] font-black border border-green-500/20">
                                <MessageSquare size={12} /> WHATSAPP
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-end justify-center pl-4 border-l border-white/5 min-w-[120px]">
                        <span className="text-lg font-black text-green-400 tracking-tighter">{item.valor}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {item.ano && <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">{item.ano}</span>}
                            {item.cambio && <span className="text-[9px] text-gray-500">{item.cambio?.slice(0, 3)}</span>}
                            {item.placa ? (
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-[3px] rounded mr-2">
                                    {item.placa}
                                </span>
                            ) : (
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest px-2 py-[3px] border border-slate-700/30 rounded mr-2">— sem placa —</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [stats]);

    return (
        <div className="h-full flex flex-col space-y-6 pb-4 overflow-hidden adaptive-container px-4 lg:px-6">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border flex items-center gap-3 ${toast.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                        <span className="font-bold">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Relatório */
            }
            {selectedVehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedVehicle(null)}>
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* HEADER — IMAGE ONLY */}
                        <div className="relative h-56 sm:h-72 bg-[#0a1224] overflow-hidden border-b border-white/5">
                            {(() => {
                                const vehicle = items.find(i => i.nome === selectedVehicle);
                                return vehicle?.foto ? (
                                    <>
                                        <img src={vehicle.foto} alt={selectedVehicle} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[4px]" />
                                        <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
                                            <img src={vehicle.foto} alt={selectedVehicle} className="max-h-full max-w-full drop-shadow-[0_20px_60px_rgba(0,0,0,0.9)] object-contain" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-800 bg-white/5">
                                        <ImageIcon size={64} strokeWidth={1} />
                                    </div>
                                );
                            })()}

                            <div className="absolute top-5 right-5 z-40">
                                <button onClick={() => setSelectedVehicle(null)} className="p-2.5 bg-black/40 hover:bg-white/10 backdrop-blur-xl rounded-full text-white transition-all border border-white/10 shadow-lg group">
                                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>
                        </div>

                        {/* INFO SECTION — NEW: BELOW IMAGE */}
                        <div className="px-8 py-6 bg-white/[0.02] border-b border-white/5 shadow-inner">
                            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                                {cleanVehicleName(selectedVehicle).split(' #')[0]}
                            </h3>
                            <div className="flex items-center gap-3 mt-4 flex-wrap">
                                {(() => {
                                    const vehicle = items.find(i => i.nome === selectedVehicle);
                                    return vehicle && (
                                        <>
                                            {vehicle.valor && (
                                                <span className="text-sm font-bold text-green-400 bg-green-500/10 px-4 py-1.5 rounded-xl border border-green-500/10">
                                                    {vehicle.valor}
                                                </span>
                                            )}
                                            {vehicle.ano && (
                                                <span className="text-sm font-semibold text-slate-300 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                                                    {vehicle.ano}
                                                </span>
                                            )}
                                            {vehicle.placa && (
                                                <span
                                                    className="text-[11px] font-black uppercase px-3 py-1.5 rounded-md shadow-xl"
                                                    style={{
                                                        background: '#f0f0e8',
                                                        color: '#111827',
                                                        border: '1.5px solid #1e3a5f',
                                                        letterSpacing: '0.15em'
                                                    }}
                                                >
                                                    {vehicle.placa}
                                                </span>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>

                        {/* LIST SECTION */}
                        <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-[#0a1224]">
                            {loadingVisits ? (
                                <div className="flex flex-col items-center justify-center h-60 gap-4">
                                    <RefreshCw className="animate-spin text-cyan-500" size={40} strokeWidth={1.5} />
                                    <span className="text-sm font-semibold text-slate-500 animate-pulse uppercase tracking-[0.2em]">Buscando Histórico...</span>
                                </div>
                            ) : vehicleVisits.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-60 opacity-20 select-none">
                                    <Car size={64} strokeWidth={1} className="mb-4 text-slate-400" />
                                    <p className="text-lg font-black italic tracking-tighter text-slate-400 uppercase">Nenhuma visita registrada</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                                        <div className="pl-1">Chegada</div>
                                        <div>Cliente / Lead</div>
                                        <div>Atendimento</div>
                                        <div className="text-right pr-2">Status</div>
                                    </div>
                                    {vehicleVisits.map(v => (
                                        <div key={v.id} className="grid grid-cols-4 items-center p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all group">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-bold text-slate-200">
                                                    {v.data_agendamento ? new Date(v.data_agendamento).toLocaleDateString() : v.datahora?.split(' ')[0]}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium">
                                                    {v.datahora?.split(' ')[1] || '08:00'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                                                    {v.cliente}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-medium">
                                                    {v.telefone}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-slate-300">
                                                    {v.vendedor || 'Pátio'}
                                                </div>
                                                <div className="text-[10px] text-slate-600 font-medium uppercase mt-0.5">Vendedor</div>
                                            </div>
                                            <div className="flex justify-end">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase border flex items-center justify-center min-w-[100px]
                                                    ${v.status === 'Vendido' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                                        v.status === 'Perdido' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                                            'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                                    {v.status || 'Em Aberto'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="px-8 py-5 bg-black/40 border-t border-white/[0.05] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Base de Leads IRW</span>
                            </div>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                Total: <span className="text-white ml-1">{vehicleVisits.length} registros</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Compartilhamento WhatsApp */
            }
            {isShareModalOpen && selectedVehicleForShare && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}>
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-glass-100 border-b border-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <MessageSquare className="text-green-500" />
                                Enviar para WhatsApp
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Selecione o cliente para enviar o veiculo: <span className="text-cyan-400 font-bold">{cleanVehicleName(selectedVehicleForShare.nome)}</span></p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-green-500 transition-all text-sm font-medium text-white"
                                    placeholder="Buscar cliente ou telefone..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                                {clients
                                    .filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase()) || c.telefone.includes(clientSearch))
                                    .slice(0, 50)
                                    .map((client, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleConfirmShare(client)}
                                            className="p-3 rounded-xl bg-white/5 hover:bg-green-500/20 hover:border-green-500/30 border border-transparent transition-all cursor-pointer flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-bold text-sm text-gray-200 group-hover:text-white">{client.nome}</div>
                                                <div className="text-xs text-gray-500 group-hover:text-green-300">{client.telefone}</div>
                                            </div>
                                            <Send size={16} className="text-gray-600 group-hover:text-green-400 transform group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))}
                                {clients.length === 0 && (
                                    <div className="text-center py-4 text-gray-500 text-xs">Nenhum cliente no histórico. Digite um número acima.</div>
                                )}
                            </div>

                            {/* Option to send to custom number if search looks like a number */}
                            {clientSearch.replace(/\D/g, '').length >= 10 && (
                                <button
                                    onClick={() => handleConfirmShare({ nome: 'Novo Cliente', telefone: clientSearch })}
                                    className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white text-xs  tracking-wider shadow-lg shadow-green-900/20"
                                >
                                    Enviar para {clientSearch}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER & SEARCH BAR - UNIFIED & ALIGNED */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6 shrink-0 px-1 pt-9 pb-8">
                <div className="flex flex-col">
                    <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter flex items-center gap-3 leading-none">
                        Tabela <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">Digital</span>
                        <Car size={32} className="text-cyan-500/50" />
                    </h1>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 tracking-[0.2em] mt-2 flex items-center gap-2 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Em Tempo Real
                    </p>
                </div>

                <div className="flex flex-1 max-w-3xl gap-3 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-xl">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar veículo..."
                            className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all text-sm font-medium placeholder:text-gray-600"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-center px-4 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-gray-300 gap-2 whitespace-nowrap" title="Total em Estoque">
                        <Car size={14} className="text-cyan-400" />
                        <span>{items.length}</span>
                    </div>

                    <div className="w-40 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs group-focus-within:text-green-400">R$</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Máximo"
                            className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-500/50 transition-all text-sm font-bold text-left placeholder:text-gray-650"
                            value={priceLimit}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                setPriceLimit(val);
                            }}
                        />
                    </div>

                    <button
                        onClick={handleSync}
                        title="Forçar Atualização"
                        className={`px-4 rounded-xl border border-white/5 flex items-center justify-center transition-all ${syncing ? 'bg-cyan-500/20 text-cyan-400' : 'bg-black/20 text-gray-500 hover:text-white hover:bg-white/5'}`}
                        disabled={syncing}
                    >
                        <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* LISTAGEM AGRUPADA POR MARCA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 p-1 pr-2">
                {Object.keys(grouped).length > 0 ? (
                    <div className="flex flex-col gap-8 pb-20">
                        {Object.keys(grouped).sort().map(marca => (
                            <div key={marca} className={performanceMode ? "" : "animate-in fade-in slide-in-from-bottom-4 duration-500"}>
                                {/* Título da Marca */}
                                <div className="flex items-center gap-4 mb-4 ml-2">
                                    <div className="flex items-center gap-6">
                                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tighter italic pr-2">
                                            {marca}
                                        </h3>
                                        <span className="text-sm font-black text-white bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10 shadow-lg">
                                            {grouped[marca].length}
                                        </span>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>

                                {/* Grid de Carros da Marca (Agora Lado a Lado - Max 2 a partir de LG) */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {grouped[marca].map((item, index) => (
                                        <div
                                            key={item.id || `${marca}-${index}`}
                                            className={`relative border rounded-2xl flex items-stretch transition-all duration-200 overflow-hidden group
                                                ${item.ativo
                                                    ? 'bg-[#1a2642]/60 border-white/8 hover:border-cyan-500/40 hover:bg-[#1e2d4a]/70'
                                                    : 'bg-red-950/20 border-red-500/20 opacity-60 grayscale'
                                                }`}
                                            style={{ minHeight: '7.5rem' }}
                                        >
                                            {/* GLOW HOVER */}
                                            {!performanceMode && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                            )}

                                            {/* IMAGEM */}
                                            <div
                                                className="relative flex-shrink-0 w-36 sm:w-44 xl:w-52 cursor-pointer overflow-hidden"
                                                onClick={() => handleOpenReport(item.nome)}
                                            >
                                                {item.foto ? (
                                                    <>
                                                        <img 
                                                            src={item.foto} 
                                                            alt={item.nome} 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e) => {
                                                                console.warn(`[Estoque] Erro ao carregar imagem: ${item.foto}. Usando fallback.`);
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = '<div class="w-full h-full bg-white/5 flex items-center justify-center text-gray-700 animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                                                            }}
                                                        />
                                                        {/* Gradiente direito: funde imagem com o card */}
                                                        <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-[#1a2642]/90" />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-700">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                )}
                                                {!item.ativo && (
                                                    <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center">
                                                        <span className="text-red-200 font-bold tracking-widest text-[10px] border border-red-500/50 px-2 py-1 rounded">Vendido</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* CONTEÚDO PRINCIPAL */}
                                            <div className="flex-1 flex flex-col justify-center px-5 py-4 min-w-0 gap-2">

                                                {/* LINHA 1 — NOME */}
                                                <h4
                                                    className="text-[15px] sm:text-[17px] font-semibold text-white truncate cursor-pointer hover:text-cyan-400 transition-colors leading-tight"
                                                    onClick={() => handleOpenReport(item.nome)}
                                                    title={item.nome}
                                                >
                                                    {cleanVehicleName(item.nome).split(' #')[0]}
                                                </h4>

                                                {/* LINHA 2 — SPECS: Ano · KM + Placa */}
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[13px] text-slate-300 font-medium leading-none">{item.ano}</span>
                                                    {item.km && item.km !== 'Consulte' && (
                                                        <>
                                                            <span className="text-slate-600 leading-none select-none">·</span>
                                                            <span className="text-[13px] text-slate-300 font-medium leading-none">
                                                                {(() => { const d = item.km.toString().replace(/\D/g, ''); return d ? Number(d).toLocaleString('pt-BR') : item.km; })()} KM
                                                            </span>
                                                        </>
                                                    )}
                                                    {item.placa ? (
                                                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-[3px] rounded">
                                                            {item.placa}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest px-2 py-[3px] border border-slate-700/30 rounded">— sem placa —</span>
                                                    )}
                                                </div>

                                                {/* LINHA 3 — BOTÕES */}
                                                <div className="flex items-center gap-2">
                                                    {item.link && (
                                                        <button
                                                            onClick={() => openLink(item.link)}
                                                            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-all text-[11px] font-semibold"
                                                        >
                                                            <ExternalLink size={11} /> WEB
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleOpenReport(item.nome)}
                                                        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-all text-[11px] font-semibold"
                                                    >
                                                        <Car size={11} /> {stats[item.nome] || 0} VIS
                                                    </button>
                                                    <button
                                                        onClick={() => handleShare(item)}
                                                        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 hover:text-white transition-all text-[11px] font-semibold"
                                                    >
                                                        <MessageSquare size={11} /> WHATSAPP
                                                    </button>
                                                </div>

                                            </div>

                                            {/* COLUNA DE PREÇO */}
                                            <div className="flex flex-col items-end justify-center pr-6 pl-4 min-w-[120px] border-l border-white/[0.06] flex-shrink-0">
                                                <span className="text-base sm:text-lg xl:text-xl font-bold leading-none text-green-400 whitespace-nowrap">
                                                    {item.valor || 'R$ 0,00'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-20">
                            <Search size={64} strokeWidth={1} className="mb-4" />
                            <span className="text-xl font-black tracking-tighter italic">Nenhum veículo encontrado</span>
                        </div>
                    )
                )}
            </div>

            {/* Empty state */}
            {items.length === 0 && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-gray-500 bg-glass-100 rounded-[3rem] border border-white/5 mt-6">
                    <Car size={64} className="opacity-10 mb-4" />
                    <p className="font-bold text-center">Nenhum veículo disponível no catálogo local.</p>
                    <p className="text-[10px] tracking-widest mt-2 opacity-50">Sincronização automática em andamento...</p>
                </div>
            )}

            {/* Loading spinner */}
            {loading && items.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Debug Info */}
            {(currentUser.role === 'developer' || currentUser.role === 'master') && (
                <div className="opacity-[0.05] hover:opacity-100 transition-opacity absolute bottom-2 right-2 text-[8px] text-white flex gap-4 bg-black/50 p-2 rounded-lg pointer-events-none hover:pointer-events-auto">
                    <span>Items: {items.length}</span>
                    <span>Filtered: {filtered.length}</span>
                    <span>Loading: {loading ? 'YES' : 'NO'}</span>
                </div>
            )}
        </div>
    );
};

export default Estoque;
