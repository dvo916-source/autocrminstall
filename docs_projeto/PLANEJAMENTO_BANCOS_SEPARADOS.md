# 🏗️ REFATORAÇÃO: BANCOS DE DADOS SEPARADOS POR LOJA

## 🎯 Objetivo

Migrar de **multi-tenant com `loja_id`** para **bancos de dados separados** no Supabase.

---

## 📊 Arquitetura Atual vs. Nova

### ❌ ATUAL (Multi-tenant)
```
SUPABASE (1 projeto)
├── Tabela: estoque (loja_id: irw-motors-main, loja-02, loja-03)
├── Tabela: usuarios (loja_id: irw-motors-main, loja-02, loja-03)
├── Tabela: visitas (loja_id: irw-motors-main, loja-02, loja-03)
└── Tabela: scripts (loja_id: irw-motors-main, loja-02, loja-03)
```

### ✅ NOVO (Bancos separados)
```
SUPABASE PROJETO 1 (IRW Motors)
├── URL: https://irw-motors.supabase.co
├── Tabela: estoque (SEM loja_id)
├── Tabela: usuarios (SEM loja_id)
├── Tabela: visitas (SEM loja_id)
└── Tabela: scripts (SEM loja_id)

SUPABASE PROJETO 2 (Loja 02)
├── URL: https://loja-02.supabase.co
├── Tabela: estoque
├── Tabela: usuarios
├── Tabela: visitas
└── Tabela: scripts

SUPABASE PROJETO 3 (Loja 03)
├── URL: https://loja-03.supabase.co
├── Tabela: estoque
├── Tabela: usuarios
├── Tabela: visitas
└── Tabela: scripts
```

---

## 🔧 Mudanças Necessárias

### 1. Tabela `lojas` (SQLite Local)

**ANTES:**
```sql
CREATE TABLE lojas (
    id TEXT PRIMARY KEY,
    nome TEXT,
    endereco TEXT,
    logo_url TEXT,
    modulos TEXT,  -- JSON array
    ativo INTEGER DEFAULT 1
);
```

**DEPOIS:**
```sql
CREATE TABLE lojas (
    id TEXT PRIMARY KEY,
    nome TEXT,
    endereco TEXT,
    logo_url TEXT,
    modulos TEXT,  -- JSON array
    ativo INTEGER DEFAULT 1,
    supabase_url TEXT NOT NULL,      -- NOVO
    supabase_key TEXT NOT NULL,      -- NOVO
    supabase_project_id TEXT         -- NOVO
);
```

---

### 2. Conexão Dinâmica com Supabase

**ANTES (db.js):**
```javascript
// Conexão fixa
const supabase = createClient(
    "https://whyfmogbayqwaeddoxwf.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
);
```

**DEPOIS:**
```javascript
// Conexão dinâmica por loja
const supabaseConnections = new Map();

function getSupabaseClient(lojaId) {
    if (supabaseConnections.has(lojaId)) {
        return supabaseConnections.get(lojaId);
    }
    
    const loja = db.prepare('SELECT * FROM lojas WHERE id = ?').get(lojaId);
    if (!loja || !loja.supabase_url || !loja.supabase_key) {
        throw new Error(`Loja ${lojaId} não tem configuração Supabase`);
    }
    
    const client = createClient(loja.supabase_url, loja.supabase_key);
    supabaseConnections.set(lojaId, client);
    return client;
}
```

---

### 3. Atualizar Todas as Queries

**ANTES:**
```javascript
export async function syncXml(lojaId) {
    const { data } = await supabase
        .from('estoque')
        .select('*')
        .eq('loja_id', lojaId);  // ❌ Filtro por loja_id
}
```

**DEPOIS:**
```javascript
export async function syncXml(lojaId) {
    const supabase = getSupabaseClient(lojaId);  // ✅ Cliente específico
    const { data } = await supabase
        .from('estoque')
        .select('*');  // ✅ SEM filtro (já é o banco certo)
}
```

---

### 4. Remover `loja_id` das Tabelas Supabase

**Tabelas afetadas:**
- `estoque` - Remover coluna `loja_id`
- `usuarios` - Remover coluna `loja_id`
- `visitas` - Remover coluna `loja_id`
- `scripts` - Remover coluna `loja_id`
- `vendedores` - Remover coluna `loja_id`
- `portais` - Remover coluna `loja_id`

