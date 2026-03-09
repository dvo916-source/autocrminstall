import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, CheckCircle2, Store, MapPin, Image as ImageIcon,
    User, Shield, Lock, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { SYSTEM_MODULES } from '../../constants/modules';

const StoreWizard = ({
    isOpen, onClose, wizardStep, setWizardStep,
    newStore, setNewStore, newAdmin, setNewAdmin,
    loading, cpfError, maskCPF, handleAddStore
}) => {

    const steps = [
        { id: 1, label: 'UNIDADE' },
        { id: 2, label: 'ADMIN' },
        { id: 3, label: 'RECURSOS' }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { onClose(); setWizardStep(1); }}
            maxWidth="max-w-2xl"
            className="p-10 rounded-[4rem]"
        >
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-3 mb-12">
                {steps.map(step => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all duration-500 border ${wizardStep >= step.id
                                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                : 'bg-white/5 border-white/5 text-slate-700'
                                }`}>
                                {wizardStep > step.id ? <CheckCircle2 size={18} strokeWidth={3} /> : <span className="text-sm italic">{step.id}</span>}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${wizardStep >= step.id ? 'text-blue-400' : 'text-slate-800'}`}>
                                {step.label}
                            </span>
                        </div>
                        {step.id < 3 && (
                            <div className={`w-12 h-[1px] mb-6 transition-all duration-700 ${wizardStep > step.id ? 'bg-blue-600' : 'bg-white/5'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <button
                onClick={() => { onClose(); setWizardStep(1); }}
                className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full"
            >
                <X size={20} />
            </button>

            <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none font-inter">NOVA <span className="text-blue-400">UNIDADE</span></h2>
                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3 font-inter">Cadastro de Estabelecimento</p>
                        </div>

                        <div className="space-y-4 max-w-md mx-auto">
                            <Input
                                label="NOME COMERCIAL"
                                icon={Store}
                                value={newStore.nome}
                                onChange={e => setNewStore({ ...newStore, nome: e.target.value })}
                                placeholder="NOME DA LOJA"
                                autoFocus
                                required
                            />

                            <Input
                                label="LOCALIZAÇÃO"
                                icon={MapPin}
                                value={newStore.endereco}
                                onChange={e => setNewStore({ ...newStore, endereco: e.target.value })}
                                placeholder="CIDADE - UF"
                            />

                            <Input
                                label="LOGOMARCA URL"
                                icon={ImageIcon}
                                value={newStore.logo_url}
                                onChange={e => setNewStore({ ...newStore, logo_url: e.target.value })}
                                placeholder="HTTPS://..."
                                className="font-mono"
                            />
                        </div>

                        <div className="flex gap-4 pt-6 max-w-md mx-auto">
                            <button
                                onClick={() => onClose()}
                                className="flex-1 py-4 font-black text-slate-700 hover:text-white transition-all uppercase text-[9px] tracking-[0.4em] font-inter"
                            >
                                CANCELAR
                            </button>
                            <button
                                disabled={!newStore.nome}
                                onClick={() => setWizardStep(2)}
                                className="flex-[2] bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] tracking-[0.3em] transition-all shadow-xl hover:bg-blue-500 hover:text-white flex items-center justify-center gap-2 font-inter"
                            >
                                PRÓXIMA ETAPA
                                <ChevronRight size={16} strokeWidth={4} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {wizardStep === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none font-inter">ADMIN<span className="text-blue-400">ISTRADOR</span></h2>
                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3 font-inter">Responsável pela Unidade</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                            <Input
                                label="NOME COMPLETO"
                                icon={User}
                                value={newAdmin.nome_completo}
                                onChange={e => setNewAdmin({ ...newAdmin, nome_completo: e.target.value })}
                                placeholder="NOME DO ADMIN"
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="CPF (LOGIN)"
                                    icon={Shield}
                                    value={newAdmin.cpf}
                                    onChange={e => setNewAdmin({ ...newAdmin, cpf: maskCPF(e.target.value) })}
                                    placeholder="000.000.000-00"
                                    error={cpfError}
                                />
                                <Input
                                    label="SENHA MASTER"
                                    icon={Lock}
                                    type="password"
                                    value={newAdmin.password}
                                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                    placeholder="******"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6 max-w-md mx-auto">
                            <button
                                onClick={() => setWizardStep(1)}
                                className="flex-1 py-4 font-black text-slate-700 hover:text-white transition-all uppercase text-[9px] tracking-[0.4em] flex items-center justify-center gap-2 font-inter"
                            >
                                <ChevronLeft size={16} strokeWidth={4} />
                                VOLTAR
                            </button>
                            <button
                                disabled={!newAdmin.nome_completo || !newAdmin.password || newAdmin.password.length < 4}
                                onClick={() => setWizardStep(3)}
                                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-2 font-inter"
                            >
                                CONTINUAR
                                <ChevronRight size={16} strokeWidth={4} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {wizardStep === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none font-inter">RECURSOS <span className="text-blue-400">ATIVOS</span></h2>
                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3 font-inter">Módulos do Sistema</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-white/5 max-w-lg mx-auto">
                            {SYSTEM_MODULES.map((mod) => {
                                const isEnabled = newStore.modulos.includes(mod.id);
                                return (
                                    <button
                                        key={mod.id}
                                        type="button"
                                        disabled={mod.disabled}
                                        onClick={() => {
                                            if (mod.disabled) return;
                                            const newMods = isEnabled
                                                ? newStore.modulos.filter(id => id !== mod.id)
                                                : [...newStore.modulos, mod.id];
                                            setNewStore({ ...newStore, modulos: newMods });
                                        }}
                                        className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${isEnabled
                                            ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-lg'
                                            : 'bg-white/5 border-white/5 text-slate-800 hover:bg-white/[0.08]'
                                            } ${mod.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={isEnabled ? 'text-blue-400' : 'text-slate-600'}>
                                                {mod.icon && LucideIcons[mod.icon] && React.createElement(LucideIcons[mod.icon], { size: 12 })}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest font-inter">{mod.label}</span>
                                        </div>
                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-300 ${isEnabled
                                            ? 'bg-blue-500 border-blue-400'
                                            : 'border-white/5 group-hover:border-white/10'
                                            }`}>
                                            {isEnabled && <CheckCircle2 size={10} className="text-white" strokeWidth={5} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-2xl max-w-md mx-auto">
                            <p className="text-blue-400/60 text-center text-[8px] font-black uppercase tracking-[0.3em] leading-relaxed font-inter">
                                Setup finalizado. A unidade será criada com os recursos selecionados.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4 max-w-md mx-auto">
                            <button
                                onClick={() => setWizardStep(2)}
                                className="flex-1 py-4 font-black text-slate-700 hover:text-white transition-all uppercase text-[9px] tracking-[0.4em] flex items-center justify-center gap-2 font-inter"
                            >
                                <ChevronLeft size={16} strokeWidth={4} />
                                VOLTAR
                            </button>
                            <button
                                disabled={loading || newStore.modulos.length === 0}
                                onClick={handleAddStore}
                                className="flex-[2] relative group bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.4em] transition-all shadow-2xl overflow-hidden font-inter"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                        <>
                                            CRIAR UNIDADE
                                            <CheckCircle2 size={18} strokeWidth={4} />
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Modal>
    );
};

export default StoreWizard;
