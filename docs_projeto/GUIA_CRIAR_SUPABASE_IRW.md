# 🏗️ GUIA: CRIAR NOVO PROJETO SUPABASE PARA IRW MOTORS

## 📝 Passo 1: Criar Projeto

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `irw-motors-main`
   - **Database Password:** (Escolha uma senha forte e ANOTE!)
   - **Region:** `South America (São Paulo)` (mais próximo)
   - **Pricing Plan:** Free (ou Pro se preferir)
4. Clique em **"Create new project"**
5. Aguarde 2-3 minutos

---

## 📝 Passo 2: Copiar Credenciais

Após criar, vá em **Settings** > **API**:

1. **Project URL:** `https://[seu-projeto].supabase.co`
2. **anon/public key:** `eyJhbGc...` (chave longa)
3. **Project ID:** `[id-do-projeto]`

**ANOTE ESSAS 3 INFORMAÇÕES!**

---

## 📝 Passo 3: Criar Tabelas (SQL Editor)

Vá em **SQL Editor** e execute este script:

```sql
-- ========================================
-- BANCO DE DADOS SIMPLIFICADO - IRW MOTORS
-- SEM loja_id em NENHUMA tabela!
-- ========================================

-- 1. ESTOQUE (Veículos)
CREATE TABLE estoque (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    foto TEXT,
    fotos TEXT,
    link TEXT,
    km TEXT,
    cambio TEXT,
    ano TEXT,
    valor TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_estoque_ativo ON estoque(ativo);
CREATE INDEX idx_estoque_nome ON estoque(nome);

-- 2. USUÁRIOS
CREATE TABLE usuarios (
    username TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    cpf TEXT,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    force_password_change BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_cpf ON usuarios(cpf);

-- 3. VISITAS
CREATE TABLE visitas (
    id TEXT PRIMARY KEY,
    cliente_nome TEXT NOT NULL,
    cliente_telefone TEXT,
    cliente_email TEXT,
    veiculo_interesse TEXT,
    vendedor TEXT,
    origem TEXT,
    status TEXT DEFAULT 'pendente',
    data_agendamento TIMESTAMP,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visitas_status ON visitas(status);
CREATE INDEX idx_visitas_vendedor ON visitas(vendedor);
CREATE INDEX idx_visitas_data ON visitas(data_agendamento);

-- 4. SCRIPTS (Respostas Rápidas)
CREATE TABLE scripts (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    categoria TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. VENDEDORES
CREATE TABLE vendedores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    foto_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. PORTAIS
CREATE TABLE portais (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    url TEXT,
    logo_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. METAS
CREATE TABLE metas (
    id TEXT PRIMARY KEY,
    vendedor TEXT NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    meta_vendas INTEGER DEFAULT 0,
    vendas_realizadas INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metas_vendedor ON metas(vendedor);
CREATE INDEX idx_metas_periodo ON metas(ano, mes);

-- 8. CRM SETTINGS
CREATE TABLE crm_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    auto_response BOOLEAN DEFAULT false,
    greeting_message TEXT,
    away_message TEXT,
    business_hours JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. IA PROMPTS (Configuração de Prompts da IA)
CREATE TABLE ia_prompts (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'system', 'greeting', 'qualification', 'closing'
    conteudo TEXT NOT NULL,
    variaveis JSONB, -- Variáveis dinâmicas que podem ser usadas
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ia_prompts_tipo ON ia_prompts(tipo);
CREATE INDEX idx_ia_prompts_ativo ON ia_prompts(ativo);

-- 10. IA CONVERSAS (Histórico de Conversas da IA)
CREATE TABLE ia_conversas (
    id TEXT PRIMARY KEY,
    cliente_telefone TEXT NOT NULL,
    cliente_nome TEXT,
    status TEXT DEFAULT 'ativa', -- 'ativa', 'finalizada', 'transferida'
    origem TEXT, -- 'whatsapp', 'instagram', 'facebook'
    modelo_ia TEXT DEFAULT 'claude-3.5-sonnet',
    total_mensagens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    custo_estimado DECIMAL(10, 4) DEFAULT 0,
    qualificacao_score INTEGER, -- 0-100
    veiculo_interesse TEXT,
    transferido_para TEXT, -- Username do vendedor
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    finalizada_em TIMESTAMP
);

CREATE INDEX idx_ia_conversas_telefone ON ia_conversas(cliente_telefone);
CREATE INDEX idx_ia_conversas_status ON ia_conversas(status);
CREATE INDEX idx_ia_conversas_data ON ia_conversas(created_at);

-- 11. IA MENSAGENS (Mensagens individuais das conversas)
CREATE TABLE ia_mensagens (
    id TEXT PRIMARY KEY,
    conversa_id TEXT NOT NULL REFERENCES ia_conversas(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    conteudo TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB -- Informações extras (imagens, áudios, etc)
);

CREATE INDEX idx_ia_mensagens_conversa ON ia_mensagens(conversa_id);
CREATE INDEX idx_ia_mensagens_timestamp ON ia_mensagens(timestamp);

-- 12. IA CONFIG (Configurações Gerais da IA)
CREATE TABLE ia_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    modelo_ativo TEXT DEFAULT 'claude-3.5-sonnet',
    temperatura DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    auto_transfer BOOLEAN DEFAULT true, -- Transferir automaticamente para vendedor
    auto_transfer_score INTEGER DEFAULT 70, -- Score mínimo para transferência
    horario_ativo_inicio TIME DEFAULT '08:00',
    horario_ativo_fim TIME DEFAULT '22:00',
    dias_ativos JSONB DEFAULT '["seg","ter","qua","qui","sex","sab"]',
    meta_api_key TEXT,
    meta_phone_id TEXT,
    meta_business_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. IA ANALYTICS (Métricas e Analytics da IA)
CREATE TABLE ia_analytics (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    total_conversas INTEGER DEFAULT 0,
    conversas_finalizadas INTEGER DEFAULT 0,
    conversas_transferidas INTEGER DEFAULT 0,
    taxa_conversao DECIMAL(5, 2) DEFAULT 0,
    tempo_medio_resposta INTEGER DEFAULT 0, -- em segundos
    total_tokens INTEGER DEFAULT 0,
    custo_total DECIMAL(10, 4) DEFAULT 0,
    score_medio DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ia_analytics_data ON ia_analytics(data);


-- ========================================
-- TRIGGERS PARA UPDATED_AT
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica em todas as tabelas
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON estoque
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitas_updated_at BEFORE UPDATE ON visitas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendedores_updated_at BEFORE UPDATE ON vendedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portais_updated_at BEFORE UPDATE ON portais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ia_prompts_updated_at BEFORE UPDATE ON ia_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ia_conversas_updated_at BEFORE UPDATE ON ia_conversas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ia_config_updated_at BEFORE UPDATE ON ia_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS (ROW LEVEL SECURITY) - OPCIONAL
-- ========================================

-- Por enquanto, desabilitado para facilitar
-- Você pode ativar depois se quiser controle de acesso fino

-- ========================================
-- ✅ PRONTO!
-- ========================================

-- Verifique se todas as tabelas foram criadas:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## 📝 Passo 4: Migrar Dados do Banco Antigo

Após criar as tabelas, vamos migrar os dados:

1. **Estoque:** 49 veículos
2. **Usuários:** Diego, Raianny, etc.
3. **Vendedores:** 4 vendedores
4. **Portais:** 7 portais

**Vou criar um script automático para isso!**

---

## 📝 Passo 5: Atualizar Aplicação

Vou modificar o código para:

1. ✅ Remover TODOS os `.eq('loja_id', ...)`
2. ✅ Usar conexão dinâmica por loja
3. ✅ Armazenar credenciais na tabela `lojas`

---

## ⏰ Tempo Estimado

- **Criar projeto:** 5 minutos
- **Executar SQL:** 2 minutos
- **Migrar dados:** 10 minutos (automático)
- **Atualizar código:** 30 minutos

**Total: ~50 minutos**

---

## 🚀 PRÓXIMO PASSO

**Me passe as credenciais do novo projeto quando criar:**

1. Project URL
2. Anon Key
3. Project ID

Ou me diga para continuar e eu crio os scripts de migração enquanto você cria o projeto!

---

**Quer que eu comece a preparar os scripts de migração agora? 🚀**
