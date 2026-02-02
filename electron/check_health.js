
import { app } from 'electron';
import * as db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Silencia logs de init normais
const originalLog = console.log;
console.log = () => { };

app.whenReady().then(async () => {
    try {
        console.log = originalLog; // Restaura log
        console.log('\n🔍 --- DIAGNÓSTICO NEURAL ---');

        db.initDb();
        const settings = db.getAllSettings();

        const apiKey = settings['openai_api_key'];
        const metaPhone = settings['meta_phone_id'];
        const metaToken = settings['meta_access_token'];
        const model = settings['ai_model'];

        // Analisa OpenAI/Claude
        if (apiKey && apiKey.length > 20) {
            console.log('✅ IA Key (Claude/GPT): DETECTADA e VÁLIDA.');
        } else {
            console.log('⚠️ IA Key: NÃO CONFIGURADA NO BANCO (Sistema usará Fallback Embutido).');
        }

        // Analisa Meta
        if (metaPhone && metaPhone.length > 5) {
            console.log(`✅ Meta Phone ID: DETECTADO (${metaPhone})`);
        } else {
            console.log('❌ Meta Phone ID: AUSENTE ou INVÁLIDO.');
        }

        if (metaToken && metaToken.startsWith('EAA')) {
            console.log('✅ Meta Access Token: DETECTADO (Formato Correto).');
        } else {
            console.log('❌ Meta Access Token: AUSENTE ou Formato Incorreto (Deve começar com EAAG...).');
        }

        console.log(`🧠 Modelo Ativo: ${model || 'Padrão (Claude 3.5 Sonnet)'}`);
        console.log('------------------------------\n');

        process.exit(0);
    } catch (e) {
        console.error('❌ Erro no diagnóstico:', e);
        process.exit(1);
    }
});
