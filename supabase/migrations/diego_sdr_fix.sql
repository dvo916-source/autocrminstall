-- =====================================================
-- DIEGO SDR ELITE - CORREÇÃO
-- Se já executou antes, use este script
-- =====================================================

-- Dropar policies existentes (se existirem)
DROP POLICY IF EXISTS "Public access diego_faq" ON diego_faq;
DROP POLICY IF EXISTS "Public access diego_sales_scripts" ON diego_sales_scripts;
DROP POLICY IF EXISTS "Public access diego_commercial_policies" ON diego_commercial_policies;
DROP POLICY IF EXISTS "Public access diego_lead_qualification" ON diego_lead_qualification;
DROP POLICY IF EXISTS "Public access diego_conversation_context" ON diego_conversation_context;
DROP POLICY IF EXISTS "Public access diego_conversation_outcomes" ON diego_conversation_outcomes;

-- Dropar constraint de category para atualizar (adicionar 'objecoes')
ALTER TABLE diego_faq DROP CONSTRAINT IF EXISTS diego_faq_category_check;
ALTER TABLE diego_faq ADD CONSTRAINT diego_faq_category_check 
    CHECK (category IN ('financiamento', 'troca', 'preco', 'veiculo', 'localizacao', 'agendamento', 'objecoes', 'documentacao', 'geral'));

-- Recriar policies
CREATE POLICY "Public access diego_faq" ON diego_faq FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_sales_scripts" ON diego_sales_scripts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_commercial_policies" ON diego_commercial_policies FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_lead_qualification" ON diego_lead_qualification FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_conversation_context" ON diego_conversation_context FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access diego_conversation_outcomes" ON diego_conversation_outcomes FOR ALL TO public USING (true) WITH CHECK (true);

-- Inserir FAQs de Objeções (novas)
INSERT INTO diego_faq (category, keywords, question, answer, priority) VALUES

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

-- Verificar resultado
SELECT 'Correção aplicada!' AS status,
       (SELECT COUNT(*) FROM diego_faq) AS total_faqs,
       (SELECT COUNT(*) FROM diego_faq WHERE category = 'objecoes') AS faqs_objecoes;
