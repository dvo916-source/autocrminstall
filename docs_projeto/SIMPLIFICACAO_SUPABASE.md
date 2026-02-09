# 🎯 SIMPLIFICAÇÃO DO SUPABASE - BANCOS SEPARADOS

## 📊 Decisão Arquitetural

**APROVADO:** Cada loja terá seu próprio projeto Supabase.

---

## ✅ Vantagens da Abordagem

### 1. **Simplicidade**
- ❌ **ANTES:** Queries com `.eq('loja_id', 'xxx')` em TUDO
- ✅ **DEPOIS:** Queries diretas sem filtros

```javascript
// ANTES (Complexo)
const { data } = await supabase
    .from('estoque')
    .select('*')
    .eq('loja_id', 'irw-motors-main')
    .eq('ativo', true);

// DEPOIS (Simples)
const { data } = await supabase
    .from('estoque')
    .select('*')
    .eq('ativo', true);
```

### 2. **Segurança Total**
- ✅ Impossível acessar dados de outra loja
- ✅ Cada loja tem suas próprias credenciais
- ✅ Isolamento físico dos dados

### 3. **Performance**
- ✅ Tabelas menores = Queries mais rápidas
- ✅ Índices mais eficientes
- ✅ Menos dados para filtrar

### 4. **Escalabilidade**
- ✅ Cada loja pode ter plano diferente
- ✅ Pode estar em região diferente
- ✅ Backup independente

---

## 🗂️ Estrutura de Tabelas Simplificada

### **ANTES (Multi-tenant):**
```sql
CREATE TABLE estoque (
    id UUID PRIMARY KEY,
    loja_id TEXT NOT NULL,  -- ❌ Campo extra
    nome TEXT,
    valor TEXT,
    ativo BOOLEAN,
    FOREIGN KEY (loja_id) REFERENCES lojas(id)
);

CREATE INDEX idx_estoque_loja ON estoque(loja_id);  -- ❌ Índice extra
```

### **DEPOIS (Banco separado):**
```sql
CREATE TABLE estoque (
    id UUID PRIMARY KEY,
    -- ✅ SEM loja_id
    nome TEXT,
    valor TEXT,
    ativo BOOLEAN
);

-- ✅ SEM índice de loja_id
```

---

## 📋 Tabelas Afetadas

Todas as tabelas terão o campo `loja_id` **REMOVIDO**:

1. ✅ `estoque`
2. ✅ `usuarios`
3. ✅ `visitas`
4. ✅ `scripts`
5. ✅ `vendedores`
6. ✅ `portais`
7. ✅ `metas`
8. ✅ `crm_settings`

---

## 🔧 Mudanças no Código

### 1. **Tabela `lojas` (SQLite Local)**

```sql
CREATE TABLE lojas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT,
    logo_url TEXT,
    modulos TEXT,  -- JSON array
    ativo INTEGER DEFAULT 1,
    
    -- NOVOS CAMPOS
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    supabase_project_id TEXT
);
```

### 2. **Conexão Dinâmica (db.js)**

```javascript
// Cache de conexões
const supabaseClients = new Map();

function getSupabaseForLoja(lojaId) {
    // Verifica cache
    if (supabaseClients.has(lojaId)) {
        return supabaseClients.get(lojaId);
    }
    
    // Busca configuração da loja
    const loja = db.prepare('SELECT * FROM lojas WHERE id = ?').get(lojaId);
    
    if (!loja || !loja.supabase_url || !loja.supabase_anon_key) {
        throw new Error(`Loja ${lojaId} sem configuração Supabase`);
    }
    
    // Cria cliente
    const client = createClient(loja.supabase_url, loja.supabase_anon_key);
    
    // Armazena em cache
    supabaseClients.set(lojaId, client);
    
    return client;
}
```

### 3. **Atualizar Todas as Funções**

```javascript
// ANTES
export async function syncXml(lojaId) {
    const { data } = await supabase  // ❌ Cliente global
        .from('estoque')
        .select('*')
        .eq('loja_id', lojaId);  // ❌ Filtro por loja
}

// DEPOIS
export async function syncXml(lojaId) {
    const supabase = getSupabaseForLoja(lojaId);  // ✅ Cliente específico
    const { data } = await supabase
        .from('estoque')
        .select('*');  // ✅ SEM filtro (já é o banco certo)
}
```

---

## 🚀 Plano de Migração

### **Fase 1: Preparação (1 dia)**
- [ ] Criar projeto Supabase para IRW Motors
- [ ] Copiar schema das tabelas (SEM loja_id)
- [ ] Testar conexão

### **Fase 2: Código (2 dias)**
- [ ] Adicionar campos Supabase na tabela `lojas`
- [ ] Implementar `getSupabaseForLoja()`
- [ ] Atualizar TODAS as funções que usam Supabase
- [ ] Remover TODOS os `.eq('loja_id', ...)`
- [ ] Atualizar Realtime Sync

### **Fase 3: Migração de Dados (1 dia)**
- [ ] Script para migrar dados da IRW Motors
- [ ] Validar integridade dos dados
- [ ] Backup completo

### **Fase 4: Testes (1 dia)**
- [ ] Testar criação de loja
- [ ] Testar sincronização
- [ ] Testar Realtime
- [ ] Testar isolamento

---

## 💰 Considerações de Custo

### **Supabase Free Tier (Por Projeto):**
- ✅ 500 MB de banco de dados
- ✅ 1 GB de armazenamento de arquivos
- ✅ 2 GB de largura de banda
- ✅ 50.000 usuários ativos mensais

### **Estimativa:**
- **Loja pequena:** Free tier suficiente
- **Loja média:** ~$25/mês (Pro)
- **Loja grande:** ~$599/mês (Team)

---

## 📝 Checklist de Implementação

### **Backend (db.js)**
- [ ] Criar `getSupabaseForLoja(lojaId)`
- [ ] Atualizar `syncXml()`
- [ ] Atualizar `syncConfig()`
- [ ] Atualizar `addVisita()`
- [ ] Atualizar `updateVisita()`
- [ ] Atualizar `deleteVisita()`
- [ ] Atualizar `addUser()`
- [ ] Atualizar `updateUser()`
- [ ] Atualizar `deleteUser()`
- [ ] Atualizar `addItem()`
- [ ] Atualizar `toggleItem()`
- [ ] Atualizar `deleteItem()`
- [ ] Atualizar `enableRealtimeSync()`

### **Frontend**
- [ ] Adicionar campos no wizard de criação de loja
- [ ] Validar URL e chave Supabase
- [ ] Testar conexão antes de salvar

### **Banco de Dados**
- [ ] Adicionar colunas na tabela `lojas`
- [ ] Migrar dados da IRW Motors
- [ ] Criar novos projetos Supabase para novas lojas

---

## ⚠️ Riscos

1. **Custo:** Cada projeto tem custo separado
2. **Manutenção:** Migrations precisam rodar em TODOS os projetos
3. **Complexidade inicial:** Mais código para gerenciar conexões

---

## ✅ Decisão Final

**APROVADO para implementação após estabilizar o sistema atual.**

**Prioridade:** 🔵 ALTA (Após resolver bugs críticos)

**Estimativa:** 5 dias de desenvolvimento + testes

---

**Status:** 📝 PLANEJADO
**Responsável:** Equipe de Desenvolvimento
**Data Prevista:** Após estabilização do sistema
