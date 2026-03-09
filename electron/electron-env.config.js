/**
 * CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE - ELECTRON BACKEND
 * 
 * Este arquivo é usado APENAS no processo principal do Electron (main.js).
 * As credenciais NUNCA são expostas ao frontend.
 * 
 * Em produção, estas variáveis devem vir de:
 * 1. Variáveis de ambiente do sistema (Windows: setx, Linux/Mac: export)
 * 2. Arquivo .env (APENAS em desenvolvimento, nunca no build)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carrega variáveis de ambiente de forma segura
 */
export function loadEnvConfig() {
    // 1. Tentar carregar do sistema primeiro
    if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
        console.log('✅ [Config] Variáveis carregadas do sistema');
        return {
            supabaseUrl: process.env.VITE_SUPABASE_URL,
            supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
            supabaseServiceKey: process.env.VITE_SUPABASE_SERVICE_KEY || null
        };
    }

    // 2. Em desenvolvimento, tentar .env (APENAS se não estiver em produção)
    if (process.env.NODE_ENV !== 'production') {
        const envPath = path.join(__dirname, '..', '.env');

        if (fs.existsSync(envPath)) {
            console.log('⚠️ [Config] Carregando .env (APENAS DESENVOLVIMENTO)');
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const envVars = parseEnvFile(envContent);

            return {
                supabaseUrl: envVars.VITE_SUPABASE_URL,
                supabaseAnonKey: envVars.VITE_SUPABASE_ANON_KEY,
                supabaseServiceKey: envVars.VITE_SUPABASE_SERVICE_KEY || null
            };
        }
    }

    // 3. Fallback de emergência (apenas para compatibilidade com instalações antigas)
    console.warn('🚨 [Config] USANDO FALLBACK - Configure variáveis de ambiente!');
    return {
        supabaseUrl: "https://mtbfzimnyactwhdonkgy.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys",
        supabaseServiceKey: null
    };
}

/**
 * Parse simples de arquivo .env
 */
function parseEnvFile(content) {
    const vars = {};
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            vars[key.trim()] = valueParts.join('=').trim();
        }
    }

    return vars;
}

/**
 * Expõe apenas as variáveis necessárias para o frontend (via IPC)
 * NUNCA expor SERVICE_KEY aqui!
 */
export function getPublicEnvVars() {
    const config = loadEnvConfig();

    return {
        VITE_SUPABASE_URL: config.supabaseUrl,
        VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey
    };
}

// Exporta configuração carregada
export const envConfig = loadEnvConfig();
