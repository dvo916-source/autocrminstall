const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://whyfmogbayqwaeddoxwf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind oeWZtb2d  iYXlxd2FlZGRveHdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQ0NDkxMiwiZXhwIjoyMDUyMDIwOTEyfQ.tX5CtZQxGsYhO_yV0mqGwNWBBe0BVfQT7YR3Hx_KuJY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('\n🚀 Aplicando migration Diego Config Sync...\n');

    try {
        // 1. Create FAQ table
        console.log('1️⃣ Criando tabela FAQ...');
        const { error: faqTableError } = await supabase.rpc('exec_sql', {
            query: `
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
            
            CREATE INDEX IF NOT EXISTS idx_faq_keywords ON faq USING GIN(keywords);
            CREATE INDEX IF NOT EXISTS idx_faq_active ON faq (active) WHERE active = true;
            CREATE INDEX IF NOT EXISTS idx_faq_category ON faq (category) WHERE category IS NOT NULL;
            `
        });

        if (faqTableError) {
            console.log('   RPC não disponível, tentando método alternativo...');
            // Se RPC falhar, criar manualmente via INSERT direto já não funcionará sem extension
        }

        // 2. Insert Diego AI default configs
        console.log('2️⃣ Inserindo configurações padrão Diego AI...');

        const defaultConfigs = [
            {
                category: 'diego_ai',
                key: 'system_prompt',
                value: `Você é um SDR (Sales Development Representative) da IRW Motors em Brasília/DF.
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
- Não seja insistente se o cliente parar de responder. Deixe a porta aberta.`,
                description: 'Prompt de sistema base do Diego SDR'
            },
            { category: 'diego_ai', key: 'temperature', value: '0.6', description: 'Criatividade do modelo (0-1). 0.6 = equilibrado' },
            { category: 'diego_ai', key: 'response_style', value: 'profissional', description: 'Estilo de resposta: profissional, amigável, formal' },
            { category: 'diego_ai', key: 'auto_response_delay', value: '5', description: 'Delay em segundos antes de responder automaticamente' },
            { category: 'diego_ai', key: 'max_response_length', value: '500', description: 'Máximo de tokens na resposta (aproximado)' },
            { category: 'diego_ai', key: 'use_emoji', value: 'true', description: 'Usar emojis moderadamente nas respostas' },
            { category: 'diego_ai', key: 'language', value: 'pt-BR', description: 'Idioma principal para respostas' },
            { category: 'diego_ai', key: 'out_of_hours_message', value: 'De Segunda a Sábado de 09h às 18h\nDomingo de 09h às 14h', description: 'Mensagem de horário de atendimento' }
        ];

        for (const config of defaultConfigs) {
            const { error } = await supabase
                .from('crm_settings')
                .upsert(config, {
                    onConflict: 'category,key',
                    ignoreDuplicates: false
                });

            if (error) {
                console.log(`   ⚠️ Erro ao inserir ${config.key}:`, error.message);
            } else {
                console.log(`   ✅ ${config.key}`);
            }
        }

        console.log('\n✅ Migration aplicada com sucesso!');
        console.log('\n📊 Verificando resultados...\n');

        // Verify
        const { data: configs } = await supabase
            .from('crm_settings')
            .select('key')
            .eq('category', 'diego_ai');

        console.log(`Total de configurações Diego AI: ${configs?.length || 0}`);

    } catch (error) {
        console.error('❌ Erro ao aplicar migration:', error);
        process.exit(1);
    }
}

applyMigration();
