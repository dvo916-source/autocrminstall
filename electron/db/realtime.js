import { db, DEFAULT_STORE_ID } from './connection.js';
import { getSupabaseClient, markVisitaSaved, isVisitaRecentlySaved } from './sync.js';
import { BrowserWindow } from 'electron';

let realtimeChannel = null;

export function enableRealtimeSync(lojaId = DEFAULT_STORE_ID) {
    if (realtimeChannel) realtimeChannel.unsubscribe();
    const client = getSupabaseClient(lojaId);
    if (!client) return;

    const filter = `loja_id=eq.${lojaId}`;
    console.log('🔄 [Realtime] Ativando para loja:', lojaId);

    realtimeChannel = client.channel(`db-changes-${lojaId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios', filter }, async (payload) => {
            const { new: n, old: o, eventType: t } = payload;
            try {
                if (t === 'DELETE' && o) db.prepare("DELETE FROM usuarios WHERE username = ?").run(o.username);
                else if (n && (t === 'INSERT' || t === 'UPDATE')) {
                    if (n.username === 'diego' || n.username === 'admin') return;
                    db.prepare(`
                        INSERT INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions, loja_id, cpf, em_fila, ultima_atribuicao, leads_recebidos_total, portais_permitidos)
                        VALUES(@username, @password, @role, @reset_password, @nome_completo, @email, @whatsapp, @ativo, @permissions, @loja_id, @cpf, @em_fila, @ultima_atribuicao, @leads_recebidos_total, @portais_permitidos)
                        ON CONFLICT(username) DO UPDATE SET password = excluded.password, role = excluded.role, reset_password = excluded.reset_password, nome_completo = excluded.nome_completo, email = excluded.email, whatsapp = excluded.whatsapp, ativo = excluded.ativo, permissions = excluded.permissions, loja_id = excluded.loja_id, cpf = excluded.cpf, em_fila = excluded.em_fila, ultima_atribuicao = excluded.ultima_atribuicao, leads_recebidos_total = excluded.leads_recebidos_total, portais_permitidos = excluded.portais_permitidos
                    `).run({
                        ...n,
                        password: n.password_hash || n.password,
                        reset_password: n.force_password_change ? 1 : (n.reset_password ? 1 : 0),
                        permissions: typeof n.permissions === 'string' ? n.permissions : JSON.stringify(n.permissions || []),
                        portais_permitidos: typeof n.portais_permitidos === 'string' ? n.portais_permitidos : JSON.stringify(n.portais_permitidos || []),
                        ativo: n.ativo ? 1 : 0, em_fila: n.em_fila ? 1 : 0
                    });
                }
                refreshUI('usuarios');
            } catch (e) { console.error("Realtime User Error:", e); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas', filter }, async (payload) => {
            const { new: n, old: o, eventType: t } = payload;
            if (n?.id && isVisitaRecentlySaved(n.id)) return;
            
            try {
                if (t === 'DELETE' && o) db.prepare("DELETE FROM visitas WHERE id = ?").run(o.id);
                else if (n && (t === 'INSERT' || t === 'UPDATE')) {
                    db.prepare(`
                        INSERT INTO visitas(id, datahora, mes, cliente, telefone, portal, veiculo_interesse, veiculo_id, foto_veiculo, veiculo_troca, vendedor, vendedor_sdr, negociacao, status, data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline, valor_proposta, cpf_cliente, historico_log, loja_id, created_at, updated_at)
                        VALUES(@id, @datahora, @mes, @cliente, @telefone, @portal, @veiculo_interesse, @veiculo_id, @foto_veiculo, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, @status, @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log, @loja_id, @created_at, @updated_at)
                        ON CONFLICT(id) DO UPDATE SET datahora = excluded.datahora, cliente = excluded.cliente, telefone = excluded.telefone, portal = excluded.portal, veiculo_interesse = excluded.veiculo_interesse, veiculo_id = excluded.veiculo_id, foto_veiculo = excluded.foto_veiculo, veiculo_troca = excluded.veiculo_troca, vendedor = excluded.vendedor, vendedor_sdr = excluded.vendedor_sdr, negociacao = excluded.negociacao, status = excluded.status, data_agendamento = excluded.data_agendamento, temperatura = excluded.temperatura, motivo_perda = excluded.motivo_perda, forma_pagamento = excluded.forma_pagamento, status_pipeline = excluded.status_pipeline, valor_proposta = excluded.valor_proposta, cpf_cliente = excluded.cpf_cliente, historico_log = excluded.historico_log, updated_at = excluded.updated_at
                    `).run({ ...n });
                }
                refreshUI('visitas');
            } catch (e) { console.error("Realtime Visita Error:", e); }
        })
        .subscribe();
}

function refreshUI(target = 'all') {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', target));
}
