const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const paths = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'sdr-irw-motors', 'sistema_visitas.db')
];

let dbPath = paths.find(p => fs.existsSync(p));

if (!dbPath) {
    console.log("❌ Database not found at any of the paths:", paths);
    process.exit(1);
}

const db = new Database(dbPath);

console.log("--- DATABASE INFO ---");
console.log("Path:", dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables found:", tables.map(t => t.name).join(', '));

console.log("\n--- COUNTS ---");
['lojas', 'usuarios', 'visitas', 'estoque', 'config'].forEach(table => {
    try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
        console.log(`${table}: ${count}`);
    } catch (e) {
        console.log(`${table}: Error - ${e.message}`);
    }
});

console.log("\n--- LOJA IDs ---");
try {
    const lojas = db.prepare("SELECT id, nome FROM lojas").all();
    console.log("Lojas defined:", lojas);

    const visitLojas = db.prepare("SELECT DISTINCT loja_id, COUNT(*) as c FROM visitas GROUP BY loja_id").all();
    console.log("Loja IDs in 'visitas':", visitLojas);
} catch (e) {
    console.log("Error checking lojs:", e.message);
}

console.log("\n--- RECENT VISITS ---");
try {
    const recent = db.prepare("SELECT id, datahora, loja_id, status FROM visitas ORDER BY id DESC LIMIT 5").all();
    console.log(recent);
} catch (e) {
    console.log("Error checking recent visits:", e.message);
}

console.log("\n--- CONFIG CHECK ---");
try {
    const configs = db.prepare("SELECT * FROM config").all();
    console.log(configs);
} catch (e) {
    console.log("Error checking config:", e.message);
}
