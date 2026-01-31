-- Migration: Create FAQ table and populate Diego AI default configs
-- Created: 2026-01-30

-- 1. Create FAQ table
CREATE TABLE IF NOT EXISTS faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    keywords TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_faq_keywords ON faq USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_faq_active ON faq (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq (category) WHERE category IS NOT NULL;

-- 2. Ensure crm_settings has unique constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'crm_settings_category_key_unique'
    ) THEN
        ALTER TABLE crm_settings 
        ADD CONSTRAINT crm_settings_category_key_unique UNIQUE (category, key);
    END IF;
END $$;

-- 3. Insert default Diego AI configurations
INSERT INTO crm_settings (category, key, value, description) VALUES
('diego_ai', 'system_prompt', 'Você é um SDR (Sales Development Representative) da IRW Motors em Brasília/DF.
Sua missão é vender sonhos sobre rodas, não apenas carros.

🧠 PERSONALIDADE (HUMANIDADE):
- Aja como um consultor experiente, não um robô. Pode usar "vc", "tá", "pra", mas mantenha o profissionalismo.
- Demonstre interesse real. Se o cliente falar que o carro é pra família, comente sobre segurança/espaço.
- Se não souber algo, diga "Vou verificar esse detalhe com o gerente e te falo", em vez de inventar.
- Humor leve é permitido se o cliente der abertura.

🎯 OBJETIVO PRINCIPAL:
Extrair informações para qualificar o lead e agendar visita, MAS de forma natural.

🕵️ O QUE VOCÊ PRECISA DESCOBRIR (Aos poucos, não tudo de uma vez):
1. **Troca**: Ele tem veículo para dar na troca? (Modelo, Ano, Versão)
2. **Pagamento**: Pretende financiar, à vista ou consórcio? (Isso define o foco)
3. **Uso**: Para trabalho, família, aplicativo? (Ajuda a argumentar)
4. **Nome**: Se não souber, pergunte gentilmente.

⚡️ ESTRATÉGIA DE CONVERSA (Técnica Espelho):
- Responda o que ele perguntou PRIMEIRO.
- Em seguida, faça UMA pergunta de qualificação.
- Exemplo: "O Onix 2020 faz média de 14km/L na cidade, é super econômico! ⛽ Vc pretende usar mais pro dia a dia ou viagens?"

🚫 O QUE NÃO FAZER:
- Não mande "textão". Blocos curtos são melhores para WhatsApp.
- Não pergunte CPF ou dados sensíveis agora.
- Não seja insistente se o cliente parar de responder. Deixe a porta aberta.', 'Prompt de sistema base do Diego SDR'),

('diego_ai', 'temperature', '0.6', 'Criatividade do modelo (0-1). 0.6 = equilibrado'),

('diego_ai', 'response_style', 'profissional', 'Estilo de resposta: profissional, amigável, formal'),

('diego_ai', 'auto_response_delay', '5', 'Delay em segundos antes de responder automaticamente'),

('diego_ai', 'max_response_length', '500', 'Máximo de tokens na resposta (aproximado)'),

('diego_ai', 'use_emoji', 'true', 'Usar emojis moderadamente nas respostas'),

('diego_ai', 'language', 'pt-BR', 'Idioma principal para respostas'),

('diego_ai', 'out_of_hours_message', 'De Segunda a Sábado de 09h às 18h
Domingo de 09h às 14h', 'Mensagem de horário de atendimento')

ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 4. Insert sample FAQs
INSERT INTO faq (question, answer, category, keywords) VALUES
('Qual o horário de funcionamento da loja?', 'Nosso horário de atendimento é de Segunda a Sábado de 09h às 18h e Domingo de 09h às 14h. Estamos localizados em Brasília/DF.', 'atendimento', ARRAY['horário', 'horario', 'funcionamento', 'aberto', 'fecha', 'domingo']),

('Onde fica a loja?', 'Estamos localizados em Brasília/DF. Para visitar, é só marcar um horário comigo!', 'atendimento', ARRAY['localização', 'localizacao', 'endereço', 'endereco', 'onde', 'fica']),

('Vocês aceitam financiamento?', 'Sim! Trabalhamos com as melhores financeiras do mercado e podemos simular condições personalizadas para você. Qual valor você está pensando de entrada?', 'financiamento', ARRAY['financiamento', 'financiar', 'parcelado', 'parcelas', 'consórcio', 'consorcio']),

('Aceitam carro na troca?', 'Aceitamos sim! Fazemos avaliação do seu veículo e damos a melhor proposta de troca. Qual carro você tem?', 'troca', ARRAY['troca', 'avaliação', 'avaliacao', 'aceita', 'entrada'])

ON CONFLICT DO NOTHING;

-- 5. Add RLS policies for FAQ table (optional, depends on your security model)
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read FAQ"
ON faq FOR SELECT
TO authenticated
USING (active = true);

CREATE POLICY "Allow service role full access to FAQ"
ON faq FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
