const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.vexcore', 'database.db');
const db = new Database(dbPath);

console.log('--- Total de Visitas ---');
const count = db.prepare("SELECT COUNT(*) as total FROM visitas").get();
console.log(count);

console.log('--- Amostra de Visitas (últimas 5) ---');
const sample = db.prepare("SELECT id, cliente, status, status_pipeline, data_agendamento, mes, loja_id FROM visitas ORDER BY id DESC LIMIT 5").all();
console.log(JSON.stringify(sample, null, 2));
