import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Car, Power, PowerOff, ExternalLink, Image as ImageIcon, CheckCircle, AlertTriangle, X, MessageSquare, Send, Trash2, Calendar, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { supabase } from '../lib/supabase';
import { parsePrice, cleanVehicleName } from '../lib/utils';
import { useLoja } from '../context/LojaContext';
import { get, set } from 'idb-keyval'; // ⚡ Cache Local

const Estoque = ({ user }) => {
    const { currentLoja } = useLoja();
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
            const { ipcRenderer } = window.require('electron');
            // Assuming get-visitas returns all history, we extract unique clients
            const visitas = await ipcRenderer.invoke('get-visitas-secure', { role: 'admin', username: null, lojaId: currentLoja?.id });

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
            const { ipcRenderer } = window.require('electron');
            const data = await ipcRenderer.invoke('get-vehicles-stats', currentLoja?.id);
            setStats(data || {});
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        loadItems();
        loadStats();
        loadClients();

        // Ouvi atualizações automáticas do Main Process
        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, payload) => {
            const table = typeof payload === 'string' ? payload : payload?.table;
            if (table === 'estoque' || !table) {
                console.log(`[Estoque] Atualização recebida para: ${table || 'estoque'}`);
                loadItems();
                loadStats();
            }
        };
        ipcRenderer.on('sync-status', handleRefresh);
        ipcRenderer.on('refresh-data', handleRefresh);
        return () => {
            ipcRenderer.removeListener('sync-status', handleRefresh);
            ipcRenderer.removeListener('refresh-data', handleRefresh);
        };
    }, []);

    const loadItems = async (force = false) => {
        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');
            const lojaId = currentLoja?.id || 'irw-motors-main';

            // ⚡ CACHE LOCAL (Stale-While-Revalidate)
            if (!force) {
                try {
                    const cached = await get(`estoque-cache-${lojaId}`);
                    if (cached && Array.isArray(cached) && cached.length > 0) {
                        console.log(`⚡ [Cache] Mostrando ${cached.length} veículos do cache`);
                        setItems(cached);
                        setLoading(false); // Libera a UI imediatamente
                    }
                } catch (e) { console.warn('Erro cache:', e); }
            }

            // 🏠 BUSCA NO BANCO LOCAL (Sincronizado a cada 5 min)
            const localData = await ipcRenderer.invoke('get-list', { table: 'estoque', lojaId });

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
                setItems(finalItems);
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
            const { ipcRenderer } = window.require('electron');
            const data = await ipcRenderer.invoke('get-visits-by-vehicle', { name: vehicleName, lojaId: currentLoja?.id });
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
            const { ipcRenderer } = window.require('electron');
            const res = await ipcRenderer.invoke('sync-xml', currentLoja?.id);

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
            const { ipcRenderer } = window.require('electron');
            const res = await ipcRenderer.invoke('migrate-all');
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

    const openLink = (url) => {
        if (!url) return;
        try {
            const { shell } = window.require('electron');
            shell.openExternal(url);
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
                        <div className="flex items-center gap-2 mt-1">
                            {item.ano && <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">{item.ano}</span>}
                            {item.cambio && <span className="text-[9px] text-gray-500 ">{item.cambio?.slice(0, 3)}</span>}
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
                        <div className="relative h-48 sm:h-64 bg-black/50">
                            {(() => {
                                const vehicle = items.find(i => i.nome === selectedVehicle);
                                return vehicle?.foto ? (
                                    <>
                                        {/* Main Image - Contained to show full car */}
                                        <div className="absolute inset-0 bg-[#0f172a]" />
                                        <img src={vehicle.foto} alt={selectedVehicle} className="absolute inset-0 w-full h-full object-contain z-10 p-4" />
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 bg-white/5">
                                        <ImageIcon size={64} />
                                    </div>
                                );
                            })()}

                            <div className="absolute top-4 right-4 z-20">
                                <button onClick={() => setSelectedVehicle(null)} className="p-2 bg-black/50 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                                <h3 className="text-2xl font-bold text-white flex items-end gap-3 shadow-black drop-shadow-lg">
                                    {cleanVehicleName(selectedVehicle)}
                                </h3>
                                <div className="flex items-center gap-4 mt-2">
                                    {(() => {
                                        const vehicle = items.find(i => i.nome === selectedVehicle);
                                        return vehicle && (
                                            <>
                                                {vehicle.valor && <span className="text-green-400 font-bold bg-green-900/40 px-3 py-1 rounded-lg border border-green-500/20 backdrop-blur-sm">{vehicle.valor}</span>}
                                                {vehicle.ano && <span className="text-gray-300 font-bold bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">{vehicle.ano}</span>}
                                                {vehicle.cambio && <span className="text-gray-300 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">{vehicle.cambio}</span>}
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-6">
                            {loadingVisits ? (
                                <div className="flex justify-center items-center h-40">
                                    <RefreshCw className="animate-spin text-cyan-500" size={32} />
                                </div>
                            ) : vehicleVisits.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <p className="text-lg font-medium">Nenhuma visita agendada para este veículo.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-xs text-gray-400  tracking-wider">
                                            <th className="pb-3 pl-2">Data</th>
                                            <th className="pb-3">Cliente</th>
                                            <th className="pb-3">Vendedor</th>
                                            <th className="pb-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {vehicleVisits.map(v => (
                                            <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3 pl-2 font-medium text-white">
                                                    {v.data_agendamento ? new Date(v.data_agendamento).toLocaleDateString() : v.datahora}
                                                </td>
                                                <td className="py-3 text-gray-300 font-medium">
                                                    {v.cliente} <span className="text-xs text-gray-500 block">{v.telefone}</span>
                                                </td>
                                                <td className="py-3 text-gray-300">{v.vendedor || 'Indefinido'}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold  ${v.status === 'Vendido' ? 'bg-green-500/20 text-green-400' :
                                                        v.status === 'Perdido' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {v.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 bg-white/5 border-t border-white/10 text-right">
                            <span className="text-xs text-gray-500 font-medium mr-2">Total de Agendamentos: {vehicleVisits.length}</span>
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

            {/* HEADER - NEW STANDARD */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 shrink-0 px-1">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight  font-rajdhani flex items-center gap-3">
                        Estoque <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">Digital</span>
                        <Car size={32} className="text-cyan-500" />
                    </h1>
                    <p className="text-sm font-bold text-gray-400  tracking-widest mt-1 font-rajdhani flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        Inventário em Tempo Real
                    </p>
                </div>
            </div>

            {/* SEARCH BAR - CLEAN & CENTERED */}
            <div className="flex justify-center mb-6 shrink-0">
                <div className="flex gap-3 w-full max-w-2xl bg-glass-100 p-2 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-xl">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar veículo..."
                            className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium placeholder:text-gray-600"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Badge de Contagem */}
                    <div className="flex items-center justify-center px-4 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-gray-300 gap-2 whitespace-nowrap" title="Total em Estoque">
                        <Car size={16} className="text-cyan-400" />
                        <span>{items.length}</span>
                    </div>

                    <div className="w-48 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs group-focus-within:text-green-400">R$</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Preço Máximo"
                            className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-green-500/50 transition-all font-bold text-left placeholder:text-gray-600 placeholder:font-medium"
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
                        <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* LISTAGEM AGRUPADA POR MARCA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 p-1 pr-2">
                {Object.keys(grouped).length > 0 ? (
                    <div className="flex flex-col gap-8 pb-20">
                        {Object.keys(grouped).sort().map(marca => (
                            <div key={marca} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Título da Marca */}
                                <div className="flex items-center gap-4 mb-4 ml-2">
                                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500  tracking-tighter">
                                        {marca}
                                    </h3>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                    <span className="text-xs font-bold text-gray-600 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                        {grouped[marca].length} {grouped[marca].length === 1 ? 'VEÍCULO' : 'VEÍCULOS'}
                                    </span>
                                </div>

                                {/* Grid de Carros da Marca (Agora Lado a Lado - Max 2 a partir de LG) */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {grouped[marca].map((item, index) => (
                                        <div
                                            key={item.id || `${marca}-${index}`}
                                            className={`relative bg-[#1e293b]/50 border border-white/5 rounded-2xl flex items-center gap-6 p-3 transition-all duration-200 h-28 overflow-hidden group hover:border-cyan-500/30 ${!item.ativo && 'opacity-60 grayscale'}`}
                                        >
                                            {/* Glow de Fundo no Hover */}
                                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                            {/* IMAGEM COM MÁSCARA GRADIENTE (Sutil integração) */}
                                            <div className="w-24 sm:w-36 xl:w-44 h-full absolute left-0 top-0 bottom-0 overflow-hidden cursor-pointer" onClick={() => handleOpenReport(item.nome)}>
                                                {item.foto ? (
                                                    <>
                                                        <img src={item.foto} alt={item.nome} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-[#162032] opacity-20" />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-700">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                )}
                                                {!item.ativo && (
                                                    <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center">
                                                        <span className="text-red-200 font-bold  tracking-widest text-[10px] border border-red-500/50 px-2 py-1 rounded">Vendido</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* CONTEÚDO (Com margem para não ficar em cima da imagem) */}
                                            <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 pl-28 sm:pl-40 xl:pl-48 relative z-10">
                                                <div className="min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4
                                                            className="text-sm sm:text-base xl:text-lg font-bold leading-none truncate cursor-pointer hover:text-cyan-400 transition-colors text-white font-rajdhani tracking-tight drop-shadow-md pr-2"
                                                            onClick={() => handleOpenReport(item.nome)}
                                                            title={item.nome}
                                                        >
                                                            {cleanVehicleName(item.nome).split(' #')[0]}
                                                        </h4>
                                                    </div>

                                                    {/* SPECS BADGES - Minimalistas Tech */}
                                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                        {item.ano && (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 shadow-sm transition-colors group-hover:border-amber-500/30">
                                                                <Calendar size={12} className="text-amber-500" />
                                                                <span className="text-[11px] font-bold text-gray-300 font-rajdhani tracking-wider">
                                                                    {item.ano}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {item.km && (item.km !== 'Consulte') && (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 shadow-sm transition-colors group-hover:border-cyan-500/30">
                                                                <Gauge size={12} className="text-cyan-400" />
                                                                <span className="text-[11px] font-bold text-gray-300 font-rajdhani tracking-wider">
                                                                    {(() => {
                                                                        const onlyDigits = item.km.toString().replace(/\D/g, '');
                                                                        return onlyDigits ? Number(onlyDigits).toLocaleString('pt-BR') : item.km;
                                                                    })()} KM
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* BARRA DE AÇÕES INFERIOR */}
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    {item.link && (
                                                        <button onClick={() => openLink(item.link)} className="btn-cyber-secondary text-[11px] py-1.5 px-3 text-blue-400 border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all">
                                                            <ExternalLink size={13} /> <span className="hidden 2xl:inline">WEB</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenReport(item.nome)} className="btn-cyber-secondary text-[11px] py-1.5 px-3 text-purple-400 border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all">
                                                        <Car size={13} /> <span className="hidden xl:inline">{(stats[item.nome] || 0)} VIS</span>
                                                    </button>
                                                    <button onClick={() => handleShare(item)} className="btn-cyber-secondary text-[11px] py-1.5 px-3 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all">
                                                        <MessageSquare size={13} /> <span className="hidden 2xl:inline">WHATSAPP</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* PREÇO PREMIUM (Lado Direito - Floating Clean) */}
                                            <div className="flex flex-col items-end justify-center pl-2 sm:pl-6 min-w-[max-content] h-full pr-1 sm:pr-4">
                                                <div className="flex flex-col items-end group-hover:scale-105 transition-transform duration-500 origin-right">
                                                    <span className="text-base sm:text-xl xl:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight font-rajdhani drop-shadow-[0_0_15px_rgba(34,211,238,0.15)] leading-none">
                                                        {item.valor || 'R$ 0,00'}
                                                    </span>
                                                    <span className="hidden sm:block text-[8px] text-gray-500/40 font-semibold tracking-wider mt-0.5 font-rajdhani uppercase">Venda</span>
                                                </div>
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
                            <span className="text-xl font-black  tracking-tighter italic">Nenhum veículo encontrado</span>
                        </div>
                    )
                )}
            </div>
            {items.length === 0 && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-gray-500 bg-glass-100 rounded-[3rem] border border-white/5 mt-6">
                    <Car size={64} className="opacity-10 mb-4" />
                    <p className="font-bold text-center">Nenhum veículo disponível no catálogo local.</p>
                    <p className="text-[10px]  tracking-widest mt-2 opacity-50">Sincronização automática em andamento...</p>
                </div>
            )}

            {loading && items.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Debug Info (Visible only for Developer/Admin during diagnosis) */}
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
