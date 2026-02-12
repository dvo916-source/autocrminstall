const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Tenta encontrar o caminho correto do banco
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');
console.log(`📂 Abrindo banco de dados em: ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    console.log('\n📊 --- ANÁLISE DE VISITAS ---');
    const count = db.prepare('SELECT COUNT(*) as c FROM visitas').get().c;
    console.log(`Total de Visitas: ${count}`);

    if (count > 0) {
        console.log('\n🏢 Visitas por Loja ID:');
        const byLoja = db.prepare('SELECT loja_id, COUNT(*) as c FROM visitas GROUP BY loja_id').all();
        console.table(byLoja);

        console.log('\n📅 Range de Datas (datahora):');
        const dateRange = db.prepare('SELECT MIN(datahora) as min, MAX(datahora) as max FROM visitas').get();
        console.table(dateRange);

        console.log('\n🗓️ Visitas por Mês (coluna mes):');
        const byMes = db.prepare('SELECT mes, COUNT(*) as c FROM visitas GROUP BY mes ORDER BY mes').all();
        console.table(byMes);

        console.log('\n🔍 Amostra das 5 últimas visitas:');
        const sample = db.prepare('SELECT id, loja_id, datahora, mes FROM visitas ORDER BY id DESC LIMIT 5').all();
        console.table(sample);
    } else {
        console.log('⚠️ Tabela de visitas vazia!');
    }

    console.log('\n📋 --- TABELA CONFIG ---');
    const configs = db.prepare("SELECT * FROM config WHERE chave IN ('meta_visita_semanal', 'meta_venda_mensal')").all();
    console.table(configs);

    console.log('\n👥 --- TABELA USUARIOS ---');
    const users = db.prepare("SELECT username, loja_id, role, ativo FROM usuarios").all();
    console.table(users);

    console.log('\n🏪 --- TABELA LOJAS ---');
    const lojas = db.prepare("SELECT id, nome, ativo FROM lojas").all();
    console.table(lojas);

} catch (err) {
    console.error('❌ Erro ao abrir/ler banco:', err.message);
}
