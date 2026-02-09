import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';

export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [supabaseStatus, setSupabaseStatus] = useState('checking'); // 'online', 'offline', 'checking'
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Verificar status do Supabase
        checkSupabaseConnection();
        const interval = setInterval(checkSupabaseConnection, 30000); // Verifica a cada 30s

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const checkSupabaseConnection = async () => {
        if (typeof navigator === 'undefined' || !navigator.onLine) {
            setSupabaseStatus('offline');
            return;
        }

        try {
            const response = await fetch('https://mtbfzimnyactwhdonkgy.supabase.co/rest/v1/', {
                method: 'HEAD',
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys'
                }
            });
            setSupabaseStatus(response.ok ? 'online' : 'offline');
        } catch {
            setSupabaseStatus('offline');
        }
    };

    const getStatusColor = () => {
        if (!isOnline) return 'bg-red-500';
        if (supabaseStatus === 'online') return 'bg-emerald-500';
        if (supabaseStatus === 'offline') return 'bg-amber-500';
        return 'bg-gray-500';
    };

    const getStatusText = () => {
        if (!isOnline) return 'Sem Internet';
        if (supabaseStatus === 'online') return 'Online';
        if (supabaseStatus === 'offline') return 'Nuvem Offline';
        return 'Verificando...';
    };

    const getStatusIcon = () => {
        if (!isOnline) return <WifiOff size={14} />;
        if (supabaseStatus === 'online') return <Cloud size={14} />;
        if (supabaseStatus === 'offline') return <CloudOff size={14} />;
        return <RefreshCw size={14} className="animate-spin" />;
    };

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]">
            <motion.button
                onClick={() => setShowDetails(!showDetails)}
                className={`${getStatusColor()} text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {getStatusIcon()}
                <span>{getStatusText()}</span>
            </motion.button>

            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full right-0 mb-3 bg-[#1d253a] border border-white/10 rounded-2xl p-4 shadow-2xl w-72"
                    >
                        <h3 className="text-white font-black text-sm mb-3 uppercase tracking-wider">Status da Conexão</h3>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Wifi size={16} className={isOnline ? 'text-emerald-400' : 'text-red-400'} />
                                    <span className="text-xs font-bold text-gray-300">Internet</span>
                                </div>
                                <span className={`text-xs font-black ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isOnline ? 'CONECTADO' : 'DESCONECTADO'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Cloud size={16} className={supabaseStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'} />
                                    <span className="text-xs font-bold text-gray-300">Nuvem (Supabase)</span>
                                </div>
                                <span className={`text-xs font-black ${supabaseStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {supabaseStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-[10px] text-blue-300 font-bold leading-relaxed">
                                {isOnline && supabaseStatus === 'online' && '✅ Tudo funcionando! Dados sendo sincronizados.'}
                                {isOnline && supabaseStatus === 'offline' && '⚠️ Nuvem offline. Dados salvos localmente.'}
                                {!isOnline && '📴 Modo Offline. Sincronização pausada.'}
                            </p>
                        </div>

                        <button
                            onClick={checkSupabaseConnection}
                            className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={12} />
                            Verificar Novamente
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
