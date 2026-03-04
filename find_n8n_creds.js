import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// Path to the SQLite database
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SistemaVisitas', 'sistema_visitas.db');

async function findN8nSettings() {
    console.log('🔍 Procurando configurações do n8n no banco local...');

    try {
        const db = new Database(dbPath, { readonly: true });

        // Check crm_settings for n8n keys
        const settings = db.prepare("SELECT * FROM crm_settings WHERE key LIKE '%n8n%' OR category = 'diego_ai'").all();

        if (settings.length > 0) {
            console.log('✅ Configurações encontradas:');
            settings.forEach(s => {
                console.log(`   - [${s.category}] ${s.key}: ${s.value}`);
            });
        } else {
            console.log('❌ Nenhuma configuração de n8n encontrada no banco crm_settings.');
        }

        // Also check the config table just in case
        const config = db.prepare("SELECT * FROM config WHERE chave LIKE '%n8n%'").all();
        if (config.length > 0) {
            console.log('✅ Configurações na tabela config:');
            config.forEach(c => {
                console.log(`   - ${c.chave}: ${c.valor}`);
            });
        }

    } catch (err) {
        console.error('💥 Erro ao acessar o banco:', err.message);
    }
}

findN8nSettings();
