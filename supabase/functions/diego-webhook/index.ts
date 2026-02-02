import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VERIFY_TOKEN = "diego_token_seguro_irw_2026";

// === CONFIG HELPER INLINED (Fix for Import Issues) ===
interface ConfigCache {
    [key: string]: {
        value: string;
        timestamp: number;
    };
}

const configCache: ConfigCache = {};
const CACHE_TTL = 60000; // 1 minute cache

export async function getAllConfigs(
    supabaseClient: any,
    category: string
): Promise<Record<string, string>> {
    try {
        const { data, error } = await supabaseClient
            .from('crm_settings')
            .select('key, value')
            .eq('category', category);

        if (!error && data) {
            const configs: Record<string, string> = {};
            data.forEach((row: any) => {
                configs[row.key] = row.value;
            });
            return configs;
        }
    } catch (err) {
        console.warn(`Failed to get all configs for ${category}:`, err);
    }
    return {};
}
// =====================================================
// PADRÕES DE DETECÇÃO DE ORIGEM
// =====================================================
const ORIGIN_PATTERNS: Record<string, RegExp[]> = {
    olx: [
        /vi.*(olx|anúncio|anuncio)/i,
        /\bolx\b/i,
        /pelo anúncio/i
    ],
    trafego_pago: [
        /tenho interesse.*(e quero|e queria|quero mais|queria mais)/i,
        /quero mais informações/i,
        /^olá,?\s*tenho interesse/i,
        /^oi,?\s*tenho interesse/i
    ],
    indicacao: [
        /indicação|indicou|amigo.*(indicou|falou)/i
    ],
    retorno: [
        /conversamos|falamos|voltei|retornando/i
    ]
};

// Detectar origem do lead
function detectOrigin(message: string): string {
    for (const [origin, patterns] of Object.entries(ORIGIN_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(message)) {
                return origin;
            }
        }
    }
    return 'organico';
}

// Função auxiliar para criar keywords de busca
function extractKeywords(text: string): string[] {
    if (!text) return [];
    // Remove palavras comuns e curtas
    const stopWords = ['tenho', 'interesse', 'gostaria', 'saber', 'sobre', 'quero', 'mais', 'informações', 'onde', 'qual', 'valor', 'preço', 'está', 'disponível', 'carro', 'veículo', 'troca', 'financiar', 'financiamento', 'entrada', 'quanto'];
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.includes(w));
}

