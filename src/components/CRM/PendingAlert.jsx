import React, { memo, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PendingAlert = memo(({ overdueCount, todayCount, performanceMode }) => {
    const [isVisible, setIsVisible] = useState(true);

    if ((overdueCount === 0 && todayCount === 0) || !isVisible) return null;

    const isOverdue = overdueCount > 0;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    {...(performanceMode ? {} : {
                        initial: { height: 0, opacity: 0 },
                        animate: { height: 'auto', opacity: 1 },
                        exit: { height: 0, opacity: 0 }
                    })}
                    className={`mt-2 mb-1 px-4 py-2 border rounded-xl flex items-center justify-between overflow-hidden relative ${isOverdue ? 'bg-red-950/30 border-red-500/30' : 'bg-amber-950/30 border-amber-500/30'}`}
                >
                    <div className="flex items-center gap-3">
                        <Phone size={13} className={`shrink-0 ${isOverdue ? 'text-red-400' : 'text-amber-400'} ${performanceMode ? '' : 'animate-bounce'}`} />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">
                            {isOverdue ? 'Pendências Vencidas' : 'Pendências para Hoje'}
                        </span>
                        <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                            — {isOverdue ? `${overdueCount} clientes aguardando retorno` : `${todayCount} clientes para retornar hoje`}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {isOverdue && (
                            <span className={`text-[9px] font-black text-red-300 px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 tracking-widest uppercase ${performanceMode ? '' : 'animate-pulse'}`}>
                                Urgente
                            </span>
                        )}
                        <button onClick={() => setIsVisible(false)}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all ${isOverdue ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-amber-500/20 text-amber-400'}`}>
                            <X size={12} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default PendingAlert;
