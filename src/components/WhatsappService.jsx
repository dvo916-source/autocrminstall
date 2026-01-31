import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Componente persistente que gerencia o WhatsApp em segundo plano
const WhatsappService = ({ isVisible, isActive }) => {
    const webviewRef = useRef(null);
    const [username, setUsername] = useState(null);
    const [isReady, setIsReady] = useState(false);

    // 1. Inicialização Tardia (3 Segundos) e Carregamento de Usuário
    useEffect(() => {
        const timer = setTimeout(() => {
            const user = localStorage.getItem('username');
            setUsername(user);
            setIsReady(true);
            console.log("🟢 [WhatsappService] Iniciando Webview em Background (3s delay)...");
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const [rightSidebarOffset, setRightSidebarOffset] = useState(320); // Começa aberto (320px)

    // Listener para redimensionamento baseado na Sidebar de Scripts
    useEffect(() => {
        const handleResize = (e) => {
            const isOpen = e.detail;
            setRightSidebarOffset(isOpen ? 320 : 0);
        };
        window.addEventListener('whatsapp-sidebar-toggle', handleResize);
        return () => window.removeEventListener('whatsapp-sidebar-toggle', handleResize);
    }, []);

    // 2. Lógica de Scripts e Notificações
    useEffect(() => {
        if (!isReady) return;

        const webview = webviewRef.current;
        if (!webview) return;

        const handleDomReady = () => {
            console.log('🌐 [WhatsappService] DOM Ready - Injetando Hooks...');
            try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('whatsapp-view-ready');

                webview.insertCSS(`
                    body { background-color: #0f172a !important; }
                    ::-webkit-scrollbar { width: 6px !important; }
                    ::-webkit-scrollbar-thumb { background: #334155 !important; border-radius: 3px !important; }
                `);
            } catch (e) {
                console.error('Erro handshake:', e);
            }

            if (webview && !webview.isDestroyed?.() && webview.getURL() !== 'about:blank') {
                webview.executeJavaScript(`
                    if (!window.__notificationHooked) {
                        window.__notificationHooked = true;
                        window.__notifs = {};
                        window.__notiffId = 0;
                        
                        window.Notification = function(title, options) {
                            const id = ++window.__notiffId;
                            try {
                                console.log('__WA_NOTIFICATION__:' + JSON.stringify({id, title, options: { body: options.body }}));
                            } catch(e) {}
                            return {
                                close: () => {},
                                addEventListener: () => {},
                                removeEventListener: () => {}
                            };
                        };
                        window.Notification.permission = 'granted';
                        window.Notification.requestPermission = async () => 'granted';
                    }
                    true; // Retorno seguro
                `).catch(err => console.error('Erro hook notif:', err));
            }
        };

        const handleConsoleMessage = (e) => {
            if (e.message.startsWith('__WA_NOTIFICATION__:')) {
                try {
                    const raw = e.message.replace('__WA_NOTIFICATION__:', '');
                    const payload = JSON.parse(raw);
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.send('show-native-notification', {
                        title: "WhatsApp SDR",
                        body: `${payload.title}: ${payload.options.body || ''}`,
                        id: payload.id
                    });
                } catch (err) { console.error("Erro notif:", err); }
            }
        };

        const handleTitleUpdate = (e) => {
            const title = e.title || '';
            const match = title.match(/\((\d+)\)/);
            const count = match ? parseInt(match[1]) : 0;
            window.dispatchEvent(new CustomEvent('whatsapp-badge-update', { detail: count }));
        };

        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('console-message', handleConsoleMessage);
        webview.addEventListener('page-title-updated', handleTitleUpdate);

        return () => {
            if (webview) {
                webview.removeEventListener('dom-ready', handleDomReady);
                webview.removeEventListener('console-message', handleConsoleMessage);
                webview.removeEventListener('page-title-updated', handleTitleUpdate);
            }
        };
    }, [isReady]);

    // 3. Ouvintes de Eventos UI
    useEffect(() => {
        if (!isReady) return;

        const handleSendText = (e) => {
            const text = e.detail;
            if (!webviewRef.current) return;

            console.log("📨 [Service] Enviando texto...", text);
            webviewRef.current.focus();

            const encodedText = encodeURIComponent(text);
            const script = `
                (() => {
                    const input = document.querySelector('footer div[contenteditable="true"]') || 
                                document.querySelector('div[contenteditable="true"][data-tab="10"]');
                    if (input) {
                        input.focus();
                        const textToPaste = decodeURIComponent("${encodedText}");
                        const dataTransfer = new DataTransfer();
                        dataTransfer.setData('text/plain', textToPaste);
                        
                        const pasteEvent = new ClipboardEvent('paste', {
                            clipboardData: dataTransfer,
                            bubbles: true,
                            cancelable: true
                        });
                        input.dispatchEvent(pasteEvent);
                        setTimeout(() => input.dispatchEvent(new Event('input', { bubbles: true })), 100);
                    }
                })();
                true; // Retorno seguro
            `;
            webviewRef.current.executeJavaScript(script);
        };

        const handleDirectChat = (e) => {
            const phone = e.detail;
            if (webviewRef.current) {
                webviewRef.current.loadURL(`https://web.whatsapp.com/send?phone=55${phone}`);
            }
        };

        window.addEventListener('whatsapp-send-text', handleSendText);
        window.addEventListener('whatsapp-direct-chat', handleDirectChat);

        return () => {
            window.removeEventListener('whatsapp-send-text', handleSendText);
            window.removeEventListener('whatsapp-direct-chat', handleDirectChat);
        };
    }, [isReady]);

    // Injeção de Imagens
    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;
        const listener = (e) => {
            if (e.detail && e.detail.script) {
                // Adiciona true no final para garantir serialização safe
                webview.executeJavaScript(e.detail.script + " true;").catch(err => console.error(err));
            }
        };
        window.addEventListener('whatsapp-execute-script', listener);
        return () => window.removeEventListener('whatsapp-execute-script', listener);
    }, [isReady]);

    if (!isReady) return null;

    const partitionName = username ? `persist:whatsapp-${username}` : 'persist:whatsapp-default';

    return (
        <div
            style={{
                // Leva em conta a sidebar esquerda (80px) E a sidebar direita (rightSidebarOffset)
                position: 'absolute', // Absolute relativo ao <main> (que já é flex-1)
                top: 0,
                left: isVisible ? 0 : '-10000px', // 0 inicia onde o main começa (logo após a sidebar nav)
                right: isVisible && isActive ? `${rightSidebarOffset}px` : 0,
                bottom: 0,
                // width: auto implícito pelo left/right
                zIndex: isVisible ? 10 : -1,
                visibility: isVisible ? 'visible' : 'hidden',
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' // Animação suave combinando com o Framer Motion
            }}
        // Removemos classes que conflitam com style
        >
            <webview
                ref={webviewRef}
                src="https://web.whatsapp.com/"
                className="w-full h-full border-none"
                partition={partitionName}
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                webpreferences="backgroundThrottling=false, spellcheck=false"
                allowpopups="true"
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default WhatsappService;
