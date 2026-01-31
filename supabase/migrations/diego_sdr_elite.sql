-- =====================================================
-- DIEGO SDR ELITE - MIGRATION
-- Execute no Supabase SQL Editor
-- https://supabase.com/dashboard/project/whyfmogbayqwaeddoxwf/sql/new
-- =====================================================

-- =====================================================
-- 1. TABELA: diego_faq - Perguntas Frequentes
-- =====================================================
CREATE TABLE IF NOT EXISTS diego_faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('financiamento', 'troca', 'preco', 'veiculo', 'localizacao', 'agendamento', 'objecoes', 'documentacao', 'geral')),
    keywords TEXT[] DEFAULT '{}',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    usage_count INT DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA: diego_sales_scripts - Roteiros de Venda
-- =====================================================
CREATE TABLE IF NOT EXISTS diego_sales_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('origin', 'stage', 'situation', 'keyword')),
    trigger_value TEXT NOT NULL,
    script_order INT DEFAULT 1,
    message_template TEXT NOT NULL,
    requires_response BOOLEAN DEFAULT true,
    next_script_id UUID REFERENCES diego_sales_scripts(id),
    is_active BOOLEAN DEFAULT true,
    usage_count INT DEFAULT 0,
    conversion_rate FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA: diego_commercial_policies - Políticas Comerciais
-- =====================================================
CREATE TABLE IF NOT EXISTS diego_commercial_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type TEXT NOT NULL CHECK (policy_type IN ('financiamento', 'desconto', 'entrega', 'troca', 'garantia', 'horario')),
    policy_key TEXT NOT NULL,
    policy_value TEXT NOT NULL,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(policy_type, policy_key)
);

-- =====================================================
-- 4. TABELA: diego_lead_qualification - Qualificação de Leads
-- =====================================================
CREATE TABLE IF NOT EXISTS diego_lead_qualification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    origin_detected TEXT CHECK (origin_detected IN ('olx', 'trafego_pago', 'organico', 'indicacao', 'retorno', 'desconhecido')),
    location TEXT,
    is_local_df BOOLEAN,
    has_trade_in BOOLEAN DEFAULT false,
    trade_in_details JSONB DEFAULT '{}',
    vehicle_interest TEXT,
    vehicle_id UUID,
    payment_type TEXT CHECK (payment_type IN ('avista', 'financiado', 'troca', 'troca_financiado', 'indefinido')),
    qualification_score INT DEFAULT 0 CHECK (qualification_score BETWEEN 0 AND 100),
    stage TEXT DEFAULT 'inicial' CHECK (stage IN ('inicial', 'qualificando', 'qualificado', 'agendado', 'visitou', 'negociando', 'convertido', 'perdido')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. TABELA: diego_conversation_context - Memória da Conversa
-- =====================================================
CREATE TABLE IF NOT EXISTS diego_conversation_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    context_key TEXT NOT NULL,
    context_value TEXT,
    confidence FLOAT DEFAULT 1.0,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, context_key)
);

-- =====================================================
-- 6. TABELA: diego_conversation_outcomes - Resultados
-- =====================================================
CREATE TABLE IF NOT EXISTS diego_conversation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    outcome TEXT CHECK (outcome IN ('agendou', 'negociando', 'perdido', 'convertido', 'em_andamento')),
    scripts_used UUID[] DEFAULT '{}',
    faqs_used UUID[] DEFAULT '{}',
    total_messages INT DEFAULT 0,
    response_time_avg FLOAT,
    human_takeover BOOLEAN DEFAULT false,
    human_takeover_reason TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_diego_faq_category ON diego_faq(category);
CREATE INDEX IF NOT EXISTS idx_diego_faq_keywords ON diego_faq USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_diego_scripts_trigger ON diego_sales_scripts(trigger_type, trigger_value);
CREATE INDEX IF NOT EXISTS idx_diego_qualification_conv ON diego_lead_qualification(conversation_id);
CREATE INDEX IF NOT EXISTS idx_diego_context_conv ON diego_conversation_context(conversation_id);
CREATE INDEX IF NOT EXISTS idx_diego_outcomes_conv ON diego_conversation_outcomes(conversation_id);

