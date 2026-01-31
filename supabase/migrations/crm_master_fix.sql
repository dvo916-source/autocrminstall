-- 1. GARANTIR TABELAS (Se não existirem, cria. Se existirem, mantém.)
CREATE TABLE IF NOT EXISTS public.crm_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    photo_url TEXT,
    ai_status TEXT DEFAULT 'active',
    unread_count INT DEFAULT 0,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    type TEXT DEFAULT 'text',
    body TEXT,
    media_url TEXT,
    status TEXT DEFAULT 'sent',
    wa_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CORRIGIR PERMISSÕES (Apagar velhas e refazer)
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em Conversas" ON public.crm_conversations;
DROP POLICY IF EXISTS "Permitir tudo em Mensagens" ON public.crm_messages;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_conversations;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_messages;

CREATE POLICY "Permitir tudo em Conversas" ON public.crm_conversations FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em Mensagens" ON public.crm_messages FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. HABILITAR REALTIME (Com verificação para não dar erro)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
  END IF;
END $$;
