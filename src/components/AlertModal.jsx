import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

const AlertModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;

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
                        className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 40 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-[#1a1f2e] border border-orange-500/20 rounded-[2.5rem] shadow-[0_0_50px_rgba(249,115,22,0.15)] overflow-hidden relative p-8 text-center"
                        >
                            {/* Glow Effect */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-600/10 blur-[80px] rounded-full pointer-events-none" />
                            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Icon */}
                            <div className="w-20 h-20 rounded-3xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-6 border border-orange-500/20 shadow-inner">
                                <AlertCircle size={40} strokeWidth={2.5} />
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-black text-white italic  tracking-tighter mb-3">
                                {title || 'ATENÇÃO'}
                            </h3>
                            <p className="text-gray-400 font-bold text-sm leading-relaxed mb-8">
                                {message}
                            </p>

                            {/* Button */}
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black  tracking-widest text-xs rounded-2xl shadow-lg shadow-orange-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Entendi
                            </button>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AlertModal;
