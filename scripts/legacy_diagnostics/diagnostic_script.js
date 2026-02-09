// ==============================================
// SCRIPT DE DIAGNÓSTICO COMPLETO
// ==============================================
// Cole este código no DevTools (F12) > Console

(async function diagnostico() {
    console.log('🔬 ========== DIAGNÓSTICO COMPLETO ==========');

    // 1. Verificar contexto da loja
    console.log('\n📍 1. CONTEXTO DA LOJA:');
    const lojaStorage = localStorage.getItem('selected_loja_id');
    const username = localStorage.getItem('username');
    console.log('- localStorage selected_loja_id:', lojaStorage);
    console.log('- localStorage username:', username);

    // 2. Verificar IPC
    console.log('\n📡 2. TESTE IPC:');
    const { ipcRenderer } = window.require('electron');

    try {
        const lojaId = lojaStorage || 'irw-motors-main';
        console.log(`- Chamando get-list com lojaId: ${lojaId}`);

        const result = await ipcRenderer.invoke('get-list', {
            table: 'estoque',
            lojaId: lojaId
        });

        console.log(`- ✅ IPC retornou ${result?.length || 0} veículos`);
        if (result && result.length > 0) {
            console.log('- Primeiros 3 veículos:', result.slice(0, 3));
        } else {
            console.log('- ❌ Array vazio ou null:', result);
        }
    } catch (err) {
        console.error('- ❌ Erro no IPC:', err);
    }

    // 3. Veri ficar estado do React (se conseguirmos acessar)
    console.log('\n⚛️ 3. ESTADO DO REACT:');
    try {
        // Tenta encontrar o componente React no DOM
        const whatsappElement = document.querySelector('[class*="whatsapp"], [id*="whatsapp"]');
        if (whatsappElement) {
            console.log('- Elemento WhatsApp encontrado:', whatsappElement);

            // Tenta acessar React Fiber (pode não funcionar em prod)
            const fiber = Object.keys(whatsappElement).find(key =>
                key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
            );

            if (fiber) {
                console.log('- React Fiber encontrado');
            } else {
                console.log('- React Fiber não acessível (normal em produção)');
            }
        } else {
            console.log('- ❌ Elemento WhatsApp não encontrado no DOM');
        }
    } catch (err) {
        console.log('- Não foi possível acessar estado do React:', err.message);
    }

    // 4. Verificar listeners ativos
    console.log('\n👂 4. LISTENERS IPC:');
    console.log('- Nota: Listeners não são listáveis, mas devem estar ativos');
    console.log('- Verifique se há logs de "🔄 [Whatsapp] Atualizando sidebar..."');

    // 5. Forçar refresh manual
    console.log('\n🔄 5. FORÇANDO REFRESH:');
    try {
        await ipcRenderer.invoke('sync-essential', lojaStorage || 'irw-motors-main');
        console.log('- ✅ Sync-essential disparado');
    } catch (err) {
        console.error('- ❌ Erro ao disparar sync:', err);
    }

    console.log('\n✅ ========== DIAGNÓSTICO COMPLETO ==========');
    console.log('Aguarde 2 segundos e verifique se o estoque apareceu...');
})();
