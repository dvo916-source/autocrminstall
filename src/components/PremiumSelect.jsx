import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

const PremiumSelect = ({ options, value, onChange, placeholder = "Selecione...", className = "", searchable = false, itemRenderer = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [portalContainer, setPortalContainer] = useState(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    const selectedOption = options.find(opt => opt.value === value);

    // Initial value for search term if searchable
    useEffect(() => {
        if (selectedOption && searchable && !isOpen) {
            setSearchTerm(selectedOption.label);
        } else if (!selectedOption && !isOpen) {
            setSearchTerm('');
        }
    }, [selectedOption, isOpen, searchable]);

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
            const dropdownWidth = rect.width;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpwards = spaceBelow < 250;

            // Clamping left position to avoid going off-screen
            let leftPos = rect.left;
            if (leftPos + dropdownWidth > window.innerWidth) {
                leftPos = window.innerWidth - dropdownWidth - 10;
            }
            if (leftPos < 10) leftPos = 10;

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

    // Robust positioning logic
    useEffect(() => {
        if (isOpen) {
            updatePosition();

            // Re-calculate after a short delay to account for modal animations
            const timer = setTimeout(updatePosition, 100);
            const timer2 = setTimeout(updatePosition, 300);

            window.addEventListener('resize', updatePosition);
            return () => {
                clearTimeout(timer);
                clearTimeout(timer2);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    // Auto-focus when opened
    useEffect(() => {
        if (isOpen && searchable && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, searchable]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideInput = containerRef.current && containerRef.current.contains(event.target);
            const isInsideDropdown = event.target.closest('[data-select-content="true"]');

            if (!isInsideInput && !isInsideDropdown) {
                setIsOpen(false);
                if (searchable && selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else if (searchable) {
                    setSearchTerm('');
                }
            }
        };

        const handleScroll = (e) => {
            if (isOpen) {
                const isInsideDropdown = e.target.closest && e.target.closest('[data-select-content="true"]');
                if (!isInsideDropdown) {
                    updatePosition();
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [selectedOption, searchable, isOpen]);

    const filteredOptions = searchable
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    const handleToggle = (e) => {
        e.stopPropagation();
        const nextState = !isOpen;
        setIsOpen(nextState);

        if (nextState && searchable) {
            setSearchTerm(''); // Clear to search fresh
        }
    };

    return (
        <div className={`relative w-full`} ref={containerRef}>
            {/* Trigger Container */}
            <div
                onClick={handleToggle}
                className={`w-full h-14 bg-white/5 border ${isOpen ? 'border-cyan-500/50 bg-white/10 ring-1 ring-cyan-500/30' : 'border-white/10'} rounded-2xl px-5 flex items-center justify-between cursor-pointer transition-all hover:bg-white/10 group shadow-lg`}
            >
                {searchable ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            ref={inputRef}
                            type="text"
                            className="bg-transparent border-none outline-none text-white text-base font-bold tracking-tight w-full placeholder-gray-500 cursor-text"
                            placeholder={placeholder}
                            value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : '')}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                ) : (
                    <span className={`text-base font-bold tracking-tight truncate flex-1 pr-2 ${!selectedOption ? 'text-gray-500' : 'text-white'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                )}

                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="text-gray-600 group-hover:text-blue-400 transition-colors shrink-0 ml-2"
                >
                    <ChevronDown size={14} />
                </motion.div>
            </div>

            {/* Dropdown Menu via Portal */}
            {portalContainer && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="select-dropdown"
                            data-select-content="true"
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            style={dropdownStyle}
                            className="bg-[#111827] border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl p-1.5 mt-1"
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar overscroll-contain pr-1">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChange(option.value);
                                                setIsOpen(false);
                                                if (searchable) setSearchTerm(option.label);
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mb-1 last:mb-0 ${value === option.value
                                                ? 'bg-blue-600/20 text-blue-400 font-black border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                                : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0 px-1">
                                                {itemRenderer ? (
                                                    itemRenderer(option)
                                                ) : (
                                                    <span className="text-sm font-bold tracking-wide uppercase">{option.label}</span>
                                                )}
                                            </div>
                                            {value === option.value && <Check size={14} strokeWidth={3} className="shrink-0 ml-2" />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-500 text-[10px] font-black tracking-widest bg-white/5 rounded-xl m-1 uppercase">
                                        Nenhuma opção encontrada
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                portalContainer
            )}
        </div>
    );
};

export default PremiumSelect;
