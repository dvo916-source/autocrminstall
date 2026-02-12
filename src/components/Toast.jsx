import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="text-green-400" size={20} />,
        error: <AlertTriangle className="text-red-400" size={20} />,
        info: <Info className="text-blue-400" size={20} />
    };

    const colors = {
        success: 'border-green-500/20 bg-green-500/10 text-green-200',
        error: 'border-red-500/20 bg-red-500/10 text-red-200',
        info: 'border-blue-500/20 bg-blue-500/10 text-blue-200'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border backdrop-blur-xl shadow-2xl min-w-[300px] max-w-[90vw] ${colors[type]}`}
        >
            <div className="shrink-0">
                {icons[type]}
            </div>

            <p className="text-[11px] font-black uppercase tracking-widest flex-1">
                {message}
            </p>

            <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
            >
                <X size={16} />
            </button>

            <motion.div
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1 rounded-full ${type === 'success' ? 'bg-green-500/40' :
                        type === 'error' ? 'bg-red-500/40' : 'bg-blue-500/40'
                    }`}
            />
        </motion.div>
    );
};

export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <AnimatePresence>
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </AnimatePresence>
    );
};

export default Toast;
