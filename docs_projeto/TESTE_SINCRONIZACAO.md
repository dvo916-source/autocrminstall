# 🔧 TESTE RÁPIDO - SINCRONIZAÇÃO DO ESTOQUE

## 📋 Passos para Testar

### 1. Reinicie o Aplicativo
```bash
# Pare o aplicativo atual (Ctrl+C no terminal)
# Depois execute novamente:
npm run dev
```

### 2. Observe os Logs

Procure por estas mensagens no console:

✅ **SUCESSO:**
```
[SupabaseSync] Buscando estoque da nuvem para loja: irw-motors-main...
[SupabaseSync] Supabase disponível: true
[SupabaseSync] Resposta do Supabase: { temDados: true, quantidade: 49, erro: 'nenhum' }
[SupabaseSync] 🗑️  Removidos X veículos antigos da loja irw-motors-main
[SupabaseSync] ✅ Inseridos 49/49 veículos
✅[SupabaseSync] Sincronia Completa: 49 veículos ativos na loja irw-motors-main.
```

❌ **ERRO:**
```
[SupabaseSync] ❌ Supabase não está inicializado!
[SupabaseSync] ❌ Erro na query: ...
[SupabaseSync] ⚠️  cloudEstoque é null/undefined
[SupabaseSync] ⚠️  Nenhum veículo para inserir
```

### 3. Verifique no WhatsApp

1. Vá para a página **WhatsApp**
2. Clique na aba **ESTOQUE**
3. Deve aparecer **49 veículos**

---

## 🔍 Se Ainda Mostrar 0 Veículos

### Opção 1: Forçar Sincronização via DevTools

1. Pressione `F12` para abrir o Console
2. Cole e execute:
```javascript
(async () => {
    const { ipcRenderer } = window.require('electron');
    console.log('🔄 Forçando sincronização...');
    const result = await ipcRenderer.invoke('force-sync-estoque', 'irw-motors-main');
    console.log('Resultado:', result);
    if (result.success) {
        console.log(`✅ ${result.count} veículos sincronizados!`);
        location.reload();
    } else {
        console.error(`❌ Erro: ${result.error}`);
    }
})();
```

### Opção 2: Verificar Banco Local

```javascript
(async () => {
    const { ipcRenderer } = window.require('electron');
    const estoque = await ipcRenderer.invoke('get-list', { 
        table: 'estoque', 
        lojaId: 'irw-motors-main' 
    });
    console.log(`📊 Estoque local: ${estoque.length} veículos`);
    if (estoque.length > 0) {
        console.log('Primeiros 3:', estoque.slice(0, 3).map(v => v.nome));
    }
})();
```

---

## 🎯 Checklist de Validação

- [ ] Aplicativo reiniciado
- [ ] Logs mostram "Supabase disponível: true"
- [ ] Logs mostram "quantidade: 49"
- [ ] Logs mostram "Inseridos 49/49 veículos"
- [ ] WhatsApp/Estoque mostra os veículos
- [ ] Desenvolvedor consegue ver o estoque

---

## 💡 Sobre Permissões do Desenvolvedor

**SIM**, o desenvolvedor tem acesso ao estoque!

O código em `Shell.jsx` garante:
```javascript
// DEVELOPER: Acesso total, sem restrições
if (user.role === 'developer') return true;
```

Isso significa:
- ✅ Vê TODAS as lojas
- ✅ Vê TODOS os módulos (mesmo inativos)
- ✅ Acessa TODAS as funcionalidades
- ✅ Não precisa de permissões específicas

---

## 🆘 Se Nada Funcionar

1. **Verifique a conexão com internet**
2. **Execute o diagnóstico:**
   ```bash
   node diagnostico_query_estoque.mjs
   ```
3. **Verifique se retorna 49 veículos**
4. **Se sim, o problema é na sincronização local**
5. **Compartilhe os logs do console comigo**

---

**Última Atualização:** 2026-02-07 11:30
