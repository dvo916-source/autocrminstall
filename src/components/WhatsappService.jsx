import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { electronAPI } from '@/lib/electron-api';

// Componente persistente que gerencia o WhatsApp em segundo plano
const WhatsappService = ({ isVisible, isActive }) => {
    const webviewRef = useRef(null);
    const [username, setUsername] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [rightSidebarOffset, setRightSidebarOffset] = useState(0);

    // 1. Inicialização Tardia (Agora 500ms para ser quase instantâneo)
    useEffect(() => {
        const timer = setTimeout(() => {
            const user = localStorage.getItem('username');
            setUsername(user);
            setIsReady(true);
            console.log("🟢 [WhatsappService] Iniciando Webview em Background (Instant Start)...");
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // 2. Listener para o estado do sidebar (vindo do Whatsapp.jsx)
    useEffect(() => {
        const handleSidebarState = (e) => {
            const { isOpen, width } = e.detail;
            setRightSidebarOffset(isOpen ? width : 0);
        };
        window.addEventListener('whatsapp-sidebar-state', handleSidebarState);

        const handleSidebarToggle = (e) => {
            const data = e.detail;
            if (typeof data === 'object') {
                setRightSidebarOffset(data.isOpen ? data.width : 0);
            } else {
                setRightSidebarOffset(data ? 320 : 0);
            }
        };
        window.addEventListener('whatsapp-sidebar-toggle', handleSidebarToggle);

        return () => {
            window.removeEventListener('whatsapp-sidebar-state', handleSidebarState);
            window.removeEventListener('whatsapp-sidebar-toggle', handleSidebarToggle);
        };
    }, []);

    // 2. Lógica de Scripts e Notificações
    useEffect(() => {
        if (!isReady) return;

        const webview = webviewRef.current;
        if (!webview) return;

        const handleDomReady = () => {
            console.log('🌐 [WhatsappService] DOM Ready - Injetando Hooks...');
            try {
                // USANDO electronAPI EM VEZ DE ipcRenderer
                electronAPI.whatsappViewReady();

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


                    // Extrai nome e mensagem
                    const clientName = payload.title || 'Cliente';
                    const message = payload.options.body || '';

                    // Monta notificação melhorada USANDO electronAPI
                    electronAPI.showNotification({
                        title: `💬 Nova Mensagem - ${clientName}`,
                        body: message,
                        icon: 'whatsapp',
                        id: payload.id,
                        clickAction: 'open-chat',
                        clientName: clientName
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

        const handleCrashed = () => {
            console.error('🔴 [WhatsappService] Webview CRASHED! Tentando recarregar...');
            if (webview && !webview.isDestroyed?.()) webview.reload();
        };

        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('console-message', handleConsoleMessage);
        webview.addEventListener('page-title-updated', handleTitleUpdate);
        webview.addEventListener('crashed', handleCrashed);
        webview.addEventListener('render-process-gone', handleCrashed);

        return () => {
            if (webview) {
                webview.removeEventListener('dom-ready', handleDomReady);
                webview.removeEventListener('console-message', handleConsoleMessage);
                webview.removeEventListener('page-title-updated', handleTitleUpdate);
                webview.removeEventListener('crashed', handleCrashed);
                webview.removeEventListener('render-process-gone', handleCrashed);
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

        const handleRequestChatInfo = async () => {
            if (!webviewRef.current) return;

            console.log("🔍 [Service] Solicitando informações do chat...");
            const script = `
                (() => {
                    try {
                        const header = document.querySelector('header');
                        if (!header) return null;
                        
                        // Busca o elemento de título (Nome ou Número)
                        const titleEl = header.querySelector('span[title]') || 
                                       header.querySelector('div[role="button"] span[title]');
                        
                        const name = titleEl ? titleEl.getAttribute('title') : '';
                        
                        // Se for um número de telefone direto
                        let phone = '';
                        if (name && name.replace(/\\D/g, '').length >= 8) {
                            phone = name.replace(/\\D/g, '');
                        }
                        
                        return { name, phone };
                    } catch(e) { return null; }
                })();
            `;

            try {
                const info = await webviewRef.current.executeJavaScript(script);
                if (info) {
                    window.dispatchEvent(new CustomEvent('whatsapp-chat-info-captured', { detail: info }));
                }
            } catch (err) {
                console.error("Erro ao capturar info do chat:", err);
            }
        };

        const handleDirectChat = (e) => {
            const phone = e.detail;
            if (!webviewRef.current || !phone) return;

            const cleanPhone = phone.replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

            console.log("🚀 [Service] Iniciando Chat Direto Silencioso:", finalPhone);

            // Tenta abrir o chat injetando interação na UI do WhatsApp — SEM RELOAD
            const script = `
                (async () => {
                    try {
                        const targetPhone = "${finalPhone}";
                        const cleanPhone = "${cleanPhone}";

                        // 1. Limpa qualquer estado anterior de busca
                        const clearSearch = () => {
                            const btn = document.querySelector('[data-testid="x-alt"]') || 
                                      document.querySelector('[data-icon="x-alt"]');
                            if (btn) btn.click();
                        }
                        clearSearch();

                        // 2. Encontra a caixa de pesquisa principal
                        let search = document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
                                     document.querySelector('[data-testid="chat-list-search"]');

                        if (!search) {
                            // Tenta abrir a barra de pesquisa se estiver oculta
                            const newChatBtn = document.querySelector('[data-icon="chat"]') || 
                                             document.querySelector('[data-testid="newsletter-list-add-icon"]');
                            if (newChatBtn) {
                                newChatBtn.click();
                                await new Promise(r => setTimeout(r, 400));
                                search = document.querySelector('div[contenteditable="true"][data-tab="3"]');
                            }
                        }

                        if (search) {
                            search.focus();
                            document.execCommand('selectAll', false, null);
                            document.execCommand('insertText', false, cleanPhone);
                            search.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            // 3. Aguarda o WhatsApp processar a busca (timing crucial)
                            await new Promise(r => setTimeout(r, 1200));

                            // 4. Procura o resultado em dois lugares: Lista ou "Novo Chat"
                            const result = 
                                // Caso seja contato ou conversa existente
                                document.querySelector('[data-testid="cell-frame-container"]') ||
                                document.querySelector('#pane-side div[role="listitem"]') ||
                                // Caso seja um número NOVO (Botão "Conversar com...")
                                document.querySelector('div[role="button"] span[title="' + targetPhone + '"]') ||
                                Array.from(document.querySelectorAll('div[role="button"]')).find(el => el.innerText.includes(cleanPhone));

                            if (result) {
                                // Clica no elemento mais próximo da raiz que seja clicável
                                (result.closest('div[role="row"]') || result).click();
                                
                                // Limpeza sutil pós-clique
                                setTimeout(() => {
                                    document.activeElement.blur();
                                }, 300);
                                return "SUCCESS";
                            }
                        }

                        console.log("⚠️ Chat não encontrado instantaneamente na busca.");
                        return "NOT_FOUND";

                    } catch(err) {
                        console.error("Erro no Zap Direto:", err);
                        return "ERR";
                    }
                })();
                true;
            `;

            webviewRef.current.executeJavaScript(script).catch(err => {
                console.error("❌ Erro ao executar script de Chat Direto:", err);
            });
        };

        const handleRepassLead = (e) => {
            const { message, groupName } = e.detail;
            if (!webviewRef.current) return;

            console.log(`📢 [Service] Repassando lead para grupo: ${groupName}`);

            const encodedMsg = encodeURIComponent(message);
            const encodedGroup = encodeURIComponent(groupName);

            const script = `
                (async () => {
                    try {
                        const groupName = decodeURIComponent("${encodedGroup}");
                        const msg = decodeURIComponent("${encodedMsg}");
                        
                        // 1. Tentar encontrar o grupo na lista lateral sem pesquisar primeiro
                        let chat = Array.from(document.querySelectorAll('span[title]'))
                                    .find(el => el.title === groupName || el.innerText === groupName);
                        
                        if (!chat) {
                            // 2. Usar a pesquisa do WhatsApp
                            const searchInput = document.querySelector('div[contenteditable="true"][data-tab="3"]') || 
                                              document.querySelector('div[contenteditable="true"]');
                            if (searchInput) {
                                searchInput.focus();
                                document.execCommand('insertText', false, groupName);
                                await new Promise(r => setTimeout(r, 1500));
                                chat = Array.from(document.querySelectorAll('span[title]'))
                                            .find(el => el.title === groupName || el.innerText === groupName);
                            }
                        }

                        if (chat) {
                            chat.click();
                            await new Promise(r => setTimeout(r, 800));
                        }

                        // 3. Colar e Enviar
                        const input = document.querySelector('footer div[contenteditable="true"]') || 
                                    document.querySelector('div[contenteditable="true"][data-tab="10"]');
                        if (input) {
                            input.focus();
                            const dataTransfer = new DataTransfer();
                            dataTransfer.setData('text/plain', msg);
                            const pasteEvent = new ClipboardEvent('paste', {
                                clipboardData: dataTransfer,
                                bubbles: true,
                                cancelable: true
                            });
                            input.dispatchEvent(pasteEvent);
                            setTimeout(() => {
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                // Tentar clicar no botão de enviar
                                const sendBtn = document.querySelector('span[data-icon="send"]') || 
                                               document.querySelector('button span[data-icon="send"]');
                                if (sendBtn) sendBtn.click();
                            }, 200);
                        }
                    } catch (e) { console.error('Erro ao repassar lead:', e); }
                })();
                true;
            `;

            webviewRef.current.executeJavaScript(script);
        };

        window.addEventListener('whatsapp-send-text', handleSendText);
        window.addEventListener('whatsapp-request-chat-info', handleRequestChatInfo);
        window.addEventListener('whatsapp-direct-chat', handleDirectChat);
        window.addEventListener('whatsapp-repass-lead', handleRepassLead);

        return () => {
            window.removeEventListener('whatsapp-send-text', handleSendText);
            window.removeEventListener('whatsapp-request-chat-info', handleRequestChatInfo);
            window.removeEventListener('whatsapp-direct-chat', handleDirectChat);
            window.removeEventListener('whatsapp-repass-lead', handleRepassLead);
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
                display: isVisible ? 'flex' : 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
                paddingRight: `${rightSidebarOffset}px`,
                transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
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
