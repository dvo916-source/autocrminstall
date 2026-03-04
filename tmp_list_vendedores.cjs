const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');
const db = new Database(dbPath);

try {
    const vendedores = db.prepare("SELECT * FROM vendedores").all();
    console.log(JSON.stringify(vendedores, null, 2));
    process.exit(0);
} catch (e) {
    console.error(e);
    process.exit(1);
}
