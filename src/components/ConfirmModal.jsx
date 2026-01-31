import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false }) => {

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-[#1a1f2e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative"
                        >
                            {/* Decorative Top Line */}
                            <div className={`h-1 w-full ${isDestructive ? 'bg-red-500' : 'bg-blue-500'}`} />

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="p-8 flex flex-col items-center text-center">
                                {/* Icon */}
                                <div className={`
                                    w-16 h-16 rounded-2xl flex items-center justify-center mb-6
                                    ${isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}
                                `}>
                                    <AlertTriangle size={32} />
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl font-black text-white mb-2">
                                    {title}
                                </h3>
                                <p className="text-gray-400 font-medium mb-8">
                                    {message}
                                </p>

                                {/* Actions */}
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onConfirm();
                                            onClose();
                                        }}
                                        className={`
                                            flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]
                                            ${isDestructive
                                                ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20'
                                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-500/20'}
                                        `}
                                    >
                                        {confirmText}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
