
-- Tabela de Conversas (Contatos/Leads)
CREATE TABLE IF NOT EXISTS public.crm_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE, -- Telefone com DDI (55...)
    name TEXT,
    photo_url TEXT,
    ai_status TEXT DEFAULT 'active', -- 'active' (Diego responde) ou 'paused' (Humano assume)
    unread_count INT DEFAULT 0,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.crm_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')), -- 'inbound' (cliente) ou 'outbound' (loja/ai)
    type TEXT DEFAULT 'text', -- text, image, audio, etc.
    body TEXT,
    media_url TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
    wa_id TEXT, -- ID da mensagem no WhatsApp (para evitar duplicidade)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.crm_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.crm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.crm_conversations(last_message_at DESC);

-- Habilitar RLS (Segurança)
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Liberado para Autenticados e Service Role)
CREATE POLICY "Permitir tudo para autenticados e anon (dev)" ON public.crm_conversations
AS PERMISSIVE FOR ALL
TO public, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir mensagens para tudo" ON public.crm_messages
AS PERMISSIVE FOR ALL
TO public, anon
USING (true)
WITH CHECK (true);

-- Habilitar Realtime para essas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
