/**
 * PRELOAD.JS - PONTE SEGURA ENTRE ELECTRON E REACT
 * 
 * Este arquivo roda em um contexto isolado e expõe APENAS as funções
 * necessárias para o React, evitando que o frontend tenha acesso total
 * ao Node.js (o que seria um risco de segurança).
 */

const { contextBridge, ipcRenderer } = require('electron');

// Aumenta o limite de listeners para evitar warnings de memória (EventEmitter)
ipcRenderer.setMaxListeners(50);

// Lista de canais IPC permitidos (whitelist)
const ALLOWED_CHANNELS = {
    // 🔐 AUTENTICAÇÃO E USUÁRIOS
    invoke: [
        'login',
        'validate-session',
        'get-user',
        'change-password',
        'update-user-password',
        'add-user',
        'update-user',
        'update-user-field',
        'delete-user',
        'get-list-users',

        // 📊 VISITAS (LEADS)
        'get-visitas-secure',
        'add-visita',
        'update-visita-status',
        'update-visita-sdr',
        'update-visita-sdr-quick',
        'update-visita-visitou-loja',
        'update-visita-nao-compareceu',
        'update-visita-full',
        'delete-visita',
        'get-visits-by-vehicle',

        // 📅 AGENDAMENTOS E NOTAS
        'get-agendamentos-detalhes',
        'get-agendamentos-resumo',
        'get-notas',
        'add-nota',
        'update-nota',
        'toggle-nota',
        'delete-nota',

        // 🚗 ESTOQUE
        'get-list',
        'add-item',
        'update-item',
        'delete-item',
        'toggle-item',
        'sync-xml',
        'force-sync-estoque',
        'get-competition',
        'get-vehicles-stats',

        // 🏪 LOJAS
        'get-stores',
        'create-store-with-admin',
        'update-store',
        'delete-store',
        'update-loja-modules',
        'create-loja',
        'sync-all-stores',

        // 📊 ESTATÍSTICAS E PERFORMANCE
        'get-stats',
        'get-sdr-performance',

        // 🔄 SINCRONIZAÇÃO
        'full-cloud-sync',
        'sync-essential',
        'upload-data-to-supabase',

        // 🤖 IA E SCRIPTS
        'get-scripts',
        'add-script',
        'update-script',
        'delete-script',

        // ⚙️ CONFIGURAÇÕES E SISTEMA
        'get-app-version',
        'get-user-data-path',
        'get-config-meta',
        'set-config-meta',
        'open-external',
        'install-update',
        'validate-cpf',

        // 📱 WHATSAPP
        'whatsapp-view-ready',

        // 📄 ARQUIVOS
        'save-pdf',
        'read-file-content',
        'get-image-base64',

        // 🪟 JANELA
        'focus-window',
        'show-native-notification',
        'get-home-sdr-stats',

        // 🚗 RASPAGEM E CACHE
        'scrap-car-details',

        // 🛠️ DEBUG
        'execute-sql',
        'userData',
        'get-all-settings',
        'save-settings-batch'
    ],

    // Canais que RECEBEM eventos do main process
    on: [
        'refresh-data',
        'update-available',
        'update-downloaded',
        'sync-progress',
        'notification',
        'sync-status',
        'user-data-updated',
        'update-progress',
        'navigate-to',
        'show-notification'
    ]
};

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, data) => {
        if (!ALLOWED_CHANNELS.invoke.includes(channel)) {
            throw new Error(`Canal IPC não permitido: ${channel}`);
        }
        return ipcRenderer.invoke(channel, data);
    },
    on: (channel, callback) => {
        if (!ALLOWED_CHANNELS.on.includes(channel)) {
            throw new Error(`Canal IPC on não permitido: ${channel}`);
        }
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on(channel, subscription);
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },
    once: (channel, callback) => {
        if (!ALLOWED_CHANNELS.on.includes(channel)) {
            throw new Error(`Canal IPC once não permitido: ${channel}`);
        }
        ipcRenderer.once(channel, (event, ...args) => callback(...args));
    },
    removeAllListeners: (channel) => {
        if (!ALLOWED_CHANNELS.on.includes(channel)) {
            throw new Error(`Canal IPC não permitido: ${channel}`);
        }
        ipcRenderer.removeAllListeners(channel);
    }
});

contextBridge.exposeInMainWorld('electronHelpers', {
    isElectron: () => true,
    getEnvironment: () => ({
        platform: process.platform,
        version: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
    })
});

if (process.env.NODE_ENV !== 'production') {
    console.log('🔒 [Preload] Context isolation ativado');
}
