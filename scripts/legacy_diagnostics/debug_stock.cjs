const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'sdr-irw-motors');
const dbPath = path.join(appDataPath, 'sistema_visitas.db');

console.log('📍 Database Path:', dbPath);
console.log('═══════════════════════════════════════════════════════\n');

try {
    const db = new Database(dbPath, { readonly: true });

    // 1. Verificar lojas disponíveis
    console.log('🏪 LOJAS CADASTRADAS:');
    const lojas = db.prepare('SELECT * FROM lojas').all();
    console.table(lojas);

    // 2. Verificar estoque por loja
    console.log('\n📦 ESTOQUE POR LOJA:');
    const stockByStore = db.prepare(`
        SELECT loja_id, COUNT(*) as total, 
               SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) as ativos
        FROM estoque 
        GROUP BY loja_id
    `).all();
    console.table(stockByStore);

    // 3. Verificar alguns veículos de exemplo
    console.log('\n🚗 PRIMEIROS 5 VEÍCULOS (SAMPLE):');
    const sampleVehicles = db.prepare(`
        SELECT id, loja_id, nome, ativo, valor 
        FROM estoque 
        LIMIT 5
    `).all();
    console.table(sampleVehicles);

    // 4. Verificar se há veículos sem loja_id
    console.log('\n⚠️  VEÍCULOS SEM LOJA_ID:');
    const orphanVehicles = db.prepare(`
        SELECT COUNT(*) as total 
        FROM estoque 
        WHERE loja_id IS NULL
    `).get();
    console.log(`Total: ${orphanVehicles.total}`);

    // 5. Verificar localStorage (simulado - mostra qual loja está ativa)
    console.log('\n💾 VERIFICAÇÃO DE CONTEXTO:');
    console.log('Para saber qual loja está selecionada, verifique o localStorage no navegador:');
    console.log('  - Abra DevTools (F12)');
    console.log('  - Console > localStorage.getItem("active_loja_id")');

    db.close();
    console.log('\n✅ Diagnóstico concluído!');

} catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error('\nPossíveis causas:');
    console.error('  1. Banco de dados não existe ainda');
    console.error('  2. Aplicação não foi executada');
    console.error('  3. Caminho incorreto');
}
