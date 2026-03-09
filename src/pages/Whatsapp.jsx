import { MessageSquare, MessageCircle, Smartphone, ListCheck, Plus, Trash2, Send, Star, X, Car, Search, ExternalLink, Image as ImageIcon, Edit2, GripVertical, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Calendar, Gauge, CircleDollarSign, Filter } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useUI } from '../context/UIContext';
import { useLoja } from '../context/LojaContext';
import { useLeads } from '../context/LeadsContext'; // 🔥 Cérebro de Leads
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import NewVisitModal from '../components/NewVisitModal';
import PremiumSelect from '../components/PremiumSelect'; // 🔥 Dropdown Premium
import { cleanVehicleName } from '../lib/utils';
import CarCard from '../components/Whatsapp/CarCard';
import { AddScriptModal, EditScriptModal } from '../components/Whatsapp/ScriptModals';
import { WorkspaceControls } from '../components/Whatsapp/WorkspaceControls';
import { get, set } from 'idb-keyval'; // ⚡ Cache Local
import { electronAPI } from '@/lib/electron-api';

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




const Whatsapp = () => {
    const { currentLoja } = useLoja();
    const { performanceMode } = useUI();
    const { filteredLeads, estoque: brainEstoque } = useLeads(); // 🔥 Puxando Leads do Cérebro
    const location = useLocation();
    const navigate = useNavigate();
    const [scripts, setScripts] = useState([]);
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

    // 🔥 MOTOR CROSS-ROUTING: Recebe o clique vindo lá dos cards do CRM
    useEffect(() => {
        if (location.state && location.state.action === 'open-chat' && location.state.phone) {
            const phone = location.state.phone;

            const performChatOpen = async () => {
                // Aguarda 1.2s para garantir que o painel interno do Zap terminou de carregar na tela
                await new Promise(r => setTimeout(r, 1200));

                // Dispara a mágica do Anti-Reload silencioso no Webview
                const scriptAntiReload = `
                    (function() {
                        try {
                            const link = document.createElement('a');
                            link.href = 'https://api.whatsapp.com/send/?phone=${phone}';
                            link.target = '_self';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } catch(err) {}
                    })();
                `;
                window.dispatchEvent(new CustomEvent('whatsapp-execute-script', { detail: { script: scriptAntiReload } }));
                window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Abrindo conversa do CRM...', type: 'info' } }));
            };

            performChatOpen();
            // Limpa o estado da memória para não ficar repetindo ao navegar
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);


    const pasteToWhatsapp = useCallback((text) => {
        // Dispara evento para o Service colar texto
        window.dispatchEvent(new CustomEvent('whatsapp-send-text', { detail: text }));
    }, []);

    // Função avançada para injetar fotos diretamente (Via Service)
    const sendPhotosToWhatsapp = async (fotosRaw) => {
        try {

            const fotosArray = typeof fotosRaw === 'string' ? JSON.parse(fotosRaw) : fotosRaw;

            if (!fotosArray || fotosArray.length === 0) return;

            // Busca todas as fotos em paralelo
            const base64Promises = fotosArray.map(url =>
                electronAPI.getImageBase64(url).catch(e => null)
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
        electronAPI.onSyncStatus(handleRefresh);
        electronAPI.onRefreshData(handleRefresh);

        return () => {
            clearTimeout(refreshTimeout);
            // Managed by electronAPI cleanup;
            // Managed by electronAPI.onRefreshData unsubscribe;
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
                    const cachedScripts = await get(`scripts-cache-${lojaId}`);

                    if (cachedScripts && Array.isArray(cachedScripts)) {
                        console.log(`⚡ [Cache] Carregados ${cachedScripts.length} scripts`);
                        setScripts(cachedScripts);
                    }
                } catch (e) { console.warn('Erro leitura cache Whatsapp:', e); }
            }

            const scriptsData = await electronAPI.getScripts(username, lojaId);

            if (scriptsData) {
                setScripts(scriptsData);
                set(`scripts-cache-${lojaId}`, scriptsData).catch(console.error);
            }
        } catch (err) {
            console.error('❌ [Whatsapp] Erro ao carregar scripts:', err);
        }
    };

    // 🔥 MOTOR BLINDADO ANTI-RELOAD DE CONVERSA RÁPIDA
    const handleStartDirectChat = useCallback((e) => {
        if (e) {
            e.preventDefault(); // Impede o formulário HTML de piscar
            e.stopPropagation();
        }

        if (directPhone.length >= 8) {
            let numeroLimpo = directPhone.replace(/\D/g, '');
            if (!numeroLimpo.startsWith('55')) numeroLimpo = '55' + numeroLimpo;

            // 1. INJEÇÃO DE SCRIPT (A Mágica do Sem-Recarregar)
            // Isso cria um link invisível dentro do WhatsApp e clica nele, acionando a troca de conversa instantânea!
            const scriptAntiReload = `
                (function() {
                    try {
                        const link = document.createElement('a');
                        link.href = 'https://api.whatsapp.com/send/?phone=${numeroLimpo}';
                        link.target = '_self';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } catch(err) {}
                })();
            `;
            window.dispatchEvent(new CustomEvent('whatsapp-execute-script', { detail: { script: scriptAntiReload } }));

            // 2. Emite o evento padrão do sistema como segurança (Motor de Busca do Service)
            window.dispatchEvent(new CustomEvent('whatsapp-direct-chat', { detail: numeroLimpo }));

            window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Iniciando conversa...', type: 'info' } }));

            setDirectPhone(''); // Limpa o input
        }
    }, [directPhone]);

    const handleAddScript = async (e) => {
        e.preventDefault();
        if (!newScript.titulo || !newScript.mensagem) return;
        try {

            const username = localStorage.getItem('username');

            await electronAPI.addScript({
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

            const username = localStorage.getItem('username');

            await electronAPI.updateScript({
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

            const username = localStorage.getItem('username');

            await electronAPI.deleteScript({
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

                const fresh = await electronAPI.scrapCarDetails({ nome: car.nome, url: car.link });
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
        const query_filtered = (searchEstoque || "").toLowerCase();
        const limit = parseInt(priceLimit);

        const source = brainEstoque || [];

        const filtered = source.filter(car => {
            if (!car || !car.nome) return false;
            const matchesSearch = car.nome.toLowerCase().includes(query_filtered);
            const carPrice = parsePrice(car.valor);
            const matchesPrice = !priceLimit || isNaN(limit) || carPrice <= limit;
            const ativoOk = car.ativo !== 0;

            return matchesSearch && matchesPrice && ativoOk;
        });

        return filtered;
    }, [brainEstoque, searchEstoque, priceLimit, parsePrice]);

    // Separa scripts para facilitar o Drag and Drop
    const systemScripts = scripts.filter(s => s.is_system === 1);
    const userScripts = scripts.filter(s => s.is_system !== 1);

    const handleReorder = (newUserScripts) => {
        const newFullList = [...systemScripts, ...newUserScripts];
        setScripts(newFullList);
        const orderUpdate = newFullList.map((script, index) => ({ id: script.id, ordem: index }));

        electronAPI.updateScriptsOrder(orderUpdate).catch(console.error);
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
                    type="button"
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
                            {/* 🔥 HEADER E TABS PREMIUM */}
                            <div className="shrink-0 mb-6">
                                <div className="flex items-center justify-between px-1 mb-1">
                                    <div>
                                        <h2 className="text-lg font-black text-white tracking-[0.15em] uppercase flex items-center gap-2.5">
                                            <span className="w-1.5 h-5 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full block shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
                                            {activeTab === 'veiculos' ? 'WORKSPACE' : 'MENSAGENS'}
                                        </h2>
                                        <p className="text-[9px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1 ml-4">
                                            {activeTab === 'veiculos' ? 'Central de Atendimento' : 'Scripts e Atalhos'}
                                        </p>
                                    </div>

                                    {activeTab === 'templates' && (
                                        <button onClick={() => setIsAddModalOpen(true)} className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition-all border border-cyan-500/20 shadow-lg" title="Novo Script">
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>

                                {/* Tabs / Segmented Control */}
                                <div className="bg-[#0a101d] p-1.5 rounded-[1.25rem] flex gap-1 border border-white/5 shadow-inner mt-4">
                                    <button
                                        onClick={() => setActiveTab('veiculos')}
                                        className={`flex-1 flex items-center justify-center gap-2 transition-all rounded-xl py-2.5 text-[10px] font-black tracking-widest uppercase ${activeTab === 'veiculos' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_4px_15px_rgba(6,182,212,0.3)] border border-cyan-400/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                                    >
                                        <Smartphone size={13} className={activeTab === 'veiculos' ? 'text-cyan-200' : 'opacity-60'} />
                                        Operação
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('templates')}
                                        className={`flex-1 flex items-center justify-center gap-2 transition-all rounded-xl py-2.5 text-[10px] font-black tracking-widest uppercase ${activeTab === 'templates' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] border border-purple-400/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                                    >
                                        <MessageSquare size={13} className={activeTab === 'templates' ? 'text-purple-200' : 'opacity-60'} />
                                        Scripts
                                    </button>
                                </div>
                            </div>

                            {/* Conteúdo Tabs */}
                            <div className="flex-1 min-h-0 space-y-3 flex flex-col">
                                {activeTab === 'templates' ? (
                                    <>



                                        <div className="flex-1 min-h-0 space-y-2 mt-4 overflow-y-auto pr-2 custom-scrollbar">
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
                                    <div className="flex flex-col h-full">
                                        <WorkspaceControls
                                            directPhone={directPhone} setDirectPhone={setDirectPhone}
                                            handleStartDirectChat={handleStartDirectChat}
                                            isQuickVisitOpen={isQuickVisitOpen} setIsQuickVisitOpen={setIsQuickVisitOpen}
                                            searchEstoque={searchEstoque} setSearchEstoque={setSearchEstoque}
                                            priceLimit={priceLimit} setPriceLimit={setPriceLimit}
                                        />

                                        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2 custom-scrollbar pb-20">
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modais */}
                <AddScriptModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} newScript={newScript} setNewScript={setNewScript} onSubmit={handleAddScript} userRole={userRole} />
                <EditScriptModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editingScript={editingScript} setEditingScript={setEditingScript} onSubmit={handleUpdateScript} />

                <NewVisitModal
                    isOpen={isVisitModalOpen}
                    onClose={() => setIsVisitModalOpen(false)}
                />

            </motion.div >
        </ErrorBoundary >
    );
};

export default Whatsapp;
