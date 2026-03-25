import { createClient } from '@supabase/supabase-js';
import { db, DEFAULT_STORE_ID, checkVersionAndReset } from './connection.js';
import { envConfig } from '../electron-env.config.js';
import { BrowserWindow } from 'electron';
import { enableRealtimeSync } from './realtime.js';

/**
 * ☁️ Sync Config (Pull Configuration from Cloud)
 */
export async function syncConfig(lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;
    console.log(`☁️ [SyncConfig] Iniciando sincronização para loja: ${lojaId}...`);
    const stats = { users: 0, sellers: 0, scripts: 0, errors: [] };

    try {
        const client = getSupabaseClient(lojaId);
        if (!client) return { success: false, error: 'Supabase offline' };

        // 1. USUÁRIOS
        const { data: cloudUsers } = await client.from('usuarios').select('*').eq('loja_id', lojaId);
        if (cloudUsers) {
            db.transaction(() => {
                for (const u of cloudUsers) {
                    db.prepare(`
                        INSERT INTO usuarios(
                            username, password, role, reset_password, nome_completo, email,
                            whatsapp, avatar_url, ativo, permissions, session_id, created_by,
                            loja_id, cpf, em_fila, ultima_atribuicao, leads_recebidos_total, portais_permitidos
                        )
                        VALUES(
                            @username, @password, @role, @reset_password, @nome_completo, @email,
                            @whatsapp, @avatar_url, @ativo, @permissions, @session_id, @created_by,
                            @loja_id, @cpf, @em_fila, @ultima_atribuicao, @leads_rece_total, @portais
                        )
                        ON CONFLICT(username) DO UPDATE SET
                            password = excluded.password, role = excluded.role, reset_password = excluded.reset_password,
                            nome_completo = excluded.nome_completo, email = excluded.email, whatsapp = excluded.whatsapp,
                            avatar_url = excluded.avatar_url, ativo = excluded.ativo, permissions = excluded.permissions,
                            session_id = excluded.session_id, created_by = excluded.created_by, loja_id = excluded.loja_id,
                            cpf = excluded.cpf, em_fila = excluded.em_fila, ultima_atribuicao = excluded.ultima_atribuicao,
                            leads_recebidos_total = excluded.leads_recebidos_total, portais_permitidos = excluded.portais_permitidos
                    `).run({
                        username: u.username,
                        password: u.password_hash || u.password,
                        role: u.role,
                        reset_password: u.force_password_change ? 1 : (u.reset_password ? 1 : 0),
                        nome_completo: u.nome_completo || '',
                        email: u.email || '',
                        whatsapp: u.whatsapp || '',
                        avatar_url: u.avatar_url || '',
                        ativo: (u.ativo === true || u.ativo === 1) ? 1 : 0,
                        permissions: typeof u.permissions === 'string' ? u.permissions : JSON.stringify(u.permissions || []),
                        session_id: u.session_id || '',
                        created_by: u.created_by || '',
                        loja_id: u.loja_id || DEFAULT_STORE_ID,
                        cpf: u.cpf || null,
                        em_fila: u.em_fila ? 1 : 0,
                        ultima_atribuicao: u.ultima_atribuicao || null,
                        leads_rece_total: u.leads_recebidos_total || 0,
                        portais: typeof u.portais_permitidos === 'string' ? u.portais_permitidos : JSON.stringify(u.portais_permitidos || [])
                    });
                }
            })();
            stats.users = cloudUsers.length;
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        }

        // 2. LOJA
        const { data: cloudLoja } = await client.from('lojas').select('*').eq('id', lojaId).single();
        if (cloudLoja) {
            db.prepare(`
                INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                VALUES(?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                nome = excluded.nome, endereco = excluded.endereco, logo_url = excluded.logo_url,
                slug = excluded.slug, modulos = excluded.modulos, ativo = excluded.ativo
            `).run(cloudLoja.id, cloudLoja.nome, cloudLoja.endereco || '', cloudLoja.logo_url || '', cloudLoja.slug || cloudLoja.id, cloudLoja.modulos || '[]', cloudLoja.ativo ? 1 : 0);
        }

        // 3. VENDEDORES
        const { data: cloudSellers } = await client.from('vendedores').select('*').eq('loja_id', lojaId);
        if (cloudSellers && cloudSellers.length > 0) {
            db.transaction(() => {
                for (const s of cloudSellers) {
                    db.prepare(`
                        INSERT OR REPLACE INTO vendedores(nome, sobrenome, telefone, email, foto_url, ativo, loja_id)
                        VALUES(@nome, @sobrenome, @telefone, @email, @foto_url, @ativo, @loja_id)
                    `).run({
                        nome: s.nome,
                        sobrenome: s.sobrenome || '',
                        telefone: s.telefone || '',
                        email: s.email || '',
                        foto_url: s.foto_url || '',
                        ativo: s.ativo ? 1 : 0,
                        loja_id: s.loja_id || DEFAULT_STORE_ID
                    });
                }
            })();
            stats.sellers = cloudSellers.length;
        }

        // 4. SCRIPTS
        const { data: cloudScripts } = await client.from('scripts').select('*').eq('loja_id', lojaId);
        if (cloudScripts && cloudScripts.length > 0) {
            db.transaction(() => {
                for (const s of cloudScripts) {
                    db.prepare(`
                        INSERT OR REPLACE INTO scripts(id, titulo, mensagem, is_system, link, username, ordem, loja_id)
                        VALUES(@id, @titulo, @mensagem, @is_system, @link, @username, @ordem, @loja_id)
                    `).run({ ...s, is_system: s.is_system ? 1 : 0 });
                }
            })();
            stats.scripts = cloudScripts.length;
        }

        // Finaliza
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'all'));
        return { success: true, stats };
    } catch (err) {
        console.error('[SyncConfig] Erro:', err);
        return { success: false, error: err.message };
    }
}

