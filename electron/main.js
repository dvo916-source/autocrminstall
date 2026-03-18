// --- CONFIGURAÇÃO DE AMBIENTE ---
import { envConfig } from './electron-env.config.js';

// --- IMPORTAÇÕES CORE DO ELECTRON ---
import { app, BrowserWindow, ipcMain, Notification, dialog, shell } from 'electron';

// autoUpdater gerencia as atualizações automáticas via GitHub
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Importa os módulos internos que lidam com Banco de Dados e IA
import * as db from './db.js';
import * as aiservice from './aiservice.js';

// Utilitários para converter o caminho do arquivo para o padrão do Node.js ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow; // Instância global da janela principal
const activeNotifications = new Set(); // Conjunto para evitar que notificações sejam limpas pelo lixeiro (GC)
let pendingWhatsappClickId = null; // Guarda ID para automação caso o WhatsApp ainda esteja carregando
let whatsappViewReady = false; // Flag que indica se a view do WhatsApp já deu o "aperto de mão"

// 🧠 INICIALIZAÇÃO DOS MOTORES
db.initDb(); // Cria as tabelas se não existirem
// Pega loja ativa do SQLite e passa pro Realtime Sync
const startupLojaId = db.getActiveStoreId();
db.enableRealtimeSync(startupLojaId); // ✅ Agora com lojaId correto
console.log('[Main] Realtime Sync habilitado para loja:', startupLojaId);
aiservice.initAi(); // Prepara a conexão com a OpenAI

// 🛠️ TRATAMENTO DE ERROS GLOBAIS (DEBUG)
process.on('uncaughtException', (err) => {
    console.error('🔥 [CRITICAL] Uncaught Exception:', err);
});

// 🔍 DIAGNÓSTICO: Executar SQL direto (apenas para debug)
ipcMain.handle('execute-sql', async (e, { query }) => {
    try {
        const Database = require('better-sqlite3');
        const dbPath = path.join(app.getPath('userData'), 'crystal.db');
        const dbInstance = new Database(dbPath);
        const result = dbInstance.prepare(query).all();
        dbInstance.close();
        return result;
    } catch (err) {
        console.error('Erro ao executar SQL:', err);
        throw err;
    }
});

// 📅 HANDLERS DE AGENDAMENTOS E NOTAS (CRM)
ipcMain.handle('get-agendamentos-detalhes', async (e, { username, lojaId }) => {
    return db.getAgendamentosDetalhes(username, lojaId);
});

ipcMain.handle('get-agendamentos-resumo', async (e, lojaId) => {
    return db.getAgendamentosPorUsuario(lojaId);
});

ipcMain.handle('get-notas', async (e, { username, lojaId }) => {
    return db.getNotas({ username, lojaId });
});
ipcMain.handle('add-nota', async (e, n) => {
    const res = await db.addNota(n);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'notas'));
    return res;
});
ipcMain.handle('update-nota', async (e, n) => {
    const res = await db.updateNota(n);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'notas'));
    return res;
});
ipcMain.handle('toggle-nota', async (e, { id, concluido, lojaId }) => {
    const res = await db.toggleNota(id, concluido, lojaId);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'notas'));
    return res;
});
ipcMain.handle('delete-nota', async (e, { id, lojaId }) => {
    const res = await db.deleteNota(id, lojaId);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'notas'));
    return res;
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Configuração necessária para as notificações aparecerem corretamente no Windows
if (process.platform === 'win32') {
    app.setAppUserModelId('VexCORE');
}

// 🛡️ TRAVA DE INSTÂNCIA ÚNICA
// Garante que o usuário não abra o programa duas vezes ao mesmo tempo
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit(); // Se já tiver um aberto, fecha este novo
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Se tentarem abrir outro, traz o original para frente (foco)
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            if (!mainWindow.isVisible()) mainWindow.show();
        }
    });
}

