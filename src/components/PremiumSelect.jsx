import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

const PremiumSelect = ({ options, value, onChange, placeholder = "Selecione...", className = "", searchable = false, itemRenderer = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Initial value for search term if searchable
    useEffect(() => {
        if (selectedOption && searchable && !isOpen) {
            setSearchTerm(selectedOption.label);
        } else if (!selectedOption && !isOpen) {
            setSearchTerm('');
        }
    }, [selectedOption, isOpen, searchable]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // Reset search term to selected value on close
                if (searchable && selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else if (searchable) {
                    setSearchTerm('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedOption, searchable]);

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
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Container */}
            <div
                onClick={handleToggle}
                className={`w-full bg-white/5 border ${isOpen ? 'border-cyan-500/50 bg-white/10' : 'border-white/10'} rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all hover:bg-white/10 group`}
            >
                {searchable ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            ref={inputRef}
                            type="text"
                            className="bg-transparent border-none outline-none text-white text-sm font-bold  tracking-wider w-full placeholder-gray-500 cursor-pointer"
                            placeholder={placeholder}
                            value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : '')}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <span className={`text-sm font-bold  tracking-wider truncate flex-1 pr-2 ${!selectedOption ? 'text-gray-500' : 'text-white'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                )}

                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="text-gray-500 group-hover:text-white transition-colors shrink-0"
                >
                    <ChevronDown size={18} />
                </motion.div>
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        className="absolute left-0 right-0 z-[500] bg-[#111827] border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-3xl p-1.5 mt-1"
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
                                        className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${value === option.value
                                            ? 'bg-blue-600/20 text-blue-400 font-black border border-blue-500/20'
                                            : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            {itemRenderer ? (
                                                itemRenderer(option)
                                            ) : (
                                                <span className="text-sm">{option.label}</span>
                                            )}
                                        </div>
                                        {value === option.value && <Check size={16} strokeWidth={3} className="shrink-0 ml-2" />}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-[10px] font-black  tracking-widest bg-white/5 rounded-xl m-1">
                                    Nenhuma opção encontrada
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PremiumSelect;
