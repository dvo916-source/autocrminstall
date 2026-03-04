-- 🛡️ PROTEÇÃO AUTOMÁTICA: TRIGGER PARA GARANTIR LOJA_ID

-- Este trigger garante que NENHUM veículo fique sem loja_id
-- Sempre que um INSERT ou UPDATE acontecer sem loja_id, ele força 'irw-motors-main'

CREATE OR REPLACE FUNCTION enforce_loja_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se loja_id for NULL, define como 'irw-motors-main'
    IF NEW.loja_id IS NULL THEN
        NEW.loja_id := 'irw-motors-main';
        RAISE NOTICE 'loja_id NULL detectado! Forçando para irw-motors-main';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica o trigger na tabela estoque
DROP TRIGGER IF EXISTS trigger_enforce_loja_id ON estoque;

CREATE TRIGGER trigger_enforce_loja_id
    BEFORE INSERT OR UPDATE ON estoque
    FOR EACH ROW
    EXECUTE FUNCTION enforce_loja_id();

-- ✅ TESTE
-- Tente inserir um veículo sem loja_id:
-- INSERT INTO estoque (nome, valor, ativo) VALUES ('Teste', '50000', true);
-- SELECT * FROM estoque WHERE nome = 'Teste';
-- Resultado: loja_id será 'irw-motors-main' automaticamente!