-- =====================================================
-- RLS POLICIES (Público para teste)
-- =====================================================
ALTER TABLE diego_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE diego_sales_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE diego_commercial_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE diego_lead_qualification ENABLE ROW LEVEL SECURITY;
ALTER TABLE diego_conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE diego_conversation_outcomes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (ajustar depois para admin only)
CREATE POLICY "Public access diego_faq" ON diego_faq FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_sales_scripts" ON diego_sales_scripts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_commercial_policies" ON diego_commercial_policies FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_lead_qualification" ON diego_lead_qualification FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_conversation_context" ON diego_conversation_context FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_conversation_outcomes" ON diego_conversation_outcomes FOR ALL TO public USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON diego_faq TO anon, authenticated, service_role;
GRANT ALL ON diego_sales_scripts TO anon, authenticated, service_role;
GRANT ALL ON diego_commercial_policies TO anon, authenticated, service_role;
GRANT ALL ON diego_lead_qualification TO anon, authenticated, service_role;
GRANT ALL ON diego_conversation_context TO anon, authenticated, service_role;
GRANT ALL ON diego_conversation_outcomes TO anon, authenticated, service_role;

-- =====================================================
-- SEED: FAQs INICIAIS
-- =====================================================
INSERT INTO diego_faq (category, keywords, question, answer, priority) VALUES

-- FINANCIAMENTO
('financiamento', ARRAY['financiam', 'financiamento', 'financia', 'parcela', 'parcelar'], 
 'Vocês financiam?', 
 'Sim! Trabalhamos com os melhores bancos do mercado: Santander, Itaú, Bradesco, BV e outros. Conseguimos aprovar até 100% do valor dependendo da análise. Quer que eu faça uma simulação para você? 📊', 9),

('financiamento', ARRAY['100%', 'cem por cento', 'entrada zero', 'sem entrada'], 
 'Financiam 100%?', 
 'Sim, conseguimos financiamento de até 100% do valor! 🎉 Depende da análise de crédito e do veículo. Me passa seu CPF que faço uma consulta rápida e te dou retorno em minutos!', 9),

('financiamento', ARRAY['entrada', 'entrada mínima', 'quanto de entrada'], 
 'Qual a entrada mínima?', 
 'A entrada mínima varia conforme a análise de crédito. Em muitos casos conseguimos aprovar com entrada zero! Me passa seu CPF que verifico as melhores condições para você. 💳', 8),

('financiamento', ARRAY['score', 'score baixo', 'nome sujo', 'restrição', 'negativado', 'serasa'], 
 'Aceitam score baixo/nome sujo?', 
 'Trabalhamos com bancos que aceitam clientes com restrição! 👍 Cada caso é um caso. Me passa seu CPF por aqui que faço a consulta sigilosa e te dou um retorno honesto.', 9),

('financiamento', ARRAY['taxa', 'juros', 'taxa de juros'], 
 'Qual a taxa de juros?', 
 'As taxas variam de 1,29% a 2,5% ao mês dependendo do banco e do seu perfil. Trabalhamos sempre para conseguir a menor taxa possível! Quer que eu simule para você?', 7),

('financiamento', ARRAY['parcela', 'quantas parcelas', 'prazo', 'meses'], 
 'Em quantas parcelas pode financiar?', 
 'Financiamos em até 60x! O prazo depende da idade do veículo e da sua preferência. Parcelas menores, mais tempo pagando. Parcelas maiores, quita mais rápido. O que prefere?', 7),

-- TROCA
('troca', ARRAY['troca', 'trocar', 'carro na troca', 'dou meu carro'], 
 'Vocês aceitam troca?', 
 'Sim, aceitamos seu veículo na troca! 🚗 Fazemos avaliação justa e transparente. Me conta: qual carro você tem para dar na troca? Marca, modelo, ano e km aproximado.', 9),

('troca', ARRAY['quanto dão', 'valor do meu', 'avaliam', 'avaliação'], 
 'Quanto dão no meu carro?', 
 'Para te dar um valor justo, preciso de algumas informações: Qual o carro? Ano? Km atual? Está todo em dia? Se preferir, me manda umas fotos que avalio rapidinho! 📸', 8),

('troca', ARRAY['levar', 'preciso ir', 'avaliar presencial'], 
 'Preciso levar o carro para avaliar?', 
 'Se você for de Brasília, é melhor trazer aqui que fazemos uma avaliação completa! Se for de outra cidade, podemos fazer avaliação por fotos e vídeo. De onde você é?', 8),

('troca', ARRAY['fotos', 'avaliação online', 'avaliar por foto'], 
 'Fazem avaliação por fotos?', 
 'Sim! Para clientes de fora do DF, fazemos avaliação por fotos e vídeo. Me manda: - Fotos externas (frente, traseira, laterais) - Painel com km - Interior - Qualquer detalhe que tenha. Respondo rapidinho! 📲', 8),