/**
 * 🔄 Sync Hybrid Logic (API Real-time + XML Fallback / Inventory Sync)
 */
export async function syncXml(lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;
    
    // 🔥 Lógica de Reset de Versão (Garante integridade)
    checkVersionAndReset();

    // 🔥 SYNC CONFIG FIRST
    await syncConfig(lojaId);

    // 🔥 REALTIME SYNC
    enableRealtimeSync(lojaId);

    try {
        const client = getSupabaseClient(lojaId);
        if (!client) return { success: false, message: 'Supabase não disponível' };

        console.log(`[SupabaseSync] Buscando estoque para loja: ${lojaId}...`);
        const { data: cloudEstoque, error: ceErr } = await client.from('estoque').select('*').eq('loja_id', lojaId);

        if (ceErr) throw ceErr;

        if (cloudEstoque && cloudEstoque.length > 0) {
            db.transaction((items) => {
                db.prepare("DELETE FROM estoque WHERE loja_id = ?").run(lojaId);
                const stmt = db.prepare(`
                    INSERT INTO estoque(id, loja_id, nome, foto, fotos, link, km, cambio, ano, valor, ativo, placa)
                    VALUES(@id, @loja_id, @nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo, @placa)
                `);
                for (const v of items) {
                    stmt.run({
                        ...v,
                        loja_id: v.loja_id || lojaId,
                        foto: v.foto || v.foto_url || '/placeholder.png',
                        fotos: typeof v.fotos === 'string' ? v.fotos : JSON.stringify(v.fotos || []),
                        ativo: v.ativo ? 1 : 0,
                        placa: v.placa || ''
                    });
                }
            })(cloudEstoque);

            console.log(`✅ [SupabaseSync] Sincronizado: ${cloudEstoque.length} veículos.`);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'estoque'));
            return { success: true, message: `Sincronizado: ${cloudEstoque.length} veículos.` };
        }

        return { success: true, message: 'Nenhum veículo novo na nuvem.' };
    } catch (e) {
        console.error("[SupabaseSync] Erro:", e);
        return { success: false, message: e.message };
    }
}


const SUPABASE_CONFIG = {
    url: envConfig.supabaseUrl,
    key: envConfig.supabaseAnonKey
};

const supabaseClients = new Map();

/**
 * Obtém o cliente Supabase correto para uma determinada loja.
 */
