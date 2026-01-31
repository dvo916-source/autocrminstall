-- ADICIONA COLUNA ATIVO NA TABELA USUARIOS (CORREÇÃO DE SYNC)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Atualiza usuários existentes para ativo = true
UPDATE public.usuarios SET ativo = true WHERE ativo IS NULL;
