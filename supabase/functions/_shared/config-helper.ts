// Config Helper for Edge Functions
// Reads settings from database with fallback to environment variables

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ConfigCache {
    [key: string]: {
        value: string;
        timestamp: number;
    };
}

const configCache: ConfigCache = {};
const CACHE_TTL = 60000; // 1 minute cache

export async function getConfig(
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

export function clearConfigCache() {
    Object.keys(configCache).forEach(key => delete configCache[key]);
}
