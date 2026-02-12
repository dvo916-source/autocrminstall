
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');

if (!fs.existsSync(dbPath)) {
    console.error(`❌ DB not found at ${dbPath}`);
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

console.log('\n--- Status for specifically requested visits ---');
try {
    const visits = db.prepare(`
        SELECT id, cliente, status, status_pipeline 
        FROM visitas 
        WHERE cliente GLOB '*ALEX*' OR cliente GLOB '*ADEMIR*'
        ORDER BY id DESC
    `).all();
    console.table(visits);
} catch (e) { console.error(e.message); }
