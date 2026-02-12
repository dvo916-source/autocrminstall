const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.vexcore', 'database.db');
const db = new Database(dbPath);

console.log('--- Portais Locais ---');
const portais = db.prepare("SELECT * FROM portais").all();
console.log(JSON.stringify(portais, null, 2));

console.log('--- Lojas Locais ---');
const lojas = db.prepare("SELECT * FROM lojas").all();
console.log(JSON.stringify(lojas, null, 2));
