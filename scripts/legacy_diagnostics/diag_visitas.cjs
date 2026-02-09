const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SDR IRW Motors', 'database.sqlite');
const Database = require('d:/VISITAS IRW/crystal_app/node_modules/better-sqlite3');

try {
    const db = new Database(dbPath);
    const tableInfo = db.prepare("PRAGMA table_info(visitas)").all();
    console.log("Colunas:", tableInfo.map(c => c.name).join(", "));
    const rows = db.prepare("SELECT * FROM visitas LIMIT 10").all();
    console.log("Dados:", JSON.stringify(rows, null, 2));
} catch (e) {
    console.error("Erro:", e.message);
}
