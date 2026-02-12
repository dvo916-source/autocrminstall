
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Try common user data paths for electron
const possiblePaths = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'irw.db'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'irw.db'),
    path.join(os.homedir(), '.vexcore', 'irw.db'), // Just in case
    'd:\\VISITAS IRW\\crystal_app\\irw.db' // Project root fallback
];

let dbPath = null;

for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        console.log(`✅ [FOUND] Database found at: ${p}`);
        dbPath = p;
        break;
    } else {
        console.log(`❌ [NOT FOUND] ${p}`);
    }
}

if (!dbPath) {
    console.error("🔥 Could not find irw.db in standard locations.");
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

console.log('\n--- Checking Visits (loja_id distribution) ---');
const dist = db.prepare("SELECT loja_id, COUNT(*) as count FROM visitas GROUP BY loja_id").all();
console.table(dist);

console.log('\n--- Checking Visits for irw-motors-main (Limit 5) ---');
const visits = db.prepare("SELECT id, cliente, loja_id, data_agendamento FROM visitas WHERE loja_id = 'irw-motors-main' ORDER BY id DESC LIMIT 5").all();
console.table(visits);

console.log('\n--- Checking Visits for NULL loja_id (Limit 5) ---');
const nullVisits = db.prepare("SELECT id, cliente, loja_id, data_agendamento FROM visitas WHERE loja_id IS NULL ORDER BY id DESC LIMIT 5").all();
console.table(nullVisits);
