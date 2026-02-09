import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Shield, Plus, Power, PowerOff, UserPlus, Trash2, Key, CheckCircle2, AlertCircle, Phone, User as UserIcon, Mail, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';
import PremiumSelect from '../components/PremiumSelect';
import { useLoja } from '../context/LojaContext';

const AVAILABLE_PERMISSIONS = [
    { id: '/diario', label: 'Agenda Diária (Diário)', icon: 'BookOpen' },
    { id: '/dashboard', label: 'Dashboard (Painel)', icon: 'BarChart3' },
    { id: '/whatsapp', label: 'WhatsApp', icon: 'MessageSquare' },
    { id: '/estoque', label: 'Tabela de Estoque', icon: 'Car' },
    { id: '/visitas', label: 'Gestão de Visitas', icon: 'Users' },
    { id: '/metas', label: 'Metas & Resultados', icon: 'Target' },
    { id: '/portais', label: 'Config. Portais', icon: 'Globe' },
    { id: '/ia-chat', label: 'IA Chat (Configuração)', icon: 'Bot' },
    { id: '/usuarios', label: 'Gestão de Usuários', icon: 'Shield' },
];

const Usuarios = ({ user }) => {
    const { currentLoja } = useLoja();
    const [vendedores, setVendedores] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

    // Modal Control
    const [modal, setModal] = useState({ open: false, type: '', data: null });

    // Vendedor Form (Nome, Sobrenome, Telefone)
    const [newVendedor, setNewVendedor] = useState({ nome: '', sobrenome: '', telefone: '' });

    const [showUserForm, setShowUserForm] = useState(false); // Collapsible State

    // Usuarios Form
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        role: 'sdr',
        nome_completo: '',
        email: '',
        whatsapp: '',
        cpf: '',
        ativo: 1,
        permissions: [] // Default permissions for new users (selected manually)
    });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ text: '', color: '' });

    // Busca e Filtros
    const [searchUsuario, setSearchUsuario] = useState('');


    const loadAll = useCallback(async () => {
        try {
            const { ipcRenderer } = window.require('electron');
            // 🚀 FALLBACK: Se currentLoja não estiver definida, usa a loja padrão
            const lojaId = currentLoja?.id || 'irw-motors-main';

            const [vends, usersList] = await Promise.all([
                ipcRenderer.invoke('get-list', { table: 'vendedores', lojaId }),
                ipcRenderer.invoke('get-list-users', lojaId)
            ]);
            setVendedores(vends || []);
            const parsedUsers = (usersList || []).map(u => ({
                ...u,
                permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || [])
            }));
            setUsuarios(parsedUsers);
        } catch (err) {
            console.error("Error loading all data:", err);
        } finally {
            setLoading(false);
        }
    }, [currentLoja]);

    useEffect(() => {
        loadAll();

        const { ipcRenderer } = window.require('electron');
        const handleRefresh = (event, table) => {
            if (table === 'usuarios' || table === 'vendedores') {
                loadAll();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setEditModal({ open: false, user: null });
                setModal({ open: false, type: '', data: null });
            }
        };

        ipcRenderer.on('refresh-data', handleRefresh);
        window.addEventListener('keydown', handleEscape);

        return () => {
            ipcRenderer.removeListener('refresh-data', handleRefresh);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [loadAll]);

    const showMsg = (text, type = 'success') => {
        setStatusMsg({ text, type });
        setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
    };

    const handleAddVendedor = useCallback(async (e, customData = null) => {
        if (e) e.preventDefault();
        const data = customData || newVendedor;
        if (!data?.nome?.trim()) return;
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('add-item', {
                table: 'vendedores',
                nome: data.nome.trim().toUpperCase(),
                sobrenome: (data.sobrenome || '').trim().toUpperCase(),
                telefone: (data.telefone || '').trim(),
                loja_id: currentLoja?.id
            });
            setNewVendedor({ nome: '', sobrenome: '', telefone: '' });
            showMsg('Consultor adicionado com sucesso!');
            loadAll();
        } catch (err) { showMsg('Erro ao adicionar', 'error'); }
    }, [newVendedor, loadAll]);

    const toggleVendedor = async (nome, current) => {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-item', { table: 'vendedores', nome, ativo: !current, loja_id: currentLoja?.id });
            loadAll();
        } catch (err) { console.error(err); }
    };

    // Funções de validação
    const validateUsername = (value) => {
        if (value.length < 3) return 'Mínimo 3 caracteres';
        if (!/^[a-z0-9_]+$/.test(value)) return 'Apenas letras minúsculas, números e _';
        return '';
    };

    const getPasswordStrength = (pwd) => {
        if (pwd.length === 0) return { text: '', color: '' };
        if (pwd.length < 6) return { text: 'Fraca', color: 'text-red-400' };
        if (pwd.length < 10) return { text: 'Média', color: 'text-yellow-400' };
        return { text: 'Forte', color: 'text-green-400' };
    };

    const formatPhone = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return value;
    };

    const formatCPF = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return value;
    };

    const handleAddUser = async (e) => {
        e.preventDefault();

        if (newUser.password.length < 6) {
            showMsg('Senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }
        if (newUser.password !== confirmPassword) {
            showMsg('Senhas não correspondem', 'error');
            return;
        }

        try {
            const { ipcRenderer } = window.require('electron');

            await ipcRenderer.invoke('add-user', { ...newUser, loja_id: currentLoja?.id });
            showMsg('Novo usuário cadastrado!');

            // Reset
            setNewUser({
                username: '', password: '', role: 'sdr',
                nome_completo: '', email: '', whatsapp: '', cpf: '', ativo: 1,
                permissions: ['/', '/whatsapp', '/estoque', '/visitas', '/metas', '/diario']
            });
            setConfirmPassword('');
            loadAll();
        } catch (err) {
            console.error(err);
            const msg = err.message ? err.message : 'Usuário já existe ou erro na rede';
            showMsg(msg.includes('Error inviting') ? msg : 'Erro: ' + msg, 'error');
        }
    };

    const handleEditUser = (u) => {
        let parsedPerms = [];
        try {
            parsedPerms = (typeof u.permissions === 'string') ? JSON.parse(u.permissions) : (u.permissions || []);
        } catch (e) { parsedPerms = []; }

        setEditModal({
            open: true,
            user: { ...u, password: '', permissions: parsedPerms }
        });
        setConfirmPassword('');
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const u = editModal.user;

        if (!u.email || !u.nome_completo) {
            showMsg('Nome e Email são obrigatórios', 'error');
            return;
        }

        if (u.password && u.password.length > 0) {
            if (u.password.length < 6) {
                showMsg('A nova senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }
            if (u.password !== confirmPassword) {
                showMsg('As senhas não conferem', 'error');
                return;
            }
        }

        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('update-user', { ...u, loja_id: currentLoja?.id });
            showMsg('Usuário atualizado com sucesso!');
            setEditModal({ open: false, user: null });
            loadAll();
        } catch (err) {
            showMsg('Erro ao atualizar usuário', 'error');
        }
    };

    const toggleUserStatus = async (userObj) => {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('update-user', {
                ...userObj,
                ativo: !userObj.ativo,
                loja_id: currentLoja?.id
            });
            showMsg(userObj.ativo ? 'Usuário pausado' : 'Usuário reativado');
            loadAll();
        } catch (err) {
            showMsg('Erro ao alterar status', 'error');
        }
    };

    const executeDelete = async () => {
        const { type, data } = modal;
        try {
            const { ipcRenderer } = window.require('electron');
            if (type === 'vendedor') {
                await ipcRenderer.invoke('delete-item', { table: 'vendedores', nome: data, loja_id: currentLoja?.id });
                showMsg('Consultor removido da lista!');
            } else if (type === 'usuario') {
                await ipcRenderer.invoke('delete-user', data);
                showMsg('Acesso removido com sucesso!');
            }
            loadAll();
        } catch (err) { showMsg('Erro ao excluir', 'error'); }
    };

    const isMaster = user?.role === 'master' || user?.role === 'developer';
    const isMasterOrAdmin = user?.role === 'master' || user?.role === 'admin' || user?.role === 'developer';

    const filteredUsuarios = useMemo(() => {
        return usuarios
            .filter(u => isMaster ? true : u.role !== 'developer')
            .filter(u => (u.username || '').toLowerCase().includes(searchUsuario.toLowerCase()));
    }, [usuarios, searchUsuario, isMaster]);

    return (
        <div className="w-full space-y-12 pb-20 relative px-2 lg:px-4">

            {/* Modal de Confirmação */}
            <ConfirmModal
                isOpen={modal.open}
                onClose={() => setModal({ open: false, type: '', data: null })}
                onConfirm={executeDelete}
                title="Atenção"
                message={
                    modal.type === 'vendedor'
                        ? `Deseja remover ${modal.data} da lista de consultores?`
                        : `Deseja permanentemente remover o acesso de ${modal.data}?`
                }
            />

            {/* Modal de EDIÇÃO DE USUÁRIO */}
            <EditUserModal
                isOpen={editModal.open}
                initialUser={editModal.user}
                onClose={() => setEditModal({ open: false, user: null })}
                onSuccess={(msg) => {
                    showMsg(msg);
                    setEditModal({ open: false, user: null });
                    loadAll();
                }}
                onError={(msg) => showMsg(msg, 'error')}
                isMaster={isMaster}
                isMasterOrAdmin={isMasterOrAdmin}
                isMasterOrAdmin={isMasterOrAdmin}
                formatPhone={formatPhone}
                currentLoja={currentLoja}
            />

            <AnimatePresence>
                {statusMsg.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-24 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                            }`}
                    >
                        {statusMsg.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        <span className="font-black  text-xs tracking-widest">{statusMsg.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* Gestão de Consultores (Vendedores de Salão) */}
                <div className="space-y-6">
                    <ConsultoresManager
                        vendedores={vendedores}
                        isMasterOrAdmin={isMasterOrAdmin}
                        handleAddVendedor={handleAddVendedor}
                        newVendedor={newVendedor}
                        setNewVendedor={setNewVendedor}
                        formatPhone={formatPhone}
                        toggleVendedor={toggleVendedor}
                        onDelete={(nome) => setModal({ open: true, type: 'vendedor', data: nome })}
                    />
                </div>

                {/* Gestão de Usuários do Sistema */}
                <div className="space-y-6">
                    <div className="bg-[#1a2233] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute bottom-[-10px] right-[-10px] p-8 opacity-[0.03] pointer-events-none transition-all">
                            <Shield size={120} />
                        </div>

                        <div className="flex justify-between items-center cursor-pointer relative z-20" onClick={() => setShowUserForm(!showUserForm)}>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                                    USUÁRIOS DO SISTEMA
                                </h2>
                                <p className="text-gray-400 text-[11px] tracking-widest mt-1 uppercase">Gestão de Contas e Permissões de Login</p>
                            </div>
                            <button className={`p-3 rounded-xl transition-all shadow-lg border border-white/5 ${showUserForm ? 'bg-blue-500/20 text-blue-400 rotate-45' : 'bg-[#131b29] text-gray-400 hover:text-blue-400 hover:border-blue-500/30'}`}>
                                <Plus size={20} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {showUserForm && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden relative z-10"
                                >
                                    <form onSubmit={handleAddUser} className="space-y-3 mt-8 pt-8 border-t border-white/5">
                                        <div className="relative group">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                            <input
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                                placeholder="NOME COMPLETO"
                                                value={newUser.nome_completo}
                                                onChange={e => setNewUser({ ...newUser, nome_completo: e.target.value.toUpperCase() })}
                                                required
                                            />
                                        </div>

                                        <div className="relative group">
                                            <input
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                                placeholder="CPF (OPCIONAL)"
                                                value={newUser.cpf}
                                                onChange={e => setNewUser({ ...newUser, cpf: formatCPF(e.target.value) })}
                                                maxLength={14}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                                <input
                                                    type="email"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                                    placeholder="EMAIL PARA ACESSO"
                                                    value={newUser.email}
                                                    onChange={e => setNewUser({ ...newUser, email: e.target.value.toLowerCase(), username: e.target.value.toLowerCase() })}
                                                    required
                                                />
                                            </div>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                                    placeholder="WHATSAPP / CELULAR"
                                                    value={newUser.whatsapp}
                                                    onChange={e => setNewUser({ ...newUser, whatsapp: formatPhone(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <input
                                                    type="password"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-cyan-500 transition-all font-medium text-sm"
                                                    placeholder="SENHA PROVISÓRIA"
                                                    value={newUser.password}
                                                    onChange={e => {
                                                        setNewUser({ ...newUser, password: e.target.value });
                                                        setPasswordStrength(getPasswordStrength(e.target.value));
                                                    }}
                                                    required
                                                />
                                                {passwordStrength.text && (
                                                    <p className={`text-[11px] ml-2 font-bold uppercase ${passwordStrength.color}`}>
                                                        Força: {passwordStrength.text}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <input
                                                    type="password"
                                                    className={`w-full bg-white/5 border ${confirmPassword && newUser.password !== confirmPassword ? 'border-red-500/50' : 'border-white/10'} rounded-2xl p-4 outline-none focus:border-cyan-500 transition-all font-medium text-sm`}
                                                    placeholder="CONFIRMAR SENHA"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <PremiumSelect
                                                className="flex-1"
                                                options={[
                                                    { value: 'sdr', label: 'PERFIL VENDEDOR (SDR)' },
                                                    ...(isMasterOrAdmin ? [{ value: 'admin', label: 'PERFIL ADMINISTRADOR' }] : []),
                                                    ...(isMaster ? [{ value: 'gerente', label: 'PERFIL GERENTE' }] : [])
                                                ]}
                                                value={newUser.role}
                                                onChange={val => setNewUser({ ...newUser, role: val })}
                                            />
                                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 rounded-2xl transition-all shadow-lg active:scale-95 text-white font-bold text-xs  tracking-widest">
                                                CADASTRAR
                                            </button>
                                        </div>
                                        {isMasterOrAdmin && (
                                            <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                                                <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-3 flex items-center gap-2 uppercase">
                                                    <Shield size={12} className="text-blue-400" /> Permissões do Usuário
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {AVAILABLE_PERMISSIONS.filter(p => {
                                                        const storeModules = currentLoja?.modulos ? (typeof currentLoja.modulos === 'string' ? JSON.parse(currentLoja.modulos) : currentLoja.modulos) : [];
                                                        const moduleKey = p.id.replace('/', '');
                                                        return storeModules.includes(moduleKey);
                                                    }).map((page) => {
                                                        const isChecked = newUser.permissions?.includes(page.id);
                                                        return (
                                                            <button
                                                                key={page.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = newUser.permissions || [];
                                                                    const newPerms = current.includes(page.id)
                                                                        ? current.filter(p => p !== page.id)
                                                                        : [...current, page.id];
                                                                    setNewUser({ ...newUser, permissions: newPerms });
                                                                }}
                                                                className={`text-[11px] font-bold py-2 px-3 rounded-xl border transition-all text-left flex items-center gap-2 uppercase ${isChecked
                                                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                                    : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                <div className={`w-2 h-2 rounded-full ${isChecked ? 'bg-blue-400 shadow-[0_0_5px_cyan]' : 'bg-gray-600'}`} />
                                                                {page.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-6 relative z-10">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar usuário pelo nome ou e-mail..."
                                    value={searchUsuario}
                                    onChange={e => setSearchUsuario(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-cyan-500 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="mt-8 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                            {filteredUsuarios.map(u => (
                                <div key={u.username} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`p-2 rounded-lg shrink-0 ${u.role === 'admin' || u.role === 'master' || u.role === 'gerente' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {u.role === 'admin' || u.role === 'master' ? <Shield size={16} /> : <Key size={16} />}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className={`font-bold text-sm flex items-center gap-2 truncate ${!u.ativo && 'text-gray-600 line-through'}`}>
                                                {u.nome_completo || u.username || 'USUÁRIO SEM NOME'}
                                                {u.reset_password === 1 && (
                                                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded-full shrink-0 uppercase">
                                                        Senha Resetada
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[11px] font-semibold text-gray-500 tracking-widest truncate uppercase">{u.email || u.username || 'SEM EMAIL'}</p>
                                            <p className="text-[10px] font-semibold text-blue-500/60 tracking-tight uppercase">{!u.role ? 'SEM PERFIL' : (u.role === 'sdr' ? 'VENDEDOR (SDR)' : u.role.toUpperCase())} • {u.whatsapp || 'SEM WHATSAPP'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => toggleUserStatus(u)}
                                            className={`p-2 rounded-xl transition-all ${u.ativo ? 'text-orange-400 hover:bg-orange-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                                            title={u.ativo ? "Pausar Usuário" : "Ativar Usuário"}
                                        >
                                            {u.ativo ? <PowerOff size={16} /> : <Power size={16} />}
                                        </button>

                                        <button
                                            onClick={() => handleEditUser(u)}
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                            title="Editar Usuário"
                                        >
                                            <Edit size={16} />
                                        </button>

                                        {(isMaster || (user?.role === 'admin' && u.username !== user?.username)) && (
                                            <button
                                                onClick={() => setModal({ open: true, type: 'usuario', data: u.username })}
                                                className="text-gray-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Excluir Permanentemente"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div >
    );
};

// --- COMPONENTE EDIÇÃO ---
const EditUserModal = React.memo(({ isOpen, initialUser, onClose, onSuccess, onError, isMaster, isMasterOrAdmin, formatPhone, currentLoja }) => {
    const [user, setUser] = useState(null);
    const [confirmPwd, setConfirmPwd] = useState('');

    useEffect(() => {
        if (isOpen && initialUser) {
            const normalizedPerms = typeof initialUser.permissions === 'string'
                ? JSON.parse(initialUser.permissions)
                : initialUser.permissions;
            setUser({ ...initialUser, permissions: normalizedPerms || [], password: '' });
            setConfirmPwd('');
        }
    }, [isOpen, initialUser]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user.email || !user.nome_completo) {
            onError('Nome e Email são obrigatórios');
            return;
        }

        if (user.password && user.password.length > 0) {
            if (user.password.length < 6) {
                onError('A nova senha deve ter no mínimo 6 caracteres');
                return;
            }
            if (confirmPwd !== user.password) {
                onError('As senhas não conferem');
                return;
            }
        }

        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('update-user', { ...user, loja_id: currentLoja?.id });

            if (user.password && user.password.length > 0) {
                onSuccess('Usuário atualizado! A senha foi alterada.');
            } else {
                onSuccess('Dados do usuário atualizados!');
            }
        } catch (err) {
            onError('Erro ao atualizar usuário');
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 flex items-center justify-center z-[300] p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#1d253a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                        <Edit size={160} />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">EDITAR <span className="text-blue-400">USUÁRIO</span></h2>
                    <p className="text-gray-400 text-[11px] font-black tracking-widest mb-8 uppercase">Alterar credenciais e permissões de acesso</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-500 ml-2 tracking-widest uppercase">Nome Completo</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-bold text-sm text-white"
                                    value={user.nome_completo}
                                    onChange={e => setUser({ ...user, nome_completo: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-500 ml-2 tracking-widest uppercase">WhatsApp / Celular</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-bold text-sm text-white"
                                    value={user.whatsapp}
                                    onChange={e => setUser({ ...user, whatsapp: formatPhone(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 ml-2 tracking-widest uppercase">CPF (Opcional)</label>
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-bold text-sm text-white"
                                value={user.cpf || ''}
                                onChange={e => setUser({ ...user, cpf: formatCPF(e.target.value) })}
                                maxLength={14}
                                placeholder="000.000.000-00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-500 ml-2 tracking-widest uppercase">E-mail de Login</label>
                                <input
                                    type="email"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-bold text-sm text-white"
                                    value={user.email}
                                    onChange={e => setUser({ ...user, email: e.target.value.toLowerCase() })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 ml-2 tracking-widest uppercase">Perfil (Role)</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-bold text-sm text-white appearance-none"
                                    value={user.role}
                                    onChange={e => setUser({ ...user, role: e.target.value })}
                                >
                                    <option value="sdr" className="bg-[#1d253a]">PERFIL VENDEDOR (SDR)</option>
                                    <option value="admin" className="bg-[#1d253a]">PERFIL ADMINISTRADOR</option>
                                    <option value="gerente" className="bg-[#1d253a]">PERFIL GERENTE</option>
                                    {user.role === 'master' && <option value="master" className="bg-[#1d253a]">PERFIL MASTER (PROPRIETÁRIO)</option>}
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-black/20 rounded-[2rem] border border-white/5 space-y-4 mt-2">
                            <h4 className="text-[11px] font-black text-blue-400 tracking-widest flex items-center gap-2 uppercase">
                                <Key size={12} /> Alterar Senha (Opcional)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-cyan-500 transition-all font-bold text-sm text-white"
                                    placeholder="NOVA SENHA"
                                    value={user.password || ''}
                                    onChange={e => setUser({ ...user, password: e.target.value })}
                                />
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-cyan-500 transition-all font-bold text-sm text-white"
                                    placeholder="CONFIRMAR NOVA SENHA"
                                    value={confirmPwd}
                                    onChange={e => setConfirmPwd(e.target.value)}
                                />
                            </div>
                            {isMasterOrAdmin && (
                                <div className="p-6 bg-black/20 rounded-[2rem] border border-white/5 space-y-4 mt-2">
                                    <h4 className="text-[11px] font-black text-blue-400 tracking-widest flex items-center gap-2 uppercase">
                                        <Shield size={12} /> Gerenciar Permissões
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AVAILABLE_PERMISSIONS.filter(p => {
                                            const storeModules = currentLoja?.modulos ? (typeof currentLoja.modulos === 'string' ? JSON.parse(currentLoja.modulos) : currentLoja.modulos) : [];
                                            const moduleKey = p.id.replace('/', '');
                                            return storeModules.includes(moduleKey);
                                        }).map((page) => {
                                            const isChecked = user.permissions?.includes(page.id);
                                            return (
                                                <button
                                                    key={page.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = user.permissions || [];
                                                        const newPerms = current.includes(page.id)
                                                            ? current.filter(p => p !== page.id)
                                                            : [...current, page.id];
                                                        setUser({ ...user, permissions: newPerms });
                                                    }}
                                                    className={`text-[11px] font-bold py-3 px-4 rounded-xl border transition-all text-left flex items-center gap-3 uppercase ${isChecked
                                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                        : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full ${isChecked ? 'bg-purple-400 shadow-[0_0_8px_purple]' : 'bg-gray-600'}`} />
                                                    {page.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all text-[11px] tracking-widest uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black py-4 px-12 rounded-2xl transition-all shadow-xl text-[11px] tracking-widest active:scale-95 uppercase"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
});


// --- COMPONENTE GESTÃO DE VENDEDORES ---
const ConsultoresManager = React.memo(({ vendedores, isMasterOrAdmin, handleAddVendedor, newVendedor, setNewVendedor, formatPhone, toggleVendedor, onDelete }) => {
    const [localVendedor, setLocalVendedor] = useState({ nome: '', sobrenome: '', telefone: '' });
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (newVendedor.nome === '') setLocalVendedor({ nome: '', sobrenome: '', telefone: '' });
    }, [newVendedor]);

    const onSubmit = (e) => {
        e.preventDefault();
        handleAddVendedor(e, localVendedor);
    };

    return (
        <div className="bg-[#1a2233] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transition-all">
                <Users size={120} />
            </div>

            <div className="flex justify-between items-center cursor-pointer relative z-20" onClick={() => setShowForm(!showForm)}>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        VENDEDORES DE SALÃO
                    </h2>
                    <p className="text-gray-400 text-[11px] tracking-widest mt-1 uppercase">Cadastro de Consultores do Estabelecimento</p>
                </div>
                <button className={`p-3 rounded-xl transition-all shadow-lg border border-white/5 ${showForm ? 'bg-blue-500/20 text-blue-400 rotate-45' : 'bg-[#131b29] text-gray-400 hover:text-blue-400 hover:border-blue-500/30'}`}>
                    <Plus size={20} />
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden relative z-10"
                    >
                        {isMasterOrAdmin ? (
                            <form onSubmit={onSubmit} className="space-y-3 mt-8 pt-8 border-t border-white/5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative group">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                        <input
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                            placeholder="NOME DO CONSULTOR"
                                            value={localVendedor.nome}
                                            onChange={e => setLocalVendedor({ ...localVendedor, nome: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                            placeholder="SOBRENOME"
                                            value={localVendedor.sobrenome}
                                            onChange={e => setLocalVendedor({ ...localVendedor, sobrenome: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative group flex-1">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                        <input
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                                            placeholder="WHATSAPP DE CONTATO"
                                            value={localVendedor.telefone}
                                            onChange={e => setLocalVendedor({ ...localVendedor, telefone: formatPhone(e.target.value) })}
                                        />
                                    </div>
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 rounded-2xl transition-all shadow-lg active:scale-95 text-white">
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                                <p className="text-[10px] font-black text-gray-500  tracking-widest">Acesso restrito para administradores</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-8 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {vendedores.map(m => (
                    <div key={m.nome} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                        <div className="flex flex-col">
                            <span className={`font-bold text-sm tracking-tight ${!m.ativo && 'text-gray-600 line-through'}`}>
                                {m.nome} {m.sobrenome}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold">{m.telefone || 'SEM TELEFONE'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => toggleVendedor(m.nome, m.ativo)}
                                className={`p-2 rounded-xl transition-all ${m.ativo ? 'text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                                title={m.ativo ? "Pausar Consultor" : "Ativar Consultor"}
                            >
                                {m.ativo ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            {isMasterOrAdmin && (
                                <button
                                    onClick={() => onDelete(m.nome)}
                                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default Usuarios;
