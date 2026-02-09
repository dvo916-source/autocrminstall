const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'sdr-irw-motors');
const dbPath = path.join(appDataPath, 'sistema_visitas.db');

console.log('Checking database at:', dbPath);

try {
    const db = new Database(dbPath);
    console.log('--- ESTOQUE PER STORE ---');
    const counts = db.prepare('SELECT loja_id, COUNT(*) as total FROM estoque GROUP BY loja_id').all();
    console.log(JSON.stringify(counts, null, 2));

    console.log('\n--- LOJAS DISPONÍVEIS ---');
    const lojas = db.prepare('SELECT id, nome, slug FROM lojas').all();
    console.log(JSON.stringify(lojas, null, 2));

    db.close();
} catch (err) {
    console.error('Error:', err.message);
}
