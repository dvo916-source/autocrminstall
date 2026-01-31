import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// Path matching db.js (assuming project root)
const dbPath = 'd:/VISITAS IRW/sistema_visitas.db';
console.log('Checking database at:', dbPath);

try {
    const db = new Database(dbPath);
    const users = db.prepare("SELECT username, role, ativo, length(password) as pass_len FROM usuarios").all();
    console.log('Users found:', users);
} catch (err) {
    console.error('Error reading database:', err.message);
}