**Migration SQL:**
```sql
-- Para cada projeto Supabase
ALTER TABLE estoque DROP COLUMN loja_id;
ALTER TABLE usuarios DROP COLUMN loja_id;
ALTER TABLE visitas DROP COLUMN loja_id;
ALTER TABLE scripts DROP COLUMN loja_id;
ALTER TABLE vendedores DROP COLUMN loja_id;
ALTER TABLE portais DROP COLUMN loja_id;
```

---

### 5. Interface de Cadastro de Loja

**Adicionar campos em `StoreManagement.jsx`:**

```javascript
const [newStore, setNewStore] = useState({
    nome: '',
    endereco: '',
    logo_url: '',
    modulos: [...],
    supabase_url: '',      // NOVO
    supabase_key: '',      // NOVO
    supabase_project_id: ''  // NOVO
});
```

**Wizard Step 4 (Novo):**
```
┌─────────────────────────────────────┐
│  Configuração do Supabase           │
│                                     │
│  URL do Projeto:                    │
│  [https://xxx.supabase.co]          │
│                                     │
│  Chave Anon (Pública):              │
│  [eyJhbGciOiJIUzI1NiIsInR5cCI...]  │
│                                     │
│  ID do Projeto:                     │
│  [xxx-xxx-xxx]                      │
└─────────────────────────────────────┘
```

---

### 6. Realtime Sync (Multi-conexão)

**ANTES:**
```javascript
export function enableRealtimeSync() {
    const channel = supabase.channel('db-changes')
        .on('postgres_changes', { table: 'estoque' }, ...)
        .subscribe();
}
```

**DEPOIS:**
```javascript
export function enableRealtimeSync(lojaId) {
    const supabase = getSupabaseClient(lojaId);
    const channel = supabase.channel(`db-changes-${lojaId}`)
        .on('postgres_changes', { table: 'estoque' }, ...)
        .subscribe();
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Preparação
- [ ] Criar projetos Supabase para cada loja
- [ ] Copiar schema de tabelas para cada projeto
- [ ] Migrar dados existentes

### Fase 2: Código
- [ ] Adicionar campos `supabase_url`, `supabase_key` na tabela `lojas`
- [ ] Implementar `getSupabaseClient(lojaId)`
- [ ] Atualizar todas as funções que usam Supabase
- [ ] Remover filtros `.eq('loja_id', ...)`
- [ ] Atualizar Realtime Sync

### Fase 3: Interface
- [ ] Adicionar campos no wizard de criação de loja
- [ ] Adicionar validação de credenciais Supabase
- [ ] Testar conexão antes de salvar

### Fase 4: Migração
- [ ] Script de migração de dados
- [ ] Backup completo
- [ ] Executar migração
- [ ] Validar dados

### Fase 5: Testes
- [ ] Testar criação de loja nova
- [ ] Testar sincronização de estoque
- [ ] Testar Realtime
- [ ] Testar isolamento de dados

---

## ⚠️ Riscos e Considerações

1. **Custo:** Cada projeto Supabase pode ter custo separado
2. **Manutenção:** Mais projetos = mais complexidade
3. **Migrations:** Precisam ser aplicadas em TODOS os projetos
4. **Backup:** Cada banco precisa de backup individual

---

## 💡 Alternativa (Híbrida)

**Manter multi-tenant MAS com RLS (Row Level Security):**

```sql
-- Supabase RLS Policy
CREATE POLICY "Users can only see their store data"
ON estoque
FOR SELECT
USING (loja_id = current_setting('app.current_loja_id'));
```

**Vantagens:**
- ✅ Isolamento de dados via RLS
- ✅ Um único projeto Supabase
- ✅ Mais fácil de manter
- ✅ Queries continuam simples

**Desvantagens:**
- ❌ Dados ainda estão no mesmo banco (fisicamente)
- ❌ Depende de configuração correta do RLS

---

## 🎯 Recomendação

**Para pequeno/médio porte (até 10 lojas):**
→ Usar **RLS (Row Level Security)** no modelo atual

**Para grande porte (10+ lojas):**
→ Usar **bancos separados** como você sugeriu

---

**Status:** 📝 PLANEJADO (Aguardando resolução do bug atual)
**Prioridade:** 🔵 MÉDIA (Após estabilizar sistema)
**Estimativa:** 2-3 dias de desenvolvimento
