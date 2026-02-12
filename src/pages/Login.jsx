import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ChevronRight, AlertCircle, Mail, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ForcePasswordReset from '../components/ForcePasswordReset';
import { ToastContainer } from '../components/Toast';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [needsReset, setNeedsReset] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);

    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [toasts, setToasts] = useState([]);

    const [appVersion, setAppVersion] = useState('...');

    useEffect(() => {
        try {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-app-version').then(setAppVersion).catch(() => setAppVersion('v1.1.2'));
        } catch (e) {
            setAppVersion('v1.1.2');
        }
    }, []);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!username.trim() || !password.trim()) {
            addToast('Preencha todos os campos.', 'error');
            return;
        }

        setLoading(true);

        try {
            const { ipcRenderer } = window.require('electron');
            const user = await ipcRenderer.invoke('login', { username, password });

            if (user) {
                if (user.reset_password === 1) {
                    setPendingUser(user);
                    setNeedsReset(true);
                    setLoading(false);
                    return;
                }

                localStorage.setItem('username', user.username);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('sessionId', user.session_id);

                if (user.loja_id) {
                    localStorage.setItem('active_loja_id', user.loja_id);
                }

                onLogin(user);
            } else {
                addToast('Credenciais inválidas ou conta pausada.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Erro ao conectar ao servidor local.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        if (e) e.preventDefault();
        if (!forgotEmail.trim()) {
            addToast('Digite seu email.', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                redirectTo: 'http://localhost:5173/reset-password',
            });
            if (resetError) throw resetError;
            setForgotSent(true);
            addToast("Email de recuperação enviado!");
        } catch (err) {
            addToast(err.message || 'Erro ao enviar email de recuperação.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-[#01091e] overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-600/5 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute top-[20%] right-[0%] w-[50vw] h-[50vw] bg-cyan-500/5 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[420px] mx-4"
            >
                <div className="absolute -inset-[1px] rounded-[2.5rem] overflow-hidden z-0">
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_50%,#22d3ee_100%)] animate-[spin_4s_linear_infinite]" />
                </div>

                <div className="relative z-10 bg-[#01091e] rounded-[2.5rem] m-[1px] p-8 md:p-10 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center mb-8">
                        <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-500/10 blur-[60px] rounded-full" />
                        <div className="text-center group select-none py-4">
                            <div className="relative inline-block scale-110 md:scale-125 mb-12">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative flex flex-col items-center select-none group w-full"
                                >
                                    <div className="absolute inset-0 bg-cyan-500/10 blur-[80px] rounded-full scale-150 transition-all duration-1000" />
                                    <div className="relative flex justify-center items-center px-8">
                                        <h1 className="text-8xl md:text-9xl font-black italic tracking-tighter font-rajdhani leading-none absolute inset-0 text-black/40 blur-[6px] pointer-events-none text-center pr-4"
                                            style={{ transform: 'skewX(-6deg) translateY(6px)' }}>
                                            Vex
                                        </h1>
                                        <h1 className="text-8xl md:text-9xl font-black italic tracking-tighter font-rajdhani leading-none relative z-10 pr-6 text-center"
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
                                    <div className="mt-0 flex items-center justify-center gap-5 w-full opacity-95">
                                        <div className="h-[1.5px] flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-cyan-500/50 to-cyan-500/80" />
                                        <span className="text-[16px] font-black tracking-[1.2em] text-cyan-400 font-mono uppercase"
                                            style={{ marginRight: '-1.2em' }}>
                                            CORE
                                        </span>
                                        <div className="h-[1.5px] flex-1 max-w-[60px] bg-gradient-to-l from-transparent via-cyan-500/50 to-cyan-500/80" />
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {needsReset ? (
                        <ForcePasswordReset
                            username={pendingUser?.username}
                            onComplete={(newPass) => {
                                setNeedsReset(false);
                                if (newPass) setPassword(newPass);
                                // A g u a r d a o estado atualizar para disparar o login automático
                                setTimeout(() => {
                                    handleSubmit();
                                }, 100);
                            }}
                            onCancel={() => {
                                setNeedsReset(false);
                                setPendingUser(null);
                                setPassword('');
                            }}
                        />
                    ) : !showForgot ? (
                        <form onSubmit={handleSubmit} noValidate className="space-y-6 relative z-10">
                            <div className="group/input mb-5 relative">
                                <div className="relative bg-[#01091e] border border-white/10 hover:border-white/20 group-focus-within/input:border-cyan-500/50 rounded-2xl flex items-center transition-all h-14">
                                    <div className="pl-4 text-cyan-400 group-focus-within/input:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                                        <User size={22} strokeWidth={1.5} />
                                    </div>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="USUÁRIO / EMAIL"
                                        className="w-full bg-transparent text-white font-bold placeholder:text-gray-500 px-4 focus:outline-none tracking-wider text-base font-['Rajdhani']"
                                    />
                                </div>
                            </div>

                            <div className="group/input mb-2 relative">
                                <div className="relative bg-[#01091e] border border-white/10 hover:border-white/20 group-focus-within/input:border-cyan-500/50 rounded-2xl flex items-center transition-all h-14">
                                    <div className="pl-4 text-cyan-400 group-focus-within/input:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                                        <Lock size={22} strokeWidth={1.5} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="SUA SENHA"
                                        className="w-full bg-transparent text-white font-bold placeholder:text-gray-500 px-4 focus:outline-none tracking-wider text-base font-['Rajdhani']"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 pr-1">
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    className="text-xs font-bold text-gray-400 hover:text-cyan-400 transition-colors tracking-wider font-['Rajdhani'] uppercase"
                                >
                                    ESQUECI A SENHA
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full group/btn overflow-hidden rounded-2xl p-[1px] shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_10px_rgba(34,211,238,0.1)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-400 animate-[gradient_4s_ease_infinite] bg-[length:200%_200%]" />
                                <div className="relative bg-[#020617] bg-opacity-[0.92] backdrop-blur-md rounded-2xl px-6 py-3.5 flex items-center justify-center gap-2 group-hover/btn:bg-opacity-70 transition-all duration-500">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-sm font-extrabold text-white/90 tracking-[0.25em] group-hover/btn:text-white transition-all duration-500 uppercase font-sans group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5 transform origin-center inline-block">
                                                Acessar Sistema
                                            </span>
                                            <ArrowRight size={20} className="text-cyan-400 group-hover/btn:text-white group-hover/btn:translate-x-1.5 transition-all duration-500" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-6 relative z-10 text-left">
                            <button
                                type="button"
                                onClick={() => { setShowForgot(false); setForgotSent(false); }}
                                className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white transition-colors mb-2 group/back"
                            >
                                <div className="p-1 rounded-full bg-white/5 group-hover/back:bg-white/10 transition-colors">
                                    <ArrowLeft size={14} />
                                </div>
                                <span className="tracking-widest ">Voltar ao Login</span>
                            </button>

                            {!forgotSent ? (
                                <>
                                    <div className="space-y-1 text-center">
                                        <h3 className="text-xl font-bold text-white">Recuperar Acesso</h3>
                                        <p className="text-xs text-gray-400">Digite seu email cadastrado para continuar.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group/input">
                                            <div className="relative bg-[#020617]/60 border border-white/10 hover:border-white/20 group-focus-within/input:border-orange-500/50 rounded-2xl flex items-center transition-all">
                                                <div className="pl-4 text-gray-500 group-focus-within/input:text-orange-400 transition-colors">
                                                    <Mail size={20} strokeWidth={1.5} />
                                                </div>
                                                <input
                                                    type="email"
                                                    required
                                                    className="w-full bg-transparent border-none py-4 px-4 text-white text-sm font-bold placeholder-gray-600 focus:ring-0 outline-none"
                                                    placeholder="SEU@EMAIL.COM"
                                                    value={forgotEmail}
                                                    onChange={e => setForgotEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:brightness-110 active:scale-95 py-4 rounded-2xl font-black text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "ENVIAR EMAIL"}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-6 py-4">
                                    <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full mx-auto flex items-center justify-center animate-bounce">
                                        <CheckCircle size={40} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Email Enviado!</h3>
                                        <p className="text-xs text-gray-400 leading-relaxed px-4">
                                            Enviamos um link para <strong>{forgotEmail}</strong>. Verifique sua caixa de entrada (e spam).
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgot(false)}
                                        className="w-full bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/20 py-3 rounded-xl text-xs font-bold  tracking-widest text-gray-400 transition-all"
                                    >
                                        Voltar
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    <div className="mt-8 text-center relative z-10 opacity-60 hover:opacity-100 transition-opacity duration-300">
                        <p className="text-[11px] text-cyan-100 font-bold tracking-[0.2em] uppercase">
                            VexCORE &copy; 2026 <span className="mx-2 opacity-30">|</span> v{appVersion}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
