import { db, DEFAULT_STORE_ID } from './connection.js';
import { getSupabaseClient, markVisitaSaved } from './sync.js';
import { BrowserWindow } from 'electron';

export function getVisitas(userRole = 'vendedor', username = null, lojaId = DEFAULT_STORE_ID) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    return db.prepare(`SELECT * FROM visitas WHERE loja_id = ? ORDER BY COALESCE(data_agendamento, NULLIF(datahora, '')) DESC, id DESC LIMIT 2000`).all(activeLojaId);
}

export async function addVisita(visita) {
    if (!visita.datahora) visita.datahora = new Date().toISOString();
    if (!visita.mes) visita.mes = new Date(visita.datahora).getMonth() + 1;

    const portalNormalizado = (visita.portal || '').toUpperCase();
    const lojaId = visita.loja_id || DEFAULT_STORE_ID;

    // Distribuição Automática (Round Robin)
    if (!visita.vendedor_sdr && !visita.vendedor && portalNormalizado !== 'TRÁFEGO PAGO') {
        try {
            const candidatos = db.prepare("SELECT username, portais_permitidos FROM usuarios WHERE loja_id = ? AND em_fila = 1 AND ativo = 1").all(lojaId);
            const validos = candidatos.filter(v => {
                const p = JSON.parse(v.portais_permitidos || '[]');
                return p.length === 0 || p.includes(portalNormalizado);
            });
            if (validos.length > 0) {
                const nextUser = db.prepare(`SELECT username FROM usuarios WHERE username IN (${validos.map(v => `'${v.username}'`).join(',')}) ORDER BY ultima_atribuicao ASC NULLS FIRST, username ASC LIMIT 1`).get();
                if (nextUser) {
                    visita.vendedor_sdr = nextUser.username;
                    const now = new Date().toISOString();
                    db.prepare("UPDATE usuarios SET ultima_atribuicao = ?, leads_recebidos_total = leads_recebidos_total + 1 WHERE username = ?").run(now, nextUser.username);
                }
            }
        } catch (e) { console.error("Erro na distribuição:", e); }
    }

    const stmt = db.prepare(`
        INSERT INTO visitas(mes, datahora, cliente, telefone, portal, veiculo_interesse, veiculo_id, foto_veiculo, veiculo_troca, vendedor, vendedor_sdr, negociacao, status, data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline, valor_proposta, cpf_cliente, historico_log, loja_id, created_at)
        VALUES(@mes, @datahora, @cliente, @telefone, @portal, @veiculo_interesse, @veiculo_id, @foto_veiculo, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, 'Pendente', @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log, @loja_id, datetime('now', 'localtime'))
    `);
    const result = stmt.run({ ...visita, foto_veiculo: visita.foto_veiculo || null });
    const id = result.lastInsertRowid;

    // SYNC SUPABASE
    try {
        const client = getSupabaseClient(lojaId);
        if (client) {
            await client.from('visitas').insert([{ ...visita, id, loja_id: lojaId, status: 'Pendente' }]);
        }
    } catch (e) {}

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
    return result;
}

export async function updateVisitaFull(visita) {
    const now = new Date().toISOString();
    const payload = { ...visita, updated_at: now, veiculo_id: visita.veiculo_id || null, foto_veiculo: visita.foto_veiculo || null };
    
    db.prepare(`
        UPDATE visitas SET
            cliente = @cliente, telefone = @telefone, portal = @portal, veiculo_interesse = @veiculo_interesse,
            veiculo_id = @veiculo_id, foto_veiculo = @foto_veiculo, veiculo_troca = @veiculo_troca,
            vendedor = @vendedor, vendedor_sdr = @vendedor_sdr, negociacao = @negociacao,
            data_agendamento = @data_agendamento, temperatura = @temperatura, status_pipeline = @status_pipeline,
            forma_pagamento = @forma_pagamento, valor_proposta = @valor_proposta, historico_log = @historico_log,
            motivo_perda = @motivo_perda, status = @status, loja_id = @loja_id, cpf_cliente = @cpf_cliente, updated_at = @updated_at
        WHERE id = @id
    `).run(payload);

    markVisitaSaved(visita.id);
    const client = getSupabaseClient(visita.loja_id);
    if (client) {
        const { id, ...supabaseData } = payload;
        await client.from('visitas').update(supabaseData).eq('id', id);
    }

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
    return { success: true };
}

