import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, TrendingUp, AlertCircle, BarChart2 } from 'lucide-react';

const SDRStatsGrid = ({ stats, viewDate }) => {
    const navigate = useNavigate();

    const statCards = [
        {
            label: 'Visitas',
            value: stats.visitsConfirmed ?? 0,
            color: 'orange',
            icon: CheckCircle2,
            tooltip: 'Visitas confirmadas no mês',
            onClick: () => navigate('/crm', { state: { filter: 'visited' } }),
        },
        {
            label: 'Vendas',
            value: stats.sales,
            color: 'green',
            icon: TrendingUp,
            tooltip: 'Vendas fechadas no mês',
            onClick: () => navigate('/crm', { state: { filter: 'sold' } }),
        },
        {
            label: 'Pendentes',
            value: stats.pending,
            color: 'red',
            icon: AlertCircle,
            pulse: stats.pending > 0,
            tooltip: 'Leads em atraso',
            onClick: () => navigate('/crm', { state: { filter: 'pending' } }),
        },
        {
            label: 'Conversão',
            value: `${stats.visitsConfirmed > 0 && stats.sales > 0
                ? ((stats.sales / stats.visitsConfirmed) * 100).toFixed(1)
                : 0}%`,
            color: 'indigo',
            icon: BarChart2,
            tooltip: 'Vendas ÷ Visitas confirmadas',
            onClick: null,
        },
    ];

    const colorMap = {
        orange: { border: 'border-orange-500/15', label: 'text-orange-400', hover: 'hover:border-orange-500/40 hover:bg-orange-500/[0.06]' },
        green: { border: 'border-green-500/15', label: 'text-green-400', hover: 'hover:border-green-500/40 hover:bg-green-500/[0.06]' },
        red: { border: 'border-red-500/15', label: 'text-red-400', hover: 'hover:border-red-500/40 hover:bg-red-500/[0.06]' },
        indigo: { border: 'border-indigo-500/15', label: 'text-indigo-400', hover: '' },
    };

    return (
        <div className="p-4 border-b border-white/[0.05] shrink-0">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">
                {viewDate?.toLocaleDateString('pt-BR', { month: 'long' }) || 'Mês atual'}
            </p>
            <div className="grid grid-cols-2 gap-2">
                {statCards.map(s => {
                    const c = colorMap[s.color];
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            onClick={s.onClick || undefined}
                            title={s.tooltip}
                            className={`bg-white/[0.03] border p-3 rounded-xl flex flex-col transition-all
                                ${c.border} ${s.onClick ? `cursor-pointer ${c.hover}` : ''}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${c.label}`}>
                                    {s.label}
                                </span>
                                <Icon size={11} className={`${c.label} opacity-60`} />
                            </div>
                            <span className={`text-xl font-black ${s.pulse && stats.pending > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {s.value}
                            </span>
                            {s.onClick && (
                                <span className="text-[8px] text-slate-700 mt-1 font-bold uppercase tracking-wider">
                                    ver detalhes →
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SDRStatsGrid;
