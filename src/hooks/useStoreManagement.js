import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../context/LojaContext';
import { maskCPF } from '../lib/utils';
import { electronAPI } from '@/lib/electron-api';
import { SYSTEM_MODULES } from '../constants/modules';

export const useStoreManagement = () => {
    const { lojas, currentLoja, switchLoja, refreshLojas } = useLoja();
    const navigate = useNavigate();

    // 🧠 ESTADOS LOCAIS
    const [isAdding, setIsAdding] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [configStore, setConfigStore] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ nome: '', logo_url: '' });
    const [emptyStoreAlert, setEmptyStoreAlert] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [cpfError, setCpfError] = useState('');

    // Dados para a NOVA loja (Wizard)
    const [newStore, setNewStore] = useState({
        nome: '',
        endereco: '',
        logo_url: '',
        modulos: SYSTEM_MODULES.filter(m => !m.disabled).map(m => m.id)
    });

    // Dados para o PRIMEIRO Administrador
    const [newAdmin, setNewAdmin] = useState({
        nome_completo: '',
        cpf: '',
        email: '',
        password: ''
    });

    // 🔒 Bloqueio de Scroll
    useEffect(() => {
        if (isAdding || configStore || emptyStoreAlert) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isAdding, configStore, emptyStoreAlert]);

    // 🔍 FILTRAGEM DINÂMICA MEMOIZADA
    const filteredLojas = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return lojas.filter(l =>
            l.nome.toLowerCase().includes(term) ||
            l.id.toLowerCase().includes(term)
        );
    }, [lojas, searchTerm]);

    // 🚀 NAVEGAÇÃO INTELIGENTE
    const getFirstAvailableModulePath = useCallback((lojaDestino) => {
        let mods = [];
        try {
            mods = typeof lojaDestino.modulos === 'string' ? JSON.parse(lojaDestino.modulos || '[]') : (lojaDestino.modulos || []);
        } catch (e) { mods = []; }

        const validMods = mods.filter(m => SYSTEM_MODULES.some(av => av.id === m && !av.disabled));
        if (!validMods || validMods.length === 0) return null;

        const priorityMap = ['diario', 'whatsapp', 'estoque', 'crm', 'portais', 'usuarios'];
        const firstMod = priorityMap.find(m => validMods.includes(m)) || '';
        return firstMod ? `/${firstMod}` : '/';
    }, []);

    const handleAcessarLoja = useCallback(async (lojaDestino) => {
        const targetPath = getFirstAvailableModulePath(lojaDestino);

        if (!targetPath) {
            setEmptyStoreAlert(lojaDestino);
            return;
        }

        setLoading(true);
        try {
            await electronAPI.invoke('sync-essential', lojaDestino.id);
            switchLoja(lojaDestino);
            navigate(targetPath);
        } catch (err) {
            console.error('[Central] Erro ao sincronizar loja:', err);
            switchLoja(lojaDestino);
            navigate(targetPath);
        } finally {
            setLoading(false);
        }
    }, [navigate, switchLoja, getFirstAvailableModulePath]);

    // 🚀 TRANSAÇÃO ATÔMICA: CRIAR LOJA + ADMIN
    const handleCreateStoreComplete = async () => {
        setLoading(true);
        setCpfError('');

        try {
            if (newAdmin.cpf && newAdmin.cpf.trim()) {
                const cpfVal = await electronAPI.invoke('validate-cpf', newAdmin.cpf);
                if (!cpfVal.valid) {
                    setCpfError(cpfVal.message);
                    setWizardStep(2);
                    setLoading(false);
                    return;
                }
            }

            const result = await electronAPI.invoke('create-loja', { storeData: newStore, adminData: newAdmin });

            if (result.success) {
                await refreshLojas();
                setIsAdding(false);
                setWizardStep(1);
                setNewStore({
                    nome: '', endereco: '', logo_url: '',
                    modulos: SYSTEM_MODULES.filter(m => !m.disabled).map(m => m.id)
                });
                setNewAdmin({ nome_completo: '', cpf: '', email: '', password: '' });
                window.dispatchEvent(new CustomEvent('show-notification', {
                    detail: { message: result.message, type: 'success' }
                }));
            }
        } catch (err) {
            console.error("Erro ao criar loja:", err);
            window.dispatchEvent(new CustomEvent('show-notification', {
                detail: { message: "Erro ao criar loja", type: 'error' }
            }));
        } finally {
            setLoading(false);
        }
    };

    const handleStartEdit = (loja) => {
        setEditingId(loja.id);
        setEditForm({ nome: loja.nome, logo_url: loja.logo_url || '' });
    };

    const handleSaveEdit = async (lojaId) => {
        setLoading(true);
        try {
            const originalLoja = lojas.find(l => l.id === lojaId);
            await electronAPI.invoke('update-store', { ...originalLoja, nome: editForm.nome, logo_url: editForm.logo_url, ativo: originalLoja.ativo !== 0 });
            await refreshLojas();
            setEditingId(null);
        } catch (err) {
            console.error("Erro ao salvar:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateModules = async (lojaId, modules) => {
        setLoading(true);
        try {
            await electronAPI.invoke('update-loja-modules', { lojaId, modules });
            await refreshLojas();
            setConfigStore(null);
        } catch (err) {
            console.error("Erro ao atualizar módulos:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (id === 'irw-motors-main') return;
        const confirm = window.confirm("Deseja realmente excluir esta loja? Todos os dados vinculados serão inacessíveis.");
        if (confirm) {
            try {
                await electronAPI.invoke('delete-store', id);
                await refreshLojas();
            } catch (err) {
                console.error("Erro ao excluir:", err);
            }
        }
    };

    const handleSyncAll = async () => {
        setLoading(true);
        try {
            const res = await electronAPI.invoke('full-cloud-sync', null);
            if (res.success) {
                await refreshLojas();
            } else {
                alert("Erro ao sincronizar lojas: " + res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return {
        state: {
            lojas: filteredLojas,
            currentLoja,
            isAdding,
            wizardStep,
            configStore,
            editingId,
            editForm,
            emptyStoreAlert,
            searchTerm,
            loading,
            newStore,
            newAdmin,
            cpfError
        },
        actions: {
            setIsAdding,
            setWizardStep,
            setConfigStore,
            setEditingId,
            setEditForm,
            setEmptyStoreAlert,
            setSearchTerm,
            setNewStore,
            setNewAdmin,
            handleAcessarLoja,
            handleCreateStoreComplete,
            handleStartEdit,
            handleSaveEdit,
            handleUpdateModules,
            handleDelete,
            handleSyncAll,
            switchLoja,
            maskCPF
        }
    };
};
