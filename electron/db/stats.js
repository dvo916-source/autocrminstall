import { db, DEFAULT_STORE_ID } from './connection.js';

export function getStats(options = {}) {
    let days = options.days || 30;
    let month = options.month;
    let year = options.year;
    let lojaId = options.lojaId || DEFAULT_STORE_ID;
    
    // Suporte legado
    if (typeof options === 'number') { days = options; lojaId = arguments[1] || DEFAULT_STORE_ID; }
    const activeLojaId = lojaId || DEFAULT_STORE_ID;

    let startDate, endDate, chartDays = days;
    if (month && year) {
        const dStart = new Date(year, month - 1, 1);
        const dEnd = new Date(year, month, 0);
        startDate = dStart.toISOString().split('T')[0] + ' 00:00:00';
        endDate = dEnd.toISOString().split('T')[0] + ' 23:59:59';
        chartDays = dEnd.getDate();
    } else {
        const dStart = new Date(); dStart.setDate(dStart.getDate() - days); dStart.setHours(0, 0, 0, 0);
        startDate = dStart.toISOString(); endDate = new Date().toISOString();
    }

    const leadsTotal = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;
    const leadsAtendidos = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE vendedor IS NOT NULL AND vendedor != '' AND datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;
    const leadsAgendados = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE data_agendamento IS NOT NULL AND data_agendamento != '' AND datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;
    const leadsVendidos = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE status IN ('Ganho', 'Vendido', 'Venda Concluída') AND datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;

    const leadsPorPortal = db.prepare(`SELECT portal as name, COUNT(*) as value, SUM(CASE WHEN status IN ('Ganho', 'Vendido', 'Venda Concluída') THEN 1 ELSE 0 END) as sales FROM visitas WHERE portal IS NOT NULL AND portal != '' AND datahora >= ? AND datahora <= ? AND loja_id = ? GROUP BY portal ORDER BY value DESC`).all(startDate, endDate, activeLojaId);

    // Gráfico
    const visitasPorDay = db.prepare("SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total FROM visitas WHERE datahora >= ? AND datahora <= ? AND loja_id = ? GROUP BY dia").all(startDate, endDate, activeLojaId);
    const vendasPorDay = db.prepare("SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total FROM visitas WHERE status IN ('Ganho', 'Vendido', 'Venda Concluída') AND datahora >= ? AND datahora <= ? AND loja_id = ? GROUP BY dia").all(startDate, endDate, activeLojaId);
    
    const chartData = [];
    for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        chartData.push({
            name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            leads: visitasPorDay.find(r => r.dia === dStr)?.total || 0,
            vendas: vendasPorDay.find(r => r.dia === dStr)?.total || 0
        });
    }

    return { leadsTotal, leadsAtendidos, leadsAgendados, leadsVendidos, leadsPorPortal, chartData };
}

export function getHomeSDRStats({ lojaId = DEFAULT_STORE_ID, month, year, username = null }) {
    try {
        const targetMonth = month || (new Date().getMonth() + 1);
        const targetYear = year || new Date().getFullYear();
        const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
        const params = [lojaId, monthStr];
        let userFilter = "";
        if (username) { userFilter = " AND (vendedor_sdr = ? OR vendedor = ?)"; params.push(username, username); }

        const visitas = db.prepare(`SELECT COUNT(*) as count FROM visitas WHERE loja_id = ? AND strftime('%Y-%m', COALESCE(data_agendamento, created_at, datahora)) = ? AND (visitou_loja = 1 OR status_pipeline IN ('Ganho', 'Vendido', 'Venda Concluída')) ${userFilter}`).get(...params)?.count || 0;
        const vendas = db.prepare(`SELECT COUNT(*) as count FROM visitas WHERE loja_id = ? AND strftime('%Y-%m', COALESCE(data_agendamento, created_at, datahora)) = ? AND (status_pipeline IN ('Ganho', 'Vendido', 'Venda Concluída')) ${userFilter}`).get(...params)?.count || 0;
        
        return { visitas, vendas };
    } catch (e) { return { visitas: 0, vendas: 0 }; }
}

