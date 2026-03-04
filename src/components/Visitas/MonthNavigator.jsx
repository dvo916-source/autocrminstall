import React, { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MonthNavigator = memo(({ monthOffset, setMonthOffset, itemCount }) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + monthOffset);
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
        <div className="flex items-center justify-center gap-3">
            <button
                onClick={() => setMonthOffset(prev => prev - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-cyan-400/50 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                title="Mês anterior"
            >
                <ChevronLeft size={16} />
            </button>
            <div className="flex flex-col items-center">
                <span className="text-[14px] font-black tracking-[0.2em] text-cyan-400 uppercase">
                    {monthLabel}
                </span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    {itemCount} registro{itemCount !== 1 ? 's' : ''}
                </span>
            </div>
            <button
                onClick={() => setMonthOffset(prev => Math.min(prev + 1, 0))}
                disabled={monthOffset >= 0}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${monthOffset >= 0 ? 'text-gray-800 cursor-not-allowed' : 'text-cyan-400/50 hover:text-cyan-300 hover:bg-cyan-500/10'}`}
                title="Próximo mês"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
});

export default MonthNavigator;
