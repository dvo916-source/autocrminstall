
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');

if (!fs.existsSync(dbPath)) {
    console.error(`❌ DB not found at ${dbPath}`);
    process.exit(1);
}

console.log(`✅ Opening DB at ${dbPath}`);
const db = new Database(dbPath, { readonly: true });

console.log('\n--- All Users ---');
try {
    const users = db.prepare("SELECT username, nome_completo, role, loja_id FROM usuarios").all();
    console.table(users);
} catch (e) { console.error(e.message); }

console.log('\n--- Agendamentos linked to diego (NOCASE) ---');
try {
    const visits = db.prepare("SELECT id, cliente, vendedor_sdr, status_pipeline FROM visitas WHERE vendedor_sdr = 'diego' COLLATE NOCASE OR vendedor = 'diego' COLLATE NOCASE").all();
    console.table(visits);
} catch (e) { console.error(e.message); }