export function getCompetitionData(lojaId = DEFAULT_STORE_ID) {
    const config = db.prepare("SELECT valor FROM config WHERE chave = 'active_campaign' AND loja_id = ?").get(lojaId);
    if (!config) return null;
    const campaign = JSON.parse(config.valor);
    if (!campaign.active) return null;

    let dateFilter = campaign.start_date ? `AND datahora >= '${campaign.start_date}'` : "";
    const ranking = db.prepare(`SELECT vendedor_sdr as name, COUNT(*) as visitas, SUM(CASE WHEN status IN ('Ganho', 'Vendido', 'Venda Concluída') THEN 1 ELSE 0 END) as vendas FROM visitas WHERE vendedor_sdr IS NOT NULL AND vendedor_sdr != '' ${dateFilter} GROUP BY vendedor_sdr`).all();

    return {
        campaign,
        leaderboard: ranking.map(r => ({
            name: r.name,
            visitas: r.visitas,
            vendas: r.vendas,
            progress: Math.round(((Math.min(r.visitas / campaign.goal_visits, 1) + Math.min(r.vendas / campaign.goal_sales, 1)) / 2) * 100),
            completed: r.visitas >= campaign.goal_visits && r.vendas >= campaign.goal_sales
        })).sort((a,b) => b.progress - a.progress)
    };
}

export function getConfigMeta(lojaId = DEFAULT_STORE_ID) {
    try {
        const metaVisitas = db.prepare("SELECT valor FROM config WHERE chave = 'meta_visitas_semanal' AND loja_id = ?").get(lojaId)?.valor || '0';
        const metaVendas = db.prepare("SELECT valor FROM config WHERE chave = 'meta_vendas_mensal' AND loja_id = ?").get(lojaId)?.valor || '0';
        return { visita_semanal: parseInt(metaVisitas), venda_mensal: parseInt(metaVendas) };
    } catch (e) { return { visita_semanal: 0, venda_mensal: 0 }; }
}

export function setConfigMeta(visita, venda, lojaId = DEFAULT_STORE_ID) {
    const stmt = db.prepare("INSERT INTO config (chave, valor, loja_id) VALUES (?, ?, ?) ON CONFLICT(chave, loja_id) DO UPDATE SET valor=excluded.valor");
    db.transaction(() => {
        stmt.run('meta_visitas_semanal', visita.toString(), lojaId);
        stmt.run('meta_vendas_mensal', venda.toString(), lojaId);
    })();
    return { success: true };
}

export function getConfig(key, lojaId = DEFAULT_STORE_ID) {
    const row = db.prepare("SELECT valor FROM config WHERE chave = ? AND loja_id = ?").get(key, lojaId);
    return row ? row.valor : null;
}

export function saveConfig(key, value, lojaId = DEFAULT_STORE_ID) {
    db.prepare("INSERT INTO config (chave, valor, loja_id) VALUES (?, ?, ?) ON CONFLICT(chave, loja_id) DO UPDATE SET valor=excluded.valor").run(key, value, lojaId);
    return { success: true };
}

export function getSdrPerformance(lojaId = DEFAULT_STORE_ID) {
    try {
        const now = new Date();
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate()+6); endOfWeek.setHours(23,59,59,999);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth()+1, 0); endOfMonth.setHours(23,59,59,999);

        const users = db.prepare("SELECT username FROM usuarios WHERE role IN ('vendedor', 'sdr') AND username != 'diego' COLLATE NOCASE AND loja_id = ?").all(lojaId);
        return users.map(u => ({
            username: u.username,
            visitas_semana: db.prepare("SELECT COUNT(*) as c FROM visitas WHERE vendedor_sdr = ? AND status_pipeline IN ('Agendado', 'Visita Realizada', 'Vendido', 'Proposta') AND data_agendamento BETWEEN ? AND ? AND loja_id = ?").get(u.username, startOfWeek.toISOString(), endOfWeek.toISOString(), lojaId).c,
            vendas_mes: db.prepare("SELECT COUNT(*) as c FROM visitas WHERE vendedor_sdr = ? AND status_pipeline = 'Vendido' AND data_agendamento BETWEEN ? AND ? AND loja_id = ?").get(u.username, startOfMonth.toISOString(), endOfMonth.toISOString(), lojaId).c
        })).sort((a,b) => b.vendas_mes - a.vendas_mes || b.visitas_semana - a.visitas_semana);
    } catch (e) { return []; }
}

export function getAllSettings(lojaId = DEFAULT_STORE_ID) {
    return db.prepare('SELECT key, value, category FROM crm_settings WHERE loja_id = ?').all(lojaId);
}

export async function saveSettingsBatch(settings, lojaId = DEFAULT_STORE_ID) {
    const updated_at = new Date().toISOString();
    const stmt = db.prepare("INSERT INTO crm_settings(key, value, category, updated_at, loja_id) VALUES(@key, @value, @category, @updated_at, @loja_id) ON CONFLICT(key, loja_id) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = excluded.updated_at");
    db.transaction((items) => {
        for (const i of items) stmt.run({ ...i, value: String(i.value || ''), category: i.category || 'default', updated_at, loja_id: lojaId });
    })(settings);
    return { success: true };
}