// 🖥️ CRIAÇÃO DA JANELA PRINCIPAL
function createWindow() {
    const iconPath = path.join(__dirname, '../icon.png');

    mainWindow = new BrowserWindow({
        title: 'VexCORE',
        width: 1200,
        height: 800,
        autoHideMenuBar: true, // Esconde a barra de menu (Arquivo, Editar...)
        resizable: true,
        webPreferences: {
            nodeIntegration: false, // ✅ SEGURO: Desabilita acesso direto ao Node no front
            contextIsolation: true, // ✅ SEGURO: Ativa isolamento de contexto
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js') // ✅ PONTE SEGURA
        },
        backgroundColor: '#0f172a',
        show: false, // Criar escondida e mostrar só quando estiver pronta (ready-to-show)
        icon: iconPath
    });

    const win = mainWindow;
    win.maximize(); // Abre maximizada
    win.setMenu(null); // Remove o menu padrão completamente

    // Define se carrega do servidor local (Vite) ou do arquivo pronto (Build)
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173/#/');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/' });
    }

    // Atalhos de Teclado Internos do Electron
    win.webContents.on('before-input-event', (event, input) => {
        if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
            win.webContents.toggleDevTools(); // Abre o console do desenvolvedor
        }
        if (input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen()); // Tela cheia
        }
        if (input.key === 'Escape' && win.isFullScreen()) {
            win.setFullScreen(false);
        }
        if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
            event.preventDefault();
            win.webContents.reloadIgnoringCache(); // Recarrega a página limpando o cache
        }
    });

    win.once('ready-to-show', () => {
        win.show();

        // Verifica atualizações ao abrir
        autoUpdater.checkForUpdates();

        // 🚀 OTIMIZAÇÃO: Controle de Sincronização
        let syncInProgress = false;
        let lastSyncTime = 0;
        const SYNC_DEBOUNCE_MS = 5000; // 5 segundos entre sincronizações

        // Timer de Sync
        const runAutoSync = async () => {
            try {
                // ⏱️ Verifica se já está sincronizando
                if (syncInProgress) {
                    console.log('[AutoSync] ⏭️  Sincronização já em andamento, pulando...');
                    return;
                }

                // ⏱️ Verifica se passou tempo suficiente desde a última sync
                const now = Date.now();
                const timeSinceLastSync = now - lastSyncTime;
                if (timeSinceLastSync < SYNC_DEBOUNCE_MS) {
                    console.log(`[AutoSync] ⏭️  Aguardando debounce (${Math.round((SYNC_DEBOUNCE_MS - timeSinceLastSync) / 1000)}s restantes)`);
                    return;
                }

                syncInProgress = true;
                lastSyncTime = now;

                // 🏪 Detecta qual loja está ativa (localStorage ou padrão)
                let activeLojaId = 'irw-motors-main'; // Padrão

                try {
                    // Tenta pegar do localStorage (setado pelo LojaContext)
                    const stored = await win.webContents.executeJavaScript('localStorage.getItem("active_loja_id")');
                    if (stored) {
                        activeLojaId = stored;
                        console.log(`[AutoSync] Loja ativa detectada: ${activeLojaId}`);
                    } else {
                        console.log(`[AutoSync] Nenhuma loja ativa. Usando padrão: ${activeLojaId}`);
                    }
                } catch (e) {
                    console.log(`[AutoSync] Erro ao detectar loja ativa. Usando padrão: ${activeLojaId}`);
                }

                console.log(`[AutoSync] Iniciando sincronização essencial para loja: ${activeLojaId}...`);
                await db.syncConfig(activeLojaId);

                console.log('[AutoSync] Sincronizando estoque da NUVEM para este PC...');
                if (!win.isDestroyed()) win.webContents.send('sync-status', { loading: true });

                const result = await db.syncXml(activeLojaId);
                console.log('[AutoSync] Concluído:', result.message);

                if (!win.isDestroyed()) {
                    win.webContents.send('sync-status', { loading: false, success: true });
                    win.webContents.send('refresh-data', 'estoque');
                }
            } catch (err) {
                console.error('[AutoSync] Erro:', err);
                if (!win.isDestroyed()) win.webContents.send('sync-status', { loading: false, success: false });
            } finally {
                syncInProgress = false;
            }
        };

        // Aguarda 3 segundos para garantir que o React/localStorage estejam prontos
        setTimeout(runAutoSync, 3000);
        // Depois sincroniza a cada 5 minutos
        setInterval(runAutoSync, 5 * 60 * 1000);
    });

    win.on('close', () => {
        // Preserva dados de sessão para que o WhatsApp e o login sobrevivam ao fechamento
        win.webContents.executeJavaScript(`
            (() => {
                const keep = ['vexcore_user', 'active_loja_id', 'username', 'userRole', 'crm_period_filter'];
                const preserved = {};
                keep.forEach(k => { const v = localStorage.getItem(k); if (v) preserved[k] = v; });
                localStorage.clear();
                Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
            })();
        `).catch(() => { });
    });

    // Evento disparado quando a página começa a carregar
    win.webContents.on('did-start-loading', () => {
        whatsappViewReady = false; // Reseta o estado do WhatsApp
        console.log('[Main] Renderer Iniciando Carga (Handshake Reset)');
    });

    // Eventos do 'autoUpdater' para gerenciar atualizações via GitHub
    autoUpdater.logger = console;
    autoUpdater.autoDownload = true; // Garante que o download comece sozinho
    autoUpdater.autoInstallOnAppQuit = false; // DESABILITADO - Vamos controlar manualmente

    // Quando o React termina de carregar, esperamos 3 segundos e checamos atualizações
    win.webContents.on('did-finish-load', () => {
        console.log('[Main] Renderer Totalmente Carregado');
        setTimeout(() => {
            console.log('[Updater] Iniciando verificação programada...');
            autoUpdater.checkForUpdates().catch(err => console.error('[Updater] Erro Check:', err));
        }, 3000);
    });

    // Escuta eventos do processo de atualização
    autoUpdater.on('update-available', (info) => {
        console.log('[Updater] Atualização disponível:', info.version);
        win.webContents.send('update-available', info); // Notifica o React
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`[Updater] Download: ${Math.round(progress.percent)}%`);
        // Aqui você pode enviar progresso global se quiser
        win.webContents.send('update-progress', progress.percent);
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('[Updater] Download concluído. Versão:', info.version);
        // Aguarda 2 segundos para o usuário ver a mensagem, depois instala
        setTimeout(() => {
            console.log('[Updater] Iniciando instalação...');
            autoUpdater.quitAndInstall(false, true);
        }, 2000);
    });
}

