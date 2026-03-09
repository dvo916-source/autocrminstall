/**
 * ELECTRON API - HELPER PARA REACT
 * 
 * Este arquivo fornece uma interface limpa e tipada para o React
 * se comunicar com o Electron através do preload.js
 */

export const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

const ensureElectron = () => {
    if (!isElectron()) {
        throw new Error('Esta funcionalidade só está disponível no Electron');
    }
};

export const electronAPI = {
    // 🔐 AUTENTICAÇÃO E USUÁRIOS
    login: async (username, password) => {
        ensureElectron();
        return window.electronAPI.invoke('login', { username, password });
    },
    validateSession: async (username, sessionId) => {
        ensureElectron();
        return window.electronAPI.invoke('validate-session', { username, sessionId });
    },
    getUser: async (username) => {
        ensureElectron();
        return window.electronAPI.invoke('get-user', username);
    },
    changePassword: async (username, newPassword) => {
        ensureElectron();
        return window.electronAPI.invoke('change-password', { username, newPassword });
    },
    addUser: async (user) => {
        ensureElectron();
        return window.electronAPI.invoke('add-user', user);
    },
    updateUser: async (user) => {
        ensureElectron();
        return window.electronAPI.invoke('update-user', user);
    },
    updateUserField: async (userId, field, value) => {
        ensureElectron();
        return window.electronAPI.invoke('update-user-field', { userId, field, value });
    },
    deleteUser: async (username) => {
        ensureElectron();
        return window.electronAPI.invoke('delete-user', username);
    },
    getListUsers: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-list-users', lojaId);
    },

    // 📊 VISITAS (LEADS)
    getVisitas: async (role, username, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-visitas-secure', { role, username, lojaId });
    },
    getVisitasSecure: async (role, username, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-visitas-secure', { role, username, lojaId });
    },
    addVisita: async (visita) => {
        ensureElectron();
        return window.electronAPI.invoke('add-visita', visita);
    },
    updateVisitaStatus: async (id, status, pipeline) => {
        ensureElectron();
        return window.electronAPI.invoke('update-visita-status', { id, status, pipeline });
    },
    updateVisitaSdr: async (id, sdr, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('update-visita-sdr', { id, sdr, lojaId });
    },
    updateVisitaSdrQuick: async (id, field, value, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('update-visita-sdr-quick', { id, field, value, lojaId });
    },
    updateVisitaVisitouLoja: async (id, valor, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('update-visita-visitou-loja', { id, valor, lojaId });
    },
    updateVisitaNaoCompareceu: async (id, valor, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('update-visita-nao-compareceu', { id, valor, lojaId });
    },
    updateVisitaFull: async (visita) => {
        ensureElectron();
        return window.electronAPI.invoke('update-visita-full', visita);
    },
    deleteVisita: async (id, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('delete-visita', { id, lojaId });
    },
    getVisitsByVehicle: async (name, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-visits-by-vehicle', { name, lojaId });
    },

    // 📅 AGENDAMENTOS E NOTAS
    getAgendamentosDetalhes: async (username, lojaId) => {
        ensureElectron();
        // Suporte para getAgendamentosDetalhes({ username, lojaId }) e getAgendamentosDetalhes(username, lojaId)
        const payload = (typeof username === 'object' && !lojaId) ? username : { username, lojaId };
        return window.electronAPI.invoke('get-agendamentos-detalhes', payload);
    },
    getAgendamentosResumo: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-agendamentos-resumo', lojaId);
    },
    getNotas: async (username, lojaId) => {
        ensureElectron();
        // Suporte para getNotas({ username, lojaId }) e getNotas(username, lojaId)
        const payload = (typeof username === 'object' && !lojaId) ? username : { username, lojaId };
        return window.electronAPI.invoke('get-notas', payload);
    },
    addNota: async (nota) => {
        ensureElectron();
        return window.electronAPI.invoke('add-nota', nota);
    },
    updateNota: async (nota) => {
        ensureElectron();
        return window.electronAPI.invoke('update-nota', nota);
    },
    toggleNota: async (id, concluido, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('toggle-nota', { id, concluido, lojaId });
    },
    deleteNota: async (id, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('delete-nota', { id, lojaId });
    },

    // 🚗 ESTOQUE
    getList: async (table, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-list', { table, lojaId });
    },
    addItem: async (table, data) => {
        ensureElectron();
        return window.electronAPI.invoke('add-item', { table, data });
    },
    updateItem: async (table, oldNome, data) => {
        ensureElectron();
        return window.electronAPI.invoke('update-item', { table, oldNome, data });
    },
    deleteItem: async (table, nome, loja_id) => {
        ensureElectron();
        return window.electronAPI.invoke('delete-item', { table, nome, loja_id });
    },
    toggleItem: async (table, nome, ativo, loja_id) => {
        ensureElectron();
        return window.electronAPI.invoke('toggle-item', { table, nome, ativo, loja_id });
    },
    syncXml: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('sync-xml', lojaId);
    },
    forceSyncEstoque: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('force-sync-estoque', lojaId);
    },
    getCompetition: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-competition', lojaId);
    },
    getVehiclesStats: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-vehicles-stats', lojaId);
    },
    scrapCarDetails: async ({ nome, url }) => {
        ensureElectron();
        return window.electronAPI.invoke('scrap-car-details', { nome, url });
    },

    // 🏪 LOJAS
    getStores: async () => {
        ensureElectron();
        return window.electronAPI.invoke('get-stores');
    },
    createStoreWithAdmin: async (loja, admin) => {
        ensureElectron();
        return window.electronAPI.invoke('create-store-with-admin', { loja, admin });
    },
    updateStore: async (store) => {
        ensureElectron();
        return window.electronAPI.invoke('update-store', store);
    },
    deleteStore: async (id) => {
        ensureElectron();
        return window.electronAPI.invoke('delete-store', id);
    },
    syncAllStores: async () => {
        ensureElectron();
        return window.electronAPI.invoke('sync-all-stores');
    },

    // 📊 ESTATÍSTICAS
    getStats: async (options) => {
        ensureElectron();
        return window.electronAPI.invoke('get-stats', options);
    },
    getSdrPerformance: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-sdr-performance', lojaId);
    },

    // 🔄 SINCRONIZAÇÃO
    fullCloudSync: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('full-cloud-sync', lojaId);
    },
    syncEssential: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('sync-essential', lojaId);
    },
    uploadDataToSupabase: async () => {
        ensureElectron();
        return window.electronAPI.invoke('upload-data-to-supabase');
    },

    // 🤖 IA E SCRIPTS
    getScripts: async (username, lojaId) => {
        ensureElectron();
        const payload = (typeof username === 'object' && !lojaId) ? username : { username, lojaId };
        return window.electronAPI.invoke('get-scripts', payload);
    },
    addScript: async (script) => {
        ensureElectron();
        return window.electronAPI.invoke('add-script', script);
    },
    updateScript: async (script) => {
        ensureElectron();
        return window.electronAPI.invoke('update-script', script);
    },
    deleteScript: async (id, role, username, lojaId) => {
        ensureElectron();
        const payload = (typeof id === 'object' && !role) ? id : { id, role, username, lojaId };
        return window.electronAPI.invoke('delete-script', payload);
    },

    // ⚙️ SISTEMA E CONFIGURAÇÕES
    getAppVersion: async () => {
        ensureElectron();
        return window.electronAPI.invoke('get-app-version');
    },
    getUserDataPath: async () => {
        ensureElectron();
        return window.electronAPI.invoke('get-user-data-path');
    },
    getConfigMeta: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-config-meta', lojaId);
    },
    setConfigMeta: async (visita, venda, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('set-config-meta', { visita, venda, lojaId });
    },
    openExternal: async (url) => {
        ensureElectron();
        return window.electronAPI.invoke('open-external', url);
    },
    installUpdate: async (info) => {
        ensureElectron();
        return window.electronAPI.invoke('install-update', info);
    },
    validateCpf: async (cpf) => {
        ensureElectron();
        return window.electronAPI.invoke('validate-cpf', cpf);
    },

    // 📱 WHATSAPP
    whatsappViewReady: async () => {
        ensureElectron();
        return window.electronAPI.invoke('whatsapp-view-ready');
    },

    // 📄 ARQUIVOS
    savePdf: async (base64Data, defaultFileName) => {
        ensureElectron();
        return window.electronAPI.invoke('save-pdf', { base64Data, defaultFileName });
    },
    readFileContent: async (fileName) => {
        ensureElectron();
        return window.electronAPI.invoke('read-file-content', fileName);
    },
    getImageBase64: async (url) => {
        ensureElectron();
        return window.electronAPI.invoke('get-image-base64', url);
    },

    // 🪟 JANELA
    focusWindow: async () => {
        ensureElectron();
        return window.electronAPI.invoke('focus-window');
    },
    showNotification: async (data) => {
        ensureElectron();
        return window.electronAPI.invoke('show-native-notification', data);
    },

    // 🛠️ DEBUG E UTILS
    executeSql: async (query) => {
        ensureElectron();
        return window.electronAPI.invoke('execute-sql', { query });
    },
    getUserData: async () => {
        ensureElectron();
        return window.electronAPI.invoke('userData');
    },
    userData: async () => {
        ensureElectron();
        return window.electronAPI.invoke('userData');
    },
    getAllSettings: async (lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('get-all-settings', lojaId);
    },
    saveSettingsBatch: async (settings, lojaId) => {
        ensureElectron();
        return window.electronAPI.invoke('save-settings-batch', { settings, lojaId });
    },

    // 📡 EVENTOS (Listeners)
    onRefreshData: (callback) => {
        ensureElectron();
        return window.electronAPI.on('refresh-data', callback);
    },
    onUpdateAvailable: (callback) => {
        ensureElectron();
        return window.electronAPI.on('update-available', callback);
    },
    onUpdateDownloaded: (callback) => {
        ensureElectron();
        return window.electronAPI.on('update-downloaded', callback);
    },
    onSyncProgress: (callback) => {
        ensureElectron();
        return window.electronAPI.on('sync-progress', callback);
    },
    onNotification: (callback) => {
        ensureElectron();
        return window.electronAPI.on('notification', callback);
    },
    onSyncStatus: (callback) => {
        ensureElectron();
        return window.electronAPI.on('sync-status', callback);
    },
    onUserDataUpdated: (callback) => {
        ensureElectron();
        return window.electronAPI.on('user-data-updated', callback);
    },
    onUpdateProgress: (callback) => {
        ensureElectron();
        return window.electronAPI.on('update-progress', callback);
    },
    onNavigateTo: (callback) => {
        ensureElectron();
        return window.electronAPI.on('navigate-to', callback);
    },
    onShowNotification: (callback) => {
        ensureElectron();
        return window.electronAPI.on('show-notification', callback);
    },
    removeAllListeners: (channel) => {
        ensureElectron();
        return window.electronAPI.removeAllListeners(channel);
    }
};

export default electronAPI;