export async function updateVisitaStatusQuick({ id, status, pipeline, motivo_perda, detalhes_perda, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    let query = `UPDATE visitas SET status = ?, status_pipeline = ?, updated_at = ?`;
    const params = [status, pipeline, now];

    if (motivo_perda !== undefined) { query += `, motivo_perda = ?`; params.push(motivo_perda); }
    if (detalhes_perda !== undefined) { query += `, detalhes_perda = ?`; params.push(detalhes_perda); }
    query += ` WHERE id = ?`;
    params.push(id);

    db.prepare(query).run(...params);
    markVisitaSaved(id);
    const client = getSupabaseClient(activeLojaId);
    if (client) {
        const up = { status, status_pipeline: pipeline, updated_at: now };
        if (motivo_perda !== undefined) up.motivo_perda = motivo_perda;
        if (detalhes_perda !== undefined) up.detalhes_perda = detalhes_perda;
        await client.from('visitas').update(up).eq('id', id);
    }
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
}

export async function updateVisitaVisitouLoja({ id, valor, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    const query = valor 
        ? `UPDATE visitas SET visitou_loja = 1, nao_compareceu = 0, updated_at = ? WHERE id = ?`
        : `UPDATE visitas SET visitou_loja = 0, updated_at = ? WHERE id = ?`;
    
    db.prepare(query).run(now, id);
    markVisitaSaved(id);
    const client = getSupabaseClient(activeLojaId);
    if (client) {
        const up = { visitou_loja: valor ? 1 : 0, updated_at: now };
        if (valor) up.nao_compareceu = 0;
        await client.from('visitas').update(up).eq('id', id);
    }
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
}

export async function updateVisitaNaoCompareceu({ id, valor, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    db.prepare(`UPDATE visitas SET nao_compareceu = ?, visitou_loja = 0, updated_at = ? WHERE id = ?`).run(valor ? 1 : 0, now, id);
    markVisitaSaved(id);
    const client = getSupabaseClient(activeLojaId);
    if (client) await client.from('visitas').update({ nao_compareceu: valor ? 1 : 0, visitou_loja: 0, updated_at: now }).eq('id', id);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
}

export async function deleteVisita(id, lojaId = DEFAULT_STORE_ID) {
    db.prepare('DELETE FROM visitas WHERE id = ? AND loja_id = ?').run(id, lojaId);
    const client = getSupabaseClient(lojaId);
    if (client) await client.from('visitas').delete().eq('id', id).eq('loja_id', lojaId);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
}

export function getAgendamentosDetalhes(username = null, lojaId = DEFAULT_STORE_ID) {
    let query = `SELECT * FROM visitas WHERE loja_id = ?`;
    const params = [lojaId];
    if (username) {
        query += " AND (vendedor_sdr = ? COLLATE NOCASE OR vendedor = ? COLLATE NOCASE)";
        params.push(username, username);
    }
    query += " ORDER BY data_agendamento DESC, datahora DESC LIMIT 500";
    return db.prepare(query).all(params);
}

export function getAgendamentosPorUsuario(lojaId = DEFAULT_STORE_ID) {
    const currentMonth = new Date().getMonth() + 1;
    return db.prepare(`
        SELECT u.username as nome, u.nome_completo, u.role, u.ativo,
        (SELECT COUNT(*) FROM visitas v WHERE v.vendedor_sdr = u.username AND v.loja_id = ? AND v.mes = ?) as total,
        (SELECT COUNT(*) FROM visitas v WHERE v.vendedor_sdr = u.username AND v.loja_id = ? AND v.mes = ? AND (LOWER(v.status_pipeline) IN ('venda concluída', 'vendido') OR LOWER(v.status) IN ('venda concluída', 'vendido'))) as sales_month
        FROM usuarios u WHERE u.role IN ('sdr', 'vendedor', 'admin') AND u.username != 'diego' COLLATE NOCASE AND u.loja_id = ? ORDER BY total DESC
    `).all(lojaId, currentMonth, lojaId, currentMonth, lojaId);
}
