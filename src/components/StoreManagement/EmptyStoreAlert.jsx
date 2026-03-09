import React from 'react';
import { motion } from 'framer-motion';
import { Store, Zap } from 'lucide-react';
import Modal from '../ui/Modal';

const EmptyStoreAlert = ({ emptyStoreAlert, setEmptyStoreAlert, setConfigStore }) => {
    if (!emptyStoreAlert) return null;

    return (
        <Modal
            isOpen={!!emptyStoreAlert}
            onClose={() => setEmptyStoreAlert(null)}
            maxWidth="max-w-md"
            className="border-red-500/20 text-center"
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                <Store size={120} />
            </div>
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap size={32} className="text-red-400" />
            </div>

            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">LOJA <span className="text-red-400">SEM MÓDULOS</span></h3>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] mb-8 leading-relaxed font-inter">
                A loja <span className="text-white">{emptyStoreAlert.nome}</span> não possui nenhum módulo ativo no momento.
            </p>

            <div className="flex gap-3 relative z-10">
                <button
                    onClick={() => setEmptyStoreAlert(null)}
                    className="flex-1 py-4 font-black text-slate-500 hover:text-white transition-all uppercase text-[10px] tracking-[0.3em] font-inter"
                >
                    CANCELAR
                </button>
                <button
                    onClick={() => {
                        const lojaToConfig = emptyStoreAlert;
                        setEmptyStoreAlert(null);
                        setConfigStore(lojaToConfig);
                    }}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-[10px] tracking-[0.2em] transition-all font-inter"
                >
                    ADICIONAR MÓDULO
                </button>
            </div>
        </Modal>
    );
};

export default EmptyStoreAlert;
