import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Clock, AlertCircle, Phone, MessageCircle, StickyNote, Plus, Calendar, Check } from 'lucide-react';
import { useLoja } from '../context/LojaContext';

const NewNoteModal = ({ isOpen, onClose, onSuccess, initialDate, user, targetUser, editingNote = null }) => {
    const { currentLoja } = useLoja();
    const [note, setNote] = useState('');
    const [noteType, setNoteType] = useState('Lembrar'); // Default type
    const [customType, setCustomType] = useState('');
    const [isCustomType, setIsCustomType] = useState(false);

    // Alert State
    const [hasAlert, setHasAlert] = useState(false);
    // Initialize alertDate with the selected 'initialDate' but current time
    const [alertDateTime, setAlertDateTime] = useState(() => {
        if (editingNote) return new Date(editingNote.data_nota);
        if (!initialDate) return new Date();
        const d = new Date(initialDate);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes());
        return d;
    });

    // Populate when editing
    React.useEffect(() => {
        if (isOpen && editingNote) {
            // Regex to extract [TYPE] text
            const match = editingNote.texto.match(/^\[(.*?)\]\s*(.*)$/);
            if (match) {
                const type = match[1];
                const content = match[2];

                const isStdType = NOTE_TYPES.some(t => t.id.toLowerCase() === type.toLowerCase());
                if (isStdType) {
                    setNoteType(toTitleCase(type));
                    setIsCustomType(false);
                } else {
                    setCustomType(toTitleCase(type));
                    setIsCustomType(true);
                }
                setNote(content);
            } else {
                setNote(editingNote.texto);
            }

            if (editingNote.data_nota) {
                const d = new Date(editingNote.data_nota);
                setAlertDateTime(d);
                setHasAlert(true);
            }
        } else if (isOpen) {
            // Reset for new note
            setNote('');
            setNoteType('Lembrar');
            setIsCustomType(false);
            setHasAlert(false);
        }
    }, [isOpen, editingNote]);

    function toTitleCase(str) {
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    const [loading, setLoading] = useState(false);

    // Types Configuration
    const NOTE_TYPES = [
        { id: 'Lembrar', label: 'Lembrar', icon: StickyNote, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
        { id: 'Ligar', label: 'Ligar', icon: Phone, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
        { id: 'Whatsapp', label: 'Whatsapp', icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    ];

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!note.trim()) return;

        try {
            setLoading(true);
            const { ipcRenderer } = window.require('electron');

            // Construct Final Text with Type
            const typeLabel = isCustomType ? (customType.trim() || 'Nota') : noteType;
            const finalText = `[${typeLabel.toUpperCase()}] ${note}`;

            // Calculate Date
            // If hasAlert is true, use the user-picked alertDateTime
            // If false, use the initialDate passed to the modal (current view date)

            let finalDateStr;
            if (hasAlert && alertDateTime) {
                finalDateStr = alertDateTime.toISOString();
            } else {
                // Default to the selected calendar day
                // Use current time or default to 09:00 if just a "day note"
                const d = new Date(initialDate);
                const now = new Date();
                d.setHours(now.getHours(), now.getMinutes(), 0);
                finalDateStr = d.toISOString();
            }

            // Electron Interact
            if (editingNote) {
                await ipcRenderer.invoke('update-nota', {
                    id: editingNote.id,
                    texto: finalText,
                    data_nota: finalDateStr,
                    lojaId: currentLoja?.id
                });
            } else {
                await ipcRenderer.invoke('add-nota', {
                    sdr_username: targetUser || user.username,
                    texto: finalText,
                    data_nota: finalDateStr,
                    lojaId: currentLoja?.id
                });
            }

            onSuccess();
            setNote('');
            setHasAlert(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl z-10"
                >
                    {/* Header */}
                    <div className="p-6 pb-2 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <Save size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white leading-none">{editingNote ? 'Editar Nota' : 'Nova Nota'}</h3>
                                <p className="text-gray-500 text-xs mt-1">
                                    {initialDate ? initialDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Nova Anotação'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col gap-4">

                        {/* TYPE SELECTOR */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {NOTE_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => { setNoteType(type.id); setIsCustomType(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${noteType === type.id && !isCustomType ? `${type.bg} ${type.border} ${type.color} shadow-[0_0_10px_rgba(0,0,0,0.2)]` : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                >
                                    <type.icon size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wide">{type.label}</span>
                                </button>
                            ))}

                            {/* Custom Type Toggle */}
                            <button
                                onClick={() => setIsCustomType(true)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isCustomType ? 'bg-purple-400/10 border-purple-400/20 text-purple-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                            >
                                <Plus size={14} />
                                <span className="text-xs font-bold uppercase tracking-wide">Outro</span>
                            </button>
                        </div>

                        {/* Custom Type Input */}
                        <AnimatePresence>
                            {isCustomType && (
                                <motion.input
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    type="text"
                                    placeholder="Defina o tipo (ex: Urgentíssimo)"
                                    className="w-full bg-black/20 border border-purple-500/30 rounded-xl p-3 text-purple-200 text-sm font-bold placeholder-purple-500/50 focus:outline-none focus:border-purple-500 uppercase tracking-wider"
                                    value={customType}
                                    onChange={e => setCustomType(e.target.value)}
                                    autoFocus
                                />
                            )}
                        </AnimatePresence>

                        <textarea
                            placeholder="O que você precisa lembrar?"
                            className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        {/* Alert Logic - FIXED */}
                        <div className={`flex flex-col gap-3 bg-white/5 rounded-xl p-3 border transition-colors ${hasAlert ? 'border-cyan-500/30' : 'border-white/5'}`}>
                            <div
                                className={`flex items-center gap-2 cursor-pointer select-none ${hasAlert ? 'text-cyan-400' : 'text-gray-400'}`}
                                onClick={() => setHasAlert(!hasAlert)}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasAlert ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'}`}>
                                    {hasAlert && <Check size={12} className="text-black" strokeWidth={3} />}
                                </div>
                                <span className="text-sm font-bold uppercase tracking-wide">Definir Alerta / Data?</span>
                            </div>

                            {/* Full Date/Time Picker when Alert is Active */}
                            {hasAlert && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5"
                                >
                                    {/* Date */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase">Data</label>
                                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/10">
                                            <Calendar size={14} className="text-cyan-500" />
                                            <input
                                                type="date"
                                                className="bg-transparent text-xs font-bold text-white focus:outline-none w-full [color-scheme:dark]"
                                                value={alertDateTime.toISOString().substring(0, 10)}
                                                onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const newDate = new Date(alertDateTime);
                                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                                    newDate.setFullYear(y, m - 1, d);
                                                    setAlertDateTime(newDate);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase">Horário</label>
                                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/10">
                                            <Clock size={14} className="text-cyan-500" />
                                            <input
                                                type="time"
                                                className="bg-transparent text-xs font-bold text-white focus:outline-none w-full [color-scheme:dark]"
                                                value={alertDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                onChange={(e) => {
                                                    const [h, m] = e.target.value.split(':').map(Number);
                                                    const newDate = new Date(alertDateTime);
                                                    newDate.setHours(h, m);
                                                    setAlertDateTime(newDate);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <p className="col-span-2 text-[10px] text-cyan-500/60 italic text-center mt-1">
                                        * A nota será movida para o dia {alertDateTime.toLocaleDateString('pt-BR')}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!note.trim() || loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : 'Salvar Nota'}
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewNoteModal;
