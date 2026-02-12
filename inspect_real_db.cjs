
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// We found the file at C:\Users\Windows 11\AppData\Roaming\vexcore\sistema_visitas.db
// But let's be dynamic if possible, or just hardcode for this debugging session since we saw it in dir.
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');

if (!fs.existsSync(dbPath)) {
    console.error(`❌ DB not found at ${dbPath}`);
    process.exit(1);
}

console.log(`✅ Opening DB at ${dbPath}`);
const db = new Database(dbPath, { readonly: true });

console.log('\n--- Status Distribution ---');
try {
    const statusDist = db.prepare("SELECT status, COUNT(*) as count FROM visitas GROUP BY status").all();
    console.table(statusDist);
} catch (e) { console.error(e.message); }

console.log('\n--- Loja ID Distribution ---');
try {
    const lojaDist = db.prepare("SELECT loja_id, COUNT(*) as count FROM visitas GROUP BY loja_id").all();
    console.table(lojaDist);
} catch (e) { console.error(e.message); }

console.log('\n--- First 5 Visits (All) ---');
try {
    const visits = db.prepare("SELECT id, cliente, loja_id, data_agendamento, vendedor FROM visitas ORDER BY id DESC LIMIT 5").all();
    console.table(visits);
} catch (e) { console.error(e.message); }
