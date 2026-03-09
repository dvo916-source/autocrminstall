// --- PÁGINA DE GESTÃO DE UNIDADES (CENTRAL DE LOJAS) ---
// Esta página lida com a criação, edição e exclusão de lojas no sistema multitenant.
// REFATORADA: Padrão Headless Hook e Componentização Modular.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutGrid, Search, Plus, Database, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Hooks & Context
import { useStoreManagement } from '../hooks/useStoreManagement';

// Components
import ConnectionStatus from '../components/ConnectionStatus';
import StoreCard from '../components/StoreManagement/StoreCard';
import StoreWizard from '../components/StoreManagement/StoreWizard';
import ModuleListModal from '../components/StoreManagement/ModuleListModal';
import EmptyStoreAlert from '../components/StoreManagement/EmptyStoreAlert';
import Button from '../components/ui/Button';

const StoreManagement = () => {
    const navigate = useNavigate();
    const { state, actions } = useStoreManagement();

    const {
        lojas, currentLoja, isAdding, wizardStep,
        configStore, editingId, editForm, emptyStoreAlert,
        searchTerm, loading, newStore, newAdmin, cpfError
    } = state;

    const {
        setIsAdding, setWizardStep, setConfigStore,
        setEditingId, setEditForm, setEmptyStoreAlert,
        setSearchTerm, setNewStore, setNewAdmin,
        handleAcessarLoja, handleCreateStoreComplete,
        handleStartEdit, handleSaveEdit,
        handleUpdateModules, handleDelete,
        handleSyncAll, switchLoja, maskCPF
    } = actions;

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        }
    };

    return (
        <div className="relative min-h-screen bg-[#0f172a] overflow-x-hidden selection:bg-blue-500/30">
            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden group">
                                <LayoutGrid size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none font-inter">
                                CENTRAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">DE LOJAS</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 pl-1">
                            <div className="w-8 h-[2px] bg-blue-500/40 rounded-full" />
                            <p className="text-slate-500 font-black text-[9px] uppercase tracking-[0.4em] font-inter">
                                Gestão Multitenant VexCORE
                            </p>
                        </div>
                    </motion.div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative group flex-grow md:flex-grow-0">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="LOCALIZAR UNIDADE..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-72 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black tracking-widest text-white focus:border-blue-500/30 focus:bg-slate-900/80 transition-all outline-none placeholder:text-slate-700 font-inter"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="purple"
                                onClick={handleSyncAll}
                                disabled={loading}
                                icon={loading ? Loader2 : Database}
                                className={loading ? 'opacity-70' : ''}
                            >
                                SYNC NUVEM
                            </Button>

                            <Button
                                variant="primary"
                                onClick={() => setIsAdding(true)}
                                icon={Plus}
                            >
                                CADASTRAR LOJA
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Connection Status Indicator */}
                <div className="absolute top-6 right-8 opacity-50 hover:opacity-100 transition-opacity">
                    <ConnectionStatus />
                </div>

                {/* Stores Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {lojas.map((loja) => (
                            <StoreCard
                                key={loja.id}
                                loja={loja}
                                currentLoja={currentLoja}
                                editingId={editingId}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                handleStartEdit={handleStartEdit}
                                handleSaveEdit={handleSaveEdit}
                                setConfigStore={setConfigStore}
                                handleAcessarLoja={handleAcessarLoja}
                                switchLoja={switchLoja}
                                handleDelete={handleDelete}
                                navigate={navigate}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {lojas.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="col-span-full py-32 flex flex-col items-center justify-center text-center relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />
                            <div className="relative">
                                <div className="w-32 h-32 bg-slate-900 border border-white/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                    <Search size={48} className="text-slate-700 group-hover:text-blue-500/50 transition-all duration-500 group-hover:scale-110" />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border border-dashed border-white/10 rounded-full scale-150 opacity-20"
                                    />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4 italic tracking-tighter uppercase font-inter">ARQUIVO <span className="text-blue-500">INDISPONÍVEL</span></h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed font-inter">
                                Nenhum registro encontrado para este critério. <br />
                                Aguardando nova digitalização ou comando...
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </div >

            {/* Modals & Overlays */}
            <StoreWizard
                isOpen={isAdding}
                onClose={() => setIsAdding(false)}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                newStore={newStore}
                setNewStore={setNewStore}
                newAdmin={newAdmin}
                setNewAdmin={setNewAdmin}
                loading={loading}
                cpfError={cpfError}
                maskCPF={maskCPF}
                handleAddStore={handleCreateStoreComplete}
            />

            <ModuleListModal
                configStore={configStore}
                setConfigStore={setConfigStore}
                loading={loading}
                handleUpdateModules={handleUpdateModules}
            />

            <EmptyStoreAlert
                emptyStoreAlert={emptyStoreAlert}
                setEmptyStoreAlert={setEmptyStoreAlert}
                setConfigStore={setConfigStore}
            />

        </div >
    );
};

export default StoreManagement;
