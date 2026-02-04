import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SDRCalendar = ({ selectedDate, onSelectDate, onAddNote, isOpen, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    // Sync view with selection when opening
    useEffect(() => {
        if (isOpen) setViewDate(new Date(selectedDate));
    }, [isOpen, selectedDate]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(viewDate);

    const changeMonth = (delta) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (d) => {
        const today = new Date();
        return isSameDay(d, today);
    };

    const handleDayClick = (day) => {
        const newDate = new Date(viewDate);
        newDate.setDate(day);
        onSelectDate(newDate); // Select
    };

    const handleDayDoubleClick = (day) => {
        const newDate = new Date(viewDate);
        newDate.setDate(day);
        onSelectDate(newDate);
        if (onAddNote) onAddNote(newDate); // Trigger Add Note
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div className="text-white font-black uppercase tracking-wider text-sm">
                    {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-gray-500 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(viewDate);
                    date.setDate(day);
                    const isSelected = isSameDay(date, selectedDate);
                    const today = isToday(date);

                    return (
                        <button
                            key={day}
                            onClick={() => handleDayClick(day)}
                            onDoubleClick={() => handleDayDoubleClick(day)}
                            className={`
                                h-9 w-9 rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative group
                                ${isSelected ? 'bg-cyan-500 text-black shadow-[0_0_15px_cyan]' : 'hover:bg-white/5 text-gray-300'}
                                ${today && !isSelected ? 'border border-cyan-500/50 text-cyan-400' : ''}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-black tracking-widest text-gray-500 uppercase">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span>2 Cliques = Nova Nota</span>
                </div>
                <button onClick={() => { onSelectDate(new Date()); onClose(); }} className="text-cyan-500 hover:text-cyan-300 transition-colors">Hoje</button>
            </div>

            {/* Close Overlay (Invisible) - Handled by parent or separate click-outside logic, 
                but here we just rely on the component being closed by toggle */}
        </div>
    );
};

export default SDRCalendar;