export function getSupabaseClient(lojaId = null) {
    const id = lojaId || DEFAULT_STORE_ID;
    if (supabaseClients.has(id)) return supabaseClients.get(id);

    try {
        const store = db.prepare("SELECT supabase_url, supabase_anon_key FROM lojas WHERE id = ?").get(id);
        if (store && store.supabase_url && store.supabase_anon_key) {
            const client = createClient(store.supabase_url, store.supabase_anon_key);
            supabaseClients.set(id, client);
            return client;
        }
    } catch (e) {}

    if (!supabaseClients.has('default')) {
        supabaseClients.set('default', createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key));
    }
    return supabaseClients.get('default');
}

/**
 * Proteção global para garantir loja_id nos dados.
 */
export const safeSupabaseUpsert = async (table, data, lojaId, options = {}) => {
    const client = getSupabaseClient(lojaId);
    if (!client) return { data: null, error: new Error('Supabase não disponível') };

    const currentLojaId = lojaId || DEFAULT_STORE_ID;
    const safeData = Array.isArray(data)
        ? data.map(item => ({ ...item, loja_id: item.loja_id || currentLojaId }))
        : { ...data, loja_id: data.loja_id || currentLojaId };

    return await client.from(table).upsert(safeData, options);
};

const recentlySavedVisitas = new Set();
export function markVisitaSaved(id) {
    recentlySavedVisitas.add(String(id));
    setTimeout(() => recentlySavedVisitas.delete(String(id)), 30000);
}
export function isVisitaRecentlySaved(id) {
    return recentlySavedVisitas.has(String(id));
}

/**
 * Sincronização Completa (Startup Sync)
 */
