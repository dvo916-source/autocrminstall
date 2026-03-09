import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Calendar, User, Phone, Car,
    ArrowRight, CheckCircle2, AlertCircle,
    MessageSquare, TrendingUp
} from 'lucide-react';
import { useLeads } from '../../context/LeadsContext';
import { useUI } from '../../context/UIContext';
import { useNavigate } from 'react-router-dom';

const AgendaTimeline = ({ filters = {} }) => {
    const { filteredLeads, loading, estoque } = useLeads();
    const { performanceMode } = useUI();
    const navigate = useNavigate();

    const timelineData = useMemo(() => {
        if (!filteredLeads) return { today: [], tomorrow: [], upcoming: [] };

        // 🔥 APLICAR FILTROS CIRÚRGICOS (FASE 4)
        let processed = filteredLeads.filter(lead =>
            lead.data_agendamento || (lead.status_pipeline === 'Agendado')
        );

        if (filters.vendedor && filters.vendedor !== 'ALL') {
            processed = processed.filter(l => (l.vendedor_sdr || l.vendedor) === filters.vendedor);
        }

        if (filters.temperatura && filters.temperatura !== 'ALL') {
            processed = processed.filter(l => l.temperatura === filters.temperatura);
        }

        if (filters.onlySlaRisk) {
            processed = processed.filter(l => l.isSlaRisk);
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const afterTomorrow = new Date(tomorrow);
        afterTomorrow.setDate(afterTomorrow.getDate() + 1);

        const categorized = {
            today: [],
            tomorrow: [],
            upcoming: []
        };

        processed.forEach(lead => {
            const dateStr = lead.data_agendamento || lead.data_recontato || lead.datahora;
            if (!dateStr) return;

            const date = new Date(dateStr);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            if (dateOnly.getTime() === today.getTime()) categorized.today.push(lead);
            else if (dateOnly.getTime() === tomorrow.getTime()) categorized.tomorrow.push(lead);
            else if (dateOnly >= afterTomorrow) categorized.upcoming.push(lead);
        });

        // Sort each by time
        const sortByTime = (a, b) => {
            const timeA = new Date(a.data_agendamento || a.datahora).getTime();
            const timeB = new Date(b.data_agendamento || b.datahora).getTime();
            return timeA - timeB;
        };

        categorized.today.sort(sortByTime);
        categorized.tomorrow.sort(sortByTime);
        categorized.upcoming.sort(sortByTime);

        return categorized;
    }, [filteredLeads]);

    const handleWhatsApp = (e, phone) => {
        e.stopPropagation();
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        navigate('/whatsapp', { state: { action: 'open-chat', phone: cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone } });
    };

    const TimelineCard = ({ lead }) => {
        const cleanInteresse = (lead.veiculo_interesse || '').split(' #')[0].trim();
        const targetCar = (estoque || []).find(car => (car.nome || '').toLowerCase().includes(cleanInteresse.toLowerCase()));

        let photoUrl = null;
        if (targetCar) {
            try {
                const fotos = typeof targetCar.fotos === 'string' ? JSON.parse(targetCar.fotos) : targetCar.fotos;
                if (Array.isArray(fotos) && fotos.length > 0) photoUrl = fotos[0];
                else photoUrl = targetCar.foto;
            } catch (e) { photoUrl = targetCar.foto; }
        }

        const timeStr = lead.data_agendamento ? new Date(lead.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="relative flex items-center gap-6 p-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 rounded-[2rem] transition-all duration-500 group overflow-hidden backdrop-blur-xl"
            >
                {/* Visual Accent */}
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-500 rounded-r-full opacity-50 group-hover:opacity-100 transition-opacity" />

                {/* Time & Clock */}
                <div className="flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums leading-none mb-1">
                        {timeStr}
                    </span>
                    <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-widest">Horário</span>
                </div>

                {/* Car Photo/Icon */}
                <div className="w-24 aspect-[4/3] rounded-2xl bg-black/40 border border-white/5 overflow-hidden relative shrink-0 shadow-2xl">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Carro" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-800">
                            <Car size={32} strokeWidth={1} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Info Container */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-black text-white truncate group-hover:text-cyan-400 transition-colors uppercase italic tracking-tight">
                            {lead.cliente || 'Indefinido'}
                        </h3>
                        {lead.temperatura === 'Quente' && (
                            <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-1.5">
                                <TrendingUp size={10} className="text-red-400" />
                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Quente</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Car size={13} className="text-slate-600" />
                            <span className="text-[11px] font-bold truncate max-w-[150px] uppercase text-slate-400">{cleanInteresse || 'Nenhum veículo'}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[11px] font-black tabular-nums text-emerald-400/80">R$ {targetCar?.valor || '---'}</span>
                    </div>
                </div>

                {/* Interactive Actions */}
                <div className="flex items-center gap-3 pr-2">
                    <button
                        onClick={(e) => handleWhatsApp(e, lead.telefone)}
                        className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all shadow-lg"
                    >
                        <MessageSquare size={18} strokeWidth={2.5} />
                    </button>
                    <button className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowRight size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </motion.div>
        );
    };

    const SectionHeader = ({ title, icon: Icon, color }) => (
        <div className="flex items-center gap-3 mb-6 mt-10 first:mt-0">
            <div className={`p-2 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                <Icon size={16} className={`text-${color}-400`} />
            </div>
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">{title}</h2>
            <div className={`flex-1 h-[1px] bg-gradient-to-r from-${color}-500/20 to-transparent`} />
        </div>
    );

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full mb-4"
                />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando Agenda...</span>
            </div>
        );
    }

    const totalScheduled = timelineData.today.length + timelineData.tomorrow.length + timelineData.upcoming.length;

    if (totalScheduled === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform">
                    <Calendar size={42} className="text-slate-700" strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-3">Agenda <span className="text-slate-700">Livre</span></h3>
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-500 max-w-[280px] leading-relaxed">
                    Nenhum agendamento ativo detectado. <br />Comande um novo registro para começar.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 pb-10">
            <AnimatePresence mode="popLayout">
                {timelineData.today.length > 0 && (
                    <motion.div key="today-section">
                        <SectionHeader title="Visitas de Hoje" icon={CheckCircle2} color="cyan" />
                        <div className="space-y-4">
                            {timelineData.today.map(lead => <TimelineCard key={lead.id} lead={lead} />)}
                        </div>
                    </motion.div>
                )}

                {timelineData.tomorrow.length > 0 && (
                    <motion.div key="tomorrow-section">
                        <SectionHeader title="Amanhã" icon={Clock} color="amber" />
                        <div className="space-y-4">
                            {timelineData.tomorrow.map(lead => <TimelineCard key={lead.id} lead={lead} />)}
                        </div>
                    </motion.div>
                )}

                {timelineData.upcoming.length > 0 && (
                    <motion.div key="upcoming-section">
                        <SectionHeader title="Próximos Dias" icon={Calendar} color="purple" />
                        <div className="space-y-4">
                            {timelineData.upcoming.map(lead => <TimelineCard key={lead.id} lead={lead} />)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgendaTimeline;
