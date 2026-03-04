import { MessageSquare, Smartphone, ListCheck, Plus, Trash2, Send, Star, X, Car, Search, ExternalLink, Image as ImageIcon, Edit2, GripVertical, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Calendar, Gauge, CircleDollarSign, Filter } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useUI } from '../context/UIContext';
import { useLoja } from '../context/LojaContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import NewVisitModal from '../components/NewVisitModal';
import QuickVisitForm from '../components/QuickVisitForm';
import { cleanVehicleName } from '../lib/utils';
import { get, set } from 'idb-keyval'; // ⚡ Cache Local

// Error Boundary para capturar crashes do React
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("WhatsApp Page Crash:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-red-900/90 text-white text-center">
                    <h1 className="text-3xl font-black mb-4">⚠️ ERRO CRÍTICO NA PÁGINA</h1>
                    <div className="bg-black/50 p-6 rounded-xl border border-white/10 max-w-2xl w-full text-left overflow-auto max-h-[60vh]">
                        <p className="font-mono text-sm text-red-200 mb-2">{this.state.error && this.state.error.toString()}</p>
                        <div className="mt-4 p-4 bg-gray-800 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-300">
                            {this.state.error?.stack}
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-white text-red-900 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                        Tentar Novamente (Recarregar)
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- Sub-componentes Optimizados ---


const CarCard = memo(({ car, onSendPhotos, onSendInfo, onPasteLink, loadingCar }) => {
    const { performanceMode } = useUI();
    let fotosCount = 0;
    try {
        const parsed = JSON.parse(car.fotos || '[]');
        fotosCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
        console.warn("Erro fotos:", car?.nome, e);
    }

    return (
        <div className={`relative group overflow-hidden rounded-[1.5rem] border border-white/5 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-1 ${performanceMode ? '' : 'shadow-lg hover:shadow-cyan-500/10'} transition-all duration-300`}>
            {/* Glow Effect on Hover - Oculto em Performance */}
            {!performanceMode && (
                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}

            <div className="relative z-10 p-3 flex flex-col gap-3">
                {/* Header: Image & Title */}
                <div className="flex gap-3">
                    <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-white/20 transition-colors">
                        {car.foto ? (
                            <img src={car.foto} className={`w-full h-full object-cover transition-transform duration-500 ${performanceMode ? '' : 'group-hover:scale-110'}`} loading="lazy" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700 bg-black/40">
                                <ImageIcon size={24} />
                            </div>
                        )}
                        {/* Overlay Gradient on Image */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <h4 className="text-sm font-bold text-white leading-tight tracking-tight line-clamp-2 group-hover:text-cyan-400 transition-colors">
                            {cleanVehicleName(car.nome).split('#')[0]}
                        </h4>

                        <div className="flex flex-col items-start gap-1">
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight drop-shadow-sm">
                                {car.valor || 'R$ 0,00'}
                            </span>

                            <div className="flex flex-wrap gap-1.5">
                                {car.ano && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10 shadow-sm transition-colors group-hover:border-amber-500/30">
                                        <Calendar size={12} className="text-amber-500" />
                                        <span className="text-[11px] font-bold text-gray-300 font-rajdhani tracking-wider">
                                            {car.ano}
                                        </span>
                                    </div>
                                )}
                                {car.km && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10 shadow-sm transition-colors group-hover:border-cyan-500/30">
                                        <Gauge size={12} className="text-cyan-400" />
                                        <span className="text-[11px] font-bold text-gray-300 font-rajdhani tracking-wider lowercase">
                                            {car.km}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Grid - Cyber Buttons Padronizados */}
                <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
                    <button
                        onClick={() => onSendPhotos(car)}
                        disabled={loadingCar === car.nome}
                        className={`btn-cyber-primary w-full flex items-center justify-center gap-2 text-[11px] py-3.5 rounded-2xl
                            ${loadingCar === car.nome ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        {loadingCar === car.nome ? (
                            <ImageIcon className="animate-spin" size={14} />
                        ) : (
                            <ImageIcon size={14} className="group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-black tracking-widest">{loadingCar === car.nome ? 'BUSCANDO...' : `ENVIAR FOTOS (${fotosCount})`}</span>
                    </button>

                    <button
                        onClick={(e) => { e.currentTarget.blur(); onSendInfo(car); }}
                        className="btn-cyber-primary w-full text-[11px] py-3.5 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
                    >
                        <ListCheck size={14} className="group-hover:text-cyan-400 transition-colors" />
                        <span className="font-black tracking-widest">ENVIAR INFORMAÇÕES</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

const Whatsapp = () => {
    const { currentLoja } = useLoja();
    const { performanceMode } = useUI();
    const location = useLocation();
    const navigate = useNavigate();
    const [scripts, setScripts] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [activeTab, setActiveTab] = useState('veiculos');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // <--- INICIA FECHADO AGORA
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [isQuickVisitOpen, setIsQuickVisitOpen] = useState(false);
    const [newScript, setNewScript] = useState({ titulo: '', mensagem: '', isSystem: false, link: '' });

    const [editingScript, setEditingScript] = useState(null);
    const [searchEstoque, setSearchEstoque] = useState('');
    const [priceLimit, setPriceLimit] = useState('');
    const [loadingCar, setLoadingCar] = useState(null);
    const [directPhone, setDirectPhone] = useState('');
    const [userRole, setUserRole] = useState(null);
    const [username, setUsername] = useState(null); // Username para partition isolado
    // --- Lógica Refatorada para Controle Remoto ---

    // Bridge para capturar agendamentos do Modal e enviar via Service
    useEffect(() => {
        window.onAppointmentSaved = (msg) => {
            window.dispatchEvent(new CustomEvent('whatsapp-send-text', { detail: msg }));
        };
        return () => { window.onAppointmentSaved = null; };
    }, []);

    // Observer para notificar o Service sobre mudanças na Sidebar (para redimensionar o Webview)
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('whatsapp-sidebar-toggle', {
            detail: { isOpen: isSidebarOpen, width: 320 }
        }));
    }, [isSidebarOpen]);


    const pasteToWhatsapp = useCallback((text) => {
        // Dispara evento para o Service colar texto
        window.dispatchEvent(new CustomEvent('whatsapp-send-text', { detail: text }));
    }, []);

    // Função avançada para injetar fotos diretamente (Via Service)
    const sendPhotosToWhatsapp = async (fotosRaw) => {
        try {
            const { ipcRenderer } = window.require('electron');
            const fotosArray = typeof fotosRaw === 'string' ? JSON.parse(fotosRaw) : fotosRaw;

            if (!fotosArray || fotosArray.length === 0) return;

            // Busca todas as fotos em paralelo
            const base64Promises = fotosArray.map(url =>
                ipcRenderer.invoke('get-image-base64', url).catch(e => null)
            );

            const base64Results = await Promise.all(base64Promises);
            const base64Photos = base64Results.filter(img => img !== null);

            if (base64Photos.length === 0) {
                window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Erro ao carregar imagens.', type: 'warning' } }));
                return;
            }

            // Script complexo de Paste de Imagens - Envia para o Service executar
            const script = `
                (async () => {
                    try {
                        const base64Data = ${JSON.stringify(base64Photos)};
                        const dataTransfer = new DataTransfer();

                        const filePromises = base64Data.map(async (b64, i) => {
                            const res = await fetch(b64);
                            const blob = await res.blob();
                            return new File([blob], "carro_" + i + ".jpg", { type: "image/jpeg" });
                        });

                        const files = await Promise.all(filePromises);
                        files.forEach(file => dataTransfer.items.add(file));

                        const input = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                                    document.querySelector('div[contenteditable="true"]') ||
                                    document.querySelector('footer div[role="textbox"]');

                        if (input) {
                            input.focus();
                            input.click();

                            const pasteEvent = new ClipboardEvent('paste', {
                                clipboardData: dataTransfer,
                                bubbles: true,
                                cancelable: true
                            });
                            input.dispatchEvent(pasteEvent);
                        }
                    } catch (e) { console.error('Erro img pasta:', e); }
                })();
            `;

            window.dispatchEvent(new CustomEvent('whatsapp-execute-script', { detail: { script } }));

        } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Erro fotos: ' + err.message, type: 'error' } }));
        }
    };

    // Efeito para checar se veio de um compartilhamento (Tabela -> Zap)
    useEffect(() => {
        if (location.state && location.state.action === 'share-vehicle' && location.state.vehicle) {
            const { vehicle, client } = location.state;
            console.log("🚀 Iniciando compartilhamento automático:", vehicle.nome, "para", client?.nome);

            const performShare = async () => {
                if (client && client.telefone) {
                    // 1. Abrir conversa
                    const cleanPhone = client.telefone.replace(/\D/g, '');
                    window.dispatchEvent(new CustomEvent('whatsapp-direct-chat', { detail: cleanPhone }));

                    // 2. Aguardar carregamento (Simulação de espera)
                    // WhatsApp Web pode demorar alguns segundos para abrir o chat novo.
                    await new Promise(r => setTimeout(r, 6000));
                }

                // 3. Montar mensagem
                const cleanName = cleanVehicleName(vehicle.nome).split('#')[0].trim();
                const message = `*${cleanName}*\n📅 Ano: ${vehicle.ano || 'Consulte'}\n⚙️ Câmbio: ${vehicle.cambio}\n🛣️ KM: ${vehicle.km}\n💰 ${vehicle.valor}\n\nLink: ${vehicle.link || ''}`;

                // 4. Enviar Msg
                pasteToWhatsapp(message);

                // 5. Enviar Fotos (se houver) com pequeno delay
                if (vehicle.fotos) {
                    await new Promise(r => setTimeout(r, 1500));
                    sendPhotosToWhatsapp(vehicle.fotos);
                }

                // Limpa o estado para não repetir
                navigate(location.pathname, { replace: true, state: {} });
            };

            performShare();
        }
    }, [location.state, navigate, pasteToWhatsapp, sendPhotosToWhatsapp]);


    useEffect(() => {
        const loadUserRole = async () => {
            try {
                const user = localStorage.getItem('username');
                const role = localStorage.getItem('userRole');
                setUsername(user);
                setUserRole(role);
                console.log('👤 Usuário carregado para WhatsApp:', user);
            } catch (err) {
                console.error('Erro ao carregar role:', err);
            }
        };
        loadUserRole();

        // 🚀 CORREÇÃO: Carrega dados IMEDIATAMENTE (não espera currentLoja)
        // Usa currentLoja?.id se disponível, senão usa 'irw-motors-main' como fallback
        console.log('🚀 [Whatsapp] Carregando dados IMEDIATAMENTE...');
        loadData();

        // Listener para sincronização automática
        const { ipcRenderer } = window.require('electron');
        let refreshTimeout;
        const handleRefresh = (event, payload) => {
            const table = typeof payload === 'string' ? payload : payload?.table;
            // Debounce para evitar múltiplas chamadas
            if (table === 'estoque' || !table || payload?.success) {
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(() => {
                    console.log('🔄 [Whatsapp] Atualizando sidebar...');
                    loadData();
                }, 300); // Aguarda 300ms antes de atualizar
            }
        };
        ipcRenderer.on('sync-status', handleRefresh);
        ipcRenderer.on('refresh-data', handleRefresh);

        return () => {
            clearTimeout(refreshTimeout);
            ipcRenderer.removeListener('sync-status', handleRefresh);
            ipcRenderer.removeListener('refresh-data', handleRefresh);
        };
    }, [currentLoja]);
    // Sincronizar estado da sidebar com componentes externos
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('whatsapp-sidebar-state', {
            detail: { isOpen: isSidebarOpen, width: 420 }
        }));
    }, [isSidebarOpen]);

    // ⌨️ ESCAPE KEY LISTENER para fechar modais
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setIsVisitModalOpen(false);
                setIsQuickVisitOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const loadData = async (force = false) => {
        try {
            const { ipcRenderer } = window.require('electron');
            const username = localStorage.getItem('username');

            // 🚀 FALLBACK: Se currentLoja não estiver definida, usa a loja padrão
            const lojaId = currentLoja?.id || 'irw-motors-main';

            console.log('🔍 [Whatsapp] Iniciando loadData...');
            console.log('👤 [Whatsapp] Username:', username);
            console.log('🏪 [Whatsapp] Loja atual:', currentLoja);
            console.log('🎯 [Whatsapp] Usando lojaId:', lojaId);

            // ⚡ CACHE LOCAL (Stale-While-Revalidate)
            // Se não for forçado, tenta carregar do cache para mostrar algo instantaneamente
            if (!force) {
                try {
                    const [cachedScripts, cachedEstoque] = await Promise.all([
                        get(`scripts-cache-${lojaId}`),
                        get(`estoque-cache-${lojaId}`)
                    ]);

                    if (cachedScripts && Array.isArray(cachedScripts)) {
                        console.log(`⚡ [Cache] Carregados ${cachedScripts.length} scripts`);
                        setScripts(cachedScripts);
                    }
                    if (cachedEstoque && Array.isArray(cachedEstoque)) {
                        console.log(`⚡ [Cache] Carregados ${cachedEstoque.length} veículos`);
                        setEstoque(cachedEstoque);
                    }
                } catch (e) { console.warn('Erro leitura cache Whatsapp:', e); }
            }

            const [scriptsData, estoqueData] = await Promise.all([
                ipcRenderer.invoke('get-scripts', { username, lojaId }),
                ipcRenderer.invoke('get-list', { table: 'estoque', lojaId })
            ]);

            console.log('📊 [Whatsapp] Scripts recebidos:', scriptsData?.length || 0, scriptsData);
            console.log('🚗 [Whatsapp] Estoque recebido:', estoqueData?.length || 0);

            if (estoqueData && estoqueData.length > 0) {
                console.log('🚗 [Whatsapp] Primeiros 3 veículos:', estoqueData.slice(0, 3));
            } else {
                console.warn('⚠️  [Whatsapp] Nenhum veículo retornado!');
                console.log('🔍 [Whatsapp] Verificando lojaId usado:', lojaId);
            }

            if (scriptsData) {
                setScripts(scriptsData);
                set(`scripts-cache-${lojaId}`, scriptsData).catch(console.error);
            }

            if (estoqueData) {
                setEstoque(estoqueData);
                set(`estoque-cache-${lojaId}`, estoqueData).catch(console.error);
            }

            // DEBUG: Verificar se está setando corretamente
            console.log('🔍 [DEBUG] Após setEstoque, estoque.length deveria ser:', estoqueData?.length);
            // console.log('🔍 [DEBUG] Valor de ativo nos primeiros 3:', estoqueData?.slice(0, 3).map(v => ({ nome: v.nome, ativo: v.ativo, tipo: typeof v.ativo })));
        } catch (err) {
            console.error('❌ [Whatsapp] Erro ao carregar dados:', err);
        }
    };

    const handleAddScript = async (e) => {
        e.preventDefault();
        if (!newScript.titulo || !newScript.mensagem) return;
        try {
            const { ipcRenderer } = window.require('electron');
            const username = localStorage.getItem('username');

            await ipcRenderer.invoke('add-script', {
                titulo: newScript.titulo,
                mensagem: newScript.mensagem,
                isSystem: newScript.isSystem ? 1 : 0,
                userRole,
                link: newScript.link || null,
                username: username,
                lojaId: currentLoja?.id
            });
            setNewScript({ titulo: '', mensagem: '', isSystem: false, link: '' });
            setIsAddModalOpen(false);
            loadData();
        } catch (err) {
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: err.message || 'Erro ao adicionar script', type: 'error' }
            }));
        }
    };

    const handleEditScript = (script) => {
        setEditingScript({ ...script, isSystem: script.is_system === 1 });
        setIsEditModalOpen(true);
    };

    const handleUpdateScript = async (e) => {
        e.preventDefault();
        try {
            const { ipcRenderer } = window.require('electron');
            const username = localStorage.getItem('username');

            await ipcRenderer.invoke('update-script', {
                id: editingScript.id,
                titulo: editingScript.titulo,
                mensagem: editingScript.mensagem,
                isSystem: editingScript.isSystem ? 1 : 0,
                userRole,
                link: editingScript.link || null,
                username: username,
                loja_id: currentLoja?.id
            });
            setIsEditModalOpen(false);
            setEditingScript(null);
            loadData();
        } catch (err) {
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: err.message || 'Erro ao atualizar script', type: 'error' }
            }));
        }
    };

    const handleDeleteScript = async (e, id) => {
        e.stopPropagation();
        try {
            const { ipcRenderer } = window.require('electron');
            const username = localStorage.getItem('username');

            await ipcRenderer.invoke('delete-script', {
                id,
                userRole,
                username: username,
                lojaId: currentLoja?.id
            });
            loadData();
        } catch (err) {
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: err.message || 'Erro ao deletar script', type: 'error' }
            }));
        }
    };

    // Função para enriquecer dados faltantes (KM/Fotos) em tempo real
    const enrichCarData = async (car) => {
        // Se KM estiver faltando ou tiver poucas fotos (XML geralmente manda só 1 ou 2), busca a galeria completa no site
        if (car.km === 'Consulte' || (JSON.parse(car.fotos || '[]').length <= 4)) {
            try {
                setLoadingCar(car.nome);
                const { ipcRenderer } = window.require('electron');
                const fresh = await ipcRenderer.invoke('scrap-car-details', { nome: car.nome, url: car.link });
                if (fresh) {
                    // Atualiza o estado local para refletir na UI
                    const updatedCar = {
                        ...car,
                        km: fresh.km || car.km,
                        fotos: fresh.fotos ? JSON.stringify(fresh.fotos) : car.fotos
                    };
                    setEstoque(prev => prev.map(c => c.nome === car.nome ? updatedCar : c));
                    return updatedCar;
                }
            } catch (err) {
                console.error("Erro ao enriquecer:", err);
            } finally {
                setLoadingCar(null);
            }
        }
        return car;
    };

    const handleSendPhotos = useCallback(async (car) => {
        const enriched = await enrichCarData(car);
        sendPhotosToWhatsapp(enriched.fotos);
    }, [sendPhotosToWhatsapp]);

    const handleSendInfo = useCallback(async (car) => {
        const enriched = await enrichCarData(car);
        const cleanName = cleanVehicleName(enriched.nome).split('#')[0].trim();

        // Formata KM se for numérico puro (ex: 182000 -> 182.000)
        let formattedKm = enriched.km;
        if (typeof formattedKm === 'string') {
            const onlyDigits = formattedKm.replace(/\D/g, '');
            if (onlyDigits.length > 0) {
                formattedKm = Number(onlyDigits).toLocaleString('pt-BR') + ' km';
            }
        }

        const message = [
            `*${cleanName}*`,
            "",
            `📅 Ano: ${enriched.ano || 'Consulte'}`,
            `⚙️ Câmbio: ${enriched.cambio}`,
            `🛣️ KM: ${formattedKm}`,
            `💰 ${enriched.valor}`,
            "\n" // Espaço extra para permitir empilhar vários cliques
        ].join('\n');

        pasteToWhatsapp(message);
    }, [pasteToWhatsapp]); // pasteToWhatsapp agora é estável

    const handlePasteLink = useCallback((link) => {
        pasteToWhatsapp(link);
    }, [pasteToWhatsapp]); // pasteToWhatsapp agora é estável

    const parsePrice = useCallback((priceStr) => {
        if (!priceStr) return 0;
        // Se houver centavos (ex: 35.900,00), remove o que vem depois da vírgula
        const clean = priceStr.split(',')[0].replace(/\D/g, '');
        return parseInt(clean) || 0;
    }, []);

    const filteredEstoque = useMemo(() => {
        const query = (searchEstoque || "").toLowerCase();
        const limit = parseInt(priceLimit);

        console.log('🔍 [filteredEstoque] Início do filtro');
        console.log('🔍 [filteredEstoque] estoque.length:', estoque?.length);
        console.log('🔍 [filteredEstoque] query:', query);
        console.log('🔍 [filteredEstoque] priceLimit:', priceLimit);

        const filtered = (estoque || []).filter(car => {
            if (!car || !car.nome) {
                console.log('🔍 [filteredEstoque] Rejeitado: sem nome', car);
                return false;
            }
            const matchesSearch = car.nome.toLowerCase().includes(query);
            const carPrice = parsePrice(car.valor);
            const matchesPrice = !priceLimit || isNaN(limit) || carPrice <= limit;
            const ativoOk = car.ativo !== 0;

            if (!matchesSearch || !matchesPrice || !ativoOk) {
                console.log(`🔍 [filteredEstoque] Rejeitado: ${car.nome} - search:${matchesSearch}, price:${matchesPrice}, ativo:${ativoOk} (valor ativo=${car.ativo}, tipo=${typeof car.ativo})`);
            }

            return matchesSearch && matchesPrice && ativoOk;
        });

        console.log('🔍 [filteredEstoque] Resultado FINAL:', filtered.length, 'veículos');
        if (filtered.length === 0 && estoque && estoque.length > 0) {
            console.error('❌ [filteredEstoque] PROBLEMA: estoque tem', estoque.length, 'mas filtro retorna 0!');
        }
        return filtered;
    }, [estoque, searchEstoque, priceLimit, parsePrice]);

    // Separa scripts para facilitar o Drag and Drop
    const systemScripts = scripts.filter(s => s.is_system === 1);
    const userScripts = scripts.filter(s => s.is_system !== 1);

    const handleReorder = (newUserScripts) => {
        const newFullList = [...systemScripts, ...newUserScripts];
        setScripts(newFullList);
        const orderUpdate = newFullList.map((script, index) => ({ id: script.id, ordem: index }));
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('update-scripts-order', orderUpdate).catch(console.error);
    };

    return (
        <ErrorBoundary>
            <motion.div
                className="h-full w-full flex relative overflow-hidden bg-transparent"
                initial={false}
                animate={{ paddingRight: isSidebarOpen ? 420 : 0 }}
                transition={performanceMode ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }}
            >
                {/* ÁREA DE CONTROLE (Botão Toggle) */}
                {/* ÁREA DE CONTROLE (Botão Toggle) */}
                {/* ÁREA DE CONTROLE (Botão Toggle) */}
                <motion.button
                    onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                    initial={false}
                    animate={{
                        x: isSidebarOpen ? -420 : 0,
                    }}
                    style={{ right: 0 }}
                    whileHover={performanceMode ? {} : { width: 40, backgroundColor: "rgb(37 99 235 / 0.9)" }} // Aumenta largura no hover
                    transition={performanceMode ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }}
                    className="fixed top-1/2 -translate-y-1/2 z-[60] w-6 h-24 bg-slate-900/90 backdrop-blur-md flex items-center justify-center rounded-l-xl border-y border-l border-blue-500/30 text-blue-400 cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:text-white hover:border-blue-400/50 hover:shadow-blue-500/20 transition-colors pointer-events-auto keep-transform"
                >
                    {isSidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </motion.button>

                {/* PAINEL LATERAL */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                        <motion.div
                            initial={performanceMode ? { x: 0 } : { x: "100%" }}
                            animate={{ x: 0 }}
                            exit={performanceMode ? { x: "100%", opacity: 0 } : { x: "100%" }}
                            transition={performanceMode ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }}
                            className="absolute right-0 top-0 bottom-0 w-[420px] h-full overflow-y-auto custom-scrollbar flex flex-col pr-2 pl-4 py-8 bg-[#0f172a] border-l border-white/10 z-50 shadow-2xl pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="shrink-0 space-y-4 mb-4">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                                        <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full block"></span>
                                        {activeTab === 'veiculos' ? 'CATÁLOGO' : 'SCRIPTS'}
                                    </h2>
                                    {activeTab === 'templates' && (
                                        <button onClick={() => setIsAddModalOpen(true)} className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition-all border border-cyan-500/20">
                                            <Plus size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Tabs */}
                                <div className="bg-black/40 p-1.5 rounded-2xl flex gap-1 border border-white/5">
                                    <button
                                        onClick={() => setActiveTab('veiculos')}
                                        className={`flex-1 transition-all rounded-xl py-2 text-[11px] font-bold tracking-widest uppercase ${activeTab === 'veiculos' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                    >
                                        Estoque
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('templates')}
                                        className={`flex-1 transition-all rounded-xl py-2 text-[11px] font-bold tracking-widest uppercase ${activeTab === 'templates' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                    >
                                        Scripts
                                    </button>
                                </div>
                            </div>

                            {/* Conteúdo Tabs */}
                            <div className="flex-1 min-h-0 space-y-3 flex flex-col">
                                {activeTab === 'templates' ? (
                                    <>



                                        <div className="space-y-2 mt-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                            {/* Scripts Fixos */}
                                            {systemScripts.map(script => (
                                                <div key={script.id}
                                                    draggable
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', script.mensagem)}
                                                    onClick={() => pasteToWhatsapp(script.mensagem)}
                                                    className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/20 hover:border-blue-500/50 cursor-pointer group active:scale-95 transition-all mb-2"
                                                >
                                                    <h3 className="text-xs font-black text-blue-300 mb-1">{script.titulo}</h3>
                                                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{script.mensagem}</p>
                                                </div>
                                            ))}

                                            <Reorder.Group axis="y" values={userScripts} onReorder={handleReorder} className="space-y-2">
                                                {userScripts.map(script => (
                                                    <Reorder.Item key={script.id} value={script} className="relative group">
                                                        <div
                                                            onClick={() => pasteToWhatsapp(script.mensagem)}
                                                            className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 cursor-pointer active:scale-95 transition-all select-none"
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h3 className="text-xs font-bold text-gray-200">{script.titulo}</h3>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => { e.stopPropagation(); handleEditScript(script); }} className="p-1 hover:text-blue-400"><Edit2 size={12} /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteScript(e, script.id); }} className="p-1 hover:text-red-400"><Trash2 size={12} /></button>
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 line-clamp-2">{script.mensagem}</p>
                                                        </div>
                                                    </Reorder.Item>
                                                ))}
                                            </Reorder.Group>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Chat Direto por Número - UI Premium */}
                                        <div className="mb-4 p-4 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 rounded-3xl border border-cyan-500/20 backdrop-blur-md shadow-lg shadow-cyan-900/10 relative overflow-hidden group/chatcard">
                                            {/* Glow decorativo */}
                                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/20 blur-2xl rounded-full" />

                                            <div className="flex items-center gap-2 mb-3 px-1 relative z-10">
                                                <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                                                    <MessageSquare size={12} className="text-cyan-400" />
                                                </div>
                                                <span className="text-[10px] font-black text-cyan-200/60 tracking-[0.2em] uppercase">Conversa Rápida</span>
                                            </div>

                                            <div className="relative group/phone z-10">
                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within/phone:text-cyan-400 transition-colors">
                                                    <Smartphone size={14} />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="DDD + Telefone"
                                                    value={directPhone}
                                                    onChange={(e) => setDirectPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && directPhone.length >= 8) {
                                                            window.dispatchEvent(new CustomEvent('whatsapp-direct-chat', { detail: directPhone }));
                                                            window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Iniciando conversa...', type: 'info' } }));
                                                            setDirectPhone('');
                                                        }
                                                    }}
                                                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 pl-10 pr-12 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all font-mono font-bold tracking-widest shadow-inner"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (directPhone.length >= 8) {
                                                            window.dispatchEvent(new CustomEvent('whatsapp-direct-chat', { detail: directPhone }));
                                                            window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Iniciando conversa...', type: 'info' } }));
                                                            setDirectPhone('');
                                                        }
                                                    }}
                                                    disabled={directPhone.length < 8}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-0 disabled:scale-90 shadow-lg shadow-cyan-500/20"
                                                    title="Iniciar Conversa"
                                                >
                                                    <Send size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-2 mt-2 space-y-2 mb-4">
                                            <div className="px-2">
                                                <button
                                                    onClick={() => setIsQuickVisitOpen(!isQuickVisitOpen)}
                                                    className={`w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl transition-all border font-black tracking-widest
                                                        ${isQuickVisitOpen
                                                            ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white'
                                                            : 'btn-cyber-primary'}`}
                                                >
                                                    {isQuickVisitOpen ? (
                                                        <> <X size={16} /> Cancelar Agendamento </>
                                                    ) : (
                                                        <> <CalendarIcon size={16} strokeWidth={2.5} /> Agendar Visita </>
                                                    )}
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {isQuickVisitOpen && (
                                                    <div className="px-4 mt-2">
                                                        <QuickVisitForm onClose={() => setIsQuickVisitOpen(false)} />
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Tab Veículos - Filtros Premium */}
                                        <div className="space-y-3 mb-6 p-4 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl">
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <Filter size={12} className="text-orange-500" />
                                                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Filtrar Catálogo</span>
                                            </div>

                                            <div className="space-y-2.5">
                                                {/* Busca por Nome */}
                                                <div className="relative group/input">
                                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-orange-400 transition-colors" size={14} />
                                                    <input
                                                        type="text"
                                                        placeholder="Qual veículo procura?"
                                                        value={searchEstoque}
                                                        onChange={(e) => setSearchEstoque(e.target.value)}
                                                        className="w-full bg-white/5 text-xs text-white pl-10 pr-4 py-3 rounded-2xl border border-white/10 outline-none focus:border-orange-500/50 focus:bg-orange-500/5 transition-all placeholder:text-gray-600 font-bold"
                                                    />
                                                </div>

                                                {/* Preço Máximo */}
                                                <div className="relative group/input">
                                                    <CircleDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={14} />
                                                    <input
                                                        type="number"
                                                        placeholder="Preço Máximo (Opcional)"
                                                        value={priceLimit}
                                                        onChange={(e) => setPriceLimit(e.target.value)}
                                                        className="w-full bg-white/5 text-xs text-white pl-10 pr-4 py-3 rounded-2xl border border-white/10 outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all placeholder:text-gray-600 font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar pb-20">
                                            {filteredEstoque.map(car => (
                                                <CarCard
                                                    key={car.id || car.nome}
                                                    car={car}
                                                    loadingCar={loadingCar}
                                                    onSendPhotos={handleSendPhotos}
                                                    onSendInfo={handleSendInfo}
                                                    onPasteLink={handlePasteLink}
                                                />
                                            ))}
                                            {filteredEstoque.length === 0 && <div className="text-center text-gray-500 text-xs py-10">Nenhum veículo encontrado.</div>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modais */}
                <AnimatePresence>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsAddModalOpen(false)}
                                className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm pointer-events-auto"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-white tracking-tighter">Novo Script</h3>
                                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                        <X />
                                    </button>
                                </div>
                                <form onSubmit={handleAddScript} className="space-y-4">
                                    <input
                                        autoFocus
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 font-bold text-sm text-white"
                                        placeholder="TÍTULO DO ATALHO"
                                        value={newScript.titulo}
                                        onChange={e => setNewScript({ ...newScript, titulo: e.target.value.toUpperCase() })}
                                        required
                                    />
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 font-medium text-sm h-32 resize-none text-white"
                                        placeholder="MENSAGEM..."
                                        value={newScript.mensagem}
                                        onChange={e => setNewScript({ ...newScript, mensagem: e.target.value })}
                                        required
                                    />

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-gray-400 ml-4 tracking-widest uppercase">🔗 Link (Opcional)</label>
                                        <input type="url" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 font-medium text-sm" placeholder="https://exemplo.com" value={newScript.link} onChange={e => setNewScript({ ...newScript, link: e.target.value })} />
                                    </div>

                                    {(userRole === 'master' || userRole === 'developer' || userRole === 'admin') && (
                                        <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                                            <input type="checkbox" checked={newScript.isSystem} onChange={e => setNewScript({ ...newScript, isSystem: e.target.checked })} className="w-5 h-5 rounded accent-blue-500" />
                                            <div className="flex-1"><span className="font-bold text-sm text-white">🔒 Script do Sistema</span></div>
                                        </label>
                                    )}
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white text-xs  tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 border-t border-white/10">Salvar Script</button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isEditModalOpen && editingScript && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsEditModalOpen(false)}
                                className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm pointer-events-auto"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto"
                            >
                                <h3 className="text-xl font-black text-white mb-6">Editar Script</h3>
                                <form onSubmit={handleUpdateScript} className="space-y-4">
                                    <input
                                        autoFocus
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold text-sm text-white outline-none focus:border-blue-500"
                                        value={editingScript.titulo}
                                        onChange={e => setEditingScript({ ...editingScript, titulo: e.target.value.toUpperCase() })}
                                        required
                                    />
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-medium text-sm h-32 resize-none text-white outline-none focus:border-blue-500"
                                        value={editingScript.mensagem}
                                        onChange={e => setEditingScript({ ...editingScript, mensagem: e.target.value })}
                                        required
                                    />
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95">Atualizar</button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <NewVisitModal
                    isOpen={isVisitModalOpen}
                    onClose={() => setIsVisitModalOpen(false)}
                />

            </motion.div>
        </ErrorBoundary>
    );
};

export default Whatsapp;
