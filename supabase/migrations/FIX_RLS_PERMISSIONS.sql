-- EXECUTE NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/whyfmogbayqwaeddoxwf/sql/new

-- Desabilitar RLS temporariamente para teste
ALTER TABLE crm_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audit_log DISABLE ROW LEVEL SECURITY;

-- OU se preferir manter RLS com políticas públicas:
-- DROP POLICY IF EXISTS "Public read settings" ON crm_settings;
-- CREATE POLICY "Public read settings" ON crm_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
