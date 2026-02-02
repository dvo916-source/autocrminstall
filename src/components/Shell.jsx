import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    BarChart3, Users, Car, Globe, Target, Bot,
    LogOut, UserCircle, MessageSquare,
    CheckCircle2, AlertCircle, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WhatsappService from './WhatsappService';

const Shell = ({ children, user, onLogout }) => {
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const location = useLocation();
    const isAdmin = user.role === 'admin' || user.role === 'master' || user.role === 'developer';
    const navigate = useNavigate();

    const [updateStatus, setUpdateStatus] = useState({ available: false, progress: 0, ready: false });
    const [unseenCount, setUnseenCount] = useState(0); // Estado para o contador do Zap

    // --- Lógica Auto-Scale ---
    useEffect(() => {
        const adjustScale = () => {
            const width = window.innerWidth;
            if (width > 2500) {
                document.body.style.zoom = Math.min(width / 1920, 1.5);
            } else {
                document.body.style.zoom = '1';
            }
        };
        adjustScale();
        window.addEventListener('resize', adjustScale);

        // Listener para Atualização de Badge do Whatsapp
        const handleBadgeUpdate = (e) => {
            const count = e.detail || 0;
            console.log('🔔 Badge Update:', count);
            setUnseenCount(count);
        };
        window.addEventListener('whatsapp-badge-update', handleBadgeUpdate);

        return () => {
            window.removeEventListener('resize', adjustScale);
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

            const notifyHandler = (e) => {
                const { message, type = 'info', duration = 4000 } = e.detail;
                const id = Date.now();
                setNotifications(prev => [...prev, { id, message, type }]);
                setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), duration);
            };

            const updateAvail = () => setUpdateStatus(prev => ({ ...prev, available: true }));
            const updateProg = (e, percent) => setUpdateStatus(prev => ({ ...prev, progress: percent }));
            const updateReady = () => setUpdateStatus(prev => ({ ...prev, ready: true, available: false }));

            ipcRenderer.on('sync-status', syncHandler);
            ipcRenderer.on('update-available', updateAvail);
            ipcRenderer.on('update-progress', updateProg);
            ipcRenderer.on('update-downloaded', updateReady);
            window.addEventListener('show-notification', notifyHandler);

            return () => {
                ipcRenderer.removeListener('sync-status', syncHandler);
                ipcRenderer.removeListener('update-available', updateAvail);
                ipcRenderer.removeListener('update-progress', updateProg);
                ipcRenderer.removeListener('update-downloaded', updateReady);
                window.removeEventListener('show-notification', notifyHandler);
            };
        } catch (err) { console.error(err); }
    }, []);

    const handleInstallUpdate = () => {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('install-update');
    };

    const hasPermission = (path) => {
        if (isAdmin) return true;
        if (!user.permissions) return true;

        let perms = [];
        try {
            perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        } catch (e) { perms = []; }

        if (!Array.isArray(perms)) return false;
        return perms.includes(path);
    };

    const navItems = [
        { to: '/', label: 'DASHBOARD', icon: <BarChart3 size={22} strokeWidth={1.5} />, active: hasPermission('/') },
        { to: '/whatsapp', label: 'WHATSAPP', icon: <MessageSquare size={22} strokeWidth={1.5} />, active: hasPermission('/whatsapp') },
        { to: '/estoque', label: 'TABELA', icon: <Car size={22} strokeWidth={1.5} />, active: hasPermission('/estoque') },
        { to: '/agendamentos', label: 'AGENDA', icon: <Users size={22} strokeWidth={1.5} />, active: hasPermission('/agendamentos') },
        { to: '/visitas', label: 'VISITAS', icon: <Users size={22} strokeWidth={1.5} />, active: hasPermission('/visitas') },
        { to: '/metas', label: 'METAS', icon: <Target size={22} strokeWidth={1.5} />, active: hasPermission('/metas') },
        { to: '/portais', label: 'PORTAIS', icon: <Globe size={22} strokeWidth={1.5} />, active: hasPermission('/portais') },
        { to: '/ia-chat', label: 'IA CHAT', icon: <Bot size={22} strokeWidth={1.5} />, active: hasPermission('/ia-chat') },
        { to: '/usuarios', label: 'USUÁRIOS', icon: <Users size={22} strokeWidth={1.5} />, active: hasPermission('/usuarios') },
    ];

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
                animate={{ width: isSidebarHovered ? 240 : 80 }}
                onMouseEnter={() => setIsSidebarHovered(true)}
                onMouseLeave={() => setIsSidebarHovered(false)}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                // Z-index: 50 para garantir que sombras fiquem sobre o conteúdo
                // Position: Relative para OCUPAR espaço e empurrar o vizinho
                className="relative z-50 h-full flex flex-col justify-between bg-[#0f172a] border-r border-[#ffffff10] shadow-2xl shrink-0 overflow-hidden pt-4 lg:pt-8"
            >
                {/* Header Customizado - Logo CSS */}
                <div
                    className="h-20 flex items-center justify-center shrink-0 bg-[#00000033] relative overflow-hidden group select-none"
                >
                    {/* Efeito de brilho ambiente */}
                    <div className="absolute inset-0 bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-colors duration-500" />

                    <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isSidebarHovered ? 'scale-100' : 'scale-75'}`}>
                        {/* SDR GRANDE com corte */}
                        <div className="relative leading-none select-none">
                            <h1 className="text-5xl font-bold italic tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] font-rajdhani"
                                style={{ transform: 'skewX(-6deg)' }}>
                                IRW
                            </h1>
                            {/* O Corte Diagonal */}
                            <div className="absolute top-[45%] -left-2 -right-2 h-[3px] bg-[#0f172a] -rotate-[15deg] transform border-y border-cyan-900/30 pointer-events-none" />
                        </div>

                        {/* IRW MOTORS */}
                        <div className={`flex items-center gap-1 mt-1 transition-all duration-300 ${isSidebarHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} delay-75`}>
                            <span className="text-[10px] font-bold tracking-[0.3em] text-cyan-200/70 text-center whitespace-nowrap font-rajdhani">
                                IRW MOTORS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navegação */}
                <nav className="flex-1 flex flex-col justify-center gap-2 px-3 py-6 overflow-y-auto no-scrollbar">
                    {navItems.filter(item => item.active).map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                relative flex items-center h-11 rounded-xl transition-all duration-300 group/item overflow-hidden shrink-0
                                ${isActive
                                    ? 'bg-[#22d3ee15] text-[#22d3ee] border border-[#22d3ee30] shadow-[0_0_15px_-5px_rgba(34,211,238,0.3)]'
                                    : 'text-slate-400 hover:text-white hover:bg-[#ffffff08] border border-transparent'}
                            `}
                        >
                            <div className="absolute left-0 w-[80px] h-full flex items-center justify-center shrink-0 z-20">
                                {item.label === 'WHATSAPP' && unseenCount > 0 ? (
                                    <div className="relative flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
                                        <MessageSquare size={26} className={`${unseenCount >= 10 ? 'text-red-500 fill-red-500/20 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`} strokeWidth={2} />
                                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black leading-none pb-0.5 ${unseenCount >= 10 ? 'text-white' : 'text-white'}`}>
                                            {unseenCount > 99 ? '99+' : unseenCount}
                                        </span>
                                    </div>
                                ) : (
                                    item.icon
                                )}
                            </div>
                            <div className={`pl-[70px] flex items-center h-full w-full transition-all duration-300 ${isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
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

                {/* Footer */}
                <div className="p-3 border-t border-[#ffffff10] bg-[#00000066]">
                    <div className="flex flex-col gap-2">
                        {/* User Profile Container */}
                        <div className={`flex items-center p-1.5 rounded-2xl border transition-all duration-500 overflow-hidden relative group/user ${isAdmin ? 'bg-cyan-950/30 border-cyan-500/20 hover:bg-cyan-900/40 hover:border-cyan-500/40' : 'bg-orange-950/20 border-orange-500/20 hover:bg-orange-900/30 hover:border-orange-500/40'}`}>

                            {/* Initials - Glassy Neon Style */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 z-20 relative backdrop-blur-sm ${isAdmin ? 'bg-cyan-500/10 border-cyan-400/30 group-hover:border-cyan-400/60 shadow-[0_0_15px_-5px_rgba(34,211,238,0.3)]' : 'bg-orange-500/10 border-orange-400/30 group-hover:border-orange-400/60 shadow-[0_0_15px_-5px_rgba(251,146,60,0.3)]'}`}>
                                <span className={`text-xl font-black font-rajdhani pt-0.5 drop-shadow-md transition-colors ${isAdmin ? 'text-cyan-400 group-hover:text-cyan-300' : 'text-orange-400 group-hover:text-orange-300'}`}>
                                    {(user.username || 'User').charAt(0)}
                                </span>
                            </div>

                            {/* Name Reveal - Completando a escrita */}
                            <div className={`flex flex-col justify-center h-10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSidebarHovered ? 'opacity-100 translate-x-0 pl-3 pr-2 w-auto' : 'opacity-0 -translate-x-10 w-0 overflow-hidden'}`}>
                                <span className="text-lg font-bold font-rajdhani text-white leading-none tracking-tight whitespace-nowrap pt-1 flex">
                                    {(user.username || 'User').split('@')[0].slice(1)}
                                </span>
                                <span className={`text-[9px] font-black  tracking-[0.2em] leading-none mt-0.5 whitespace-nowrap ${isAdmin ? 'text-cyan-400' : 'text-orange-400'}`}>
                                    {isAdmin ? 'Administrator' : 'Executive SDR'}
                                </span>
                            </div>
                        </div>

                        <button onClick={onLogout} className="flex items-center gap-3 h-10 px-2 rounded-xl text-slate-500 hover:text-red-400 transition-colors overflow-hidden group">
                            <div className="w-10 flex justify-center shrink-0"><LogOut size={20} className="group-hover:scale-110 transition-transform" /></div>
                            <span className={`text-[10px] font-bold tracking-widest transition-all duration-300 ${isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>SAIR</span>
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* CONTEÚDO PRINCIPAL (Flex 1) */}
            <main className="flex-1 min-w-0 h-full relative z-0 flex flex-col bg-[#0f172a] overflow-hidden">

                {/* SERVIÇO WHATSAPP "ALWAYS ON" - Inicia com delay e fica vivo em background */}
                <WhatsappService
                    isVisible={location.pathname === '/whatsapp'}
                    isActive={location.pathname === '/whatsapp'}
                />

                <div className={`flex-1 flex flex-col relative w-full h-full ${location.pathname === '/whatsapp' ? 'p-0 text-white' : 'p-6 lg:p-8 overflow-y-auto custom-scrollbar'}`}>
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
                                className={`flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl border pointer-events-auto min-w-[320px] backdrop-blur-xl ${notif.type === 'success' ? 'bg-[#022c22cc] border-[#10b9814d] text-[#34d399]' :
                                    notif.type === 'error' ? 'bg-[#450a0acc] border-[#ef44444d] text-[#f87171]' :
                                        'bg-[#172554cc] border-[#3b82f64d] text-[#60a5fa]'
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

                {/* Update Notification */}
                <AnimatePresence>
                    {updateStatus.available && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="fixed bottom-6 right-6 bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl z-[9999] w-80"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white">Atualização Disponível</span>
                                <span className="text-[10px] font-mono text-cyan-400">{Math.round(updateStatus.progress)}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${updateStatus.progress}%` }} />
                            </div>
                            {updateStatus.ready && (
                                <button onClick={handleInstallUpdate} className="mt-3 w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg text-xs  tracking-wide transition-colors">
                                    Reiniciar Agora
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Shell;
