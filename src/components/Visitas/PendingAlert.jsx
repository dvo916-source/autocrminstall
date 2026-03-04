import React, { memo } from 'react';
import { Phone, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PendingAlert = memo(({ overdueCount, todayCount, performanceMode }) => {
    if (overdueCount === 0 && todayCount === 0) return null;

    const isOverdue = overdueCount > 0;

    return (
        <motion.div
            {...(performanceMode ? {} : {
                initial: { height: 0, opacity: 0 },
                animate: { height: 'auto', opacity: 1 }
            })}
            className={`mx-8 mt-2 mb-2 p-4 border rounded-2xl flex items-center justify-between overflow-hidden relative ${isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                    <Phone className={performanceMode ? "" : "animate-bounce"} size={20} />
                </div>
                <div>
                    <h4 className="text-white font-black text-sm tracking-tight uppercase">
                        {isOverdue ? 'PENDÊNCIAS VENCIDAS' : 'PENDÊNCIAS PARA HOJE'}
                    </h4>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                        {isOverdue
                            ? `${overdueCount} clientes aguardando retorno fora do prazo`
                            : `${todayCount} clientes para retornar hoje`}
                    </p>
                </div>
            </div>
            {isOverdue && (
                <div className={`bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full ${performanceMode ? "" : "animate-pulse"}`}>URGENTE</div>
            )}
        </motion.div>
    );
});

export default PendingAlert;