export async function fullCloudSync(lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;
    console.log(`🚀 [Startup Sync] Iniciando sincronização massiva para: ${lojaId}...`);

    const startTime = Date.now();
    const tables = ['lojas', 'usuarios', 'vendedores', 'portais', 'scripts', 'estoque', 'crm_settings', 'visitas'];
    const results = { success: true, tables: {}, duration: 0 };

    try {
        const client = getSupabaseClient(lojaId);
        if (!client) throw new Error("Supabase Client não disponível");

        for (const table of tables) {
            try {
                let query = client.from(table).select('*');
                if (table !== 'lojas') query = query.eq('loja_id', lojaId);

                const { data, error } = await query;
                if (error) {
                    results.tables[table] = { success: false, error: error.message };
                    continue;
                }

                if (data && data.length > 0) {
                    db.transaction(() => {
                        for (const item of data) {
                            if (table === 'usuarios') {
                                db.prepare(`
                                    INSERT INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, avatar_url, ativo, permissions, session_id, created_by, loja_id)
                                    VALUES(@username, @password, @role, @reset_password, @nome_completo, @email, @whatsapp, @avatar_url, @ativo, @permissions, @session_id, @created_by, @loja_id)
                                    ON CONFLICT(username) DO UPDATE SET
                                        password = excluded.password, role = excluded.role, reset_password = excluded.reset_password,
                                        nome_completo = excluded.nome_completo, email = excluded.email, whatsapp = excluded.whatsapp,
                                        avatar_url = excluded.avatar_url, ativo = excluded.ativo, permissions = excluded.permissions,
                                        session_id = excluded.session_id, created_by = excluded.created_by, loja_id = excluded.loja_id
                                `).run({
                                    username: item.username,
                                    password: item.password_hash || item.password,
                                    role: item.role,
                                    reset_password: item.force_password_change ? 1 : 0,
                                    nome_completo: item.nome_completo || '',
                                    email: item.email || '',
                                    whatsapp: item.whatsapp || '',
                                    avatar_url: item.avatar_url || '',
                                    ativo: item.ativo ? 1 : 0,
                                    permissions: item.permissions || '[]',
                                    session_id: item.session_id || '',
                                    created_by: item.created_by || '',
                                    loja_id: item.loja_id || DEFAULT_STORE_ID
                                });
                            } else if (table === 'lojas') {
                                db.prepare(`
                                    INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                                    VALUES(?, ?, ?, ?, ?, ?, ?)
                                    ON CONFLICT(id) DO UPDATE SET
                                        nome = excluded.nome, endereco = excluded.endereco, logo_url = excluded.logo_url,
                                        slug = excluded.slug, modulos = excluded.modulos, ativo = excluded.ativo
                                `).run(item.id, item.nome, item.endereco || '', item.logo_url || '', item.slug || item.id, item.modulos || '[]', item.ativo ? 1 : 0);
                            } else if (table === 'vendedores') {
                                db.prepare(`
                                    INSERT OR REPLACE INTO vendedores(nome, sobrenome, telefone, email, foto_url, ativo, loja_id)
                                    VALUES(@nome, @sobrenome, @telefone, @email, @foto_url, @ativo, @loja_id)
                                `).run({
                                    nome: item.nome,
                                    sobrenome: item.sobrenome || '',
                                    telefone: item.telefone || '',
                                    email: item.email || '',
                                    foto_url: item.foto_url || '',
                                    ativo: item.ativo ? 1 : 0,
                                    loja_id: item.loja_id || DEFAULT_STORE_ID
                                });
                            } else if (table === 'portais') {
                                db.prepare(`
                                    INSERT OR REPLACE INTO portais(nome, link, ativo, loja_id)
                                    VALUES(@nome, @link, @ativo, @loja_id)
                                `).run({
                                    nome: item.nome,
                                    link: item.link || '',
                                    ativo: item.ativo ? 1 : 0,
                                    loja_id: item.loja_id || DEFAULT_STORE_ID
                                });
                            } else if (table === 'scripts') {
                                db.prepare(`
                                    INSERT OR REPLACE INTO scripts(id, titulo, mensagem, is_system, link, username, ordem, loja_id)
                                    VALUES(@id, @titulo, @mensagem, @is_system, @link, @username, @ordem, @loja_id)
                                `).run({
                                    id: item.id,
                                    titulo: item.titulo || item.nome || '',
                                    mensagem: item.mensagem || item.texto || '',
                                    is_system: item.is_system ? 1 : 0,
                                    link: item.link || '',
                                    username: item.username || '',
                                    ordem: item.ordem || 0,
                                    loja_id: item.loja_id || DEFAULT_STORE_ID
                                });
                            } else if (table === 'estoque') {
                                db.prepare(`
                                    INSERT OR REPLACE INTO estoque(id, loja_id, nome, foto, fotos, link, km, cambio, ano, valor, ativo)
                                    VALUES(@id, @loja_id, @nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo)
                                `).run({
                                    id: item.id,
                                    loja_id: item.loja_id || DEFAULT_STORE_ID,
                                    nome: item.nome || '',
                                    foto: item.foto || item.foto_url || '',
                                    fotos: typeof item.fotos === 'string' ? item.fotos : JSON.stringify(item.fotos || []),
                                    link: item.link || '',
                                    km: item.km || '',
                                    cambio: item.cambio || '',
                                    ano: item.ano || '',
                                    valor: item.valor || item.preco || '',
                                    ativo: item.ativo ? 1 : 0
                                });
                            } else if (table === 'crm_settings') {
                                db.prepare(`
                                    INSERT OR REPLACE INTO crm_settings(key, value, updated_at, loja_id)
                                    VALUES(@key, @value, @updated_at, @loja_id)
                                `).run({
                                    key: item.key,
                                    value: item.value || '',
                                    updated_at: item.updated_at || new Date().toISOString(),
                                    loja_id: item.loja_id || DEFAULT_STORE_ID
                                });
                            } else if (table === 'visitas') {
                                db.prepare(`
                                    INSERT INTO visitas(
                                        id, loja_id, datahora, mes, cliente, telefone, portal, 
                                        veiculo_interesse, veiculo_id, foto_veiculo, veiculo_troca, 
                                        vendedor, vendedor_sdr, negociacao, data_agendamento, 
                                        temperatura, motivo_perda, detalhes_perda, forma_pagamento, 
                                        status_pipeline, valor_proposta, cpf_cliente, historico_log, 
                                        status, visitou_loja, nao_compareceu, created_at, updated_at
                                    ) 
                                    VALUES(
                                        @id, @loja_id, @datahora, @mes, @cliente, @telefone, @portal, 
                                        @veiculo_interesse, @veiculo_id, @foto_veiculo, @veiculo_troca, 
                                        @vendedor, @vendedor_sdr, @negociacao, @data_agendamento, 
                                        @temperatura, @motivo_perda, @detalhes_perda, @forma_pagamento, 
                                        @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log, 
                                        @status, @visitou_loja, @nao_compareceu, @created_at, @updated_at
                                    )
                                    ON CONFLICT(id) DO UPDATE SET
                                        loja_id = excluded.loja_id, datahora = excluded.datahora, mes = excluded.mes,
                                        cliente = excluded.cliente, telefone = excluded.telefone, portal = excluded.portal,
                                        veiculo_interesse = excluded.veiculo_interesse, veiculo_id = excluded.veiculo_id,
                                        foto_veiculo = excluded.foto_veiculo, veiculo_troca = excluded.veiculo_troca,
                                        vendedor = excluded.vendedor, vendedor_sdr = excluded.vendedor_sdr,
                                        negociacao = excluded.negociacao, data_agendamento = excluded.data_agendamento,
                                        temperatura = excluded.temperatura, motivo_perda = excluded.motivo_perda,
                                        detalhes_perda = excluded.detalhes_perda, forma_pagamento = excluded.forma_pagamento,
                                        status_pipeline = excluded.status_pipeline, valor_proposta = excluded.valor_proposta,
                                        cpf_cliente = excluded.cpf_cliente, historico_log = excluded.historico_log,
                                        status = excluded.status, visitou_loja = excluded.visitou_loja,
                                        nao_compareceu = excluded.nao_compareceu, created_at = excluded.created_at,
                                        updated_at = excluded.updated_at
                                `).run({
                                    id: item.id,
                                    loja_id: item.loja_id || DEFAULT_STORE_ID,
                                    datahora: item.datahora || '',
                                    mes: item.mes || 0,
                                    cliente: item.cliente || '',
                                    telefone: item.telefone || '',
                                    portal: item.portal || '',
                                    veiculo_interesse: item.veiculo_interesse || '',
                                    veiculo_id: item.veiculo_id || null,
                                    foto_veiculo: item.foto_veiculo || null,
                                    veiculo_troca: item.veiculo_troca || '',
                                    vendedor: item.vendedor || '',
                                    vendedor_sdr: item.vendedor_sdr || '',
                                    negociacao: item.negociacao || '',
                                    data_agendamento: item.data_agendamento || null,
                                    temperatura: item.temperatura || null,
                                    motivo_perda: item.motivo_perda || null,
                                    detalhes_perda: item.detalhes_perda || null,
                                    forma_pagamento: item.forma_pagamento || null,
                                    status_pipeline: item.status_pipeline || '',
                                    valor_proposta: item.valor_proposta || '',
                                    cpf_cliente: item.cpf_cliente || null,
                                    historico_log: item.historico_log || '',
                                    status: item.status || 'Pendente',
                                    visitou_loja: item.visitou_loja ? 1 : 0,
                                    nao_compareceu: item.nao_compareceu ? 1 : 0,
                                    created_at: item.created_at || null,
                                    updated_at: item.updated_at || null
                                });
                            }
                        }
                    })();
                    results.tables[table] = { success: true, count: data.length };
                } else {
                    results.tables[table] = { success: true, count: 0 };
                }
            } catch (err) {
                results.tables[table] = { success: false, error: err.message };
            }
        }
        results.duration = Date.now() - startTime;
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'all'));
        return results;
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Sincronização de Itens (Generic Sync)
 */
export async function syncTable(table, lojaId = DEFAULT_STORE_ID) {
    try {
        const client = getSupabaseClient(lojaId);
        if (!client) return { success: false, error: 'Supabase não disponível' };
        
        const { data, error } = await client.from(table).select('*').eq('loja_id', lojaId);
        if (error) throw error;
        
        // Inserção genérica (placeholder - cada tabela tem sua lógica no fullCloudSync)
        return { success: true, count: data?.length || 0 };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
