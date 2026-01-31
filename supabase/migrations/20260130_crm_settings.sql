-- Migration: CRM Settings & Configuration Management
-- Criado: 2026-01-30
-- Objetivo: Centralizar configurações Meta API e Diego AI Behavior

-- 1. Tabela de Configurações
CREATE TABLE IF NOT EXISTS crm_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('meta_api', 'diego_ai', 'general')),
    key TEXT NOT NULL,
    value TEXT,
    encrypted BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(category, key)
);

-- 2. Tabela de Audit Log
CREATE TABLE IF NOT EXISTS crm_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para crm_settings
DROP TRIGGER IF EXISTS update_crm_settings_updated_at ON crm_settings;
CREATE TRIGGER update_crm_settings_updated_at
    BEFORE UPDATE ON crm_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Função para Audit Log automático
CREATE OR REPLACE FUNCTION log_crm_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO crm_audit_log (table_name, record_id, action, old_value, new_value, changed_by)
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW),
            NEW.updated_by
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO crm_audit_log (table_name, record_id, action, old_value, changed_by)
        VALUES (
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            row_to_json(OLD),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para audit log
DROP TRIGGER IF EXISTS audit_crm_settings ON crm_settings;
CREATE TRIGGER audit_crm_settings
    AFTER UPDATE OR DELETE ON crm_settings
    FOR EACH ROW
    EXECUTE FUNCTION log_crm_settings_changes();

-- 7. RLS Policies
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas autenticados podem ler configs
CREATE POLICY "Authenticated users can read settings"
    ON crm_settings FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Apenas autenticados podem atualizar (expandir para admin no futuro)
CREATE POLICY "Authenticated users can update settings"
    ON crm_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Apenas autenticados podem inserir
CREATE POLICY "Authenticated users can insert settings"
    ON crm_settings FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Leitura de audit log
CREATE POLICY "Authenticated users can read audit log"
    ON crm_audit_log FOR SELECT
    TO authenticated
    USING (true);

-- 8. Seed com valores padrão
INSERT INTO crm_settings (category, key, value, encrypted, description) VALUES
-- Meta API
('meta_api', 'phone_number', '', false, 'Número de telefone WhatsApp Business'),
('meta_api', 'phone_id', '', false, 'ID do número de telefone na Meta'),
('meta_api', 'access_token', '', true, 'Token de acesso da Meta API'),
('meta_api', 'api_version', 'v17.0', false, 'Versão da API do WhatsApp'),

-- Diego AI Behavior
('diego_ai', 'system_prompt', 'Você é Diego, um assistente virtual de vendas profissional e atencioso. Seu objetivo é ajudar clientes com informações sobre produtos e serviços.', false, 'Instruções base para a IA'),
('diego_ai', 'temperature', '0.7', false, 'Criatividade da IA (0.0-1.0)'),
('diego_ai', 'response_style', 'amigável', false, 'Estilo de resposta: formal, casual, amigável'),
('diego_ai', 'auto_response_delay', '5', false, 'Delay em segundos antes de responder automaticamente'),
('diego_ai', 'business_hours', '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"13:00"},"sunday":null}', false, 'Horário de funcionamento (JSON)'),
('diego_ai', 'out_of_hours_message', 'Olá! No momento estamos fora do horário de atendimento. Nossa equipe retornará em breve. Deixe sua mensagem que responderemos assim que possível!', false, 'Mensagem automática fora do horário'),
('diego_ai', 'max_response_length', '500', false, 'Tamanho máximo de resposta em tokens'),
('diego_ai', 'use_emoji', 'true', false, 'Utilizar emojis nas respostas'),
('diego_ai', 'language', 'pt-BR', false, 'Idioma principal: pt-BR, en-US, es-ES')

ON CONFLICT (category, key) DO NOTHING;

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_settings_category ON crm_settings(category);
CREATE INDEX IF NOT EXISTS idx_crm_settings_key ON crm_settings(key);
CREATE INDEX IF NOT EXISTS idx_crm_audit_log_record ON crm_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_log_timestamp ON crm_audit_log(changed_at DESC);

COMMENT ON TABLE crm_settings IS 'Configurações centralizadas do Diego CRM';
COMMENT ON TABLE crm_audit_log IS 'Log de auditoria de alterações';
