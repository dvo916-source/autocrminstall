import Database from 'better-sqlite3';
import path from 'path';

// Adjust path as needed
const dbPath = 'C:\\Users\\Windows 11\\AppData\\Roaming\\VexCORE\\sistema_visitas.db';
let db;

try {
    db = new Database(dbPath);
    console.log('✅ Connected to DB:', dbPath);
} catch (e) {
    console.error('❌ Failed to connect:', e.message);
    process.exit(1);
}

const lojaId = 'irw-motors-main';

try {
    // 1. Count before
    const beforeCount = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE loja_id = ?").get(lojaId).c;
    console.log('📊 Count before:', beforeCount);

    // 2. Insert
    const now = new Date();
    // Simulate what NewVisitModal sends
    const visita = {
        mes: now.getMonth() + 1,
        datahora: now.toUTCString(), // Just to be different, but typically ISO
        cliente: 'TESTE AUTOMATICO ' + now.getTime(),
        telefone: '11999999999',
        portal: 'Olx',
        veiculo_interesse: 'TESTE CAR',
        veiculo_troca: '',
        vendedor: 'VEX',
        vendedor_sdr: 'VEX',
        negociacao: 'Teste de insercao via script',
        status: 'Pendente',
        data_agendamento: now.toISOString(), // Standard ISO
        temperatura: 'Morno',
        motivo_perda: '',
        forma_pagamento: '',
        status_pipeline: 'Agendado',
        valor_proposta: 0,
        cpf_cliente: '',
        historico_log: '',
        loja_id: lojaId
    };

    const stmt = db.prepare(`
        INSERT INTO visitas(
            mes, datahora, cliente, telefone, portal,
            veiculo_interesse, veiculo_troca, vendedor, vendedor_sdr, negociacao,
            status, data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline, valor_proposta, cpf_cliente, historico_log, loja_id
        )
        VALUES(
            @mes, @datahora, @cliente, @telefone, @portal,
            @veiculo_interesse, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao,
            'Pendente', @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento,
            @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log, @loja_id
        )
    `);

    const result = stmt.run(visita);
    console.log('✅ Insert result:', result);

    // 3. Count after
    const afterCount = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE loja_id = ?").get(lojaId).c;
    console.log('📊 Count after:', afterCount);

    // 4. Verify getVisitas logic
    const query = `
        SELECT * FROM visitas 
        WHERE loja_id = ? 
        ORDER BY COALESCE(data_agendamento, NULLIF(datahora, '')) DESC, id DESC 
        LIMIT 5
    `;
    const rows = db.prepare(query).all(lojaId);
    console.log('\n🔎 Top 5 visits (looking for TESTE AUTOMATICO):');
    rows.forEach(r => console.log(`[${r.id}] ${r.cliente} - ${r.data_agendamento}`));

} catch (err) {
    console.error('❌ Error:', err);
}
