-- ADICIONA COLUNAS FALTANTES NA TABELA USUARIOS
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Opcional: Criar índices para busca
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
