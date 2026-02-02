import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ChevronRight, AlertCircle, Key, ShieldCheck } from 'lucide-react';

const ResetPassword = ({ user, onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 4) {
            setError('A senha deve ter pelo menos 4 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('change-password', { username: user.username, newPassword: password });
            onComplete({ ...user, reset_password: 0 });
        } catch (err) {
            setError('Erro ao atualizar a senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[150] bg-[#0f172a]">
            {/* Background Animated Blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-md p-1"
            >
                <div className="bg-glass-100 backdrop-blur-3xl border border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-10 shadow-2xl relative overflow-hidden text-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl lg:rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-6 lg:mb-8 transform -rotate-6">
                        <Key size={32} className="text-white lg:w-10 lg:h-10" />
                    </div>

                    <h1 className="text-xl lg:text-2xl font-black text-white tracking-widest mb-2 uppercase">
                        NOVA <span className="text-purple-400">SENHA</span>
                    </h1>
                    <p className="text-gray-400 text-[11px] lg:text-xs font-bold tracking-widest leading-relaxed mb-6 lg:mb-10 uppercase">
                        {user.username.toUpperCase()}, POR SEGURANÇA,<br />DEFINA UMA SENHA PESSOAL AGORA.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 ml-4 tracking-widest uppercase">Nova Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-purple-500 focus:bg-white/10 transition-all font-bold text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 ml-4 tracking-widest uppercase">Confirmar Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-purple-500 focus:bg-white/10 transition-all font-bold text-sm"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-bold tracking-wider uppercase"
                            >
                                <AlertCircle size={14} />
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-2xl font-black text-white shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 group border-t border-white/10"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    SALVAR E ENTRAR
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
