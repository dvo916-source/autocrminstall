import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const [portalContainer, setPortalContainer] = useState(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

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

    // Create persistent portal container
    useEffect(() => {
        if (typeof document !== 'undefined') {
            let el = document.getElementById('select-portal');
            if (!el) {
                el = document.createElement('div');
                el.id = 'select-portal';
                el.style.position = 'absolute';
                el.style.top = '0';
                el.style.left = '0';
                el.style.width = '100%';
                el.style.height = '0';
                el.style.overflow = 'visible';
                el.style.zIndex = '99999';
                document.body.appendChild(el);
            }
            setPortalContainer(el);
        }
    }, []);

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownWidth = 320; // Fixed width for datepicker
            const dropdownHeight = 400; // Average height with headers

            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

            let leftPos = rect.left;
            if (leftPos + dropdownWidth > window.innerWidth) {
                leftPos = window.innerWidth - dropdownWidth - 20;
            }
            if (leftPos < 20) leftPos = 20;

            setDropdownStyle({
                position: 'fixed',
                top: openUpwards ? 'auto' : (rect.bottom + 8),
                bottom: openUpwards ? (window.innerHeight - rect.top + 8) : 'auto',
                left: leftPos,
                width: dropdownWidth,
                zIndex: 99999
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const timer = setTimeout(updatePosition, 100);
            window.addEventListener('resize', updatePosition);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideInput = containerRef.current && containerRef.current.contains(event.target);
            const isInsideDropdown = event.target.closest('[data-datepicker-content="true"]');

            if (!isInsideInput && !isInsideDropdown) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
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

            {/* PORTAL CONTENT */}
            {portalContainer && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="datepicker-dropdown"
                            data-datepicker-content="true"
                            initial={{ y: -10, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -10, opacity: 0, scale: 0.95 }}
                            style={dropdownStyle}
                            className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl mt-2 p-1"
                        >
                            {/* Header Tabs */}
                            <div className="flex bg-white/5 rounded-t-xl overflow-hidden border-b border-white/5">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setView('date'); }}
                                    className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase transition-all ${view === 'date' ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Data
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (selectedDate) setView('time'); }}
                                    disabled={!selectedDate}
                                    className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase transition-all ${view === 'time' ? 'text-purple-400 bg-purple-400/10' : 'text-gray-500 hover:text-white disabled:opacity-50'}`}
                                >
                                    Horário
                                </button>
                            </div>

                            <div className="p-4 h-[320px] bg-black/40">
                                <AnimatePresence mode="wait">
                                    {view === 'date' ? (
                                        <motion.div
                                            key="calendar-view"
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                            className="h-full flex flex-col"
                                        >
                                            <div className="flex justify-between items-center mb-4 px-1">
                                                <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span className="font-black text-white uppercase text-[11px] tracking-widest">
                                                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                                </span>
                                                <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-7 gap-1 text-center mb-3">
                                                {DAYS.map((d, i) => (
                                                    <span key={i} className="text-[9px] font-black text-gray-600 tracking-tighter uppercase">{d}</span>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1.5 flex-1 content-start">
                                                {Array.from({ length: firstDay }).map((_, i) => (
                                                    <div key={`empty-${i}`} />
                                                ))}
                                                {Array.from({ length: days }).map((_, i) => {
                                                    const day = i + 1;
                                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                                    const isToday = date.getTime() === today.getTime();
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
                                                                h-8 rounded-xl text-[10px] font-black transition-all relative
                                                                ${isSelected
                                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                                    : isPast
                                                                        ? 'text-gray-800 cursor-not-allowed'
                                                                        : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                                                }
                                                                ${isToday && !isSelected ? 'border border-blue-500/50 text-blue-400 ring-1 ring-blue-500/20' : ''}
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
                                            <p className="text-center text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Horário Comercial (09:00 - 18:00)</p>
                                            <div className="grid grid-cols-2 gap-2 pb-4">
                                                {TIME_SLOTS.map(time => (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleTimeClick(time); }}
                                                        className={`
                                                            py-3 rounded-xl text-[11px] font-black transition-all border tracking-widest
                                                            ${selectedTime === time
                                                                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/30'
                                                                : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-white hover:border-white/10'
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
                </AnimatePresence>,
                portalContainer
            )}
        </div>
    );
};

export default PremiumDatePicker;