// 📡 COMUNICAÇÃO IPC (INTER-PROCESS COMMUNICATION)

// Autenticação e Usuários
ipcMain.handle('update-user-field', async (e, { userId, field, value }) => await db.updateUserField(userId, field, value));
ipcMain.handle('login', async (e, { username, password }) => {
    const user = await db.checkLogin(username, password);
    if (user && user.loja_id) {
        console.log(`🚀 [Main] Login detectado para loja ${user.loja_id}. Forçando sincronização imediata...`);
        try {
            await db.syncConfig(user.loja_id);
        } catch (err) {
            console.error('[LoginSync] Erro crítico no syncConfig durante o login:', err);
        }
        db.syncXml(user.loja_id).catch(err => console.error('[LoginSync] Erro no syncXml:', err));
    }
    return user;
});
ipcMain.handle('get-user', async (e, username) => await db.getUserByUsername(username));
ipcMain.handle('full-cloud-sync', async (event, lojaId) => {
    try {
        const { fullCloudSync } = await import('./db.js');
        return await fullCloudSync(lojaId);
    } catch (e) {
        console.error('Error in full-cloud-sync handler:', e);
        throw e;
    }
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
ipcMain.handle('open-external', (e, url) => shell.openExternal(url));
ipcMain.handle('change-password', async (e, { username, newPassword }) => await db.changePassword(username, newPassword));
ipcMain.handle('update-user-password', async (e, { username, newPassword }) => await db.changePassword(username, newPassword)); // Alias
ipcMain.handle('add-user', async (e, user) => await db.addUser(user));
ipcMain.handle('update-user', async (e, user) => await db.updateUser(user));
ipcMain.handle('delete-user', async (e, username) => await db.deleteUser(username));
ipcMain.handle('get-list-users', async (e, lojaId) => await db.getListUsers(lojaId));
ipcMain.handle('validate-session', async (e, { username, sessionId }) => {
    const user = await db.getUserByUsername(username);
    return user && user.session_id === sessionId;
});

// Comandos de Visitas (CRM)
ipcMain.handle('get-visitas-secure', (e, { role, username, lojaId }) => db.getVisitas(role, username, lojaId));
ipcMain.handle('add-visita', async (e, v) => await db.addVisita(v));
ipcMain.handle('update-visita-status', async (e, params) => {
    console.log('📡 [Main.js] IPC update-visita-status recebido:', params);
    return await db.updateVisitaStatusQuick(params);
});
ipcMain.handle('update-visita-sdr', async (e, { id, sdr, lojaId }) => await db.updateVisitaSdrQuick({ id, sdr, lojaId }));
ipcMain.handle('update-visita-sdr-quick', async (e, { id, field, value, lojaId }) => await db.updateVisitaFieldQuick({ id, field, value, lojaId }));
ipcMain.handle('update-visita-visitou-loja', async (e, { id, valor, lojaId }) => await db.updateVisitaVisitouLoja({ id, valor, lojaId }));
ipcMain.handle('update-visita-nao-compareceu', async (e, { id, valor, lojaId }) => await db.updateVisitaNaoCompareceu({ id, valor, lojaId }));
ipcMain.handle('delete-visita', async (e, { id, lojaId }) => await db.deleteVisita(id, lojaId));
ipcMain.handle('update-visita-full', async (e, v) => await db.updateVisitaFull(v));

// Comandos de Loja (Multi-tenant)
ipcMain.handle('get-stores', () => db.getStores());
ipcMain.handle('validate-cpf', async (e, cpf) => await db.validateCpfUnique(cpf));
ipcMain.handle('create-store-with-admin', async (e, { loja, admin }) => await db.createStoreWithAdmin(loja, admin));
ipcMain.handle('update-store', async (e, store) => await db.updateStore(store));
ipcMain.handle('delete-store', async (e, id) => await db.deleteStore(id));
ipcMain.handle('sync-all-stores', async () => await db.syncAllStoresFromCloud());

// Novos Handlers de Módulos (Sync granular)
ipcMain.handle('update-loja-modules', async (e, { lojaId, modules }) => await db.updateLojaModules(lojaId, modules));
ipcMain.handle('create-loja', async (e, { storeData, adminData }) => await db.createLojaWithAdmin(storeData, adminData));

// CRUD Genérico (Tabelas: estoque, portais, vendedores, etc)
ipcMain.handle('get-list', async (e, { table, lojaId }) => await db.getList(table, lojaId));
ipcMain.handle('add-item', async (e, { table, data }) => await db.addItem(table, data));
ipcMain.handle('update-item', async (e, { table, oldNome, data }) => await db.updateItem(table, oldNome, data));
ipcMain.handle('toggle-item', async (e, { table, nome, ativo, loja_id }) => await db.toggleItem(table, nome, ativo, loja_id));
ipcMain.handle('delete-item', async (e, { table, nome, loja_id }) => await db.deleteItem(table, nome, loja_id));

// Scripts e Mensagens
ipcMain.handle('get-scripts', async (e, { username, lojaId }) => await db.getScripts({ username, lojaId }));
ipcMain.handle('add-script', async (e, s) => await db.addScript(s));
ipcMain.handle('update-script', async (e, s) => await db.updateScript(s));
ipcMain.handle('delete-script', async (e, { id, role, username, lojaId }) => await db.deleteScript(id, role, username, lojaId));

// Dashboard, Metas e Estatísticas
ipcMain.handle('get-stats', async (e, options) => await db.getStats(options));
ipcMain.handle('get-competition', async (e, lojaId) => await db.getCompetitionData(lojaId));
ipcMain.handle('get-config-meta', async (e, lojaId) => await db.getConfigMeta(lojaId));
ipcMain.handle('get-sdr-performance', async (e, lojaId) => await db.getSdrPerformance(lojaId));
ipcMain.handle('set-config-meta', async (e, { visita, venda, lojaId }) => await db.setConfigMeta(visita, venda, lojaId));
ipcMain.handle('get-home-sdr-stats', async (e, options) => await db.getHomeSDRStats(options));

// Estatísticas de Veículos (Estoque Digital)
ipcMain.handle('get-vehicles-stats', async (e, lojaId) => db.getVehiclesStats(lojaId));
ipcMain.handle('get-visits-by-vehicle', async (e, { name, lojaId }) => db.getVisitsByVehicle(name, lojaId));
ipcMain.handle('scrap-car-details', async (e, { nome, url }) => await db.scrapCarDetails(nome, url));

// Comandos de Sincronização e Atualização
ipcMain.handle('sync-xml', (e, lojaId) => db.syncXml(lojaId));
ipcMain.handle('sync-essential', async (e, lojaId) => await db.syncConfig(lojaId));

ipcMain.handle('install-update', (event, info) => {
    console.log('[Updater] Usuário confirmou atualização. Iniciando download...');
    autoUpdater.downloadUpdate();
    return true;
});

// Utilitário para ler arquivos do sistema
ipcMain.handle('read-file-content', async (e, fileName) => {
    try {
        const filePath = path.join(__dirname, '..', fileName);
        return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
        console.error(`Erro ao ler arquivo ${fileName}:`, err);
        throw err;
    }
});

// 🔄 FORÇA SINCRONIZAÇÃO DO ESTOQUE
ipcMain.handle('force-sync-estoque', async (e, lojaId) => {
    try {
        const result = await db.syncXml(lojaId);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('refresh-data', 'estoque');
        }
        return { success: true, count: result.syncedCount || 0, message: result.message };
    } catch (err) {
        console.error('❌ [Force Sync] Erro:', err);
        return { success: false, error: err.message };
    }
});

// 📤 UPLOAD DE DADOS LOCAIS PARA SUPABASE
ipcMain.handle('upload-data-to-supabase', async (e) => {
    try {
        const { uploadAllDataToSupabase } = await import('./uploadData.js');
        return await uploadAllDataToSupabase(db.getDbInstance());
    } catch (err) {
        console.error('❌ [Upload] Erro:', err);
        return { success: false, error: err.message };
    }
});

// Utilitários de Mídia
ipcMain.handle('get-image-base64', async (e, url) => {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${response.headers.get('content-type') || 'image/jpeg'};base64,${buffer.toString('base64')}`;
});

// 📄 SALVAR PDF
ipcMain.handle('save-pdf', async (e, { base64Data, defaultFileName }) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            title: 'Salvar Relatório PDF',
            defaultPath: defaultFileName || 'relatorio.pdf',
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
            properties: ['showOverwriteConfirmation']
        });
        if (canceled || !filePath) return { success: false, canceled: true };
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(filePath, buffer);
        shell.showItemInFolder(filePath);
        return { success: true, filePath };
    } catch (err) {
        console.error('Erro ao salvar PDF:', err);
        return { success: false, error: err.message };
    }
});

// 📱 WHATSAPP & NOTIFICAÇÕES
ipcMain.handle('whatsapp-view-ready', (event) => {
    whatsappViewReady = true;
    console.log('📱 [WhatsApp] View Ready Handshake recebido do Renderer');
    if (pendingWhatsappClickId && mainWindow) {
        mainWindow.webContents.send('trigger-whatsapp-click', pendingWhatsappClickId);
        pendingWhatsappClickId = null;
    }
    return true;
});

ipcMain.handle('show-native-notification', (event, { title, body, icon, id, clickAction, clientName }) => {
    try {
        const notif = new Notification({
            title: title || 'VexCORE',
            body: body || '',
            icon: path.join(__dirname, '../public/icon.png'),
            silent: false,
            timeoutType: 'default'
        });

        notif.on('click', () => {
            console.log(`[Main] 🔔 Notificação clicada! Cliente: ${clientName || 'Desconhecido'}`);
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
                if (clickAction === 'open-chat') {
                    mainWindow.webContents.send('navigate-to', '/whatsapp');
                    setTimeout(() => {
                        if (whatsappViewReady) {
                            mainWindow.webContents.send('trigger-whatsapp-click', id);
                        } else {
                            pendingWhatsappClickId = id;
                        }
                    }, 500);
                }
            }
        });

        notif.on('close', () => activeNotifications.delete(notif));
        activeNotifications.add(notif);
        notif.show();
        return true;
    } catch (err) {
        console.error('Erro ao mostrar notificação nativa:', err);
        return false;
    }
});

ipcMain.handle('focus-window', (event) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
    return true;
});

app.whenReady().then(createWindow);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
