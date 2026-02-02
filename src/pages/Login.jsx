import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ChevronRight, AlertCircle, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { ipcRenderer } = window.require('electron');
            // 'username' pode ser email ou username agora
            const user = await ipcRenderer.invoke('login', { username, password });

            if (user) {
                localStorage.setItem('username', user.username);
                localStorage.setItem('userRole', user.role);
                onLogin(user);
            } else {
                setError('Credenciais inválidas ou conta pausada.');
            }
        } catch (err) {
            setError('Erro ao conectar ao servidor local.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                redirectTo: 'http://localhost:5173/reset-password',
            });
            if (resetError) throw resetError;
            setForgotSent(true);
        } catch (err) {
            setError(err.message || 'Erro ao enviar email de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-[#01091e] overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* --- BACKGROUND SÓLIDO COM GLOWS FOCAIS --- */}
            {/* Removido gradiente geral para garantir cor exata #01091e */}

            {/* Orbs de Luz Neon (Mantidos mas sutis para ambiente) */}
            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-600/5 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute top-[20%] right-[0%] w-[50vw] h-[50vw] bg-cyan-500/5 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[420px] mx-4"
            >
                {/* --- NEON SPARK BORDER EFFECT (REFINADO) --- */}
                {/* Container da Animação de Borda */}
                <div className="absolute -inset-[1px] rounded-[2.5rem] overflow-hidden z-0">
                    {/* O "Cometa" Giratório - Agora com cauda transparente para fusão perfeita */}
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_50%,#22d3ee_100%)] animate-[spin_4s_linear_infinite]" />
                </div>

                {/* CARD "MONOLITHO" */}
                <div className="relative z-10 bg-[#01091e] rounded-[2.5rem] m-[1px] p-8 md:p-10 shadow-2xl overflow-hidden group">

                    {/* Efeitos de Borda (Glow interno sutil) */}
                    <div className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none" />

                    {/* Header: Logo & Título */}
                    <div className="relative z-10 flex flex-col items-center mb-8">
                        {/* Container da Logo (Imagem Original Pura) */}
                        <div className="relative w-32 h-32 mb-6 hover:scale-105 transition-transform duration-500 ease-out">
                            <img
                                src="./icon.png"
                                alt="SDR App Icon"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Título Estilizado com Fonte TECH (Rajdhani) */}
                        <div className="text-center">
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight " style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                                SDR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">IRW MOTORS</span>
                            </h1>
                            <p className="text-cyan-200/60 text-xs font-semibold tracking-[0.4em] mt-3 border-b border-cyan-500/20 pb-4 uppercase" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                                Intelligence Experience
                            </p>
                        </div>
                    </div>

                    {!showForgot ? (
                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            {/* Campo de Usuário */}
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

                            {/* Campo de Senha */}
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

                            {/* Link Esqueci a Senha */}
                            <div className="flex justify-end pt-2 pr-1">
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    className="text-xs font-bold text-gray-400 hover:text-cyan-400 transition-colors tracking-wider font-['Rajdhani'] uppercase"
                                >
                                    ESQUECI A SENHA
                                </button>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="flex items-center gap-4 p-4 mt-6 bg-red-950/30 border border-red-500/30 rounded-2xl shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] backdrop-blur-sm group/error"
                                >
                                    <div className="p-2 bg-red-500/10 rounded-full group-hover/error:bg-red-500/20 transition-colors shrink-0">
                                        <AlertCircle size={20} className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                                    </div>
                                    <p className="text-red-200 text-xs font-bold  tracking-wider font-['Rajdhani'] leading-relaxed">
                                        {error}
                                    </p>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full group overflow-hidden rounded-2xl p-[1px] shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-[gradient_3s_ease_infinite] bg-[length:200%_200%]" />
                                <div className="relative bg-[#020617] bg-opacity-80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition-all duration-300">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-base font-black text-white tracking-[0.2em] group-hover:tracking-[0.25em] transition-all uppercase">Acessar Sistema</span>
                                            <ChevronRight size={20} className="text-cyan-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-6 relative z-10 text-left">
                            <button
                                type="button"
                                onClick={() => { setShowForgot(false); setError(''); setForgotSent(false); }}
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
                                            <div className="absolute inset-0 bg-orange-500/20 blur-md rounded-2xl opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
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

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                                            <AlertCircle size={14} /> {error}
                                        </div>
                                    )}

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

                    {/* Footer Clean */}
                    <div className="mt-8 text-center relative z-10 opacity-60 hover:opacity-100 transition-opacity duration-300">
                        <p className="text-[11px] text-cyan-100 font-bold tracking-[0.2em] uppercase">
                            IRW Motors &copy; 2026 <span className="mx-2 opacity-30">|</span> v1.0.6
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
