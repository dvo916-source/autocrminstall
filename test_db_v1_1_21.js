
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// Tenta localizar o banco de dados no AppData do usuário
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'VexCORE', 'sistema_visitas.db');
const db = new Database(dbPath);

console.log('🔍 Iniciando Testes de Banco de Dados (v1.1.21)...');

try {
    // 1. Verificar Versão Atual
    const versionRow = db.prepare("SELECT valor FROM config WHERE chave = 'internal_db_version' AND loja_id = 'SYSTEM'").get();
    console.log('Versão no Banco:', versionRow ? versionRow.valor : 'Não encontrada');

    // 2. Testar Filtro de Lojas e Módulos (Simulação)
    const loja = db.prepare("SELECT * FROM lojas LIMIT 1").get();
    if (loja) {
        console.log(`Loja Detectada: ${loja.id} (Ativo: ${loja.ativo})`);
        console.log(`Módulos Ativos: ${loja.modulos}`);
    } else {
        console.log('⚠️ Nenhuma loja encontrada no banco local.');
    }

    // 3. Testar Quantidade de Usuários
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM usuarios").get();
    console.log(`Total de Usuários Locais: ${usersCount.count}`);

} catch (err) {
    console.error('❌ Erro no teste:', err.message);
} finally {
    db.close();
}
