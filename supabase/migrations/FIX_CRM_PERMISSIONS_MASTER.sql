-- ==============================================================================
-- MASTER FIX FOR CRM PERMISSIONS & RLS
-- ==============================================================================

-- 1. GARANTIR QUE AS TABELAS EXISTEM (Idempotente)
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

-- 2. HABILITAR RLS (Segurança em Nível de Linha)
-- É importante habilitar antes de criar as políticas.
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER TODAS AS POLÍTICAS ANTIGAS
-- Removemos tudo para garantir que não haja conflitos ou políticas restritivas ocultas.
DROP POLICY IF EXISTS "Permitir tudo em Conversas" ON public.crm_conversations;
DROP POLICY IF EXISTS "Permitir tudo em Mensagens" ON public.crm_messages;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_conversations;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.crm_messages;
DROP POLICY IF EXISTS "Allow public access" ON public.crm_conversations;
DROP POLICY IF EXISTS "Allow public access" ON public.crm_messages;
-- Caso existam outras políticas com nomes diferentes, o ideal seria listar e remover, 
-- mas estas cobrem os nomes comuns usados anteriormente.

-- 4. CRIAR NOVAS POLÍTICAS "PERMITIR TUDO" (PUBLIC)
-- ATENÇÃO: Isso permite que qualquer pessoa com a chave ANON leia/escreva.
-- Ideal para desenvolvimento ou apps internos simples onde a autenticação é tratada de outra forma ou confia-se na chave.

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

-- 5. CONCEDER PERMISSÕES EXPLÍCITAS (GRANTS)
-- Garante que os rôles do Supabase tenham acesso às tabelas.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.crm_conversations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_messages TO anon, authenticated, service_role;

-- Permissões para sequências (caso uses SERIAL, embora estejamos usando UUID)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. CONFIGURAR REALTIME
-- Adiciona as tabelas à publicação padrão do Supabase para que o frontend receba atualizações.

-- Verifica se a publicação existe (padrão no Supabase) e adiciona.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'crm_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'crm_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
  END IF;
END $$;