// =====================================================
// MAIN HANDLER
// =====================================================
Deno.serve(async (req) => {
    const url = new URL(req.url);

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verificação do Webhook (GET)
    if (req.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ Webhook verificado!");
            return new Response(challenge, { status: 200 });
        }
        return new Response("Token inválido", { status: 403 });
    }

    // 2. Recebimento de Mensagens (POST)
    if (req.method === "POST") {
        try {
            const body = await req.json();
            console.log("📩 Payload recebido");


            // Load Configurations from DB (Prioritize DB over Env Vars)
            const metaConfigs = await getAllConfigs(supabase, 'meta_api');
            const anthropicConfigs = await getAllConfigs(supabase, 'diego_ai'); // Sometimes keys are here too or we can just use env fallback

            const metaToken = (metaConfigs['access_token'] || Deno.env.get('META_ACCESS_TOKEN'))?.trim();
            const phoneId = (metaConfigs['phone_id'] || Deno.env.get('META_PHONE_ID'))?.trim();
            // Check both DB locations for Anthropic Key (sometimes stored in diego_ai or root)
            const anthropicKey = (anthropicConfigs['anthropic_api_key'] || Deno.env.get('ANTHROPIC_API_KEY'))?.trim();

            if (!anthropicKey) {
                console.error("❌ ANTHROPIC_API_KEY não configurada!");
                return new Response("EVENT_RECEIVED", { status: 200 });
            }

            const entry = body?.entry;
            if (!entry?.[0]?.changes?.[0]?.value?.messages) {
                console.log("📭 Payload sem mensagem");
                return new Response("EVENT_RECEIVED", { status: 200 });
            }

            const change = entry[0].changes[0].value;
            const message = change.messages[0];
            const contact = change.contacts?.[0];

            const from = message.from;
            const text = message.text?.body;
            const referral = message.referral; // 📢 CAPTURA DADOS DO ANÚNCIO
            const wa_id = message.id;
            const name = contact?.profile?.name || from;

            if (!text) {
                console.log("📭 Mensagem sem texto");
                return new Response("EVENT_RECEIVED", { status: 200 });
            }

            console.log(`💬 ${name} (${from}): ${text}`);

            // 3. Salvar/Atualizar Conversa
            let conversationId: string | null = null;
            let aiStatus = 'active';

            try {
                const { data: convData, error: convError } = await supabase
                    .from('crm_conversations')
                    .upsert({
                        phone: from,
                        name: name,
                        last_message: text,
                        last_message_at: new Date().toISOString(),
                        unread_count: 1
                    }, { onConflict: 'phone' })
                    .select()
                    .single();

                if (convError) {
                    console.error('Erro DB Conv:', convError.message);
                } else {
                    conversationId = convData?.id;
                    aiStatus = convData?.ai_status || 'active';
                }
            } catch (e) {
                console.error('Erro salvando conversa:', e);
            }

            // check logs
            if (conversationId && (!anthropicKey || !metaToken)) {
                console.error("Missing Keys - Anthropic:", !!anthropicKey, "Meta:", !!metaToken);
            }

            // Salvar Mensagem Recebida
            if (conversationId) {
                try {
                    await supabase.from('crm_messages').insert({
                        conversation_id: conversationId,
                        direction: 'inbound',
                        body: text,
                        wa_id: wa_id,
                        status: 'received'
                    });
                } catch (e) {
                    console.error('Erro salvando msg:', e);
                }
            }

            // Verifica se deve responder
            if (aiStatus === 'paused') {
                console.log(`⏸️ AI Pausada para ${from}`);
                return new Response("EVENT_RECEIVED", { status: 200 });
            }

            // 4. INTELIGÊNCIA DO AGENTE IA
            console.log(`🧠 Agente IA IRW Motors processando...`);

            const origin = detectOrigin(text);

            // Buscar veículo no estoque (Busca Dinâmica por Palavras-Chave e Anúncios)
            let vehicleContext = '';
            let vehiclePhotos: string[] = [];
            let vehicleData: any = null;
            let adContext = '';

            // Combinar keywords do texto com keywords do anúncio (se houver)
            let keywords = extractKeywords(text);

            if (referral) {
                console.log('📢 Lead veio de anúncio Meta Ads:', referral);
                const adTitle = referral.headline || referral.body || '';

                if (adTitle) {
                    adContext = `\n[ALERTA IMPORTANTE DE SISTEMA: O cliente clicou num anúncio do Facebook/Instagram com o título: "${adTitle}". O INTERESSE DELE É ESSE CARRO. USE ISSO PARA INICIAR A CONVERSA JÁ FALANDO DO VEÍCULO.]`;

                    // Extrai keywords do título do anúncio e coloca no início da busca (prioridade)
                    const adKeywords = extractKeywords(adTitle);
                    keywords = [...adKeywords, ...keywords];
                }
            }

            if (keywords.length > 0) {
                try {
                    console.log(`🔍 Buscando estoque por keywords: ${keywords.join(', ')}`);

                    // Constroi filtro OR para buscar qualquer keyword no nome
                    const orFilter = keywords.map(k => `nome.ilike.%${k}%`).join(',');

                    const { data: vehicles } = await supabase
                        .from('estoque')
                        .select('nome, ano, km, valor, cambio, foto, fotos')
                        .eq('ativo', true)
                        .or(orFilter)
                        .limit(3); // Busca até 3 opções parecidas

                    if (vehicles && vehicles.length > 0) {
                        // Pega o melhor match (primeiro) como principal para enviar fotos
                        vehicleData = vehicles[0];

                        // Monta contexto com TODAS as opções encontradas
                        vehicleContext = `\n\n[SISTEMA: ENCONTREI ESTES VEÍCULOS NO ESTOQUE PARECIDOS COM A SOLICITAÇÃO DO CLIENTE]:\n`;

                        vehicles.forEach((v: any) => {
                            const val = Number(v.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            vehicleContext += `- ${v.nome} | Ano: ${v.ano} | ${v.km} | R$ ${val}\n`;
                        });
                        vehicleContext += `\n[Use essas informações reais para responder. Se o cliente perguntou de um específico, use os dados acima.]`;

                        // Prepara fotos do PRIMEIRO (o mais relevante)
                        if (vehicleData.fotos) {
                            try {
                                const fotosArray = JSON.parse(vehicleData.fotos);
                                if (Array.isArray(fotosArray)) {
                                    vehiclePhotos = fotosArray.filter((f: string) => f && f.startsWith('http'));
                                }
                            } catch (e) { }
                        }
                        if (vehiclePhotos.length === 0 && vehicleData.foto && vehicleData.foto.startsWith('http')) {
                            vehiclePhotos = [vehicleData.foto];
                        }
                        console.log(`🚗 Encontrado(s) ${vehicles.length} veículos. Principal: ${vehicleData.nome}`);
                    } else {
                        console.log(`⚠️ Nenhum veículo encontrado para as keywords.`);
                    }
                } catch (e) {
                    console.error('Erro na busca de estoque:', e);
                }
            }

            // Instruções por origem
            if (origin === 'olx') {
                originInstruction = '\n\n[CONTEXTO: Cliente veio do OLX - já viu fotos e descrição do anúncio]';
            } else if (origin === 'trafego_pago' || referral) {
                originInstruction = `\n\n[CONTEXTO: Cliente veio de anúncio Patrocinado.${adContext}]`;
            }

            // Buscar histórico
            let historyMsgs: any[] = [];
            if (conversationId) {
                try {
                    const { data } = await supabase
                        .from('crm_messages')
                        .select('direction, body')
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: false })
                        .limit(6);
                    historyMsgs = (data || []).reverse();
                } catch (e) {
                    // Sem histórico, ok
                }
            }

            // 5. CARREGAR CONFIGURAÇÕES DINÂMICAS (AdminIA)
            console.log(`🧠 Carregando configurações do 'diego_ai'...`);
            let diegoConfigs: Record<string, string> = {};
            try {
                diegoConfigs = await getAllConfigs(supabase, 'diego_ai');
            } catch (err) {
                console.error("⚠️ Falha ao carregar configs, usando padrão:", err);
            }

            // Fallbacks padrão caso o banco falhe ou esteja vazio
            const config = {
                system_prompt: diegoConfigs.system_prompt || `Você é o Agente IA da IRW Motors, consultor comercial especializado em atendimento de alta performance em Brasília.`,
                presentation_prompt: diegoConfigs.apresentacao_prompt || `Ao apresentar um veículo: Destaque diferenciais, valorize o estado de conservação e só fale preço de forma consultiva.`,
                temperature: parseFloat(diegoConfigs.temperature || '0.7'),
                response_style: diegoConfigs.response_style || 'amigável',
                use_emoji: diegoConfigs.use_emoji === 'true',
                language: diegoConfigs.language || 'pt-BR',
                max_photos: diegoConfigs.max_photos || '10', // Default 10
                human_delay: diegoConfigs.human_delay !== 'false', // Default true
                response_speed: diegoConfigs.response_speed || 'normal' // fast | normal | slow
            };

            // Montar System Prompt Final com Contexto
            const contextInstruction = `
CONTEXTO ATUAL:
- Estilo: ${config.response_style}
- Idioma: ${config.language}
- Uso de Emojis: ${config.use_emoji ? 'Moderado (máx 1)' : 'NENHUM'}

DIRETRIZES DE APRESENTAÇÃO DE VEÍCULOS (%IMPORTANTE%):
${config.presentation_prompt}

${vehicleContext}

${originInstruction}
`;
            const fullSystemPrompt = `${config.system_prompt}
${contextInstruction}

IMPORTANTE: Siga rigorosamente o ESTILO definido acima.`;

            const messages: Array<{ role: string, content: string }> = [
                { role: "system", content: fullSystemPrompt }
            ];

            // Adicionar histórico
            for (const msg of historyMsgs) {
                messages.push({
                    role: msg.direction === 'inbound' ? 'user' : 'assistant',
                    content: msg.body
                });
            }

            // Mensagem atual
            messages.push({ role: "user", content: text });

            console.log(`🧠 Chamando Claude (${messages.length} msgs)...`);

            // Separar system prompt das mensagens
            const systemContent = messages.find(m => m.role === 'system')?.content || '';
            const chatMessages = messages.filter(m => m.role !== 'system');

            const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: "claude-opus-4-20250514",
                    max_tokens: 400,
                    system: systemContent,
                    messages: chatMessages
                })
            });

            const aiData = await aiResponse.json();

            if (aiData.error) {
                console.error('❌ Erro Claude:', aiData.error.message);
                if (conversationId) {
                    await supabase.from('crm_messages').insert({
                        conversation_id: conversationId,
                        direction: 'outbound',
                        body: `[SYSTEM DEBUG] Erro Claude: ${aiData.error.message}`,
                        status: 'failed'
                    });
                }
                return new Response("EVENT_RECEIVED", { status: 200 });
            }

            const replyText = aiData.content?.[0]?.text || "Um momento, estou verificando! 🔍";
            console.log(`📤 Agente IA: ${replyText.substring(0, 80)}...`);

            // SIMULAR DIGITAÇÃO (Respeitando velocidade configurada)
            let typingDelay = 1000;
            if (config.human_delay) {
                // Calcular delay baseado na velocidade configurada
                const speedMultipliers = {
                    fast: 15,      // 15ms por caractere (mais rápido)
                    normal: 30,    // 30ms por caractere (padrão humano)
                    slow: 50       // 50ms por caractere (mais lento/pensativo)
                };

                const multiplier = speedMultipliers[config.response_speed as keyof typeof speedMultipliers] || 30;
                typingDelay = Math.min(Math.max(replyText.length * multiplier, 800), 6000);
            }
            console.log(`⏳ Simulando digitação (${config.response_speed}) por ${typingDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            // 7. Enviar via Meta API
            const sendResponse = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${metaToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: from,
                    text: { body: replyText }
                })
            });

            const sendData = await sendResponse.json();
            if (sendData.error) {
                console.error('❌ Erro Meta:', sendData.error.message);
                if (conversationId) {
                    await supabase.from('crm_messages').insert({
                        conversation_id: conversationId,
                        direction: 'outbound',
                        body: `[SYSTEM DEBUG] Erro Meta: ${sendData.error.message}`,
                        status: 'failed'
                    });
                }
            } else {
                console.log(`✅ Mensagem enviada para ${name}`);
            }

            // 8. Enviar DADOS E FOTOS do veículo (se tiver)
            if (vehiclePhotos.length > 0 && vehicleData) {
                try {
                    console.log(`📋 Ficha técnica enviada!`);

                    // Depois: enviar fotos (respeitando limite configurado)
                    let maxPhotosToSend = 10;
                    if (config.max_photos === 'all') {
                        maxPhotosToSend = 100;
                    } else if (config.max_photos) {
                        maxPhotosToSend = parseInt(config.max_photos);
                    }

                    const fotosParaEnviar = vehiclePhotos.slice(0, maxPhotosToSend);
                    console.log(`📸 Preparando envio de até ${maxPhotosToSend} fotos. Disponíveis: ${vehiclePhotos.length}`);

                    // Formatar valor com pontuação correta
                    const valorFormatado = Number(vehicleData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    const fichaTecnica = `*${vehicleData.nome}*\n\n📅 Ano: ${vehicleData.ano}\n⚙️ Câmbio: ${vehicleData.cambio}\n🛣️ KM: ${vehicleData.km}\n💰 R$ ${valorFormatado}`;

                    await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${metaToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: from,
                            text: { body: fichaTecnica }
                        })
                    });

                    for (let i = 0; i < fotosParaEnviar.length; i++) {
                        const fotoUrl = fotosParaEnviar[i];

                        // Pequeno delay entre fotos para não ser spam (aumentado para 800ms)
                        if (i > 0) {
                            await new Promise(resolve => setTimeout(resolve, 800));
                        }

                        const photoResponse = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${metaToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                messaging_product: "whatsapp",
                                to: from,
                                type: "image",
                                image: {
                                    link: fotoUrl
                                }
                            })
                        });

                        const photoData = await photoResponse.json();
                        if (photoData.error) {
                            console.error(`❌ Erro foto ${i + 1}:`, photoData.error.message);
                        } else {
                            console.log(`📸 Foto ${i + 1}/${fotosParaEnviar.length} enviada!`);
                        }
                    }

                    console.log(`✅ Todas as fotos enviadas!`);
                } catch (e) {
                    console.error('Erro enviando fotos:', e);
                }
            }

            // 9. Salvar Resposta
            if (conversationId) {
                try {
                    await supabase.from('crm_messages').insert({
                        conversation_id: conversationId,
                        direction: 'outbound',
                        body: replyText,
                        status: 'sent'
                    });
                } catch (e) {
                    console.error('Erro salvando resposta:', e);
                }
            }

            return new Response("EVENT_RECEIVED", { status: 200 });

        } catch (e: any) {
            console.error("❌ Erro geral:", e);
            // Verificar referência a conversationId aqui, pode precisar declarar fora do try se não estiver acessível
            return new Response("EVENT_RECEIVED", { status: 200 });
        }
    }

    return new Response("Método não permitido", { status: 405 });
});
