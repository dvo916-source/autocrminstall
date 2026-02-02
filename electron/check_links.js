
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = 'd:/VISITAS IRW/sistema_visitas.db';
const db = new Database(dbPath);

console.log('\n🏎️ --- DUMP DE ESTOQUE (LINKS) ---');

try {
    const rows = db.prepare("SELECT nome, link FROM estoque LIMIT 5").all();
    if (rows.length === 0) {
        console.log("⚠️ A tabela estoque está vazia.");
    } else {
        rows.forEach(r => {
            console.log(`🚗 ${r.nome}`);
            console.log(`🔗 ${r.link}`);
            console.log('---');
        });
    }
} catch (e) {
    console.error('❌ Erro:', e.message);
}

process.exit(0);
