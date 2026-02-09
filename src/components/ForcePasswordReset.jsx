import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const { ipcRenderer } = window.require('electron');

const ForcePasswordReset = ({ username, onComplete, onCancel }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const success = await ipcRenderer.invoke('update-user-password', {
                username,
                newPassword,
                forceReset: false // Desmarca o flag
            });

            if (success) {
                onComplete();
            } else {
                setError('Erro ao atualizar senha. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro no reset de senha:', err);
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative z-10 w-full">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="text-blue-400" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Trocar Senha</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 px-4 leading-relaxed">
                    Este é seu primeiro acesso. Por segurança, você deve criar uma nova senha pessoal.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nova Senha</label>
                    <div className="relative group/input">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type={showPass ? "text" : "password"}
                            required
                            autoFocus
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all font-['Rajdhani']"
                            placeholder="Mínimo 6 caracteres"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Confirmar Nova Senha</label>
                    <div className="relative group/input">
                        <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type={showPass ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all font-['Rajdhani']"
                            placeholder="Repita a nova senha"
                        />
                    </div>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold"
                    >
                        <AlertCircle size={16} />
                        {error}
                    </motion.div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                    <button
                        type="submit"
                        disabled={loading || !newPassword || newPassword.length < 6}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 uppercase active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Atualizar e Entrar'}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full py-2 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                    >
                        Voltar ao Login
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ForcePasswordReset;
