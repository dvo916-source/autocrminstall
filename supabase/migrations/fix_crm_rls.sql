-- Habilitar RLS (caso não esteja)
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir TUDO para Anon/Public (para o CRM funcionar sem Auth complexa por enquanto)
CREATE POLICY "Permitir tudo em Conversas" ON public.crm_conversations
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo em Mensagens" ON public.crm_messages
FOR ALL USING (true) WITH CHECK (true);

-- (Opcional) Garantir que realtime funcione
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
