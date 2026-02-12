import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

const PremiumSelect = ({ options, value, onChange, placeholder = "Selecione...", className = "", searchable = false, creatable = false, multiSelect = false, autoCapitalize = false, itemRenderer = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [portalContainer, setPortalContainer] = useState(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    const toTitleCase = (str) => {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    };

    // Se for multiSelect, value deve ser um array ou string separada por vírgula
    const getValues = () => {
        if (!multiSelect) return value ? [value] : [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
        return [];
    };

    const currentValues = getValues();
    const selectedOptions = options.filter(opt => currentValues.includes(opt.value));
    const selectedOption = !multiSelect ? selectedOptions[0] : null;

    // Initial value for search term if searchable
    useEffect(() => {
        if (!multiSelect) {
            if (selectedOption && searchable && !isOpen) {
                setSearchTerm(selectedOption.label);
            } else if (!selectedOption && !isOpen) {
                setSearchTerm('');
            }
        }
    }, [selectedOption, isOpen, searchable, multiSelect]);

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
        if (isOpen && (searchable || creatable) && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, searchable, creatable]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideInput = containerRef.current && containerRef.current.contains(event.target);
            const isInsideDropdown = event.target.closest('[data-select-content="true"]');

            if (!isInsideInput && !isInsideDropdown) {
                if (isOpen) {
                    // Se for creatable e tiver algo digitado, vamos tentar "assumir" esse valor
                    if (creatable && searchTerm.trim() && !multiSelect) {
                        const exactMatch = options.find(opt => opt.label.toLowerCase() === searchTerm.trim().toLowerCase());
                        if (exactMatch) {
                            onChange(exactMatch.value);
                            setSearchTerm(exactMatch.label);
                        } else {
                            // É um item novo
                            onChange(searchTerm.trim());
                        }
                    } else if (searchable && selectedOption && !multiSelect) {
                        setSearchTerm(selectedOption.label);
                    } else if (searchable && !multiSelect) {
                        setSearchTerm('');
                    }
                    setIsOpen(false);
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
    }, [selectedOption, searchable, isOpen, creatable, searchTerm, multiSelect]);

    const filteredOptions = searchable
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    const showCreatable = creatable && searchTerm && !options.some(opt => opt.label.toLowerCase() === searchTerm.toLowerCase()) && !multiSelect;

    const handleToggle = (e) => {
        e.stopPropagation();

        // Se já estiver aberto e o clique for no input, não fecha
        if (isOpen && (creatable || searchable)) return;

        const nextState = !isOpen;
        setIsOpen(nextState);

        if (nextState && (searchable || creatable)) {
            // Ao abrir, se já temos um valor selecionado que NÃO está nas opções (item customizado),
            // inicializamos o searchTerm com ele em vez de limpar.
            if (value && !selectedOption && !multiSelect) {
                setSearchTerm(value);
            } else {
                setSearchTerm(''); // Clear to search fresh
            }
        }
    };

    const handleOptionClick = (optionValue) => {
        if (multiSelect) {
            let nextValues;
            if (currentValues.includes(optionValue)) {
                nextValues = currentValues.filter(v => v !== optionValue);
            } else {
                nextValues = [...currentValues, optionValue];
            }
            onChange(nextValues);
        } else {
            onChange(optionValue);
            setIsOpen(false);
            const opt = options.find(o => o.value === optionValue);
            if (opt && (searchable || creatable)) setSearchTerm(opt.label);
        }
    };

    const getTriggerDisplay = () => {
        if (multiSelect) {
            if (selectedOptions.length === 0) return placeholder;
            if (selectedOptions.length === 1) return selectedOptions[0].label;
            return `${selectedOptions.length} Selecionados`;
        }
        return selectedOption ? selectedOption.label : placeholder;
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            {/* Trigger Container */}
            <div
                onClick={handleToggle}
                className={`w-full h-14 bg-white/5 border ${isOpen ? 'border-cyan-500/50 bg-white/10 ring-1 ring-cyan-500/30' : 'border-white/10'} rounded-2xl px-5 flex items-center justify-between cursor-pointer transition-all hover:bg-white/10 group shadow-lg`}
            >
                {(searchable || creatable) && !multiSelect ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            ref={inputRef}
                            type="text"
                            className="bg-transparent border-none outline-none text-white text-base font-bold tracking-tight w-full placeholder-gray-500 cursor-text"
                            placeholder={placeholder}
                            value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : value || '')}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchTerm(autoCapitalize ? toTitleCase(val) : val);
                            }}
                        />
                    </div>
                ) : (
                    <span className={`text-base font-bold tracking-tight truncate flex-1 pr-2 ${currentValues.length === 0 ? 'text-gray-500' : 'text-white'}`}>
                        {getTriggerDisplay()}
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
                                {showCreatable && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOptionClick(searchTerm);
                                        }}
                                        className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mb-1 bg-cyan-600/10 text-cyan-400 font-bold border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                                <Search size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase tracking-widest text-white">Usar: {searchTerm}</span>
                                                <span className="text-[9px] font-bold text-cyan-400/70 uppercase tracking-tight">Manual / Fora de Estoque</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionClick(option.value);
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mb-1 last:mb-0 ${currentValues.includes(option.value)
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
                                            {currentValues.includes(option.value) && (
                                                multiSelect ? (
                                                    <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                                        <Check size={10} strokeWidth={4} className="text-white" />
                                                    </div>
                                                ) : (
                                                    <Check size={14} strokeWidth={3} className="shrink-0 ml-2" />
                                                )
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    !showCreatable && (
                                        <div className="p-4 text-center text-gray-500 text-[10px] font-black tracking-widest bg-white/5 rounded-xl m-1 uppercase">
                                            Nenhuma opção encontrada
                                        </div>
                                    )
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
