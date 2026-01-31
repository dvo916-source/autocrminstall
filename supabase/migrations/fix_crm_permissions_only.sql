-- REMOVER POLÍTICAS ANTIGAS (Para garantir limpeza)
DROP POLICY IF EXISTS "Permitir tudo em Conversas" ON public.crm_conversations;
DROP POLICY IF EXISTS "Permitir tudo em Mensagens" ON public.crm_messages;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_conversations;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_messages;

-- CRIAR NOVAS POLÍTICAS (Permitir tudo para Public/Anon)
CREATE POLICY "Permitir tudo em Conversas" ON public.crm_conversations
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir tudo em Mensagens" ON public.crm_messages
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);
