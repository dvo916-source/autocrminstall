import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    BarChart3, Users, Car, Globe, Target, Bot,
    LogOut, UserCircle, MessageSquare,
    CheckCircle2, AlertCircle, Info, X, Calendar, Store, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoja } from '../context/LojaContext';
import WhatsappService from './WhatsappService';
import ConnectionStatus from './ConnectionStatus';

const Shell = ({ children, user, onLogout }) => {
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const { currentLoja } = useLoja();

    const location = useLocation();
    const isAdmin = user?.role === 'admin' || user?.role === 'master' || user?.role === 'developer';
    const navigate = useNavigate();

    const [unseenCount, setUnseenCount] = useState(0); // Estado para o contador do Zap
    const [appVersion, setAppVersion] = useState('...');

    useEffect(() => {
        try {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-app-version').then(v => setAppVersion(v)).catch(() => setAppVersion('1.1.2'));
        } catch (e) { setAppVersion('1.1.2'); }
    }, []);

    // --- Lógica Auto-Scale ---
    useEffect(() => {
        // Listener para Atualização de Badge do Whatsapp
        const handleBadgeUpdate = (e) => {
            const count = e.detail || 0;
            console.log('🔔 Badge Update:', count);
            setUnseenCount(count);
        };
        window.addEventListener('whatsapp-badge-update', handleBadgeUpdate);

        return () => {
            window.removeEventListener('whatsapp-badge-update', handleBadgeUpdate);
        };
    }, []);

    // --- Electron Listeners ---
    useEffect(() => {
        try {
            const { ipcRenderer } = window.require('electron');

            // Trigger Sync (Fire and forget, let notifications handle status)
            ipcRenderer.invoke('sync-essential').catch(err => console.error("Sync Error:", err));

            const syncHandler = (e, { loading }) => setIsSyncing(loading);

            const notifyHandler = (e, detail) => {
                const messageObj = detail?.detail || detail; // Handle both IPC and CustomEvent patterns
                const { message, type = 'info', duration = 4000 } = messageObj;
                const id = Date.now();
                setNotifications(prev => [...prev, { id, message, type }]);
                setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), duration);
            };

            ipcRenderer.on('show-notification', notifyHandler);
            window.addEventListener('show-notification', notifyHandler);

            return () => {
                ipcRenderer.removeListener('sync-status', syncHandler);
                ipcRenderer.removeListener('update-available', updateAvail);
                ipcRenderer.removeListener('update-progress', updateProg);
                ipcRenderer.removeListener('update-downloaded', updateReady);
                ipcRenderer.removeAllListeners('show-notification');
                window.removeEventListener('show-notification', notifyHandler);
            };
        } catch (err) { console.error(err); }
    }, []);


    const hasPermission = (path) => {
        // Developer has absolute access
        if (user.role === 'developer') return true;

        // Master access by default
        if (user.role === 'master' || user.role === 'admin') return true;

        if (!user.permissions || user.permissions === '[]') return false;

        let perms = [];
        try {
            perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        } catch (e) { perms = []; }

        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { }
        }
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { }
        }

        if (!Array.isArray(perms)) return false;

        // Restrição de loja para usuários não-developers (Segurança redundante)
        if (user.role !== 'developer' && user.loja_id && currentLoja?.id) {
            if (user.loja_id.toLowerCase() !== currentLoja.id.toLowerCase()) {
                console.log(`🚫 [Shell] Bloqueio por Loja ID: User(${user.loja_id}) !== Current(${currentLoja.id})`);
                return false;
            }
        }

        const isRootPath = path === '/' || path === '/diario';
        const permsMatch = perms.includes(path);

        return permsMatch || isRootPath;
    };

    const navItems = [];
    const { clearLoja } = useLoja(); // Pegamos a função de limpar loja

    if (user.role === 'developer') {
        // Se for developer e NÃO tiver loja selecionada, ele vê o link da Central
        if (!currentLoja) {
            navItems.push({ to: '/central-lojas', label: 'CENTRAL DE LOJAS', icon: <Store className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'central-lojas' });
        } else {
            // Se ele JÁ ESTIVER dentro de uma loja, mostramos o botão de SAIR da loja e voltar à central
            navItems.push({
                to: '#',
                label: 'VOLTAR À CENTRAL',
                icon: <ArrowLeft className="w-[1.375rem] h-[1.375rem] text-orange-400 animate-pulse" strokeWidth={1.5} />,
                onClick: () => {
                    clearLoja();
                    navigate('/central-lojas');
                },
                module: 'back-to-central'
            });
        }
    }

    navItems.push(
        { to: '/diario', label: 'MEU DIÁRIO', icon: <Calendar className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'diario' },
        { to: '/dashboard', label: 'DASHBOARD', icon: <BarChart3 className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'dashboard' },
        { to: '/whatsapp', label: 'WHATSAPP', icon: <MessageSquare className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'whatsapp' },
        { to: '/estoque', label: 'TABELA', icon: <Car className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'estoque' },
        { to: '/visitas', label: 'VISITAS', icon: <Users className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'visitas' },
        { to: '/metas', label: 'METAS', icon: <Target className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'metas' },
        { to: '/portais', label: 'PORTAIS', icon: <Globe className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'portais' },
        { to: '/ia-chat', label: 'IA CHAT', icon: <Bot className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'ia-chat' },
        { to: '/usuarios', label: 'USUÁRIOS', icon: <Users className="w-[1.375rem] h-[1.375rem]" strokeWidth={1.5} />, module: 'usuarios' }
    );

    const filteredNavItems = navItems.filter(item => {
        try {
            // 🔓 ADMIN/MASTER DEVELOPER: No filter for Central Lojas and internal tools
            const internalModules = ['central-lojas', 'back-to-central'];
            if (internalModules.includes(item.module)) return true;

            // 🏪 MÓDULOS DA LOJA: Verifica se o módulo está ativo no plano da loja
            const lojaModulosRaw = currentLoja?.modulos;

            // Se o desenvolvedor NÃO selecionou uma loja, ele não vê módulos operacionais (barra vazia/limpa)
            if (user.role === 'developer' && !currentLoja) return false;

            // Se não houver loja selecionada ou módulos definidos
            if (!currentLoja || !lojaModulosRaw) return user.role === 'developer';

            let enabledModules = [];
            let raw = lojaModulosRaw;
            if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { } }
            if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { } }
            if (Array.isArray(raw)) enabledModules = raw;

            const moduleEnabled = enabledModules.includes(item.module);

            if (!moduleEnabled) return false;

            // 👑 DEVELOPER/MASTER: Sempre vêem tudo
            if (user.role === 'developer' || user.role === 'master' || user.role === 'admin') return true;

            // 👤 USUÁRIO COMUM: Verifica se tem permissão individual
            return hasPermission(item.to);

        } catch (e) {
            console.error('Erro ao filtrar módulos:', e);
            return false;
        }
    });

    // 🔒 Bloqueio de Expansão (Sidebar Fixa) para Developers sem loja ativa
    const isSidebarLocked = user.role === 'developer' && !currentLoja;

    return (
        // MESTRE FLEXBOX
        <div className="flex h-screen w-screen bg-[#0f172a] text-white overflow-hidden font-inter selection:bg-cyan-500/30">

            {/* Background Vistoso */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#2563eb] blur-[150px] opacity-5 rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#0891b2] blur-[150px] opacity-5 rounded-full" />
            </div>

            {/* SIDEBAR - Coluna Sólida (Sem 'Fixed') */}
            <motion.aside
                initial={false}
                animate={{ width: (isSidebarHovered && !isSidebarLocked) ? 'var(--sidebar-expanded-width)' : 'var(--sidebar-width)' }}
                onMouseEnter={() => !isSidebarLocked && setIsSidebarHovered(true)}
                onMouseLeave={() => setIsSidebarHovered(false)}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                // Z-index: 50 para garantir que sombras fiquem sobre o conteúdo
                // Position: Relative para OCUPAR espaço e empurrar o vizinho
                className="relative z-50 h-full flex flex-col justify-between bg-[#0f172a] border-r border-[#ffffff10] shadow-2xl shrink-0 overflow-hidden pt-4"
            >
                {/* Header Customizado - Logo CSS */}
                <div
                    className="h-20 flex items-center justify-center shrink-0 bg-[#00000033] relative overflow-hidden group select-none"
                >
                    {/* Efeito de brilho ambiente */}
                    <div className="absolute inset-0 bg-cyan-500/5 blur-xl transition-colors duration-500" />

                    <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isSidebarHovered ? 'scale-100' : 'scale-75'}`}>
                        {/* Vex Final Premium - No Clipping */}
                        <div className="relative flex flex-col items-center select-none scale-75 lg:scale-95 origin-center w-full">
                            <div className="relative flex justify-center items-center px-4">
                                <h1 className="text-5xl font-bold italic tracking-tighter font-rajdhani leading-none pr-3 text-center"
                                    style={{
                                        transform: 'skewX(-6deg)',
                                        background: 'linear-gradient(180deg, #fff 0%, #a5f3fc 20%, #22d3ee 45%, #0ea5e9 65%, #0369a1 85%, #083344 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundSize: '100% 120%'
                                    }}>
                                    Vex
                                </h1>
                            </div>

                            {/* Monospace CORE Subtitle (Larger & Closer) */}
                            <div className="mt-0 flex items-center justify-center w-full">
                                <span className="text-[9px] font-black tracking-[0.8em] text-cyan-400 font-mono uppercase opacity-90 text-center"
                                    style={{ marginRight: '-0.8em' }}>
                                    CORE
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navegação */}
                <nav className="flex-1 flex flex-col justify-center gap-2 px-3 py-6 overflow-y-auto no-scrollbar">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            onClick={(e) => {
                                if (item.onClick) {
                                    e.preventDefault();
                                    item.onClick();
                                }
                            }}
                            className={({ isActive }) => `
                                relative flex items-center h-11 rounded-xl transition-all duration-300 group/item overflow-hidden shrink-0 focus:outline-none
                                ${isActive && item.to !== '#'
                                    ? 'bg-[#22d3ee15] text-[#22d3ee] border border-[#22d3ee30] shadow-[0_0_15px_-5px_rgba(34,211,238,0.3)]'
                                    : 'text-slate-400 hover:text-white hover:bg-[#ffffff08] border border-transparent'}
                            `}
                        >
                            <div className="absolute left-0 w-[var(--sidebar-width)] h-full flex items-center justify-center shrink-0 z-20">
                                {item.label === 'WHATSAPP' && unseenCount > 0 ? (
                                    <div className="relative flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
                                        <MessageSquare className={`w-[1.625rem] h-[1.625rem] ${unseenCount >= 10 ? 'text-red-500 fill-red-500/20 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`} strokeWidth={2} />
                                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black leading-none pb-0.5 ${unseenCount >= 10 ? 'text-white' : 'text-white'}`}>
                                            {unseenCount > 99 ? '99+' : unseenCount}
                                        </span>
                                    </div>
                                ) : (
                                    item.icon
                                )}
                            </div>
                            <div className={`pl-[var(--sidebar-width)] flex items-center h-full w-full transition-all duration-300 ${isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                                <span className="text-sm font-bold tracking-wide  whitespace-nowrap">
                                    {item.label}
                                </span>
                            </div>

                            {item.to === location.pathname && (
                                <div className={`absolute left-3 top-2.5 bottom-2.5 w-1 rounded-full transition-all duration-300
                                    ${item.label === 'WHATSAPP' && unseenCount >= 10
                                        ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                                        : 'bg-[#22d3ee] shadow-[0_0_10px_cyan]'}
                                `} />
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer - Sólido e Ultra-Leve */}
                <div className="mt-auto border-t border-white/5 bg-transparent">
                    <div className="flex flex-col py-6">
                        {/* Profile Section */}
                        <div className="flex items-center h-11 group/user relative">
                            <div className="absolute left-0 w-[var(--sidebar-width)] h-full flex items-center justify-center shrink-0">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border
                                    ${isAdmin ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                                    <span className="text-lg font-black font-rajdhani">
                                        {(user?.username || 'U').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className={`pl-[var(--sidebar-width)] flex flex-col justify-center transition-all duration-200
                                ${isSidebarHovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                                <span className="text-[13px] font-black text-white leading-none uppercase tracking-wide truncate max-w-[140px]">
                                    {user?.nome_completo || user?.nome || user?.username || 'VexCORE'}
                                </span>
                                <span className={`text-[8px] font-black mt-1 tracking-widest uppercase opacity-40 ${isAdmin ? 'text-cyan-400' : 'text-orange-400'}`}>
                                    {user?.role || 'Acesso VexCORE'}
                                </span>
                            </div>
                        </div>

                        {/* Logout Section */}
                        <button
                            onClick={onLogout}
                            className="flex items-center h-11 text-slate-500 hover:text-red-400 transition-colors group/logout relative"
                        >
                            <div className="absolute left-0 w-[var(--sidebar-width)] h-full flex items-center justify-center shrink-0">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <span className={`pl-[var(--sidebar-width)] text-[10px] font-black tracking-[0.15em] transition-all duration-200
                                ${isSidebarHovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                                SAIR DA CONTA
                            </span>
                        </button>

                        {/* Version Info */}
                        <div className={`mt-2 px-6 transition-opacity duration-200 ${isSidebarHovered ? 'opacity-20' : 'opacity-0'}`}>
                            <p className="text-[9px] font-black tracking-widest text-white">V{appVersion}</p>
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* CONTEÚDO PRINCIPAL (Flex 1) */}
            <main className={`flex-grow min-w-0 h-full relative z-0 flex overflow-hidden transition-colors duration-500 ${location.pathname === '/whatsapp' ? 'bg-transparent' : 'flex-col bg-[#0f172a]'}`}>

                {/* SERVIÇO WHATSAPP "ALWAYS ON" */}
                <WhatsappService
                    isVisible={location.pathname === '/whatsapp'}
                    isActive={location.pathname === '/whatsapp'}
                />

                <div
                    className={`flex-grow flex flex-col relative w-full h-full ${location.pathname === '/whatsapp' ? 'p-0 pointer-events-none' : 'overflow-y-auto custom-scrollbar'}`}
                    style={{ padding: location.pathname === '/whatsapp' ? '0' : 'var(--main-padding)' }}
                >
                    {children}
                </div>

                {/* Camada Notificações */}
                <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
                    <AnimatePresence>
                        {notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl border pointer-events-auto min-w-[320px] backdrop-blur-md ${notif.type === 'success' ? 'bg-[#022c22ee] border-[#10b9814d] text-[#34d399]' :
                                    notif.type === 'error' ? 'bg-[#450a0aee] border-[#ef44444d] text-[#f87171]' :
                                        'bg-[#172554ee] border-[#3b82f64d] text-[#60a5fa]'
                                    }`}
                            >
                                {notif.type === 'success' ? <CheckCircle2 size={24} /> : notif.type === 'error' ? <AlertCircle size={24} /> : <Info size={24} />}
                                <div className="flex-1">
                                    <p className="text-[10px] font-black  tracking-widest opacity-40 mb-1">Sistema</p>
                                    <p className="text-sm font-bold text-white leading-snug">{notif.message}</p>
                                </div>
                                <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} className="p-1 hover:bg-[#ffffff1a] rounded-lg transition-colors"><X size={18} /></button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>



            </main>
        </div>
    );
};

export default Shell;