('troca', ARRAY['diferença', 'volta', 'sobra'], 
 'Se der diferença, financiam o resto?', 
 'Sim! Se seu carro valer menos que o nosso, financiamos a diferença tranquilamente. E se sobrar valor, devolvemos pra você! 👍', 7),

-- PREÇO
('preco', ARRAY['menor valor', 'desconto', 'negocia', 'negociar', 'último preço'], 
 'Qual o menor valor? Fazem desconto?', 
 'Nossos preços já são bem competitivos, mas sempre dá pra conversar! 😉 À vista consigo melhorar a condição. Qual veículo você está interessado?', 8),

('preco', ARRAY['à vista', 'avista', 'dinheiro', 'pix'], 
 'Tem desconto à vista/PIX?', 
 'Sim! Pagamento à vista ou PIX sempre tem uma condição especial. 💰 Qual veículo está interessado que te passo o valor com desconto?', 8),

('preco', ARRAY['proposta', 'oferta', 'contraproposta'], 
 'Aceita proposta?', 
 'Claro! Estamos abertos a negociar. Qual sua proposta? Vou analisar com carinho e te dou retorno. 🤝', 7),

-- VEÍCULO
('veiculo', ARRAY['problema', 'defeito', 'bom estado', 'conservado'], 
 'O carro está em bom estado? Tem algum problema?', 
 'Todos os nossos veículos passam por uma revisão completa antes de ir para venda! 🔧 Se tiver qualquer detalhe, informamos com transparência. Qual veículo você quer saber mais?', 8),

('veiculo', ARRAY['vistoria', 'pode visitar', 'ver pessoalmente'], 
 'Posso fazer vistoria/ver pessoalmente?', 
 'Claro! Fique à vontade para trazer seu mecânico de confiança. Transparência total! 🔍 Quer agendar uma visita?', 8),

('veiculo', ARRAY['leilão', 'sinistro', 'batido'], 
 'O carro é de leilão?', 
 'Não trabalhamos com veículos de leilão! Todos os nossos carros têm procedência garantida, documentação regular e passam por vistoria rigorosa. 📋✅', 9),

('veiculo', ARRAY['ipva', 'documento', 'documentação', 'multa'], 
 'Documentação está ok? IPVA pago?', 
 'Sim! Todos os veículos são entregues com documentação 100% regularizada, sem débitos e prontos para transferir. ✅', 8),

('veiculo', ARRAY['dono', 'donos', 'único dono', 'quantos donos'], 
 'Quantos donos o carro teve?', 
 'Essa informação está na ficha do veículo! Temos carros de único dono e outros com mais histórico. Qual veículo você quer essa informação?', 6),

('veiculo', ARRAY['garantia', 'tem garantia'], 
 'Tem garantia?', 
 'Sim! Oferecemos garantia de motor e câmbio por 3 meses. Alguns veículos ainda têm garantia de fábrica também! 🛡️', 7),

-- LOCALIZAÇÃO
('localizacao', ARRAY['onde fica', 'endereço', 'localização', 'loja'], 
 'Onde fica a loja?', 
 '📍 Estamos localizados em Brasília-DF! Endereço: [INSERIR ENDEREÇO]. Fácil acesso e estacionamento próprio. Quer agendar uma visita?', 8),

('localizacao', ARRAY['entrega', 'entregam', 'mando buscar'], 
 'Vocês entregam?', 
 'Sim! Entregamos em todo Brasil! 🚚 Qual sua cidade? Vou calcular o frete e te passar um valor certinho.', 8),

('localizacao', ARRAY['frete', 'custo entrega', 'valor frete'], 
 'Qual o custo do frete?', 
 'O frete varia conforme a distância. Me fala sua cidade que calculo na hora! 📦', 7),

('localizacao', ARRAY['horário', 'funcionamento', 'aberto', 'abre'], 
 'Qual horário de funcionamento?', 
 '⏰ Funcionamos de Segunda a Sexta das 9h às 18h, e Sábado das 9h às 13h. Domingo estamos fechados. Quer agendar para passar aqui?', 7),

-- AGENDAMENTO
('agendamento', ARRAY['agendar', 'marcar', 'visita', 'posso ir', 'ver hoje'], 
 'Posso agendar uma visita?', 
 'Claro! 📅 Qual o melhor dia e horário para você? Temos disponibilidade de Segunda a Sábado. Me fala que reservo o veículo para você conhecer!', 9),

('agendamento', ARRAY['sábado', 'sabado', 'fim de semana', 'domingo'], 
 'Abre sábado/domingo?', 
 'Sábado funcionamos das 9h às 13h, ótimo para quem trabalha durante a semana! Domingo estamos fechados. Quer agendar para sábado?', 7),

