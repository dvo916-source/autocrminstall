import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Trophy, CheckCircle2, Clock, User } from 'lucide-react';
import SDRCalendar from '../SDRCalendar';
import { getFirstName } from '../../lib/utils';

const SDRSidebar = ({
    selectedDate,
    setSelectedDate,
    viewDate,
    setViewDate,
    eventDays,
    pendingDays,
    rankingData,
    nextTask
}) => {
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const getVehicleName = (name) => {
        if (!name) return null;
        return name.split(' #')[0].trim();
    };

    return (
        <div className="w-[272px] shrink-0 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">

            {/* Próximo Compromisso */}
            <div className="p-4 border-b border-white/[0.05] shrink-0">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                    <Clock size={11} className="text-cyan-500" />
                    Próximo Compromisso
                </p>
                {nextTask ? (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                                {formatTime(nextTask.data_agendamento)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider px-2 py-0.5 bg-white/5 rounded-lg">
                                {nextTask.portal || 'DIRETO'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <User size={12} className="text-slate-400" />
                            </div>
                            <span className="text-[13px] font-black text-white truncate">
                                {nextTask.cliente}
                            </span>
                        </div>
                        {getVehicleName(nextTask.veiculo_interesse) && (
                            <p className="text-[10px] text-slate-500 font-medium truncate pl-8">
                                {getVehicleName(nextTask.veiculo_interesse)}
                            </p>
                        )}
                    </motion.div>
                ) : (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500/50 shrink-0" />
                        <p className="text-[11px] text-slate-600 font-bold">
                            Sem compromissos pendentes hoje
                        </p>
                    </div>
                )}
            </div>

            {/* Calendar */}
            <div className="p-4 border-b border-white/[0.05] shrink-0">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                    <CalendarIcon size={11} className="text-cyan-500" />
                    Calendário
                </p>
                <SDRCalendar
                    isOpen={true}
                    onClose={() => { }}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onMonthChange={setViewDate}
                    eventDays={eventDays}
                    pendingDays={pendingDays}
                />
            </div>

            {/* Ranking */}
            <div className="p-4 flex-1">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                    <Trophy size={11} className="text-yellow-500" />
                    Ranking do Mês
                </p>
                <div className="space-y-2">
                    {rankingData
                        .sort((a, b) => (b.total || b.count || 0) - (a.total || a.count || 0))
                        .slice(0, 5)
                        .map((member, index) => {
                            const score = member.total || member.count || 0;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.06 }}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all
                                        ${index === 0
                                            ? 'border-yellow-500/25 bg-yellow-500/[0.04]'
                                            : 'border-white/[0.05] bg-white/[0.02]'}`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0
                                        ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                                        {index + 1}
                                    </div>
                                    <span className="flex-1 text-[12px] font-bold text-white truncate uppercase tracking-wide">
                                        {getFirstName(member.nome_completo || member.nome)}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                            <CalendarIcon size={9} className="text-blue-400" />
                                            <span className="text-[10px] font-black text-white">{score}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">
                                            <CheckCircle2 size={9} className="text-emerald-400" />
                                            <span className="text-[10px] font-black text-emerald-400">{member.sales_month || 0}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default SDRSidebar;
