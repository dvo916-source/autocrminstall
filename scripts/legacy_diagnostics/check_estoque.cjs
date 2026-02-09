const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SDR IRW Motors', 'database.sqlite');
const Database = require('d:/VISITAS IRW/crystal_app/node_modules/better-sqlite3');

try {
    const db = new Database(dbPath);
    const rows = db.prepare("SELECT nome FROM estoque LIMIT 20").all();
    console.log("Amostra de Estoque:", JSON.stringify(rows, null, 2));
} catch (e) {
    console.error("Erro:", e.message);
}
