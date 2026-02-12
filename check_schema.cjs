const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.vexcore', 'database.db');

try {
    const db = new Database(dbPath);

    console.log('--- Esquema Portais ---');
    console.log(JSON.stringify(db.prepare("PRAGMA table_info(portais)").all(), null, 2));

    console.log('--- Índices Portais ---');
    console.log(JSON.stringify(db.prepare("PRAGMA index_list(portais)").all(), null, 2));

} catch (e) {
    console.error('Erro:', e.message);
}
