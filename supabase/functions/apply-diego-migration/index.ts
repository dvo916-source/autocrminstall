import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Aplicando Diego Config Migration...');

    try {
        // 2. Insert Diego AI default configs using upsert
        console.log('Inserindo configurações Diego AI...');

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
            { category: 'diego_ai', key: 'temperature', value: '0.6', description: 'Criatividade do modelo (0-1)' },
            { category: 'diego_ai', key: 'response_style', value: 'profissional', description: 'Estilo de resposta' },
            { category: 'diego_ai', key: 'auto_response_delay', value: '5', description: 'Delay antes de responder (segundos)' },
            { category: 'diego_ai', key: 'max_response_length', value: '500', description: 'Máximo de tokens na resposta' },
            { category: 'diego_ai', key: 'use_emoji', value: 'true', description: 'Usar emojis moderadamente' },
            { category: 'diego_ai', key: 'language', value: 'pt-BR', description: 'Idioma principal' },
            { category: 'diego_ai', key: 'out_of_hours_message', value: 'De Segunda a Sábado de 09h às 18h\nDomingo de 09h às 14h', description: 'Horário de atendimento' }
        ];

        const results = [];

        for (const config of defaultConfigs) {
            const { error } = await supabase
                .from('crm_settings')
                .upsert(config, {
                    onConflict: 'category,key',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error(`Erro ao inserir ${config.key}:`, error);
                results.push({ key: config.key, status: 'error', error: error.message });
            } else {
                console.log(`✅ ${config.key}`);
                results.push({ key: config.key, status: 'success' });
            }
        }

        // Verify
        const { data: configs, error: verifyError } = await supabase
            .from('crm_settings')
            .select('key')
            .eq('category', 'diego_ai');

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Migration concluída',
                results,
                totalConfigs: configs?.length || 0,
                verifyError: verifyError?.message
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error) {
        console.error('Erro na migration:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
