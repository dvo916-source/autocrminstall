-- GARANTIR ACESSO BÁSICO (GRANTS)
-- Isso é necessário se o "Permission Denied" persistir mesmo sem RLS.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.crm_conversations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_messages TO anon, authenticated, service_role;

-- Garantir acesso a sequências (ids automáticos)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Reafirmar RLS desativado para teste (vamos reativar depois que funcionar)
ALTER TABLE public.crm_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages DISABLE ROW LEVEL SECURITY;
