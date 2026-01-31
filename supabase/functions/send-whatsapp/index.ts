// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Deprecated

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === CONFIG HELPER INLINED (Fix for Import Issues) ===
interface ConfigCache {
    [key: string]: {
        value: string;
        timestamp: number;
    };
}

const configCache: ConfigCache = {};
const CACHE_TTL = 60000; // 1 minute cache

async function getConfig(
    supabaseClient: any,
    category: string,
    key: string,
    fallbackEnvVar?: string
): Promise<string | null> {
    const cacheKey = `${category}:${key}`;
    const now = Date.now();

    // Check cache first
    if (configCache[cacheKey] && (now - configCache[cacheKey].timestamp) < CACHE_TTL) {
        return configCache[cacheKey].value;
    }

    try {
        // Try to get from database
        const { data, error } = await supabaseClient
            .from('crm_settings')
            .select('value')
            .eq('category', category)
            .eq('key', key)
            .single();

        if (!error && data && data.value) {
            // Cache the value
            configCache[cacheKey] = {
                value: data.value,
                timestamp: now
            };
            return data.value;
        }
    } catch (err) {
        console.warn(`Failed to get config ${cacheKey} from DB:`, err);
    }

    // Fallback to environment variable
    if (fallbackEnvVar) {
        const envValue = Deno.env.get(fallbackEnvVar);
        if (envValue) {
            return envValue;
        }
    }

    return null;
}
// =====================================================

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { to, text, conversation_id } = await req.json();

        if (!to || !text) {
            throw new Error("Missing 'to' or 'text'");
        }

        // 1. Setup Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 1b. Setup Admin Client (For fetching secrets/config bypassing RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2. Get Meta credentials from database (using Admin Client)
        const metaToken = await getConfig(supabaseAdmin, 'meta_api', 'access_token', 'META_ACCESS_TOKEN');
        const phoneId = await getConfig(supabaseAdmin, 'meta_api', 'phone_id', 'META_PHONE_ID');
        const apiVersion = await getConfig(supabaseAdmin, 'meta_api', 'api_version') || 'v17.0';

        if (!metaToken || !phoneId) {
            throw new Error('Meta API credentials not configured. Please configure in Admin panel.');
        }

        console.log(`Using API ${apiVersion}, phone ID: ${phoneId.substring(0, 5)}...`);

        // 3. Send to Meta
        const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            to: to,
            text: { body: text },
        };

        const metaResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${metaToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const metaData = await metaResponse.json();

        if (!metaResponse.ok) {
            // Return EXACTLY what we tried to send
            const debugInfo = {
                errorFromMeta: metaData,
                urlUsed: url,
                tokenUsedPrefix: metaToken?.substring(0, 5),
                payloadSent: payload
            };

            console.error("Meta API Error:", JSON.stringify(metaData));
            throw new Error(JSON.stringify(debugInfo));
        }

        const waId = metaData.messages?.[0]?.id;

        // 4. Persist Outbound Message
        let finalConvId = conversation_id;

        if (!finalConvId) {
            const { data: conv } = await supabaseClient
                .from('crm_conversations')
                .select('id')
                .eq('phone', to)
                .single();
            finalConvId = conv?.id;
        }

        if (finalConvId) {
            await supabaseClient.from('crm_messages').insert({
                conversation_id: finalConvId,
                direction: 'outbound',
                body: text,
                status: 'sent',
                wa_id: waId
            });

            await supabaseClient.from('crm_conversations')
                .update({
                    last_message: text,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', finalConvId);
        }

        return new Response(JSON.stringify({ success: true, wa_id: waId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Function Error:", error);

        // DEBUG: Return token info in error
        const metaToken = Deno.env.get('META_ACCESS_TOKEN');
        const debugInfo = {
            msg: error.message,
            tokenLen: metaToken?.length,
            tokenPrefix: metaToken?.substring(0, 5),
            phoneIdEnv: Deno.env.get('META_PHONE_ID')
        };

        return new Response(JSON.stringify({ error: debugInfo }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
