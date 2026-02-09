
import { createClient } from '@supabase/supabase-js';
import * as db from './db.js';

// --- CONFIG ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function initAi() {
    console.log('🧠 [AI Service] Neural Engine v3.0 (Meta API Integrated).');

    // Listener para novas mensagens do CLIENTE
    const channel = supabase
        .channel('ai_brain_listener')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'crm_messages',
                filter: "sender_role=eq.lead" // Só processa mensagens do LEAD
            },
            async (payload) => {
                console.log('🧠 [AI Service] Nova mensagem detectada:', payload.new.id);
                setTimeout(() => processIncomingMessage(payload.new), 1500);
            }
        )
        .subscribe();
}

async function processIncomingMessage(message) {
    try {
        const conversationId = message.conversation_id;

        // 1. Checa Status
        const { data: convData, error: convError } = await supabase
            .from('crm_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (convError || !convData) {
            console.error('🧠 [AI Audit] Erro ao buscar conversa:', convError);
            return;
        }

        if (convData.ai_status !== 'active') {
            console.log(`🧠 [AI Audit] Ignorando msg (Status: ${convData.ai_status})`);
            return;
        }

        // 2. Busca Configurações & Chaves
        const settings = db.getAllSettings();

        // --- FALLBACK DE EMERGÊNCIA (Claude Key) ---
        const FALLBACK_KEY = process.env.CLAUDE_API_KEY || "";

        const apiKey = settings['openai_api_key'] || FALLBACK_KEY;
        let model = settings['ai_model'] || 'claude-3-5-sonnet-20240620';
        const masterPrompt = settings['ai_master_prompt'] || 'Você é um assistente de vendas.';

        // Dados Meta API
        const metaPhoneId = settings['meta_phone_id'];
        const metaToken = settings['meta_access_token'];

        console.log(`🧠 [DEBUG CONFIG] API Key: ${apiKey ? 'OK' : 'FAIL'}, Meta Phone: ${metaPhoneId ? 'OK (' + metaPhoneId.substring(0, 4) + '..)' : 'MISSING'}, Meta Token: ${metaToken ? 'OK' : 'MISSING'}`);

        if (!apiKey) {
            console.warn('🧠 [AI Security] FALTA API KEY! (Nem fallback funcionou).');
            return;
        }

        // 3. Monta Contexto
        const { data: history } = await supabase
            .from('crm_messages')
            .select('sender_role, body')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(15);

        const cleanHistory = sanitizeHistoryForClaude(history);

        console.log(`🧠 [AI Routing] Usando modelo: ${model}`);

        let aiText = "";

        // === ROTEAMENTO DE INTELECTO ===
        if (model.includes('claude')) {
            aiText = await callAnthropic(apiKey, model, masterPrompt, cleanHistory);
        } else {
            aiText = await callOpenAI(apiKey, model, masterPrompt, cleanHistory);
        }

        if (!aiText) {
            console.error('🧠 [AI Error] Nenhuma resposta gerada.');
            return;
        }

        console.log('🧠 [AI Success] Resposta:', aiText.substring(0, 50) + "...");

        // 4. Salvar no Banco (Persistência)
        const { error: insertError } = await supabase
            .from('crm_messages')
            .insert({
                conversation_id: conversationId,
                sender_role: 'ai',
                body: aiText,
                created_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('❌ [AI Critical] Erro ao salvar DB:', insertError);
        } else {
            console.log('✅ [AI] Resposta salva no DB.');
        }

        // 5. ENVIO META API (Real Dispatch)
        if (metaPhoneId && metaToken) {
            console.log(`📤 [Meta Dispatch] Enviando para ${convData.phone}...`);
            await sendViaMetaApi(metaPhoneId, metaToken, convData.phone, aiText);
        } else {
            console.warn("⚠️ [Meta Warning] Credenciais Meta não configuradas. Resposta salva apenas no banco.");
        }

    } catch (err) {
        console.error('🧠 [AI SYSTEM FAILURE]:', err);
    }
}

// --- META DISPATCHER ---
async function sendViaMetaApi(phoneId, token, toPhone, text) {
    try {
        let cleanPhone = toPhone.replace(/\D/g, ''); // Remove não-numeros

        // CORREÇÃO BRASIL: Se tiver 10 ou 11 digitos, adiciona 55!
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
            console.log(`📞 [Meta Fix] Adicionado DDI 55: ${cleanPhone}`);
        }

        console.log(`📤 [Meta] Enviando para ${cleanPhone} (ID: ${phoneId})...`);

        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "text",
                text: { body: text }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("❌ [Meta API Error]:", data.error);
        } else {
            console.log("✅ [Meta API] Mensagem enviada! ID:", data.messages?.[0]?.id);
        }
    } catch (e) {
        console.error("❌ [Meta Network Failure]:", e);
    }
}

// --- LOGICA HIGIENIZAÇÃO ---
function sanitizeHistoryForClaude(rawHistory) {
    const clean = [];
    let lastRole = null;
    const sorted = [...(rawHistory || [])].reverse();

    for (const msg of sorted) {
        const role = msg.sender_role === 'ai' ? 'assistant' : 'user';
        const content = (msg.body || "").trim();
        if (!content) continue;
        if (role === lastRole) {
            clean[clean.length - 1].content += "\n\n" + content;
        } else {
            clean.push({ role, content });
            lastRole = role;
        }
    }
    while (clean.length > 0 && clean[0].role === 'assistant') clean.shift();
    if (clean.length === 0) clean.push({ role: 'user', content: 'Olá' });
    return clean;
}

// --- ADAPTADORES LLM ---

async function callAnthropic(apiKey, model, systemPrompt, messages) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                system: systemPrompt,
                messages: messages,
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error('❌ [Claude API Error]:', data.error);
            return null;
        }
        return data.content?.[0]?.text || null;
    } catch (e) {
        console.error('❌ [Claude Error]:', e);
        return null;
    }
}

async function callOpenAI(apiKey, model, systemPrompt, messages) {
    try {
        const openAIMessages = messages.map(m => ({ role: m.role, content: m.content }));
        openAIMessages.unshift({ role: 'system', content: systemPrompt });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: openAIMessages,
                temperature: 0.7,
                max_tokens: 400
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (e) {
        return null;
    }
}