-- OBJEÇÕES
('objecoes', ARRAY['caro', 'muito caro', 'preço alto', 'acima', 'valor alto'], 
 'Está muito caro / Achei caro', 
 'Entendo sua preocupação com o valor! 💡 Nossos preços refletem a qualidade dos veículos - todos revisados e com garantia. Mas sempre podemos conversar! Qual seria o valor ideal para você? Vamos encontrar uma solução juntos.', 9),

('objecoes', ARRAY['pensar', 'vou pensar', 'preciso pensar', 'deixa eu pensar'], 
 'Vou pensar / Preciso pensar', 
 'Entendo perfeitamente! 🤔 É uma decisão importante mesmo. Posso te mandar mais informações por aqui enquanto você pensa? Também posso reservar o veículo por 24h pra garantir que ninguém leve antes. O que acha?', 9),

('objecoes', ARRAY['outro lugar', 'concorrente', 'vi mais barato', 'encontrei mais barato'], 
 'Vi mais barato em outro lugar', 
 'Obrigado por me falar isso! 🙏 Às vezes o barato sai caro... Importante verificar: procedência, revisão, garantia e documentação. Nossos carros são checados e têm garantia. Quer trazer a proposta do concorrente? Vamos analisar juntos!', 8),

('objecoes', ARRAY['falar com esposa', 'falar com marido', 'falar com família', 'consultar'], 
 'Preciso falar com esposa/marido/família', 
 'Claro! Decisão em família é sempre melhor! 👨‍👩‍👧 Posso mandar todas as informações e fotos para vocês analisarem juntos? Ou se preferirem, podem vir os dois conhecer o carro. Qual dia fica bom?', 8),

('objecoes', ARRAY['não tenho pressa', 'sem pressa', 'depois', 'ainda não'], 
 'Não tenho pressa / Vou deixar para depois', 
 'Sem problemas! Cada um tem seu tempo. 😊 Mas esse modelo costuma sair rápido... Se quiser, posso te avisar se aparecer outro cliente interessado. Assim você decide se quer garantir. Combinado?', 7),

('objecoes', ARRAY['não sei', 'indeciso', 'não decidi', 'em dúvida'], 
 'Estou indeciso / Não sei se é o carro certo', 
 'É normal ter dúvidas! 🤷 Me conta: o que te deixa indeciso? É o modelo, o valor, ou outra coisa? Me ajuda a entender que posso te orientar melhor. Às vezes uma visita presencial resolve tudo!', 8),

('objecoes', ARRAY['longe', 'muito longe', 'distância', 'não posso ir'], 
 'A loja fica longe / Não consigo ir até aí', 
 'Entendo! A distância pode ser um desafio. 🚗 Mas fazemos todo o processo online se preferir - desde a avaliação do seu carro até a entrega na sua porta! Qual sua cidade? Vamos resolver isso!', 8)

ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED: POLÍTICAS COMERCIAIS
-- =====================================================
INSERT INTO diego_commercial_policies (policy_type, policy_key, policy_value, conditions) VALUES

-- Financiamento
('financiamento', 'entrada_minima', '0%', '{"depende_analise": true}'),
('financiamento', 'prazo_maximo', '60 meses', '{"idade_veiculo_max": 10}'),
('financiamento', 'taxa_minima', '1.29%', '{"perfil": "excelente"}'),
('financiamento', 'taxa_maxima', '2.5%', '{"perfil": "regular"}'),
('financiamento', 'bancos_parceiros', 'Santander, Itaú, Bradesco, BV, Pan, Omni', '{}'),
('financiamento', 'aceita_restricao', 'Sim, alguns bancos aceitam', '{}'),

-- Desconto
('desconto', 'avista_percentual', '3-5%', '{"negociavel": true}'),
('desconto', 'pix_percentual', '3-5%', '{"negociavel": true}'),

-- Entrega
('entrega', 'area_cobertura', 'Todo Brasil', '{}'),
('entrega', 'prazo_local', '24-48h', '{"para_df": true}'),
('entrega', 'prazo_nacional', '5-10 dias úteis', '{}'),

-- Troca
('troca', 'aceita_troca', 'Sim', '{}'),
('troca', 'avaliacao_presencial', 'Clientes do DF', '{}'),
('troca', 'avaliacao_remota', 'Clientes de fora do DF - por fotos/vídeo', '{}'),
('troca', 'financia_diferenca', 'Sim', '{}'),

