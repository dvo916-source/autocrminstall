import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const PremiumDatePicker = ({ value, onChange, allowPastDates = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('date'); // 'date' | 'time'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const containerRef = useRef(null);

    // Initial value parsing
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setSelectedDate(date);
                setCurrentDate(date);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                setSelectedTime(`${hours}:${minutes}`);
            }
        }
    }, [value]);



    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);


    const handleDateClick = (day) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(newDate);
        setView('time');
    };

    const handleTimeClick = (time) => {
        setSelectedTime(time);
        if (selectedDate) {
            const [hours, minutes] = time.split(':').map(Number);
            const finalDate = new Date(selectedDate);
            finalDate.setHours(hours, minutes, 0, 0);

            const pad = n => n.toString().padStart(2, '0');
            const isoLocal = `${finalDate.getFullYear()}-${pad(finalDate.getMonth() + 1)}-${pad(finalDate.getDate())}T${pad(hours)}:${pad(minutes)}`;

            onChange(isoLocal);
            setTimeout(() => setIsOpen(false), 200);
        }
    };

    const { days, firstDay } = (() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    })();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDisplay = () => {
        if (!selectedDate || !selectedTime) return 'Selecione Data e Hora';
        return `${selectedDate.toLocaleDateString()} às ${selectedTime}`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* INPUT TRIGGER */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white 
                    cursor-pointer flex items-center justify-between transition-all hover:bg-white/10
                    ${isOpen ? 'border-cyan-500 ring-1 ring-cyan-500/50' : ''}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <CalendarIcon size={14} className="text-gray-600 shrink-0" />
                    <span className={`text-base font-bold tracking-tight truncate ${selectedDate ? 'text-white' : 'text-gray-500'}`}>
                        {formatDisplay()}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-gray-600 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* INLINE CONTENT */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="datepicker-dropdown"
                        data-datepicker-content="true"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#1a202c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl mt-3"
                    >
                        {/* Header Tabs */}
                        <div className="flex border-b border-white/10 bg-white/5">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setView('date'); }}
                                className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-colors ${view === 'date' ? 'text-cyan-400 bg-white/5' : 'text-gray-500 hover:text-white'}`}
                            >
                                Data
                            </button>
                            <div className="w-px bg-white/10" />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (selectedDate) setView('time'); }}
                                disabled={!selectedDate}
                                className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-colors ${view === 'time' ? 'text-purple-400 bg-white/5' : 'text-gray-500 hover:text-white disabled:opacity-50'}`}
                            >
                                Horário
                            </button>
                        </div>

                        <div className="p-4 h-[320px]">
                            <AnimatePresence mode="wait">
                                {view === 'date' ? (
                                    <motion.div
                                        key="calendar-view"
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="h-full flex flex-col"
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white/10 rounded-lg text-white">
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className="font-semibold text-white capitalize text-sm">
                                                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                            </span>
                                            <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white/10 rounded-lg text-white">
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                            {DAYS.map((d, i) => (
                                                <span key={i} className="text-[10px] font-bold text-gray-500">{d}</span>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                                            {/* Empty slots for alignment */}
                                            {Array.from({ length: firstDay }).map((_, i) => (
                                                <div key={`empty-${i}`} />
                                            ))}
                                            {Array.from({ length: days }).map((_, i) => {
                                                const day = i + 1;
                                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                                const isToday = date.getTime() === today.getTime();

                                                // Normalize for comparison
                                                const compareSelected = selectedDate ? new Date(selectedDate.getTime()).setHours(0, 0, 0, 0) : null;
                                                const isSelected = selectedDate && date.getTime() === compareSelected;
                                                const isPast = !allowPastDates && date < today;

                                                return (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); !isPast && handleDateClick(day); }}
                                                        disabled={isPast}
                                                        className={`
                                                            h-8 rounded-lg text-[10px] font-bold transition-all relative
                                                            ${isSelected
                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                                : isPast
                                                                    ? 'text-gray-800 cursor-not-allowed'
                                                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                                            }
                                                            ${isToday && !isSelected ? 'border border-blue-500/50 text-blue-400' : ''}
                                                        `}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="time-view"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 20, opacity: 0 }}
                                        className="h-full overflow-y-auto custom-scrollbar pr-2"
                                    >
                                        <p className="text-center text-xs text-gray-400 mb-3 font-medium">Horário Comercial (09:00 - 18:00)</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {TIME_SLOTS.map(time => (
                                                <button
                                                    key={time}
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleTimeClick(time); }}
                                                    className={`
                                                        py-2 rounded-xl text-xs font-medium transition-all border
                                                        ${selectedTime === time
                                                            ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/30'
                                                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                                                        }
                                                    `}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PremiumDatePicker;
