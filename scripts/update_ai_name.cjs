const Database = require('better-sqlite3');
const path = require('path');

// Caminho do banco de dados (ajustado para o padrão do app)
const dbPath = path.join(__dirname, '..', 'sistema_visitas.db');
const db = new Database(dbPath);

console.log('🔄 Atualizando identidade da IA para IRW Motors...');

try {
    const newPrompt = "Você é o Agente IA da IRW Motors, consultor comercial especializado em atendimento de alta performance em Brasília. Seu objetivo é ajudar o cliente a encontrar o veículo ideal, sendo sempre educado, prestativo e focado na conversão para visita presencial.";

    // Atualiza o system_prompt na tabela crm_settings
    const result = db.prepare("UPDATE crm_settings SET value = ? WHERE key = 'system_prompt'").run(newPrompt);

    // Também atualiza o sales_prompt se existir
    db.prepare("UPDATE crm_settings SET value = ? WHERE key = 'sales_prompt'").run(newPrompt);

    if (result.changes > 0) {
        console.log('✅ Identidade atualizada com sucesso no banco local!');
        console.log('🚀 A mudança será sincronizada automaticamente com a nuvem se o App estiver aberto.');
    } else {
        // Se não existir, insere
        db.prepare("INSERT INTO crm_settings (category, key, value, updated_at) VALUES ('diego_ai', 'system_prompt', ?, datetime('now'))").run(newPrompt);
        console.log('✅ Nova identidade inserida com sucesso!');
    }
} catch (err) {
    console.error('❌ Erro ao atualizar banco:', err.message);
} finally {
    db.close();
}
