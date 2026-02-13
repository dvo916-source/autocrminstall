-- ========================================
-- MIGRAÇÃO COMPLETA DO BANCO DE DADOS
-- Data: 2026-02-13
-- Objetivo: Corrigir estrutura das tabelas para sincronização
-- ========================================

-- 1. USUARIOS - Adicionar campos faltantes
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 2. VENDEDORES - Adicionar campo sobrenome
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS sobrenome TEXT;

-- 3. VISITAS - Recriar tabela completa
DROP TABLE IF EXISTS visitas CASCADE;

CREATE TABLE visitas (
    id BIGSERIAL PRIMARY KEY,
    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
    datahora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mes INTEGER,
    cliente TEXT,
    telefone TEXT,
    portal TEXT,
    veiculo_interesse TEXT,
    veiculo_troca TEXT,
    vendedor TEXT,
    vendedor_sdr TEXT,
    negociacao TEXT,
    data_agendamento TIMESTAMPTZ,
    temperatura TEXT,
    motivo_perda TEXT,
    forma_pagamento TEXT,
    status_pipeline TEXT,
    valor_proposta TEXT,
    cpf_cliente TEXT,
    historico_log TEXT,
    status TEXT DEFAULT 'Pendente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitas_loja_id ON visitas(loja_id);
CREATE INDEX idx_visitas_datahora ON visitas(datahora);
CREATE INDEX idx_visitas_vendedor ON visitas(vendedor);

-- 4. PORTAIS - Recriar tabela completa
DROP TABLE IF EXISTS portais CASCADE;

CREATE TABLE portais (
    nome TEXT NOT NULL,
    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
    link TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (nome, loja_id)
);

-- 5. SCRIPTS - Recriar tabela completa
DROP TABLE IF EXISTS scripts CASCADE;

CREATE TABLE scripts (
    id BIGSERIAL PRIMARY KEY,
    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
    titulo TEXT NOT NULL,
    mensagem TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    link TEXT,
    username TEXT,
    ordem INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scripts_loja_id ON scripts(loja_id);
CREATE INDEX idx_scripts_username ON scripts(username);

-- 6. CRM_SETTINGS - Recriar tabela completa
DROP TABLE IF EXISTS crm_settings CASCADE;

CREATE TABLE crm_settings (
    key TEXT NOT NULL,
    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
    category TEXT,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (key, loja_id)
);

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================
