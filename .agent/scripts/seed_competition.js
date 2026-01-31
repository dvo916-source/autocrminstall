import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sistema_visitas.db');
const db = new Database(dbPath);

console.log('🏆 Configurando Campanha de Vendas de Teste...');

const campaign = {
    active: true,
    title: "Corrida Semanal",
    prize: "R$ 300,00",
    goal_visits: 10,
    goal_sales: 3,
    start_date: new Date().toISOString().split('T')[0], // Começa hoje
    end_date: null // Sem fim definido (ou poderia ser semana que vem)
};

try {
    const stmt = db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor");
    stmt.run('active_campaign', JSON.stringify(campaign));
    console.log('✅ Campanha ativada com sucesso!');
    console.log('Exemplo:', campaign);
} catch (error) {
    console.error('❌ Erro ao configurar campanha:', error.message);
}
