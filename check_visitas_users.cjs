const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.vexcore', 'database.db');
const db = new Database(dbPath);

console.log('--- Resumo por Usuário ---');
const resumen = db.prepare(`
    SELECT 
        u.username as nome, 
        u.nome_completo, 
        COUNT(v.id) as total
    FROM usuarios u
    LEFT JOIN visitas v ON u.username = v.vendedor_sdr
    WHERE u.role IN('sdr', 'vendedor')
    GROUP BY u.username
`).all();
console.log(JSON.stringify(resumen, null, 2));

console.log('--- Detalhes das Visitas ---');
const visitas = db.prepare("SELECT * FROM visitas").all();
console.log(JSON.stringify(visitas, null, 2));
