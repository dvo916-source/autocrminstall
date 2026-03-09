import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const AddScriptModal = ({ isOpen, onClose, newScript, setNewScript, onSubmit, userRole }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm pointer-events-auto" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-white tracking-tighter">Novo Script</h3>
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors"><X /></button>
                    </div>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <input autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 font-bold text-sm text-white" placeholder="TÍTULO DO ATALHO" value={newScript.titulo} onChange={e => setNewScript({ ...newScript, titulo: e.target.value.toUpperCase() })} required />
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 font-medium text-sm h-32 resize-none text-white" placeholder="MENSAGEM..." value={newScript.mensagem} onChange={e => setNewScript({ ...newScript, mensagem: e.target.value })} required />
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 ml-4 tracking-widest uppercase">🔗 Link (Opcional)</label>
                            <input type="url" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 font-medium text-sm" placeholder="https://exemplo.com" value={newScript.link} onChange={e => setNewScript({ ...newScript, link: e.target.value })} />
                        </div>
                        {(userRole === 'master' || userRole === 'developer' || userRole === 'admin') && (
                            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                                <input type="checkbox" checked={newScript.isSystem} onChange={e => setNewScript({ ...newScript, isSystem: e.target.checked })} className="w-5 h-5 rounded accent-blue-500" />
                                <div className="flex-1"><span className="font-bold text-sm text-white">🔒 Script do Sistema</span></div>
                            </label>
                        )}
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 border-t border-white/10">Salvar Script</button>
                    </form>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

export const EditScriptModal = ({ isOpen, onClose, editingScript, setEditingScript, onSubmit }) => (
    <AnimatePresence>
        {isOpen && editingScript && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm pointer-events-auto" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto">
                    <h3 className="text-xl font-black text-white mb-6">Editar Script</h3>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <input autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold text-sm text-white outline-none focus:border-blue-500" value={editingScript.titulo} onChange={e => setEditingScript({ ...editingScript, titulo: e.target.value.toUpperCase() })} required />
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-medium text-sm h-32 resize-none text-white outline-none focus:border-blue-500" value={editingScript.mensagem} onChange={e => setEditingScript({ ...editingScript, mensagem: e.target.value })} required />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95">Atualizar</button>
                    </form>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);
