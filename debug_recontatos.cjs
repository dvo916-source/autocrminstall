
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');

if (!fs.existsSync(dbPath)) {
    console.error(`❌ DB not found at ${dbPath}`);
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

console.log('--- Overdue Pending Contacts ---');
const now = new Date().toISOString();
const today = now.split('T')[0];

try {
    const overdue = db.prepare(`
        SELECT id, cliente, datahora, data_agendamento, status_pipeline 
        FROM visitas 
        WHERE LOWER(status_pipeline) = 'pendente'
    `).all();

    overdue.forEach(v => {
        const taskDate = v.data_agendamento || v.datahora;
        if (taskDate < today) {
            console.log(`ID: ${v.id} | Cliente: ${v.cliente} | Agendamento: ${v.data_agendamento} | Datahora: ${v.datahora} | Status: ${v.status_pipeline} (OVERDUE)`);
        } else {
            console.log(`ID: ${v.id} | Cliente: ${v.cliente} | Agendamento: ${v.data_agendamento} | Datahora: ${v.datahora} | Status: ${v.status_pipeline} (FUTURE/OK)`);
        }
    });

} catch (e) {
    console.error(e.message);
}
db.close();
