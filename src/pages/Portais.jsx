import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Power, PowerOff, CheckCircle2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../lib/supabase';

const Portais = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ nome: '', link: '' });

    // State for Confirm Modal
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, nome: null });

    useEffect(() => {
        loadItems();

        // IPC Listener for Realtime Refreshes
        try {
            const { ipcRenderer } = window.require('electron');
            const handleRefresh = (event, table) => {
                if (table === 'portais') {
                    console.log(`[Portais] Refreshing due to ${table} change...`);
                    loadItems();
                }
            };
            ipcRenderer.on('refresh-data', handleRefresh);
            return () => ipcRenderer.removeListener('refresh-data', handleRefresh);
        } catch (e) { }
    }, []);

    const loadItems = async () => {
        try {
            // ☁️ BUSCA NO SUPABASE (NUVEM)
            const { data, error } = await supabase
                .from('portais')
                .select('*')
                .order('nome');

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Erro ao carregar portais da nuvem:', err);
            // Fallback local se estiver offline? 
            try {
                const { ipcRenderer } = window.require('electron');
                const localData = await ipcRenderer.invoke('get-list', 'portais');
                setItems(localData);
            } catch (e) { }
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem.nome.trim()) return;
        try {
            const { ipcRenderer } = window.require('electron');
            // Salvamento Local (Cache) + Nuvem Automático (Main Process)
            await ipcRenderer.invoke('add-item', {
                table: 'portais',
                nome: newItem.nome.trim().toUpperCase(),
                link: newItem.link.trim()
            });
            setNewItem({ nome: '', link: '' });
            loadItems();
        } catch (err) { console.error(err); }
    };

    const toggleAtivo = async (nome, current) => {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-item', { table: 'portais', nome, ativo: !current });
            loadItems();
        } catch (err) { console.error(err); }
    };

    const handleExecuteDelete = async () => {
        if (!deleteModal.nome) return;
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('delete-item', { table: 'portais', nome: deleteModal.nome });
            loadItems();
            setDeleteModal({ isOpen: false, nome: null });
        } catch (err) { console.error(err); }
    };

    const confirmDelete = (nome) => {
        setDeleteModal({ isOpen: true, nome });
    };

    return (
        <div className="w-full space-y-6 pb-20 px-2 lg:px-4">
            <div className="bg-glass-100 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Globe size={120} />
                </div>

                <div className="relative z-10 w-full">
                    <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        GESTÃO DE PORTAIS
                    </h2>
                    <p className="text-gray-400 text-sm tracking-widest  mt-1">Configure as origens dos seus leads</p>

                    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 mt-8 w-full">
                        <input
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-bold placeholder:text-gray-600 min-w-0"
                            placeholder="NOME DO PORTAL (EX: WEB MOTORS)..."
                            value={newItem.nome}
                            onChange={e => setNewItem({ ...newItem, nome: e.target.value })}
                            required
                        />
                        <div className="flex-1 flex gap-2 min-w-0">
                            <input
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-medium text-sm placeholder:text-gray-600 min-w-0"
                                placeholder="LINK (https://...)"
                                value={newItem.link}
                                onChange={e => setNewItem({ ...newItem, link: e.target.value })}
                            />
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 px-8 rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20  text-sm shrink-0"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {items.map((item) => (
                    <motion.div
                        layout
                        key={item.nome}
                        className={`group relative p-6 rounded-[2rem] border transition-all duration-300 overflow-hidden ${item.ativo
                            ? 'bg-glass-100 border-white/5 hover:bg-glass-200'
                            : 'bg-red-900/5 border-red-500/10 opacity-60'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${item.ativo ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-xl tracking-tight  text-white">{item.nome}</h4>

                                    <div className="flex flex-col gap-1 mt-1">
                                        <span className="text-[10px] font-bold  tracking-widest text-gray-500 flex items-center gap-1">
                                            {item.ativo ? <span className="text-green-400">● ATIVO</span> : <span className="text-red-400">● INATIVO</span>}
                                        </span>
                                        {item.link && (
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1  hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink size={10} /> Acessar Link Externo
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleAtivo(item.nome, item.ativo)}
                                    className={`p-3 rounded-xl transition-all ${item.ativo
                                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        }`}
                                    title={item.ativo ? "Desativar" : "Ativar"}
                                >
                                    {item.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                                </button>

                                <button
                                    onClick={() => confirmDelete(item.nome)}
                                    className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                    title="Excluir Portal"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {items.length === 0 && !loading && (
                <div className="text-center py-20 bg-glass-100 rounded-[2.5rem] border border-dashed border-white/10">
                    <Globe size={48} className="mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-500 font-bold  tracking-widest">Nenhum portal cadastrado ainda</p>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleExecuteDelete}
                title="Remover Portal?"
                message={`Tem certeza que deseja remover "${deleteModal.nome}"? Esta ação removerá o portal das opções de cadastro.`}
                confirmText="Sim, Remover"
                cancelText="Cancelar"
                isDestructive={true}
            />
        </div>
    );
};

export default Portais;
