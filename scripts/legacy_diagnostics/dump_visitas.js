const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// No Windows, userData costuma ser %APPDATA%/SDR IRW Motors
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SDR IRW Motors', 'database.sqlite');

try {
    const db = new Database(dbPath);
    const rows = db.prepare("SELECT * FROM visitas").all();
    console.log(JSON.stringify(rows, null, 2));
} catch (e) {
    console.error("Erro ao ler banco:", e.message);
}
