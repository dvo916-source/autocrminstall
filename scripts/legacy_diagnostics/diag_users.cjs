const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// No Windows, userData do app costuma ficar em %APPDATA%\sdr-irw-motors
const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'sdr-irw-motors');
const dbPath = path.join(appDataPath, 'sistema_visitas.db');

console.log('Checking database at:', dbPath);

try {
    const db = new Database(dbPath);
    console.log('--- TABLE INFO (usuarios) ---');
    const info = db.prepare("PRAGMA table_info(usuarios)").all();
    console.log(JSON.stringify(info, null, 2));

    console.log('\n--- SAMPLE USERS (last 5) ---');
    const users = db.prepare("SELECT username, role, loja_id FROM usuarios LIMIT 5").all();
    console.log(JSON.stringify(users, null, 2));

    db.close();
} catch (err) {
    console.error('Error:', err.message);
}