-- Garantia
('garantia', 'motor_cambio', '3 meses', '{}'),
('garantia', 'fabrica', 'Quando aplicável, transferimos', '{}'),

-- Horário
('horario', 'segunda_sexta', '09:00-18:00', '{}'),
('horario', 'sabado', '09:00-13:00', '{}'),
('horario', 'domingo', 'Fechado', '{}')

ON CONFLICT (policy_type, policy_key) DO NOTHING;

-- =====================================================
-- SEED: ROTEIROS DE VENDA
-- =====================================================
INSERT INTO diego_sales_scripts (name, trigger_type, trigger_value, script_order, message_template, requires_response) VALUES

-- Origem: OLX
('Saudação OLX', 'origin', 'olx', 1, 
 'Olá {{nome}}! 👋 Vi que você veio do anúncio. O {{veiculo}} está disponível sim! Como você já viu as fotos, imagino que tenha gostado. Esse carro está impecável! Você é aqui de Brasília?', true),

-- Origem: Tráfego Pago
('Saudação Tráfego', 'origin', 'trafego_pago', 1, 
 'Olá {{nome}}! 😊 Que bom seu interesse no {{veiculo}}! Deixa eu te contar mais sobre ele:', true),

('Detalhes Tráfego', 'origin', 'trafego_pago', 2, 
 '📋 **Ficha Técnica:**
- Ano: {{ano}}
- KM: {{km}}
- Câmbio: {{cambio}}
- Valor: {{valor}}

Vou te enviar algumas fotos agora! 📸', false),

-- Etapa: Localização
('Pergunta Localização', 'stage', 'inicial', 1, 
 'Você é aqui de Brasília mesmo ou de outra cidade?', true),

('Resposta DF', 'stage', 'localizacao_df', 1, 
 'Ótimo! Fica fácil de você vir conhecer o carro pessoalmente. Vai dar algum veículo na troca ou pretende financiar/pagar à vista?', true),

('Resposta Fora DF', 'stage', 'localizacao_fora', 1, 
 'Sem problemas! Atendemos clientes de todo Brasil. 🚚 Entregamos na sua cidade! Vai dar algum veículo na troca?', true),

-- Etapa: Troca
('Pergunta Troca', 'stage', 'qualificando', 1, 
 'Vai dar algum veículo na troca?', true),

('Resposta Com Troca DF', 'stage', 'troca_sim_df', 1, 
 'Ótimo! Pode trazer aqui que fazemos uma avaliação justa e transparente. Me conta: qual carro você tem? Marca, modelo, ano e km mais ou menos.', true),

('Resposta Com Troca Fora', 'stage', 'troca_sim_fora', 1, 
 'Para clientes de fora fazemos avaliação por fotos! 📸 Me manda:
- Fotos externas (frente, traseira, laterais)
- Painel mostrando o km
- Interior
- Qualquer detalhe que tenha

Respondo rapidinho com o valor!', true),

('Resposta Sem Troca', 'stage', 'troca_nao', 1, 
 'Entendi! Pretende financiar ou pagar à vista?', true),

-- Etapa: Pagamento
('Resposta Financiamento', 'stage', 'pagamento_financiado', 1, 
 'Trabalhamos com os melhores bancos e conseguimos ótimas condições! 🏦 Me passa seu CPF que faço uma consulta rápida e já te dou retorno sobre aprovação e parcelas.', true),

('Resposta À Vista', 'stage', 'pagamento_avista', 1, 
 'Excelente! À vista consigo uma condição especial pra você! 💰 Quer que eu já reserve o carro? Podemos agendar sua visita para fechar negócio.', true),

-- Etapa: Agendamento
('Oferta Agendamento', 'stage', 'qualificado', 1, 
 'Posso agendar uma visita pra você conhecer o {{veiculo}} pessoalmente? 📅 Temos horários disponíveis. Qual dia e horário ficam melhor para você?', true),

('Confirmação Agendamento', 'stage', 'agendando', 1, 
 'Perfeito! ✅ Agendado para {{data}} às {{horario}}. Vou te mandar a localização. Qualquer coisa me avisa! Até lá! 🚗', false)

ON CONFLICT DO NOTHING;

-- =====================================================
-- PRONTO!
-- =====================================================
SELECT 'Migration Diego SDR Elite concluída!' AS status,
       (SELECT COUNT(*) FROM diego_faq) AS faqs_criadas,
       (SELECT COUNT(*) FROM diego_commercial_policies) AS politicas_criadas,
       (SELECT COUNT(*) FROM diego_sales_scripts) AS roteiros_criados;
