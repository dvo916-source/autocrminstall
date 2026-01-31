import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const activeNotifications = new Set();
let pendingWhatsappClickId = null;
let whatsappViewReady = false;

// Inicializa Banco e Sincronização em Tempo Real
db.initDb();
db.enableRealtimeSync();

// Fix Notification Title on Windows
if (process.platform === 'win32') {
    app.setAppUserModelId('SDR IRW Motors');
}

// ===== SINGLE INSTANCE LOCK =====
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            if (!mainWindow.isVisible()) mainWindow.show();
        }
    });
}

function createWindow() {
    // Define o ícone baseado no sistema operacional
    const iconPath = path.join(__dirname, '../icon.png');

    mainWindow = new BrowserWindow({
        title: 'SDR IRW Motors',
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        resizable: true,
        maximizable: true,
        fullscreenable: true,
        fullscreen: false,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
        },
        backgroundColor: '#0f172a',
        show: false,
        icon: iconPath
    });

    const win = mainWindow;

    win.maximize();
    win.setMenu(null);

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173/#/');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/' });
    }

    win.webContents.on('did-fail-load', () => {
        console.log('Falha ao carregar, tentando novamente em 2s...');
        setTimeout(() => {
            if (win && !win.isDestroyed()) {
                if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
                    win.loadURL('http://localhost:5173');
                }
            }
        }, 2000);
    });

    win.webContents.on('before-input-event', (event, input) => {
        // Ctrl+Shift+I ou F12 para DevTools
        if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
            win.webContents.toggleDevTools();
        }
        // F11 para alternar Fullscreen
        if (input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
        }
        // Escape para sair do Fullscreen
        if (input.key === 'Escape' && win.isFullScreen()) {
            win.setFullScreen(false);
        }
        // F5 ou Ctrl+R para Reload (Hard Refresh)
        if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
            event.preventDefault();
            win.webContents.reloadIgnoringCache();
        }
    });

    win.once('ready-to-show', () => {
        win.show();

        // Timer de Sync
        const runAutoSync = async () => {
            try {
                console.log('[AutoSync] Iniciando sincronização essencial (Usuários/Config)...');
                await db.syncConfig();
                console.log('[AutoSync] Iniciando atualização de estoque na Nuvem...');
                if (!win.isDestroyed()) win.webContents.send('sync-status', { loading: true });
                const result = await db.syncXml();
                console.log('[AutoSync] Concluído:', result.message);
                if (!win.isDestroyed()) win.webContents.send('sync-status', { loading: false, success: true });
            } catch (err) {
                console.error('[AutoSync] Erro:', err);
                if (!win.isDestroyed()) win.webContents.send('sync-status', { loading: false, success: false });
            }
        };

        setTimeout(runAutoSync, 1000);
        setInterval(runAutoSync, 5 * 60 * 1000);
    });

    win.on('close', () => {
        win.webContents.executeJavaScript('localStorage.clear();').catch(() => { });
    });

    win.webContents.on('did-start-loading', () => {
        whatsappViewReady = false;
        console.log('[Main] Renderer Iniciando Carga (Handshake Reset)');
    });

    win.webContents.on('did-finish-load', () => {
        console.log('[Main] Renderer Totalmente Carregado');
    });

    // Auto Updater
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('checking-for-updates', () => console.log('[Updater] Verificando...'));
    autoUpdater.on('update-available', (info) => win.webContents.send('update-available', info));
    autoUpdater.on('download-progress', (progress) => win.webContents.send('update-progress', progress.percent));
    autoUpdater.on('update-downloaded', () => win.webContents.send('update-downloaded'));
    autoUpdater.on('error', (err) => console.error('[Updater] Erro:', err));
}

