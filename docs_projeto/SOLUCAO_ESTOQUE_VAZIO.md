# 🔧 SOLUÇÃO RÁPIDA: ESTOQUE DESAPARECENDO

## 🎯 Problema
O estoque desaparece frequentemente no WhatsApp, mostrando "Nenhum veículo encontrado".

## ✅ Solução Definitiva (3 Passos)

### 1️⃣ **Corrigir Vínculos no Supabase**
```bash
node manutencao_estoque.mjs
```
**O que faz:** Corrige veículos sem `loja_id` e ativa veículos inativos.

---

### 2️⃣ **Sincronizar com o Banco Local**

**OPÇÃO A - Via DevTools (F12):**
1. Abra o aplicativo
2. Pressione `F12` para abrir o Console
3. Cole e execute:
```javascript
(async () => {
    const { ipcRenderer } = window.require('electron');
    const result = await ipcRenderer.invoke('force-sync-estoque', 'irw-motors-main');
    console.log(result.success ? `✅ ${result.count} veículos sincronizados!` : `❌ ${result.error}`);
})();
```
4. Pressione `F5` para recarregar

**OPÇÃO B - Aguardar Sincronização Automática:**
- O sistema sincroniza automaticamente a cada 5 minutos
- Aguarde ou reinicie o aplicativo

---

### 3️⃣ **Verificar Resultado**
1. Vá para **WhatsApp**
2. Clique na aba **ESTOQUE**
3. Verifique se os veículos aparecem

---

## 🔍 Diagnóstico

### Verificar Supabase:
```bash
node diagnostico_supabase.mjs
```

### Verificar Banco Local:
Abra o DevTools (F12) e execute:
```javascript
const { ipcRenderer } = window.require('electron');
const estoque = await ipcRenderer.invoke('get-list', { table: 'estoque', lojaId: 'irw-motors-main' });
console.log(`📊 Total: ${estoque.length} veículos`);
```

---

## 🚨 Causa Raiz

O problema ocorre quando:
1. **Veículos são cadastrados sem `loja_id`** (campo NULL no Supabase)
2. **Sincronização automática falha** (rede instável, timeout)
3. **Banco local fica desatualizado**

---

## 🛡️ Prevenção

### Automatizar Manutenção (Opcional)

**Windows Task Scheduler:**
1. Abra "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Nome: "Manutenção Estoque IRW"
4. Gatilho: Diariamente às 03:00
5. Ação: `node "D:\VISITAS IRW\crystal_app\manutencao_estoque.mjs"`

**Linux/Mac Cron:**
```bash
0 3 * * * cd /path/to/crystal_app && node manutencao_estoque.mjs
```

---

## 📋 Checklist de Solução

- [ ] Executei `node manutencao_estoque.mjs`
- [ ] Veículos foram corrigidos no Supabase
- [ ] Forcei sincronização via DevTools ou aguardei 5 minutos
- [ ] Recarreguei a página (F5)
- [ ] Estoque apareceu no WhatsApp

---

## 💡 Dicas

1. **Sempre execute `manutencao_estoque.mjs` primeiro**
2. **Aguarde 30 segundos** após forçar sincronização
3. **Recarregue a página** (F5) para ver mudanças
4. **Verifique o console** (F12) para mensagens de erro

---

## 🆘 Se Ainda Não Funcionar

1. Feche o aplicativo completamente
2. Execute:
```bash
node manutencao_estoque.mjs
```
3. Reabra o aplicativo:
```bash
npm run dev
```
4. Aguarde a sincronização automática (1 minuto)
5. Pressione F5

---

**Última Atualização:** 2026-02-07
**Versão do Sistema:** 1.1.3
