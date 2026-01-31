-- 1. Tabelas (Garantir que existem)
CREATE TABLE IF NOT EXISTS public.crm_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
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
    body TEXT,
    status TEXT DEFAULT 'sent',
    wa_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER POLÍTICAS ANTIGAS (Para evitar erros de "policy already exists")
DROP POLICY IF EXISTS "Permitir tudo em Conversas" ON public.crm_conversations;
DROP POLICY IF EXISTS "Permitir tudo em Mensagens" ON public.crm_messages;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_conversations;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_messages;

-- 4. CRIAR NOVAS POLÍTICAS (Permitir tudo para Public/Anon)
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

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