// Handler para focar a janela
ipcMain.on('focus-window', (event) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// Handler para navegação solicitada pelo Renderer
ipcMain.on('request-navigation', (event, route) => {
    if (mainWindow) mainWindow.webContents.send('navigate-to', route);
});

// HANDSHAKE: WhatsApp avisando que está carregado e pronto para cliques
ipcMain.on('whatsapp-view-ready', (event) => {
    whatsappViewReady = true;
    console.log('[Handshake] WhatsApp View está PRONTA');
    if (pendingWhatsappClickId && mainWindow) {
        console.log(`[Handshake] Disparando click pendente: ${pendingWhatsappClickId}`);
        mainWindow.webContents.send('trigger-whatsapp-click', pendingWhatsappClickId);
        pendingWhatsappClickId = null;
    }
});

// Handler para Notificações Nativas (COM REF GLOBAL PARA PREVENIR GC)
ipcMain.on('show-native-notification', (event, { title, body, icon, id }) => {
    const notif = new Notification({
        title: title || 'SDR IRW Motors',
        body: body || '',
        icon: icon ? path.join(__dirname, '../public/icon.png') : undefined,
        silent: false
    });

    // Mágica para o clique funcionar sempre
    // Mágica para o clique funcionar sempre
    notif.on('click', () => {
        console.log(`[Main] Notificação clicada! ID: ${id}`);
        if (mainWindow) {
            // Foco Ultra-Robusto
            console.log('[Main] Executando sequ├¬ncia de foco agressivo...');
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setAlwaysOnTop(false);
            mainWindow.focus();
            mainWindow.flashFrame(true);

            // Armazena o ID para o aperto de mão
            pendingWhatsappClickId = id;

            // Envia o pedido de navegação limpa via IPC
            console.log('[Main] Solicitando navegação para /whatsapp');
            mainWindow.webContents.send('navigate-to', '/whatsapp');

            // Se o WhatsApp já avisou que está pronto antes, dispara direto
            if (whatsappViewReady) {
                mainWindow.webContents.send('trigger-whatsapp-click', id);
                pendingWhatsappClickId = null;
            } else {
                console.log(`[Notification] Aguardando Handshake da View para ID: ${id}`);
                // Fallback de segurança 2s caso a view nunca avise
                setTimeout(() => {
                    if (pendingWhatsappClickId === id) {
                        console.log(`[Notification] Fallback disparando click para ID: ${id}`);
                        mainWindow.webContents.send('trigger-whatsapp-click', id);
                        pendingWhatsappClickId = null;
                    }
                }, 2000);
            }
        }
    });

    // Gerenciamento de Memória
    notif.on('close', () => {
        activeNotifications.delete(notif);
    });

    activeNotifications.add(notif);
    notif.show();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('get-visitas-secure', (e, { role, username }) => db.getVisitas(role, username));
ipcMain.handle('add-visita', async (e, v) => await db.addVisita(v));
ipcMain.handle('update-visita-status', async (e, { id, status, pipeline }) => await db.updateVisitaStatus(id, status, pipeline));
ipcMain.handle('update-visita-full', async (e, v) => await db.updateVisitaFull(v));
ipcMain.handle('delete-visita', async (e, id) => await db.deleteVisita(id));
ipcMain.handle('get-agendamentos-resumo', () => db.getAgendamentosPorUsuario());
ipcMain.handle('get-agendamentos-detalhes', (e, username) => db.getAgendamentosDetalhes(username));
ipcMain.handle('get-temperature-stats', () => db.getTemperatureStats());

// --- Genéricos (Estoque, Portais, Usuários) ---
ipcMain.handle('get-list', (e, table) => db.getList(table));
ipcMain.handle('add-item', async (e, data) => await db.addItem(data.table, data));
ipcMain.handle('toggle-item', async (e, data) => await db.toggleItem(data.table, data.nome, data.ativo));
ipcMain.handle('delete-item', async (e, data) => await db.deleteItem(data.table, data.nome));
ipcMain.handle('get-list-users', () => db.getListUsers());
ipcMain.handle('add-user', async (e, user) => await db.addUser(user));
ipcMain.handle('update-user', async (e, user) => await db.updateUser(user));
ipcMain.handle('delete-user', (e, user) => db.deleteUser(user));
ipcMain.handle('login', (e, { username, password }) => db.checkLogin(username, password));
ipcMain.handle('change-password', (e, { username, newPassword }) => db.changePassword(username, newPassword));
ipcMain.handle('migrate-all', async () => await db.migrateAllToCloud());
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall());

// --- Estatísticas & Sync ---
ipcMain.handle('get-stats', (e, days) => db.getStats(days));
ipcMain.handle('get-competition', () => db.getCompetitionData());
ipcMain.handle('set-competition', (e, data) => db.setCompetitionData(data));
ipcMain.handle('sync-xml', () => db.syncXml());
ipcMain.handle('sync-essential', async () => await db.syncConfig());
ipcMain.handle('get-scripts', (e, username) => db.getScripts(username));
ipcMain.handle('get-user-role', (e, username) => db.getUserRole(username));
ipcMain.handle('add-script', (e, args) => db.addScript(args.titulo, args.mensagem, args.isSystem, args.userRole, args.link, args.username));
ipcMain.handle('update-script', (e, args) => db.updateScript(args.id, args.titulo, args.mensagem, args.isSystem, args.userRole, args.link, args.username));
ipcMain.handle('update-scripts-order', (e, items) => db.updateScriptsOrder(items));
ipcMain.handle('delete-script', (e, { id, userRole, username }) => db.deleteScript(id, userRole, username));

ipcMain.handle('get-image-base64', async (e, url) => {
    try {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        return `data:${response.headers.get('content-type') || 'image/jpeg'};base64,${buffer.toString('base64')}`;
    } catch (err) { throw err; }
});

ipcMain.handle('scrap-car-details', (e, { nome, url }) => db.scrapCarDetails(nome, url));
ipcMain.handle('get-vehicles-stats', () => db.getVehiclesStats());
ipcMain.handle('get-visits-by-vehicle', (e, name) => db.getVisitsByVehicle(name));

ipcMain.handle('get-config', (e, key) => db.getConfig(key));
ipcMain.handle('save-config', (e, { key, value }) => db.saveConfig(key, value));

ipcMain.handle('get-config-meta', () => db.getConfigMeta());
ipcMain.handle('set-config-meta', (e, { visita, venda }) => db.setConfigMeta(visita, venda));
ipcMain.handle('get-sdr-performance', () => db.getSdrPerformance());

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
