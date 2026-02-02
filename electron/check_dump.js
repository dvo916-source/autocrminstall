
import { app } from 'electron';
import * as db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalLog = console.log;
console.log = () => { };

app.whenReady().then(async () => {
    try {
        console.log = originalLog;
        console.log('\n📦 --- DUMP DE CONFIGURAÇÕES ---');

        db.initDb();
        const settings = db.getAllSettings();

        const keys = Object.keys(settings);
        if (keys.length === 0) {
            console.log("⚠️ O banco de configurações está COMPLETAMENTE VAZIO.");
        } else {
            keys.forEach(k => {
                let val = String(settings[k]);
                if (val.length > 15) val = val.substring(0, 6) + "..." + val.substring(val.length - 4);
                console.log(`🔹 ${k}: [${val}]`);
            });
        }

        console.log('------------------------------\n');
        process.exit(0);
    } catch (e) {
        console.error('❌ Erro:', e);
        process.exit(1);
    }
});
