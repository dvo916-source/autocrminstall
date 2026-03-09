import React from 'react';
import { motion } from 'framer-motion';
import { X, Shield, CheckCircle2, Save, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Modal from '../ui/Modal';
import { SYSTEM_MODULES } from '../../constants/modules';

const ModuleListModal = ({
    configStore, setConfigStore, loading, handleUpdateModules
}) => {
    if (!configStore) return null;

    // Helper para processar módulos
    const getModulosAtuais = () => {
        let mods = configStore.modulos ? (typeof configStore.modulos === 'string' ? JSON.parse(configStore.modulos) : configStore.modulos) : [];
        return Array.isArray(mods) ? mods : [];
    };

    const modulosAtuais = getModulosAtuais();

    return (
        <Modal
            isOpen={!!configStore}
            onClose={() => setConfigStore(null)}
            maxWidth="max-w-2xl"
        >
            <button onClick={() => setConfigStore(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
                <X size={20} />
            </button>

            <div className="mb-8 flex items-center gap-5">
                <div className="p-4 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl">
                    <Shield className="text-blue-400" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                        CONTROLE <span className="text-blue-400">DE ACESSOS</span>
                    </h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2 font-inter">UNIDADE: {configStore.nome}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {SYSTEM_MODULES.map((mod) => {
                    const isEnabled = modulosAtuais.includes(mod.id);

                    return (
                        <button
                            key={mod.id}
                            disabled={mod.disabled}
                            onClick={() => {
                                if (mod.disabled) return;
                                const newMods = isEnabled
                                    ? modulosAtuais.filter(id => id !== mod.id)
                                    : [...modulosAtuais, mod.id];
                                setConfigStore({ ...configStore, modulos: newMods });
                            }}
                            className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isEnabled
                                ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-lg'
                                : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/[0.08]'
                                } ${mod.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`p-2 rounded-lg ${isEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
                                    {mod.icon && LucideIcons[mod.icon] && React.createElement(LucideIcons[mod.icon], { size: 16 })}
                                </span>
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-[10px] font-black tracking-widest uppercase font-inter">{mod.label}</span>
                                    {mod.disabled && <span className="text-[7px] text-blue-400/50 font-black uppercase mt-1">EM DESENVOLVIMENTO</span>}
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all duration-300 ${isEnabled
                                ? 'bg-blue-500 border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                : 'border-white/10 group-hover:border-white/20'
                                }`}>
                                {isEnabled && <CheckCircle2 size={12} className="text-white" strokeWidth={4} />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => setConfigStore(null)}
                    className="flex-1 py-4 font-black text-slate-600 hover:text-white transition-all uppercase text-[10px] tracking-[0.3em] font-inter"
                >
                    CANCELAR
                </button>
                <button
                    onClick={() => handleUpdateModules(configStore.id, configStore.modulos)}
                    disabled={loading}
                    className="flex-[2] relative group bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 overflow-hidden font-inter"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                        <>
                            <Save size={16} />
                            ATUALIZAR CONFIGURAÇÕES
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};

export default ModuleListModal;
