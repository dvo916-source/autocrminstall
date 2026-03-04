// --- CAMADA DE DADOS (DATABASE LAYER) ---
// Este arquivo é responsável por persistir todas as informações do sistema.
// Ele utiliza um modelo HÍBRIDO:
// 1. SQLite (Local): Para velocidade máxima e funcionamento Offline.
// 2. Supabase (Nuvem): Para sincronização entre diferentes PCs e backup.

import Database from 'better-sqlite3'; // Driver de alta performance para SQLite
import path from 'path';
import { app, BrowserWindow } from 'electron';
import bcrypt from 'bcryptjs'; // Para criptografia de senhas
import { createClient } from '@supabase/supabase-js'; // Cliente Supabase
import { v4 as uuidv4 } from 'uuid'; // Para gerar IDs únicos
// 🔐 CONFIGURAÇÃO DE SEGURANÇA (SUPABASE)
// Prioriza o arquivo .env, mas mantém fallback para compatibilidade em máquinas novas sem .env.
const SUPABASE_CONFIG = {
    url: process.env.VITE_SUPABASE_URL || "https://mtbfzimnyactwhdonkgy.supabase.co",
    key: process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZESImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys"
};

// Log de diagnóstico de inicialização (Apenas no console do desenvolvedor)
if (!process.env.VITE_SUPABASE_URL) {
    console.warn('🛡️ [Segurança] Arquivo .env não detectado ou chaves ausentes. Usando fallback de compatibilidade.');
} else {
    console.log('✅ [Segurança] Chaves Supabase carregadas via .env com sucesso.');
}

const DEFAULT_STORE_ID = 'irw-motors-main';

// Cache de clientes Supabase para suporte a múltiplos projetos
const supabaseClients = new Map();

/**
 * Obtém o cliente Supabase correto para uma determinada loja.
 * Se a loja tiver credenciais próprias no banco local, usa elas.
 * Caso contrário, usa o projeto padrão.
 */
function getSupabaseClient(lojaId = null) {
    const id = lojaId || DEFAULT_STORE_ID;

    // Se já estiver no cache, retorna
    if (supabaseClients.has(id)) return supabaseClients.get(id);

    try {
        // Busca credenciais dedicadas no banco
        const store = db.prepare("SELECT supabase_url, supabase_anon_key FROM lojas WHERE id = ?").get(id);

        if (store && store.supabase_url && store.supabase_anon_key) {
            console.log(`🔌 [Supabase] Inicializando cliente DEDICADO para loja: ${id}`);
            const client = createClient(store.supabase_url, store.supabase_anon_key);
            supabaseClients.set(id, client);
            return client;
        }
    } catch (e) {
        console.warn(`⚠️ [Supabase] Erro ao buscar config customizada para ${id}, usando padrão.`);
    }

    // Fallback para o cliente padrão
    if (!supabaseClients.has('default')) {
        console.log(`🔌 [Supabase] Inicializando cliente PADRÃO`);
        supabaseClients.set('default', createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key));
    }
    return supabaseClients.get('default');
}

// 🛡️ PROTEÇÃO GLOBAL: Garante que TODOS os dados enviados ao Supabase tenham loja_id
const safeSupabaseUpsert = async (table, data, lojaId, options = {}) => {
    const client = getSupabaseClient(lojaId);
    if (!client) {
        console.warn('[DB] Supabase não disponível');
        return { data: null, error: new Error('Supabase não disponível') };
    }

    const currentLojaId = lojaId || DEFAULT_STORE_ID;

    // Garante que SEMPRE tenha loja_id
    const safeData = Array.isArray(data)
        ? data.map(item => ({ ...item, loja_id: item.loja_id || currentLojaId }))
        : { ...data, loja_id: data.loja_id || currentLojaId };

    console.log(`🛡️ [SafeUpsert] ${table}: Garantindo loja_id para ${Array.isArray(safeData) ? safeData.length : 1} item(ns)`);

    return await client.from(table).upsert(safeData, options);
};

// 📂 CAMINHO DO BANCO LOCAL
// O arquivo .db fica na pasta de dados do usuário do Windows (AppData)
const dbPath = path.join(app.getPath('userData'), 'sistema_visitas.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Modo WAL melhora a performance de leitura/escrita simultânea

// 🔄 VARIÁVEIS DE CONTROLE DE SINCRONIZAÇÃO
let syncLock = false; // Impede loops infinitos durante a sincronização
let isRealtimeEnabled = false; // Garante que o Realtime do Supabase não seja inscrito múltiplas vezes

// 🛡️ IDs de visitas salvas localmente — ignora o echo do Realtime por 30s
const recentlySavedVisitas = new Set();
function markVisitaSaved(id) {
    recentlySavedVisitas.add(String(id));
    setTimeout(() => recentlySavedVisitas.delete(String(id)), 30000);
}

// 🛒 RETORNA O ID DA LOJA ATIVA (Usado pelo Heartbeat do main.js)
export function getActiveStoreId() {
    try {
        const row = db.prepare("SELECT loja_id FROM usuarios WHERE username != 'diego' ORDER BY rowid LIMIT 1").get();
        return row?.loja_id || DEFAULT_STORE_ID;
    } catch (e) {
        return DEFAULT_STORE_ID;
    }
}

// 📤 Exporta a instância do banco para uso em outros módulos (ex: uploadData.js)
export function getDbInstance() {
    return db;
}

// 🛠️ INICIALIZAÇÃO DO ESQUEMA (TABELAS)
// Esta função cria a "planta" da casa onde os dados moram.
export function initDb() {
    db.exec(`
    -- Tabela de Lojas (Unidades)
    CREATE TABLE IF NOT EXISTS lojas (
      id TEXT PRIMARY KEY,
      nome TEXT,
      logo_url TEXT,
      slug TEXT UNIQUE,
      config TEXT, -- Configurações em JSON
      modulos TEXT, -- Módulos ativos (ex: [dashboard, whatsapp])
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS visitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loja_id TEXT,
      datahora TEXT,
      mes INTEGER,
      cliente TEXT,
      telefone TEXT,
      portal TEXT,
      veiculo_interesse TEXT,
      veiculo_troca TEXT,
      vendedor TEXT,
      vendedor_sdr TEXT,
      negociacao TEXT,
      data_agendamento TEXT,
      temperatura TEXT,
      motivo_perda TEXT,
      forma_pagamento TEXT,
      status_pipeline TEXT,
      valor_proposta TEXT,
      cpf_cliente TEXT,
      historico_log TEXT,
      status TEXT DEFAULT 'Pendente',
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS estoque (
      id TEXT PRIMARY KEY,
      loja_id TEXT,
      nome TEXT, 
      foto TEXT,
      fotos TEXT,
      link TEXT,
      km TEXT,
      cambio TEXT,
      ano TEXT,
      valor TEXT,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS portais (
      nome TEXT, 
      loja_id TEXT,
      link TEXT,
      ativo INTEGER DEFAULT 1,
      PRIMARY KEY (nome, loja_id)
    );
    CREATE TABLE IF NOT EXISTS vendedores (
      nome TEXT, 
      loja_id TEXT,
      sobrenome TEXT,
      telefone TEXT,
      ativo INTEGER DEFAULT 1,
      PRIMARY KEY (nome, loja_id)
    );
    CREATE TABLE IF NOT EXISTS config (chave TEXT, loja_id TEXT, valor TEXT, PRIMARY KEY (chave, loja_id));
    CREATE TABLE IF NOT EXISTS crm_settings (
        key TEXT, 
        loja_id TEXT,
        category TEXT,
        value TEXT,
        updated_at TEXT,
        PRIMARY KEY (key, loja_id)
    );
    CREATE TABLE IF NOT EXISTS usuarios (
      username TEXT PRIMARY KEY, 
      loja_id TEXT,
      password TEXT, 
      role TEXT,
      reset_password INTEGER DEFAULT 0,
      nome_completo TEXT,
      email TEXT,
      whatsapp TEXT,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      loja_id TEXT,
      titulo TEXT, 
      mensagem TEXT, 
      is_system INTEGER DEFAULT 0,
      link TEXT,
      username TEXT,
      ordem INTEGER
    );
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loja_id TEXT,
      sdr_username TEXT,
      texto TEXT,
      data_nota TEXT,
      concluido INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS historico_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visita_id INTEGER,
      loja_id TEXT,
      telefone TEXT,
      remetente TEXT, -- bot, cliente, diego
      mensagem TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

    // Migrações de segurança (Essencial para manter dados em bancos existentes)
    const migrations = [
        "ALTER TABLE estoque ADD COLUMN fotos TEXT",
        "ALTER TABLE estoque ADD COLUMN id TEXT",
        "ALTER TABLE estoque ADD COLUMN km TEXT",
        "ALTER TABLE estoque ADD COLUMN cambio TEXT",
        "ALTER TABLE estoque ADD COLUMN valor TEXT",
        "ALTER TABLE estoque ADD COLUMN ano TEXT",
        "ALTER TABLE estoque ADD COLUMN foto TEXT",
        "ALTER TABLE estoque ADD COLUMN link TEXT",
        "ALTER TABLE visitas ADD COLUMN vendedor_sdr TEXT",
        "ALTER TABLE visitas ADD COLUMN negociacao TEXT",
        "ALTER TABLE visitas ADD COLUMN data_agendamento TEXT",
        "ALTER TABLE visitas ADD COLUMN temperatura TEXT",
        "ALTER TABLE visitas ADD COLUMN motivo_perda TEXT",
        "ALTER TABLE visitas ADD COLUMN forma_pagamento TEXT",
        "ALTER TABLE visitas ADD COLUMN status_pipeline TEXT",
        "ALTER TABLE visitas ADD COLUMN valor_proposta TEXT",
        "ALTER TABLE visitas ADD COLUMN cpf_cliente TEXT",
        "ALTER TABLE visitas ADD COLUMN historico_log TEXT",
        "ALTER TABLE usuarios ADD COLUMN reset_password INTEGER DEFAULT 0",
        "ALTER TABLE vendedores ADD COLUMN sobrenome TEXT",
        "ALTER TABLE vendedores ADD COLUMN telefone TEXT",
        "ALTER TABLE scripts ADD COLUMN is_system INTEGER DEFAULT 0",
        "ALTER TABLE scripts ADD COLUMN link TEXT",
        "ALTER TABLE scripts ADD COLUMN username TEXT",
        "ALTER TABLE scripts ADD COLUMN ordem INTEGER",
        "ALTER TABLE usuarios ADD COLUMN nome_completo TEXT",
        "ALTER TABLE usuarios ADD COLUMN email TEXT",
        "ALTER TABLE usuarios ADD COLUMN whatsapp TEXT",
        "ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1",
        "ALTER TABLE portais ADD COLUMN link TEXT",
        "ALTER TABLE usuarios ADD COLUMN permissions TEXT DEFAULT '[]'",
        "ALTER TABLE visitas ADD COLUMN loja_id TEXT",
        "ALTER TABLE estoque ADD COLUMN loja_id TEXT",
        "ALTER TABLE portais ADD COLUMN loja_id TEXT",
        "ALTER TABLE vendedores ADD COLUMN loja_id TEXT",
        "ALTER TABLE usuarios ADD COLUMN loja_id TEXT",
        "ALTER TABLE scripts ADD COLUMN loja_id TEXT",
        "ALTER TABLE config ADD COLUMN loja_id TEXT",
        "ALTER TABLE notas ADD COLUMN loja_id TEXT",
        "ALTER TABLE lojas ADD COLUMN modulos TEXT",
        // Phase 11: Multi-Tenant Store Management
        "ALTER TABLE lojas ADD COLUMN endereco TEXT",
        "ALTER TABLE lojas ADD COLUMN supabase_url TEXT",
        "ALTER TABLE lojas ADD COLUMN supabase_anon_key TEXT",
        "ALTER TABLE usuarios ADD COLUMN cpf TEXT",
        "ALTER TABLE usuarios ADD COLUMN session_id TEXT",
        "ALTER TABLE usuarios ADD COLUMN last_login TEXT",
        "ALTER TABLE usuarios ADD COLUMN created_by TEXT",
        "ALTER TABLE vendedores ADD COLUMN id TEXT",
        // Phase 12: Campos extras do Supabase para compatibilidade total
        "ALTER TABLE vendedores ADD COLUMN email TEXT",
        "ALTER TABLE vendedores ADD COLUMN foto_url TEXT",
        "ALTER TABLE usuarios ADD COLUMN avatar_url TEXT",
        // Phase 13: Sincronização total com Supabase (created_at / updated_at)
        "ALTER TABLE visitas ADD COLUMN created_at TEXT",
        "ALTER TABLE visitas ADD COLUMN updated_at TEXT",
        // Phase 14: n8n AI Boost (Transbordo e Memória)
        "ALTER TABLE visitas ADD COLUMN bot_ativo INTEGER DEFAULT 1",
        "ALTER TABLE visitas ADD COLUMN localizacao TEXT",
        "ALTER TABLE visitas ADD COLUMN tem_troca INTEGER DEFAULT 0",
        "ALTER TABLE visitas ADD COLUMN troca_modelo TEXT",
        "ALTER TABLE visitas ADD COLUMN troca_ano TEXT",
        "ALTER TABLE visitas ADD COLUMN troca_km TEXT",
        "ALTER TABLE visitas ADD COLUMN agendamento_visita TEXT",
        "ALTER TABLE lojas ADD COLUMN crm_ativo INTEGER DEFAULT 0",
        "ALTER TABLE lojas ADD COLUMN supabase_url TEXT",
        "ALTER TABLE lojas ADD COLUMN supabase_anon_key TEXT",
        "ALTER TABLE usuarios ADD COLUMN em_fila INTEGER DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN ultima_atribuicao TEXT",
        "ALTER TABLE usuarios ADD COLUMN leads_recebidos_total INTEGER DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN portais_permitidos TEXT DEFAULT '[]'",
        // Phase 15: Visita Física vs Pipeline (visitou_loja flag independente)
        "ALTER TABLE visitas ADD COLUMN visitou_loja INTEGER DEFAULT 0",
        // Phase 16: Confirmação de não comparecimento (botão NÃO)
        "ALTER TABLE visitas ADD COLUMN nao_compareceu INTEGER DEFAULT 0",
        // Phase 17: Placa do veículo no estoque
        "ALTER TABLE estoque ADD COLUMN placa TEXT"
    ];

    migrations.forEach(query => {
        try { db.exec(query); } catch (e) { }
    });

    // --- MIRAÇÃO CRÍTICA: REESTRUTURAÇÃO DA TABELA ESTOQUE (Nome -> ID como PK) ---
    try {
        const tableInfo = db.prepare("PRAGMA table_info(estoque)").all();
        const pkColumn = tableInfo.find(c => c.pk === 1);

        // Se a PK atual for 'nome' (antiga) ou se não tiver a coluna 'id', precisamos reconstruir
        if (!pkColumn || pkColumn.name === 'nome' || !tableInfo.find(c => c.name === 'id')) {
            console.log("🛠️ [DB Migration] Reconstruindo tabela 'estoque' para nova arquitetura de IDs...");
            db.transaction(() => {
                // 1. Cria tabela temporária com a estrutura nova
                db.exec(`
                    CREATE TABLE IF NOT EXISTS estoque_new(
        id TEXT PRIMARY KEY,
        nome TEXT,
        foto TEXT,
        fotos TEXT,
        link TEXT,
        km TEXT,
        cambio TEXT,
        ano TEXT,
        valor TEXT,
        ativo INTEGER DEFAULT 1
    )
        `);

                // 2. Tenta migrar os dados (usando o link como ID temporário caso o ID esteja nulo)
                db.exec(`
                    INSERT OR IGNORE INTO estoque_new(id, nome, foto, fotos, link, km, cambio, ano, valor, ativo)
                    SELECT IFNULL(id, link), nome, foto, fotos, link, km, cambio, ano, valor, ativo FROM estoque
        `);

                // 3. Substitui a tabela
                db.exec("DROP TABLE estoque");
                db.exec("ALTER TABLE estoque_new RENAME TO estoque");
            })();
            console.log("✅ [DB Migration] Tabela 'estoque' atualizada com sucesso.");
        }
    } catch (e) {
        console.error("❌ [DB Migration] Erro ao reconstruir tabela estoque:", e.message);
    }
    // === SEED INICIAL (AUTO CONFIGURAÇÃO) ===
    try {
        // 1. Configurar Metas Padrão se não existirem
        const metaVisita = db.prepare("SELECT valor FROM config WHERE chave = 'meta_visita_semanal'").get();
        if (!metaVisita) {
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('meta_visita_semanal', '15');
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('meta_venda_mensal', '10');
            console.log('🌱 [SEED] Metas padrão configuradas.');
        }

        // 2. Configurar Portais Padrão (Garante que a lista inicial exista)
        ensurePortals();

        // 3. Configurar Campanha Padrão (Seed para Demonstração)
        const campaignCheck = db.prepare("SELECT valor FROM config WHERE chave = 'active_campaign'").get();
        if (!campaignCheck) {
            const demoCampaign = {
                active: true,
                title: "Corrida da Semana",
                prize: "R$ 300,00",
                goal_visits: 10,
                goal_sales: 3,
                start_date: new Date().toISOString().split('T')[0]
            };
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('active_campaign', JSON.stringify(demoCampaign));
            console.log('🌱 [SEED] Campanha de Vendas iniciada!');
        }

    } catch (err) {
        console.error("Erro no Seed Inicial:", err);
    }
    performMaintenance();
    try {
        db.prepare("UPDATE usuarios SET ativo = 1 WHERE ativo IS NULL").run();
    } catch (e) { }
    ensureDefaultStore();
    ensureDevUser();
    // 📡 RESET LÓGICO (v1.1.21+) - Garante integridade de licenciamento no BOOT
    checkVersionAndReset();

    console.log("✅ [DB] Banco de dados pronto e verificado.");
}

// --- RESET LOGICO PARA VERSOES CRITICAS ---
export function checkVersionAndReset() {
    try {
        const currentInternalVersion = "1.1.21";
        const row = db.prepare("SELECT valor FROM config WHERE chave = 'internal_db_version' AND loja_id = 'SYSTEM'").get();
        const lastVersion = row ? row.valor : "0.0.0";

        if (lastVersion !== currentInternalVersion) {
            console.log(`📡 [Reset Lógico] Detectada nova versão (${currentInternalVersion}). Realizando limpeza seletiva...`);

            // 🛡️ LIMPA USUÁRIOS (Preserva as credenciais básicas por segurança, mas o sync vai sobrescrever tudo)
            db.prepare("DELETE FROM usuarios WHERE username NOT IN ('diego', 'admin')").run();

            // 🛡️ LIMPA TABELA DE LOJAS para garantir que os módulos venham do Supabase
            db.prepare("DELETE FROM lojas").run();

            // 🛡️ LIMPA CRM_SETTINGS para forçar prompts novos
            db.prepare("DELETE FROM crm_settings").run();

            // Atualiza a flag de versão (Global)
            db.prepare("INSERT OR REPLACE INTO config (chave, loja_id, valor) VALUES (?, ?, ?)").run('internal_db_version', 'SYSTEM', currentInternalVersion);

            console.log(`✅ [Reset Lógico] Tabelas críticas limpas. O próximo syncConfig será MANDATÓRIO.`);
            return true;
        }
    } catch (e) {
        console.error("Erro no Reset Lógico:", e.message);
    }
    return false;
}

// --- UTIL ---
export function toPerfectSlug(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9]+/g, '-') // substitui tudo que não é letra/numero por -
        .replace(/^-+|-+$/g, ''); // remove traços no inicio e fim
}

// --- Sync Hybrid Logic (API Real-time + XML Fallback) ---

export async function syncXml(lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;

    // 🔥 Lógica de Reset para V1.1.21 (Garante integridade de licenciamento)
    checkVersionAndReset();

    // 🔥 SYNC CONFIG FIRST (PULL FROM CLOUD)
    await syncConfig(lojaId);

    // 🔥 REALTIME SYNC (Instant Updates)
    enableRealtimeSync();

    try {
        const client = getSupabaseClient(lojaId);
        console.log(`[SupabaseSync] Buscando estoque da nuvem para loja: ${lojaId}...`);
        console.log(`[SupabaseSync] Supabase disponível: ${!!client}`);

        if (!client) {
            console.error('[SupabaseSync] ❌ Supabase não está inicializado!');
            return { success: false, message: 'Supabase não disponível' };
        }

        const { data: cloudEstoque, error: ceErr } = await client
            .from('estoque')
            .select('*')
            .eq('loja_id', lojaId);

        console.log(`[SupabaseSync] Resposta do Supabase:`, {
            temDados: !!cloudEstoque,
            quantidade: cloudEstoque?.length || 0,
            erro: ceErr?.message || 'nenhum'
        });

        if (ceErr) {
            console.error('[SupabaseSync] ❌ Erro na query:', ceErr);
            return { success: false, message: ceErr.message };
        }

        if (!cloudEstoque) {
            console.warn('[SupabaseSync] ⚠️  cloudEstoque é null/undefined');
            return { success: false, message: 'Nenhum dado retornado' };
        }

        db.transaction((items) => {
            // 🔥 ESTRATÉGIA "ESPELHO PERFEITO" POR LOJA: Limpa apenas o estoque desta loja
            const deleted = db.prepare("DELETE FROM estoque WHERE loja_id = ?").run(lojaId);
            console.log(`[SupabaseSync] 🗑️  Removidos ${deleted.changes} veículos antigos da loja ${lojaId}`);

            if (items.length > 0) {
                const stmt = db.prepare(`
                    INSERT INTO estoque(id, loja_id, nome, foto, fotos, link, km, cambio, ano, valor, ativo, placa)
                    VALUES(@id, @loja_id, @nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo, @placa)
                `);
                let inserted = 0;
                for (const v of items) {
                    try {
                        // 🛡️ PROTEÇÃO: Garante que SEMPRE tenha loja_id
                        const veiculoComLoja = {
                            ...v,
                            loja_id: v.loja_id || lojaId,
                            fotos: typeof v.fotos === 'string' ? v.fotos : JSON.stringify(v.fotos),
                            ativo: v.ativo ? 1 : 0,
                            placa: v.placa || ''
                        };
                        stmt.run(veiculoComLoja);
                        inserted++;
                    } catch (err) {
                        console.error(`[SupabaseSync] ❌ Erro ao inserir veículo ${v.nome}:`, err.message);
                    }
                }
                console.log(`[SupabaseSync] ✅ Inseridos ${inserted}/${items.length} veículos`);
            } else {
                console.warn(`[SupabaseSync] ⚠️  Nenhum veículo para inserir`);
            }
        })(cloudEstoque);

        console.log(`✅[SupabaseSync] Sincronia Completa: ${cloudEstoque.length} veículos ativos na loja ${lojaId}.`);
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('sync-status', { table: 'estoque', loading: false, lojaId });
            w.webContents.send('refresh-data', 'estoque');
        });
        return { success: true, message: `Sincronizado: ${cloudEstoque.length} veículos.`, syncedCount: cloudEstoque.length };
    } catch (e) {
        console.error("[SupabaseSync] ❌ Exceção capturada:", e);
        console.warn("[SupabaseSync] Falha ao puxar estoque da nuvem:", e.message);
        return { success: false, message: e.message };
    }
}

function performMaintenance() {
    try {
        const users = db.prepare("SELECT username, password FROM usuarios WHERE reset_password = 0").all();
        const usersNeedsReset = users.filter(u => !u.password.startsWith('$2b$'));
        if (usersNeedsReset.length > 0) {
            const stmt = db.prepare("UPDATE usuarios SET reset_password = 1 WHERE username = ?");
            usersNeedsReset.forEach(u => stmt.run(u.username));
        }

        // Backfill Permissions for Legacy SDRs
        const legacySdr = db.prepare("SELECT username FROM usuarios WHERE role = 'sdr' AND (permissions IS NULL OR permissions = '[]')").all();
        if (legacySdr.length > 0) {
            const defaultPerms = JSON.stringify(['/', '/whatsapp', '/estoque', '/visitas', '/metas']);
            const update = db.prepare("UPDATE usuarios SET permissions = ? WHERE username = ?");
            legacySdr.forEach(u => update.run(defaultPerms, u.username));
            console.log(`✅[Maintenance] Permissões padrão aplicadas para ${legacySdr.length} usuários SDR antigos.`);
        }
    } catch (e) { }
    ensureDefaultStore();
    ensureDevUser();
    // db.prepare("DELETE FROM usuarios WHERE username = 'admin'").run();
    ensurePortals();
    fixMissingDates();
}

function fixMissingDates() {
    try {
        const missing = db.prepare("SELECT id, data_agendamento FROM visitas WHERE datahora IS NULL OR datahora = ''").all();
        if (missing.length > 0) {
            console.log(`🛠️ [Maintenance] Corrigindo ${missing.length} visitas sem datahora.`);
            const stmt = db.prepare("UPDATE visitas SET datahora = ?, mes = ? WHERE id = ?");

            missing.forEach(v => {
                let d = new Date();
                // Se tiver agendamento, usa como base
                if (v.data_agendamento) {
                    const parsed = new Date(v.data_agendamento);
                    if (!isNaN(parsed.getTime())) d = parsed;
                }
                const iso = d.toISOString();
                const mes = d.getMonth() + 1;
                stmt.run(iso, mes, v.id);
            });
            console.log("✅ [Maintenance] Visitas corrigidas.");
        }
    } catch (e) {
        console.error("Erro ao corrigir datas:", e);
    }
}



function ensureDefaultStore() {
    try {
        const store = db.prepare("SELECT id FROM lojas WHERE id = ?").get(DEFAULT_STORE_ID);
        if (!store) {
            db.prepare(`
                INSERT INTO lojas(id, nome, slug, ativo)
    VALUES(?, ?, ?, ?)
            `).run(DEFAULT_STORE_ID, 'IRW Motors', 'irw-motors', 1);
            console.log('🌱 [SEED] Loja padrão IRW Motors criada.');
        }

        // Retroativamente marcar dados órfãos com a loja padrão
        const tablesToUpdate = ['usuarios', 'visitas', 'estoque', 'vendedores', 'scripts', 'config', 'portais', 'notas'];
        tablesToUpdate.forEach(table => {
            try {
                db.prepare(`UPDATE ${table} SET loja_id = ? WHERE loja_id IS NULL`).run(DEFAULT_STORE_ID);
            } catch (e) {
                // Ignore if it fails due to table specific schema issues during migration
            }
        });
    } catch (e) {
        console.error("Erro ao garantir loja padrão:", e.message);
    }
}

export async function syncAllStoresFromCloud() {
    try {
        const client = getSupabaseClient(null);
        console.log('☁️ [Sync] Puxando todas as lojas da nuvem (Admin Rescue)...');
        const { data: cloudLojas, error } = await client.from('lojas').select('*');
        if (error) throw error;

        if (cloudLojas) {
            db.transaction(() => {
                for (const cloudLoja of cloudLojas) {
                    db.prepare(`
                        INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                        VALUES(?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                        nome = excluded.nome, endereco = excluded.endereco, logo_url = excluded.logo_url,
                        slug = excluded.slug, modulos = excluded.modulos, ativo = excluded.ativo
                    `).run(
                        cloudLoja.id,
                        cloudLoja.nome,
                        cloudLoja.endereco || '',
                        cloudLoja.logo_url || '',
                        cloudLoja.slug || cloudLoja.id,
                        cloudLoja.modulos || '[]',
                        cloudLoja.ativo ? 1 : 0
                    );
                }
            })();
            // Notifica a interface para recarregar
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'lojas'));
            return { success: true, count: cloudLojas.length };
        }
        return { success: false, error: 'Nenhuma loja encontrada.' };
    } catch (err) {
        console.error('[Sync] Erro ao baixar todas as lojas:', err);
        return { success: false, error: err.message };
    }
}

export async function syncConfig(lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;
    console.log(`☁️ [SyncConfig] Iniciando sincronização para loja: ${lojaId}...`);
    ensureDevUser();
    const stats = { users: 0, sellers: 0, scripts: 0, errors: [] };

    try {
        // 1. USUÁRIOS
        const client = getSupabaseClient(lojaId);
        const { data: cloudUsers, error: uErr } = await client.from('usuarios').select('*').eq('loja_id', lojaId);
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

        // 2. LOJA (Sincroniza status e módulos ativos)
        try {
            const { data: cloudLoja, error: lErr } = await client.from('lojas').select('*').eq('id', lojaId).single();
            if (cloudLoja) {
                db.prepare(`
                    INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                    VALUES(?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                    nome = excluded.nome, endereco = excluded.endereco, logo_url = excluded.logo_url,
                        slug = excluded.slug, modulos = excluded.modulos, ativo = excluded.ativo
                            `).run(
                    cloudLoja.id,
                    cloudLoja.nome,
                    cloudLoja.endereco || '',
                    cloudLoja.logo_url || '',
                    cloudLoja.slug || cloudLoja.id,
                    cloudLoja.modulos || '[]',
                    cloudLoja.ativo ? 1 : 0
                );
                console.log(`✅[SyncConfig] Status da loja ${lojaId} atualizado(Ativo: ${cloudLoja.ativo}, Módulos: ${cloudLoja.modulos})`);
            }
        } catch (err) {
            console.error('[SyncConfig] Erro Loja:', err.message);
        }

        // 3. Vendedores
        try {
            const { data: cloudSellers, error: sErr } = await client.from('vendedores').select('*').eq('loja_id', lojaId);
            if (sErr) {
                console.error('[SyncConfig] Erro ao buscar vendedores:', sErr);
            } else if (cloudSellers && cloudSellers.length > 0) {
                db.transaction(() => {
                    for (const s of cloudSellers) {
                        try {
                            // Usa INSERT OR REPLACE para evitar erro de constraint
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
                        } catch (err) {
                            console.error(`[SyncConfig] Erro ao inserir vendedor ${s.nome}: `, err.message);
                        }
                    }
                })();
                stats.sellers = cloudSellers.length;
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'vendedores'));
            }
        } catch (err) {
            console.error('[SyncConfig] Erro Vendedores:', err.message);
            stats.errors.push(`Vendedores: ${err.message} `);
        }

        // 3. Scripts
        try {
            const { data: cloudScripts, error: scErr } = await client.from('scripts').select('*').eq('loja_id', lojaId);
            if (scErr) {
                console.error('[SyncConfig] Erro ao buscar scripts:', scErr);
            } else if (cloudScripts && cloudScripts.length > 0) {
                db.transaction(() => {
                    for (const s of cloudScripts) {
                        try {
                            // Usa INSERT OR REPLACE para evitar erro de constraint
                            db.prepare(`
                                INSERT OR REPLACE INTO scripts(id, titulo, mensagem, is_system, link, username, ordem, loja_id)
                    VALUES(@id, @titulo, @mensagem, @is_system, @link, @username, @ordem, @loja_id)
                        `).run({ ...s, is_system: s.is_system ? 1 : 0 });
                        } catch (err) {
                            console.error(`[SyncConfig] Erro ao inserir script ${s.id}: `, err.message);
                        }
                    }
                })();
                stats.scripts = cloudScripts.length;
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'scripts'));
            }
        } catch (err) {
            console.error('[SyncConfig] Erro Scripts:', err.message);
            stats.errors.push(`Scripts: ${err.message} `);
        }

        // 4. Visitas (Recent Pull)
        try {
            const { data: cloudVisitas, error: vErr } = await client
                .from('visitas')
                .select('*')
                .eq('loja_id', lojaId)
                .order('id', { ascending: false })
                .limit(2000);

            if (vErr) {
                console.error('[SyncConfig] Erro ao buscar visitas:', vErr);
            } else if (cloudVisitas && cloudVisitas.length > 0) {
                db.transaction(() => {
                    for (const v of cloudVisitas) {
                        try {
                            // Usa INSERT OR REPLACE para evitar erro de constraint
                            // IMPORTANTE: inclui visitou_loja e nao_compareceu para não resetar ao sincronizar
                            db.prepare(`
                    INSERT INTO visitas(
                            id, datahora, mes, cliente, telefone, portal,
                            veiculo_interesse, veiculo_troca, vendedor, vendedor_sdr, negociacao, status,
                            data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline,
                            valor_proposta, cpf_cliente, historico_log, loja_id,
                            visitou_loja, nao_compareceu
                        )
                    VALUES(
                        @id, @datahora, @mes, @cliente, @telefone, @portal,
                        @veiculo_interesse, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, @status,
                        @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, @status_pipeline,
                        @valor_proposta, @cpf_cliente, @historico_log, @loja_id,
                        @visitou_loja, @nao_compareceu
                    )
                    ON CONFLICT(id) DO UPDATE SET
                    datahora = excluded.datahora,
                        mes = excluded.mes,
                        cliente = excluded.cliente,
                        telefone = excluded.telefone,
                        portal = excluded.portal,
                        veiculo_interesse = excluded.veiculo_interesse,
                        veiculo_troca = excluded.veiculo_troca,
                        vendedor = excluded.vendedor,
                        vendedor_sdr = excluded.vendedor_sdr,
                        negociacao = excluded.negociacao,
                        status = excluded.status,
                        data_agendamento = excluded.data_agendamento,
                        temperatura = excluded.temperatura,
                        motivo_perda = excluded.motivo_perda,
                        forma_pagamento = excluded.forma_pagamento,
                        status_pipeline = excluded.status_pipeline,
                        valor_proposta = excluded.valor_proposta,
                        cpf_cliente = excluded.cpf_cliente,
                        historico_log = excluded.historico_log,
                        loja_id = excluded.loja_id,
                        --Só atualiza visitou_loja se o valor da nuvem for 1(alguém confirmou lá)
                        --Nunca deixa a nuvem "apagar" um SIM local com NULL ou 0
                    visitou_loja = MAX(COALESCE(visitas.visitou_loja, 0), COALESCE(excluded.visitou_loja, 0)),
                        nao_compareceu = COALESCE(excluded.nao_compareceu, visitas.nao_compareceu, 0)
                            `).run({
                                ...v,
                                visitou_loja: v.visitou_loja ? 1 : 0,
                                nao_compareceu: v.nao_compareceu ? 1 : 0,
                            });

                        } catch (err) {
                            console.error(`[SyncConfig] Erro ao inserir visita ${v.id}: `, err.message);
                        }
                    }
                })();
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
            }
        } catch (err) {
            console.error('[SyncConfig] Erro Visitas:', err.message);
            stats.errors.push(`Visitas: ${err.message} `);
        }

        // 5. Portais
        try {
            const { data: cloudPortals, error: pErr } = await client.from('portais').select('*').eq('loja_id', lojaId);
            if (pErr) {
                console.error('[SyncConfig] Erro ao buscar portais:', pErr);
            } else if (cloudPortals && cloudPortals.length > 0) {
                db.transaction(() => {
                    for (const p of cloudPortals) {
                        try {
                            db.prepare(`
                                INSERT OR REPLACE INTO portais(nome, link, ativo, loja_id)
                    VALUES(@nome, @link, @ativo, @loja_id)
                        `).run({ ...p, ativo: p.ativo ? 1 : 0 });
                        } catch (err) {
                            console.error(`[SyncConfig] Erro ao inserir portal ${p.nome}: `, err.message);
                        }
                    }
                })();
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'portais'));
            } else {
                // Se a nuvem estiver vazia, vamos tentar subir os locais (Upstream Sync)
                const localPortals = db.prepare("SELECT * FROM portais WHERE loja_id = ?").all(lojaId);
                if (localPortals.length > 0) {
                    console.log(`⬆️[SyncConfig] Subindo ${localPortals.length} portais locais para a nuvem...`);
                    await safeSupabaseUpsert('portais', localPortals, lojaId, { onConflict: 'nome,loja_id' });
                }
            }
        } catch (err) {
            console.error('[SyncConfig] Erro Portais:', err.message);
        }

        // 6. Configurações Globais (IA Prompts e Categorias)
        try {
            const client = getSupabaseClient(lojaId);
            const { data: cloudConfig, error: cErr } = await client.from('crm_settings').select('*').eq('loja_id', lojaId);
            if (cErr) {
                console.error('[SyncConfig] Erro ao buscar crm_settings:', cErr);
            } else if (cloudConfig && cloudConfig.length > 0) {
                saveSettingsBatch(cloudConfig, lojaId);
            }
        } catch (err) {
            console.error('[SyncConfig] Erro Config:', err.message);
        }

        console.log(`✅[SyncConfig] Completo para loja ${lojaId}: `, stats);
        return { success: true, stats };
    } catch (e) {
        console.error("❌ [SyncConfig] Erro Geral:", e.message);
        return { success: false, error: e.message, stats };
    }
}

function ensureDevUser() {
    const DevEmail = 'diego';
    // 🔒 SECURTY FIX: Senha padrão apenas na criação inicial
    // Se o usuário mudar a senha, NUNCA mais resetamos para o padrão
    const DevPass = '197086';
    const hash = bcrypt.hashSync(DevPass, 10);

    try {
        const devCheck = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(DevEmail);

        if (!devCheck) {
            // 🆕 Criação Inicial: Usa senha padrão
            db.prepare(`
                INSERT INTO usuarios(username, password, role, reset_password, ativo, nome_completo)
                VALUES(?, ?, ?, ?, ?, ?)
                    `).run(DevEmail, hash, 'developer', 1, 1, 'Diego Admin');
            console.log('✅ [Security] Usuário desenvolvedor criado (senha padrão definida)');
        } else {
            // 🔄 Atualização: Mantém a senha atual do usuário!
            // Garante apenas que ele continua sendo developer e ativo
            db.prepare("UPDATE usuarios SET role = ?, ativo = 1 WHERE username = ? COLLATE NOCASE")
                .run('developer', DevEmail);
            console.log('✅ [Security] Usuário desenvolvedor verificado (senha preservada)');
        }
    } catch (e) {
        console.error("Erro ao garantir usuário dev:", e.message);
    }
}


function ensurePortals() {
    try {
        // 1. Corrigir registros órfãos (sem loja_id)
        db.prepare("UPDATE portais SET loja_id = ? WHERE loja_id IS NULL OR loja_id = ''").run(DEFAULT_STORE_ID);

        // 2. Garantir portais padrão usando INSERT OR IGNORE individual
        const defaults = ["OLX", "FACEBOOK", "INSTAGRAM", "ICARROS", "WEBMOTORS", "SITE", "LOJA (PRESENCIAL)", "PASSANTE"];
        const insertPortal = db.prepare("INSERT OR IGNORE INTO portais (nome, loja_id, ativo) VALUES (?, ?, 1)");

        defaults.forEach(p => {
            insertPortal.run(p, DEFAULT_STORE_ID);
        });

        console.log(`🌱[SEED] Verificação de portais concluída.`);
    } catch (e) {
        console.error("Erro ao garantir portais:", e.message);
    }
}

export async function scrapCarDetails(nome, url) {
    if (!url || typeof url !== 'string' || url === '') return null;
    try {
        const resp = await fetch(url);
        const html = await resp.text();

        let km = 'Consulte';
        const kmMatch = html.match(/"Quilometragem":"(.*?)"/) ||
            html.match(/Quilometragem<\/div>\s*<div[^>]*>(.*?)<\/div>/i) ||
            html.match(/([\d\.]+)\s*km/i);

        if (kmMatch) {
            km = kmMatch[1].replace(' km', '').trim() + ' km';
        }

        const idMatch = url.match(/\/(\d+)$/);
        const carId = idMatch ? idMatch[1] : null;

        const photosMap = new Map();
        const addPhoto = (imgUrl) => {
            const clean = normalizePhotoUrl(imgUrl);
            if (!clean) return;
            const filenameMatch = clean.match(/\/([^\/]+\.(?:jpeg|jpg|png|webp))$/i);
            if (filenameMatch) {
                const filename = filenameMatch[1].toLowerCase();
                if (!photosMap.has(filename)) {
                    photosMap.set(filename, clean);
                }
            }
        };

        const photosMatch = html.match(/let photos = (\[.*?\]);/s);
        if (photosMatch && carId) {
            try {
                const rawJson = photosMatch[1].replace(/\\'/g, "'");
                const photosArr = JSON.parse(rawJson);
                photosArr.forEach(p => {
                    const imgUrl = p.url || p.photo_url || p.desktop || p.src || p.medium;
                    if (imgUrl && imgUrl.includes(`/ fotos / ${carId} / `)) {
                        addPhoto(imgUrl);
                    }
                });
            } catch (e) {
                console.error("Erro ao parsear photos JSON:", e.message);
            }
        }

        if (carId) {
            const fotoRegex = new RegExp(`https://(?:resized-images\\.autoconf\\.com\\.br|autoconf-production\\.s3\\.amazonaws\\.com)/[^\\s'"]*?/veiculos/fotos/${carId}/[^\\s'"]+?\\.(?:jpeg|jpg|png|webp)`, 'gi');
            const matches = [...html.matchAll(fotoRegex)];
            matches.forEach(m => addPhoto(m[0]));
        }

        const listFotos = Array.from(photosMap.values());
        if (listFotos.length > 0) {
            const fotosJson = JSON.stringify(listFotos);
            db.prepare("UPDATE estoque SET km = ?, fotos = ? WHERE nome = ?").run(km, fotosJson, nome);
            return { km, fotos: listFotos };
        }

        if (km !== 'Consulte') {
            db.prepare("UPDATE estoque SET km = ? WHERE nome = ?").run(km, nome);
        }
        return { km };
    } catch (e) {
        console.error("Erro ao fazer scrap:", e);
        return null;
    }
}

// --- CRUD & Stats ---

export function getStats(options = {}) {
    let days = options.days || 30;
    let month = options.month;
    let year = options.year;
    let lojaId = options.lojaId || DEFAULT_STORE_ID;

    // Suporte legado se receber argumentos posicionais
    if (typeof options === 'number') {
        days = options;
        lojaId = arguments[1] || DEFAULT_STORE_ID;
    }

    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    console.log(`📊 [DB] getStats called with:`, JSON.stringify(options));
    console.log(`📊 [DB] activeLojaId determined: "${activeLojaId}"`);

    let startDate, endDate, periodTitle;
    let chartDays = days;

    if (month && year) {
        // Mês específico
        const dStart = new Date(year, month - 1, 1);
        const dEnd = new Date(year, month, 0); // Último dia do mês
        startDate = dStart.toISOString().split('T')[0] + ' 00:00:00';
        endDate = dEnd.toISOString().split('T')[0] + ' 23:59:59';
        chartDays = dEnd.getDate();
        periodTitle = `${month}/${year}`;
    } else {
        // Período de dias (X dias atrás até agora)
        const dStart = new Date();
        dStart.setDate(dStart.getDate() - days);
        dStart.setHours(0, 0, 0, 0);
        startDate = dStart.toISOString();
        endDate = new Date().toISOString();
        periodTitle = `${days}D`;
    }

    // 1. Total Leads (Entrada) no período
    const leadsTotal = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;

    // 2. Atendidos (Com vendedor atribuído) no período
    const leadsAtendidos = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE vendedor IS NOT NULL AND vendedor != '' AND datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;

    // 3. Agendados (Com data de agendamento) no período
    const leadsAgendados = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE data_agendamento IS NOT NULL AND data_agendamento != '' AND datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;

    // 4. Vendas (Fechamentos) no período
    const leadsVendidos = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE status = 'Vendido' AND datahora >= ? AND datahora <= ? AND loja_id = ?").get(startDate, endDate, activeLojaId).c;

    // 5. Origem (Portais) no período
    const leadsPorPortal = db.prepare(`
        SELECT 
            portal as name, 
            COUNT(*) as value,
            SUM(CASE WHEN status = 'Vendido' THEN 1 ELSE 0 END) as sales
        FROM visitas 
        WHERE portal IS NOT NULL AND portal != '' AND datahora >= ? AND datahora <= ? AND loja_id = ?
        GROUP BY portal 
        ORDER BY value DESC
    `).all(startDate, endDate, activeLojaId);

    // 6. Fluxo de Vendedores
    let fluxoVendedores = { ultimo: 'N/A', proximo: 'N/A' };
    const lastVisit = db.prepare("SELECT vendedor FROM visitas WHERE vendedor IS NOT NULL AND vendedor != '' ORDER BY id DESC LIMIT 1").get();
    const activeSellers = db.prepare("SELECT nome FROM vendedores WHERE ativo = 1 ORDER BY nome ASC").all().map(v => v.nome);

    if (activeSellers.length > 0) {
        if (lastVisit && lastVisit.vendedor) {
            const lastVendorName = lastVisit.vendedor;
            fluxoVendedores.ultimo = lastVendorName;
            const lastIndex = activeSellers.indexOf(lastVendorName);
            const nextIndex = lastIndex !== -1 ? (lastIndex + 1) % activeSellers.length : 0;
            fluxoVendedores.proximo = activeSellers[nextIndex];
        } else {
            fluxoVendedores.proximo = activeSellers[0];
        }
    }

    // 7. Dados do Gráfico
    const visitasPorDiaRaw = db.prepare(`
        SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total 
        FROM visitas 
        WHERE datahora >= ? AND datahora <= ? AND loja_id = ?
        GROUP BY dia 
        ORDER BY dia ASC
    `).all(startDate, endDate, activeLojaId);

    const vendasPorDiaRaw = db.prepare(`
        SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total 
        FROM visitas 
        WHERE status = 'Vendido' AND datahora >= ? AND datahora <= ? AND loja_id = ?
        GROUP BY dia 
        ORDER BY dia ASC
    `).all(startDate, endDate, activeLojaId);

    const atendimentosPorDiaRaw = db.prepare(`
        SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total 
        FROM visitas 
        WHERE vendedor IS NOT NULL AND vendedor != '' AND datahora >= ? AND datahora <= ? AND loja_id = ?
        GROUP BY dia 
        ORDER BY dia ASC
    `).all(startDate, endDate, activeLojaId);

    const finalChartData = [];
    try {
        if (month && year) {
            // Se for mês, iteramos pelos dias do mês
            for (let i = 1; i <= chartDays; i++) {
                const diaStr = `${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
                const diaDisplay = i.toString().padStart(2, '0');

                const leads = visitasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
                const atendimentos = atendimentosPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
                const vendas = vendasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;

                finalChartData.push({ name: diaDisplay, leads, atendimentos, vendas });
            }
        } else {
            // Se for período de dias, iteramos de trás pra frente
            for (let i = chartDays - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const diaStr = d.toISOString().split('T')[0];
                const diaDisplay = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                const leads = visitasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
                const atendimentos = atendimentosPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
                const vendas = vendasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;

                finalChartData.push({ name: diaDisplay, leads, atendimentos, vendas });
            }
        }
    } catch (e) {
        console.error("Erro ao montar chartData:", e);
    }

    return {
        leadsTotal,
        leadsAtendidos,
        leadsAgendados,
        leadsVendidos,
        leadsPorPortal,
        fluxoVendedores,
        chartData: finalChartData,
        periodTitle
    };
}

export function getVehiclesStats(lojaId = DEFAULT_STORE_ID) {
    try {
        const stats = {};
        const rows = db.prepare(`
            SELECT veiculo_interesse, COUNT(*) as count 
            FROM visitas 
            WHERE veiculo_interesse IS NOT NULL AND veiculo_interesse != '' AND loja_id = ?
            GROUP BY veiculo_interesse
        `).all(lojaId);
        rows.forEach(r => stats[r.veiculo_interesse] = r.count);
        return stats;
    } catch (e) {
        console.error("Erro ao buscar estatísticas de veículos:", e);
        return {};
    }
}

export function getVisitsByVehicle(vehicleName, lojaId) {
    try {
        return db.prepare(`
            SELECT * FROM visitas 
            WHERE veiculo_interesse = ? AND loja_id = ?
            ORDER BY data_agendamento DESC, datahora DESC
        `).all(vehicleName, lojaId);
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- COMPETITION & GAMIFICATION ---

export function getCompetitionData(lojaId = DEFAULT_STORE_ID) {
    try {
        // 1. Busca a configuração da campanha ativa
        const configRaw = db.prepare("SELECT valor FROM config WHERE chave = 'active_campaign' AND loja_id = ?").get(lojaId);
        if (!configRaw) return null;

        const campaign = JSON.parse(configRaw.valor);
        if (!campaign.active) return null;

        // campaign structure: { title: "Semana Turbo", prize: "R$ 300,00", goal_visits: 10, goal_sales: 3, start_date: "2023-10-01", end_date: "2023-10-07" }

        // 2. Busca performance de todos os SDRs no período
        // Se não tiver data definida, assume o mês atual ou semana atual (vamos usar data start_date se existir)
        let dateFilter = "";
        if (campaign.start_date) {
            dateFilter = `AND datahora >= '${campaign.start_date}'`;
            if (campaign.end_date) dateFilter += ` AND datahora <= '${campaign.end_date} 23:59:59'`;
        }

        // Query poderosa para agrupar por SDR
        const ranking = db.prepare(`
            SELECT 
                vendedor_sdr as name,
                COUNT(*) as visitas,
                SUM(CASE WHEN status = 'Vendido' THEN 1 ELSE 0 END) as vendas
            FROM visitas 
            WHERE vendedor_sdr IS NOT NULL AND vendedor_sdr != '' ${dateFilter}
            GROUP BY vendedor_sdr
        `).all();

        // 3. Processa Ranking e Progresso
        const leaderboard = ranking.map(r => {
            const progressVisits = Math.min((r.visitas / campaign.goal_visits) * 100, 100);
            const progressSales = Math.min((r.vendas / campaign.goal_sales) * 100, 100);

            // Score ponderado para ordenação (Venda vale mais, mas a meta é composta)
            // Se a regra é "E" (10 visitas E 3 vendas), o cara só ganha se bater os dois.
            // Para ordenar "quem está mais perto", podemos usar uma média do progresso.
            const totalProgress = (progressVisits + progressSales) / 2;

            return {
                name: r.name,
                visitas: r.visitas,
                vendas: r.vendas,
                progress: Math.round(totalProgress),
                completed: r.visitas >= campaign.goal_visits && r.vendas >= campaign.goal_sales
            };
        });

        // Ordena: Primeiro quem completou, depois quem tem maior progresso
        leaderboard.sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            return b.progress - a.progress;
        });

        return { campaign, leaderboard };

    } catch (e) {
        console.error("Erro ao buscar dados da competição:", e);
        return null;
    }
}

export function setCompetitionData(data) {
    // data: { active: true, title, prize, goal_visits, goal_sales, start_date, end_date }
    try {
        db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor")
            .run('active_campaign', JSON.stringify(data));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export function getVisitas(userRole = 'vendedor', username = null, lojaId = DEFAULT_STORE_ID) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const query = `
        SELECT * FROM visitas 
        WHERE loja_id = ? 
        ORDER BY COALESCE(data_agendamento, NULLIF(datahora, '')) DESC, id DESC 
        LIMIT 2000
    `;
    return db.prepare(query).all(activeLojaId);
}


export async function addVisita(visita) {
    if (!visita.datahora) {
        visita.datahora = new Date().toISOString();
    }
    if (!visita.mes) {
        visita.mes = new Date(visita.datahora).getMonth() + 1;
    }

    // --- LÓGICA DE DISTRIBUTION (ROUND ROBIN & PORTAL FILTER) ---
    // LEAD DE TRÁFEGO PAGO -> IA Chat (Exceção)
    const portalNormalizado = (visita.portal || '').toUpperCase();
    if (portalNormalizado === 'TRÁFEGO PAGO' || portalNormalizado === 'FACEBOOK' || portalNormalizado === 'INSTAGRAM') {
        // Se for tráfego pago, marcamos para o bot e não atribuímos vendedor agora se desejado
        visita.bot_ativo = 1;
        console.log("🤖 [CRM] Lead de Tráfego Pago detectado. Direcionando para IA Chat.");
    }

    // Se o lead veio sem vendedor atribuído e não é tráfego pago
    if (!visita.vendedor_sdr && !visita.vendedor && portalNormalizado !== 'TRÁFEGO PAGO') {
        try {
            const lojaId = visita.loja_id || DEFAULT_STORE_ID;

            // Busca vendedores na fila que ATENDEM este portal
            const vendedoresCandidatos = db.prepare(`
                SELECT username, portais_permitidos FROM usuarios 
                WHERE loja_id = ? AND em_fila = 1 AND ativo = 1
            `).all(lojaId);

            // Filtra os que aceitam o portal atual
            const validos = vendedoresCandidatos.filter(v => {
                try {
                    const permitidos = JSON.parse(v.portais_permitidos || '[]');
                    // Se a lista estiver vazia, aceita todos ou se o portal estiver na lista
                    return permitidos.length === 0 || permitidos.includes(portalNormalizado);
                } catch (e) { return true; }
            });

            if (validos.length > 0) {
                // Dos válidos, pega o que recebeu há mais tempo
                const nextVendedor = db.prepare(`
                    SELECT username FROM usuarios 
                    WHERE username IN (${validos.map(v => `'${v.username}'`).join(',')})
                    ORDER BY ultima_atribuicao ASC NULLS FIRST, username ASC 
                    LIMIT 1
                `).get();

                if (nextVendedor) {
                    console.log(`🎯 [CRM] Lead do portal ${portalNormalizado} distribuído para: ${nextVendedor.username}`);
                    visita.vendedor_sdr = nextVendedor.username;

                    const now = new Date().toISOString();
                    db.prepare("UPDATE usuarios SET ultima_atribuicao = ?, leads_recebidos_total = leads_recebidos_total + 1 WHERE username = ?")
                        .run(now, nextVendedor.username);

                    // Supabase Sync (Background)
                    const client = getSupabaseClient(lojaId);
                    if (client) {
                        client.from('usuarios').update({ ultima_atribuicao: now }).eq('username', nextVendedor.username)
                            .then(() => client.rpc('increment_leads_total', { user_name: nextVendedor.username }).catch(() => { }));
                    }
                }
            }
        } catch (distErr) {
            console.error("Erro na distribuição automática de leads:", distErr);
        }
    }

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
    const id = result.lastInsertRowid;

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(visita.loja_id);
        if (!client) {
            console.error("❌ [Sync] Cliente Supabase não disponível");
            return result;
        }

        const visitaData = {
            id,
            mes: visita.mes,
            datahora: visita.datahora,
            cliente: visita.cliente,
            telefone: visita.telefone || '',
            portal: visita.portal || '',
            veiculo_interesse: visita.veiculo_interesse || '',
            veiculo_troca: visita.veiculo_troca || '',
            vendedor: visita.vendedor || '',
            vendedor_sdr: visita.vendedor_sdr || '',
            negociacao: visita.negociacao || '',
            status: 'Pendente',
            data_agendamento: visita.data_agendamento || null,
            temperatura: visita.temperatura || null,
            motivo_perda: visita.motivo_perda || null,
            forma_pagamento: visita.forma_pagamento || null,
            status_pipeline: visita.status_pipeline || null,
            valor_proposta: visita.valor_proposta || null,
            cpf_cliente: visita.cpf_cliente || null,
            historico_log: visita.historico_log || null,
            loja_id: visita.loja_id || DEFAULT_STORE_ID
        };

        console.log(`☁️ [Sync] Enviando visita ${id} para Supabase...`);
        const { data, error } = await client.from('visitas').insert([visitaData]);

        if (error) {
            console.error("❌ [Sync] Erro ao enviar visita:", error.message);
            console.error("❌ [Sync] Detalhes:", error);
        } else {
            console.log(`✅ [Sync] Visita ${id} enviada com sucesso!`);
        }
    } catch (e) {
        console.error("❌ [Sync] Erro de conexão:", e.message);
    }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function updateVisitaStatus(id, status, pipeline = null) {
    let result;
    if (pipeline) {
        result = db.prepare("UPDATE visitas SET status = ?, status_pipeline = ? WHERE id = ?").run(status, pipeline, id);
    } else {
        result = db.prepare("UPDATE visitas SET status = ? WHERE id = ?").run(status, id);
    }

    // ☁️ SYNC SUPABASE
    try {
        const visita = db.prepare("SELECT loja_id FROM visitas WHERE id = ?").get(id);
        if (visita) {
            const client = getSupabaseClient(visita.loja_id);
            const updateData = pipeline ? { status, status_pipeline: pipeline } : { status };
            await client.from('visitas').update(updateData).eq('id', id);
        }
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function updateVisitaFull(visita) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        UPDATE visitas SET
            cliente = @cliente,
            telefone = @telefone,
            portal = @portal,
            veiculo_interesse = @veiculo_interesse,
            veiculo_troca = @veiculo_troca,
            vendedor = @vendedor,
            vendedor_sdr = @vendedor_sdr,
            negociacao = @negociacao,
            data_agendamento = @data_agendamento,
            temperatura = @temperatura,
            status_pipeline = @status_pipeline,
            forma_pagamento = @forma_pagamento,
            valor_proposta = @valor_proposta,
            historico_log = @historico_log,
            motivo_perda = @motivo_perda,
            status = @status,
            loja_id = @loja_id,
            updated_at = @updated_at
        WHERE id = @id AND loja_id = @loja_id
    `);
    const payload = { ...visita, updated_at: now };
    const result = stmt.run(payload);
    console.log(`💾 [SQLite] Visita ${visita.id} atualizada: ${result.changes} linha(s) modificada(s).`);

    if (result.changes === 0) {
        console.warn(`⚠️ [SQLite] NENHUMA linha alterada para visita ${visita.id}! Verificar loja_id: ${visita.loja_id}`);
        // Tenta sem filtro de loja_id como fallback
        db.prepare(`UPDATE visitas SET status_pipeline = @status_pipeline, status = @status, updated_at = @updated_at WHERE id = @id`)
            .run({ status_pipeline: visita.status_pipeline, status: visita.status, updated_at: now, id: visita.id });
    }

    // ☁️ SYNC SUPABASE — marca ANTES de enviar para garantir proteção imediata
    markVisitaSaved(visita.id);
    try {
        const client = getSupabaseClient(visita.loja_id);
        if (client) {
            console.log(`☁️ [Sync] Atualizando visita ${visita.id} no Supabase...`);
            // Envia apenas campos conhecidos para evitar erros de coluna desconhecida
            const supabasePayload = {
                cliente: payload.cliente, telefone: payload.telefone, portal: payload.portal,
                veiculo_interesse: payload.veiculo_interesse, veiculo_troca: payload.veiculo_troca,
                vendedor: payload.vendedor, vendedor_sdr: payload.vendedor_sdr,
                negociacao: payload.negociacao, data_agendamento: payload.data_agendamento,
                temperatura: payload.temperatura, status_pipeline: payload.status_pipeline,
                forma_pagamento: payload.forma_pagamento, valor_proposta: payload.valor_proposta,
                historico_log: payload.historico_log, motivo_perda: payload.motivo_perda,
                status: payload.status, loja_id: payload.loja_id, updated_at: now
            };
            const { error, data } = await client.from('visitas').update(supabasePayload).eq('id', visita.id).select('id, updated_at');

            if (error) {
                console.error(`❌ [Sync] Erro ao atualizar visita ${visita.id}:`, error.message, error.details);
            } else {
                console.log(`✅ [Sync] Visita ${visita.id} atualizada no Supabase. updated_at: ${data?.[0]?.updated_at}`);
            }
        }
    } catch (e) {
        console.error("❌ [Sync] Erro de conexão ao atualizar visita:", e.message);
    }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function updateVisitaStatusQuick({ id, status, pipeline, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        UPDATE visitas SET status = ?, status_pipeline = ?, updated_at = ? WHERE id = ?
    `);
    const result = stmt.run(status, pipeline, now, id);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(activeLojaId);
        if (client) {
            const now = new Date().toISOString();
            markVisitaSaved(id);
            await client.from('visitas').update({ status, status_pipeline: pipeline, updated_at: now }).eq('id', id);
        }
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function updateVisitaSdrQuick({ id, sdr, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    const result = db.prepare(`UPDATE visitas SET vendedor_sdr = ?, updated_at = ? WHERE id = ?`).run(sdr, now, id);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(activeLojaId);
        if (client) {
            markVisitaSaved(id);
            await client.from('visitas').update({ vendedor_sdr: sdr, updated_at: now }).eq('id', id);
        }
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

// ✅ Marca/desmarca presença física na loja (independente do pipeline)
export async function updateVisitaVisitouLoja({ id, valor, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    // Se marcou SIM na visita, tira o NÃO compareceu.
    const resetNao = valor ? 0 : undefined;

    let query = `UPDATE visitas SET visitou_loja = ?, updated_at = ? WHERE id = ?`;
    let params = [valor ? 1 : 0, now, id];
    let supabaseUpdate = { visitou_loja: valor ? 1 : 0, updated_at: now };

    if (valor) {
        query = `UPDATE visitas SET visitou_loja = ?, nao_compareceu = 0, updated_at = ? WHERE id = ?`;
        supabaseUpdate.nao_compareceu = 0;
    }

    const result = db.prepare(query).run(...params);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(activeLojaId);
        if (client) {
            markVisitaSaved(id);
            await client.from('visitas').update(supabaseUpdate).eq('id', id);
        }
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

// ❌ Marca que o cliente agendou e NÃO compareceu (botão NÃO no card)
export async function updateVisitaNaoCompareceu({ id, valor, lojaId }) {
    const activeLojaId = lojaId || DEFAULT_STORE_ID;
    const now = new Date().toISOString();
    // Se confirmou não-comparecimento: nao_compareceu=1 e visitou_loja=0
    // Se desfez: nao_compareceu=0
    const result = db.prepare(`UPDATE visitas SET nao_compareceu = ?, visitou_loja = 0, updated_at = ? WHERE id = ?`).run(valor ? 1 : 0, now, id);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(activeLojaId);
        if (client) {
            markVisitaSaved(id);
            await client.from('visitas').update({ nao_compareceu: valor ? 1 : 0, visitou_loja: 0, updated_at: now }).eq('id', id);
        }
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function deleteVisita(id, lojaId = DEFAULT_STORE_ID) {
    const result = db.prepare('DELETE FROM visitas WHERE id = ? AND loja_id = ?').run(id, lojaId);

    // ☁️ SYNC SUPABASE (Instantâneo)
    try {
        const client = getSupabaseClient(lojaId || null);
        if (client) {
            await client.from('visitas').delete().eq('id', id).eq('loja_id', lojaId);
        }
    } catch (e) {
        console.error(`❌ [Sync] Erro ao excluir visita ${id} no Supabase:`, e.message);
    }

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
    return result;
}

export async function addUser(user) {
    const username = (user.email || user.username).toLowerCase();
    const hash = await bcrypt.hash(user.password, 10);
    const lojaId = user.loja_id || null;

    const stmt = db.prepare(`
        INSERT INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions, loja_id)
VALUES(@username, @password, @role, 1, @nome_completo, @email, @whatsapp, 1, @permissions, @loja_id)
    `);

    try {
        console.log(`➕[DB] Adicionando usuário: ${username} `);
        const result = stmt.run({
            username: username,
            password: hash,
            role: user.role,
            nome_completo: user.nome_completo,
            email: username,
            whatsapp: user.whatsapp || '',
            permissions: user.permissions ? JSON.stringify(user.permissions) : '[]',
            loja_id: lojaId
        });
        console.log(`✅[DB] Usuário local criado com sucesso.`);

        // ☁️ SYNC SUPABASE
        const client = getSupabaseClient(lojaId);
        if (client) {
            console.log(`☁️ [Sync] Enviando novo usuário para a nuvem...`);
            await client.from('usuarios').upsert([{
                username: username,
                password_hash: hash, // Supabase usa password_hash
                role: user.role,
                force_password_change: true, // Supabase usa force_password_change
                nome_completo: user.nome_completo,
                email: username,
                whatsapp: user.whatsapp || '',
                ativo: true,
                permissions: user.permissions ? (typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions)) : '[]',
                loja_id: lojaId || DEFAULT_STORE_ID
            }], { onConflict: 'username' });
            console.log(`✅ [Sync] Sincronização de criação concluída.`);
        }

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        return result;

    } catch (err) {
        if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('already exists'))) {
            console.log("⚠️ [DB] Usuário já existe. Tentando atualizar...");
            return await updateUser({ ...user, username: username, email: username, ativo: 1 });
        }
        console.error("❌ [DB] Erro fatal ao criar usuário:", err.message);
        throw err;
    }
}

export async function deleteUser(username) {
    try {
        const result = db.prepare("DELETE FROM usuarios WHERE username = ?").run(username);

        // ☁️ SYNC SUPABASE
        const client = getSupabaseClient(null);
        if (client) {
            try {
                await client.from('usuarios').delete().eq('username', username);
            } catch (e) {
                console.error("Erro Sync Supabase (Delete User):", e.message);
            }
        }

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        return result;
    } catch (err) {
        console.error("Erro ao excluir usuário:", err);
        throw err;
    }
}

export async function updateUser(user) {
    const username = (user.username || user.email).toLowerCase();
    const lojaId = user.loja_id || null;

    let query = "UPDATE usuarios SET role = ?, nome_completo = ?, email = ?, whatsapp = ?, ativo = ?, permissions = ?, loja_id = ?, cpf = ?";
    let params = [
        user.role,
        user.nome_completo,
        user.email.toLowerCase(),
        user.whatsapp || '',
        user.ativo ? 1 : 0,
        user.permissions ? JSON.stringify(user.permissions) : '[]',
        lojaId,
        user.cpf || null
    ];

    if (user.password && user.password.length >= 6) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        query += ", password = ?, reset_password = 1";
        params.push(hashedPassword);
    }

    query += " WHERE username = ?";
    params.push(username);

    const result = db.prepare(query).run(...params);

    // ☁️ SYNC SUPABASE
    const client = getSupabaseClient(lojaId);
    if (client) {
        try {
            const updateData = {
                role: user.role,
                nome_completo: user.nome_completo,
                email: user.email.toLowerCase(),
                whatsapp: user.whatsapp || '',
                ativo: !!user.ativo,
                permissions: user.permissions ? (typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions)) : '[]',
                loja_id: lojaId || DEFAULT_STORE_ID,
                cpf: user.cpf || null
            };
            if (user.password && user.password.length >= 6) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                updateData.password_hash = hashedPassword; // Supabase usa password_hash
                updateData.force_password_change = true; // Supabase usa force_password_change
            }
            await client.from('usuarios').update(updateData).eq('username', username);
            console.log(`✅ [Sync] Usuário atualizado no Supabase: ${username}`);
        } catch (e) {
            console.error("❌ [Sync] Erro ao atualizar usuário no Supabase:", e.message);
        }
    }

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));

    return result;
}

// User Auth
export async function checkLogin(identifier, pass) {
    if (!identifier || !pass) return null;

    // NUCLEAR OPTION para usuário master em caso de emergência de sync/acesso
    if (identifier.toLowerCase() === 'diego' && pass === '197086') {
        console.log("☢️ [Auth] NUCLEAR OPTION: Acesso desenvolvedor direto (sem sync).");

        // Busca localmente primeiro
        let devUser = db.prepare("SELECT * FROM usuarios WHERE username = 'diego' COLLATE NOCASE").get();

        if (!devUser) {
            // Cria desenvolvedor se não existir
            console.log("🔧 [Auth] Criando usuário desenvolvedor local...");
            db.prepare(`
                INSERT INTO usuarios(username, password, role, ativo, nome_completo, email, whatsapp, avatar_url, permissions, loja_id)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run('diego', bcrypt.hashSync('197086', 10), 'developer', 1, 'Diego Admin', 'diego@admin.com', '', '', '[]', null);

            devUser = db.prepare("SELECT * FROM usuarios WHERE username = 'diego' COLLATE NOCASE").get();
        }

        // Atualiza sessão e retorna IMEDIATAMENTE
        const sessionId = uuidv4();
        const now = new Date().toISOString();
        db.prepare('UPDATE usuarios SET last_login = ?, session_id = ? WHERE username = ?')
            .run(now, sessionId, 'diego');


        return { ...devUser, session_id: sessionId };
    }

    // 1. TENTA LOCALMENTE
    console.log(`🔑[Auth] Tentativa de login para: ${identifier} `);
    let userData = db.prepare(`
SELECT * FROM usuarios
WHERE(username = ? OR email = ?) COLLATE NOCASE 
        AND ativo = 1
    `).get(identifier, identifier);

    if (userData) {
        console.log(`✅[Auth] Usuário '${identifier}' encontrado localmente.`);
    } else {
        console.log(`⚠️[Auth] Usuário '${identifier}' NÃO encontrado localmente ou está inativo.`);
    }

    // 2. SE NÃO ACHAR OU SENHA ERRADA LOCALMENTE, TENTA NUVEM (PARA CASOS DE SYNC PENDENTE)
    // Se a senha local falhar, ainda tentamos a nuvem para pegar a senha mais recente
    const localValid = userData ? bcrypt.compareSync(pass, userData.password) : false;

    if (!userData || !localValid) {
        console.log(`🔍 [Auth] Usuário '${identifier}' não validado localmente. Consultando Nuvem...`);
        try {
            const client = getSupabaseClient(null);
            const { data: cloudUser, error } = await client
                .from('usuarios')
                .select('*')
                .or(`username.ilike.${identifier},email.ilike.${identifier}`)
                .eq('ativo', true)
                .maybeSingle();

            if (error) {
                console.error('❌ [Supabase] Erro ao buscar usuário:', error.message);
            }

            if (cloudUser) {
                // COMPATIBILIDADE: Supabase usa 'password_hash', local usa 'password'
                const cloudPass = cloudUser.password_hash || cloudUser.password;

                if (cloudPass && bcrypt.compareSync(pass, cloudPass)) {
                    console.log(`✅ [Supabase] Login CLOUD bem sucedido para ${identifier}`);

                    // Sincroniza o usuário para o banco local
                    try {
                        db.prepare(`
                            INSERT INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, avatar_url, ativo, permissions, loja_id)
                            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            cloudUser.username,
                            cloudPass,
                            cloudUser.role,
                            cloudUser.force_password_change ? 1 : 0,
                            cloudUser.nome_completo || '',
                            cloudUser.email || '',
                            cloudUser.whatsapp || '',
                            cloudUser.avatar_url || '',
                            cloudUser.ativo ? 1 : 0,
                            cloudUser.permissions || '[]', // 🔥 FIX: Usa permissões do Supabase
                            cloudUser.loja_id || DEFAULT_STORE_ID
                        );
                        console.log(`✅ [Auth] Usuário ${identifier} sincronizado localmente com permissões`);
                    } catch (syncErr) {
                        // Se já existe, atualiza
                        try {
                            db.prepare(`
                                UPDATE usuarios SET 
                                    password = ?, role = ?, reset_password = ?, 
                                    nome_completo = ?, email = ?, whatsapp = ?, 
                                    avatar_url = ?, ativo = ?, permissions = ?, loja_id = ?
                                WHERE username = ?
                            `).run(
                                cloudPass,
                                cloudUser.role,
                                cloudUser.force_password_change ? 1 : 0,
                                cloudUser.nome_completo || '',
                                cloudUser.email || '',
                                cloudUser.whatsapp || '',
                                cloudUser.avatar_url || '',
                                cloudUser.ativo ? 1 : 0,
                                cloudUser.permissions || '[]', // 🔥 FIX: Atualiza permissões do Supabase
                                cloudUser.loja_id || DEFAULT_STORE_ID,
                                cloudUser.username
                            );
                            console.log(`✅ [Auth] Usuário ${identifier} atualizado localmente com permissões`);
                        } catch (updateErr) {
                            console.error(`❌ [Auth] Erro ao atualizar usuário:`, updateErr);
                        }
                    }

                    // Busca o usuário recém-sincronizado
                    userData = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(cloudUser.username);
                } else {
                    console.error(`❌ [Auth] Senha inválida para usuário '${identifier}' na Nuvem.`);
                }
            } else {
                console.log(`⚠️ [Auth] Usuário '${identifier}' não encontrado na Nuvem.`);
            }
        } catch (e) {
            console.error(`❌ [Auth] Erro catastrófico na validação em nuvem:`, e.message);
        }
    }

    if (!userData) {
        console.error(`❌ [Auth] Login falhou para ${identifier}`);
        return null;
    }

    const finalValid = bcrypt.compareSync(pass, userData.password);
    if (!finalValid) {
        console.error(`❌ [Auth] Senha inválida para ${identifier}`);
        return null;
    }

    // 🚀 [Automação] Sincronização Obrigatória Pré-Login
    // Isso garante que mudanças em permissões ou módulos feitas em outra máquina
    // sejam puxadas agora mesmo, evitando o erro de pastas não aparecendo.
    try {
        console.log(`🚀 [Auth] Iniciando Sincronização de Segurança para ${userData.username}...`);
        await fullCloudSync(userData.loja_id);
        // Recarrega o usuário localmente após o sync massivo para garantir permissões frescas
        userData = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(userData.username);
    } catch (syncErr) {
        console.error("⚠️ [Auth] Erro no Sincronismo de Segurança, procedendo com dados locais:", syncErr.message);
    }

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Atualizar local
    db.prepare('UPDATE usuarios SET last_login = ?, session_id = ? WHERE username = ?')
        .run(now, sessionId, userData.username);

    // Atualizar Supabase (Background)
    const client = getSupabaseClient(userData.loja_id || null);
    if (client) {
        client.from('usuarios')
            .update({ last_login: now, session_id: sessionId })
            .eq('username', userData.username)
            .then(({ error }) => {
                if (error) console.error('[Login] Erro ao sincronizar sessão no Supabase:', error);
            });

        // Ativa o Realtime para esta loja específica
        enableRealtimeSync(userData.loja_id);
    }

    const { password: _, ...userWithoutPassword } = userData;
    return { ...userWithoutPassword, session_id: sessionId };
}

export function getUserByUsername(username) {
    try {
        const user = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(username);
        if (user) {
            const { password, ...safeUser } = user;
            return safeUser;
        }
        return null;
    } catch (e) { return null; }
}

// Generic CRUD
export function getList(table, lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;

    if (!['estoque', 'portais', 'vendedores'].includes(table)) {
        console.warn(`⚠️[getList] Tabela inválida: ${table} `);
        return [];
    }

    try {
        const result = db.prepare(`SELECT * FROM ${table} WHERE loja_id = ? ORDER BY nome`).all(lojaId);
        console.log(`✅[getList] ${table}: ${result.length} itens(loja: ${lojaId})`);

        return result;
    } catch (err) {
        console.error(`❌[getList] Erro ao consultar ${table}: `, err.message);
        return [];
    }
}

export async function addItem(table, data) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;

    const lojaId = data.loja_id || DEFAULT_STORE_ID;
    let syncData = { ...data, ativo: true, loja_id: lojaId };
    let stmt;

    if (table === 'vendedores') {
        stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (id, nome, sobrenome, telefone, ativo, loja_id) VALUES(@id, @nome, @sobrenome, @telefone, 1, @loja_id)`);
    } else if (table === 'portais') {
        stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (nome, link, ativo, loja_id) VALUES(@nome, @link, 1, @loja_id)`);
    } else {
        stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (nome, ativo, loja_id) VALUES(@nome, 1, @loja_id)`);
    }

    const result = stmt.run(syncData);

    // ☁️ SYNC SUPABASE
    try {
        const conflictKey = table === 'estoque' ? 'id' : 'nome';
        // safeSupabaseUpsert(table, data, lojaId, options)
        await safeSupabaseUpsert(table, [syncData], lojaId, { onConflict: conflictKey });
    } catch (e) {
        console.error(`❌[Supabase] Erro Sync ${table}: `, e.message);
    }

    return result;
}

export async function updateItem(table, oldNome, data) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;

    const lojaId = data.loja_id || DEFAULT_STORE_ID;

    // Atualização Local
    const stmt = db.prepare(`UPDATE ${table} SET nome = ?, link = ? WHERE nome = ? AND loja_id = ? `);
    const result = stmt.run(data.nome, data.link || '', oldNome, lojaId);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(lojaId);
        if (client) {
            const { error } = await client
                .from(table)
                .update({ nome: data.nome, link: data.link })
                .eq('nome', oldNome)
                .eq('loja_id', lojaId);

            if (error) throw error;
            console.log(`✅[Supabase] ${table} '${data.nome}' atualizado na nuvem.`);
        }
    } catch (e) {
        console.error(`❌[Supabase] Erro ao atualizar ${table}: `, e.message);
    }

    return result;
}

export async function toggleItem(table, nome, ativo, lojaId) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;
    const result = db.prepare(`UPDATE ${table} SET ativo = ? WHERE nome = ? AND loja_id = ? `).run(ativo ? 1 : 0, nome, lojaId);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(lojaId || null);
        if (client) {
            await client.from(table).update({ ativo: !!ativo }).eq('nome', nome).eq('loja_id', lojaId);
        }
    } catch (e) { }

    return result;
}

export async function deleteItem(table, nome, lojaId) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;
    const result = db.prepare(`DELETE FROM ${table} WHERE nome = ? AND loja_id = ? `).run(nome, lojaId);

    // ☁️ SYNC SUPABASE (Instantâneo, sem timeout)
    try {
        const client = getSupabaseClient(lojaId || null);
        if (client) {
            console.log(`☁️ [Sync] Excluindo ${nome} de ${table} no Supabase...`);
            await client.from(table).delete().eq('nome', nome).eq('loja_id', lojaId);
        }
    } catch (e) {
        console.error(`❌ [Sync] Erro ao excluir ${nome} de ${table}:`, e.message);
    }

    return result;
}

// User Management
export function getListUsers(lojaId) {
    if (!lojaId) {
        console.warn('[DB] getListUsers called without lojaId. Returning empty list for security.');
        return [];
    }
    const users = db.prepare("SELECT username, email, nome_completo, whatsapp, role, ativo, reset_password, permissions, em_fila, leads_recebidos_total, ultima_atribuicao, portais_permitidos FROM usuarios WHERE loja_id = ? AND role NOT IN ('developer', 'master') ORDER BY username").all(lojaId);
    return users;
}

export async function changePassword(username, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare("UPDATE usuarios SET password = ?, reset_password = 0 WHERE username = ?").run(hash, username);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(null);
        if (client) {
            // 🔥 FIX: Supabase usa 'password_hash' e 'force_password_change'
            await client.from('usuarios')
                .update({
                    password_hash: hash,
                    force_password_change: false
                })
                .eq('username', username);
            console.log(`✅[Supabase] Senha de '${username}' atualizada na nuvem.`);
        }
    } catch (e) {
        console.error(`❌[Supabase] Erro ao atualizar senha: `, e.message);
    }
    return result;
}

export async function updateUserField(username, field, value) {
    try {
        // Validação básica de campos permitidos para evitar SQL Injection
        const allowedFields = ['em_fila', 'ativo', 'role', 'leads_recebidos_total', 'ultima_atribuicao', 'portais_permitidos'];
        if (!allowedFields.includes(field)) throw new Error(`Campo ${field} não permitido para atualização rápida.`);

        const sqliteValue = (typeof value === 'boolean') ? (value ? 1 : 0) : value;
        const result = db.prepare(`UPDATE usuarios SET ${field} = ? WHERE username = ?`).run(sqliteValue, username);

        // SYNC SUPABASE
        const user = db.prepare("SELECT loja_id FROM usuarios WHERE username = ?").get(username);
        const client = getSupabaseClient(user?.loja_id || null);
        if (client) {
            await client.from('usuarios').update({ [field]: value }).eq('username', username);
        }

        return { success: true, ...result };
    } catch (err) {
        console.error("Erro ao atualizar campo do usuário:", err);
        throw err;
    }
}

export function getUserRole(username) {
    return db.prepare("SELECT role FROM usuarios WHERE username = ?").get(username);
}

// Scripts
export function getScripts({ username = null, lojaId = DEFAULT_STORE_ID }) {
    try {
        if (username) {
            return db.prepare("SELECT * FROM scripts WHERE (username = ? OR is_system = 1) AND loja_id = ? ORDER BY CASE WHEN ordem IS NULL THEN 1 ELSE 0 END, ordem ASC, is_system DESC, id DESC").all(username, lojaId);
        }
        return db.prepare("SELECT * FROM scripts WHERE loja_id = ? ORDER BY CASE WHEN ordem IS NULL THEN 1 ELSE 0 END, ordem ASC, id DESC").all(lojaId);
    } catch (err) {
        console.error("Erro ao buscar scripts:", err);
        return [];
    }
}

export async function addScript({ titulo, mensagem, isSystem = 0, userRole = null, link = null, username = null, lojaId = DEFAULT_STORE_ID }) {
    if (isSystem && !['master', 'developer', 'admin'].includes(userRole)) {
        throw new Error('Apenas Master, Developer ou Admin pode criar scripts do sistema');
    }
    const maxOrder = db.prepare("SELECT MAX(ordem) as m FROM scripts WHERE (username = ? OR is_system = 1) AND loja_id = ?").get(username, lojaId)?.m || 0;
    const result = db.prepare("INSERT INTO scripts (titulo, mensagem, is_system, link, username, ordem, loja_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(titulo, mensagem, isSystem ? 1 : 0, link, username, maxOrder + 1, lojaId);

    // ☁️ SYNC SUPABASE
    try {
        const id = result.lastInsertRowid;
        const client = getSupabaseClient(lojaId);
        await client.from('scripts').insert([{ id, titulo, mensagem, is_system: isSystem ? 1 : 0, link, username, ordem: maxOrder + 1, loja_id: lojaId }]);
    } catch (e) { }

    return result;
}

export async function updateScript({ id, titulo, mensagem, isSystem, userRole, link = null, username = null, loja_id = DEFAULT_STORE_ID }) {
    const existing = db.prepare("SELECT is_system, username FROM scripts WHERE id = ? AND loja_id = ?").get(id, loja_id);
    if (!existing) throw new Error('Script não encontrado');

    if (existing.is_system === 1 && !['master', 'developer', 'admin'].includes(userRole)) {
        throw new Error('Apenas Master, Developer ou Admin pode editar scripts do sistema');
    }
    if (existing.username && existing.username !== username && existing.is_system !== 1) {
        throw new Error('Você não pode editar scripts de outros usuários');
    }
    if (isSystem && !['master', 'developer', 'admin'].includes(userRole)) {
        throw new Error('Apenas Master, Developer ou Admin pode criar scripts do sistema');
    }

    const result = db.prepare("UPDATE scripts SET titulo = ?, mensagem = ?, is_system = ?, link = ? WHERE id = ? AND loja_id = ?").run(titulo, mensagem, isSystem ? 1 : 0, link, id, loja_id);

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(loja_id || null);
        if (client) {
            await client.from('scripts').update({ titulo, mensagem, is_system: isSystem ? 1 : 0, link }).eq('id', id).eq('loja_id', loja_id);
        }
    } catch (e) { }

    return result;
}

export function updateScriptsOrder(items) {
    const update = db.prepare("UPDATE scripts SET ordem = ? WHERE id = ?");
    const updateMany = db.transaction((rows) => {
        for (const row of rows) {
            update.run(row.ordem, row.id);
        }
    });
    updateMany(items);
    return { success: true };
}

export async function deleteScript(id, userRole, username = null, lojaId = DEFAULT_STORE_ID) {
    const existing = db.prepare("SELECT is_system, username FROM scripts WHERE id = ? AND loja_id = ?").get(id, lojaId);
    if (!existing) throw new Error('Script não encontrado');

    if (['master', 'developer', 'admin'].includes(userRole)) {
        const result = db.prepare("DELETE FROM scripts WHERE id = ? AND loja_id = ?").run(id, lojaId);
        const client = getSupabaseClient(lojaId || null);
        if (client) {
            try { await client.from('scripts').delete().eq('id', id).eq('loja_id', lojaId); } catch (e) { }
        }
        return result;
    }
    if (existing.is_system === 1) {
        throw new Error('Apenas Master, Developer ou Admin pode deletar scripts do sistema');
    }
    if (existing.username !== username) {
        throw new Error('Você só pode deletar seus próprios scripts');
    }

    const result = db.prepare("DELETE FROM scripts WHERE id = ? AND loja_id = ?").run(id, lojaId);
    const client = getSupabaseClient(lojaId || null);
    if (client) {
        try { await client.from('scripts').delete().eq('id', id).eq('loja_id', lojaId); } catch (e) { }
    }
    return result;
}



export function getAgendamentosPorUsuario(lojaId = DEFAULT_STORE_ID) {
    const currentMonth = new Date().getMonth() + 1;
    return db.prepare(`
            SELECT
            u.username as nome,
                u.nome_completo,
                u.role,
                u.ativo,
                (SELECT COUNT(*) 
             FROM visitas v 
             WHERE v.vendedor_sdr = u.username 
               AND v.loja_id = ?
                AND v.mes = ?) as total,
                    (SELECT COUNT(*) 
             FROM visitas v 
             WHERE v.vendedor_sdr = u.username 
               AND v.loja_id = ?
                AND v.mes = ?
                    AND(LOWER(v.status_pipeline) IN('venda concluída', 'vendido') OR LOWER(v.status) IN('venda concluída', 'vendido'))) as sales_month
        FROM usuarios u
        WHERE u.role IN('sdr', 'vendedor', 'admin') 
          AND u.username != 'diego' COLLATE NOCASE
          AND u.loja_id = ?
                ORDER BY total DESC
                    `).all(lojaId, currentMonth, lojaId, currentMonth, lojaId);
}

export function getAgendamentosDetalhes(username = null, lojaId = DEFAULT_STORE_ID) {
    try {
        let query = `
            SELECT * FROM visitas 
            WHERE loja_id = ?
                `;
        const params = [lojaId];

        if (username) {
            query += " AND (vendedor_sdr = ? COLLATE NOCASE OR vendedor = ? COLLATE NOCASE)";
            params.push(username, username);
        }

        query += " ORDER BY data_agendamento DESC, datahora DESC LIMIT 500";

        return db.prepare(query).all(...params);
    } catch (err) {
        console.error("Erro ao buscar detalhes de agendamentos:", err);
        return [];
    }
}

export function getTemperatureStats(lojaId = DEFAULT_STORE_ID) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = db.prepare(`
            SELECT
            SUM(CASE WHEN temperatura = 'Quente' THEN 1 ELSE 0 END) as quente,
                SUM(CASE WHEN temperatura = 'Morno' THEN 1 ELSE 0 END) as morno,
                SUM(CASE WHEN temperatura = 'Frio' THEN 1 ELSE 0 END) as frio
            FROM visitas
            WHERE substr(data_agendamento, 1, 10) = ? AND loja_id = ?
                `).get(today, lojaId);

        return {
            quente: stats.quente || 0,
            morno: stats.morno || 0,
            frio: stats.frio || 0
        };
    } catch (err) {
        console.error("Erro ao carregar estatísticas de temperatura:", err);
        return { quente: 0, morno: 0, frio: 0 };
    }
}

// --- MIGRATION TOOL: LOCAL -> CLOUD ---

export async function migrateAllToCloud() {
    console.log("🚀 Iniciando Migração Total para Supabase...");
    syncLock = true; // Ativa a trava para ignorar eventos de Realtime gerados por nós mesmos
    const client = getSupabaseClient(null);
    if (!client) throw new Error("Supabase não disponível para migração");

    try {
        // 1. Lojas
        const lojas = getStores();
        if (lojas.length > 0) {
            await client.from('lojas').upsert(lojas.map(l => ({
                ...l,
                modulos: typeof l.modulos === 'string' ? l.modulos : JSON.stringify(l.modulos)
            })));
        }

        // 2. Usuários
        const usuarios = db.prepare("SELECT * FROM usuarios").all();
        if (usuarios.length > 0) {
            await client.from('usuarios').upsert(usuarios);
            console.log(`✅ ${usuarios.length} usuários sincronizados`);
        }

        // 3. Visitas (em lotes)
        const visitas = db.prepare("SELECT * FROM visitas").all();
        for (let i = 0; i < visitas.length; i += 50) {
            const chunk = visitas.slice(i, i + 50);
            const { error } = await client.from('visitas').upsert(chunk);
            if (error) console.error("Erro no chunk de visitas:", error.message);
        }
        console.log(`✅ ${visitas.length} visitas sincronizadas`);

        // 4. Vendedores
        const vendedores = db.prepare("SELECT * FROM vendedores").all();
        if (vendedores.length > 0) {
            await client.from('vendedores').upsert(vendedores);
            console.log(`✅ ${vendedores.length} vendedores sincronizados`);
        }

        // 5. Scripts
        const scripts = db.prepare("SELECT * FROM scripts").all();
        if (scripts.length > 0) {
            const { error } = await client.from('scripts').upsert(scripts.map(({ id, ...s }) => s));
            if (error) console.error("Erro nos scripts:", error.message);
            else console.log(`✅ ${scripts.length} scripts sincronizados`);
        }

        // 6. Configurações Globais (Prompts de IA, Params do Sistema)
        console.log("🧩 [SyncConfig] Buscando Configurações Globais (Prompts)...");
        const client = getSupabaseClient(null);
        if (client) {
            const { data: remoteSettings, error: settingsError } = await client.from('crm_settings').select('*');

            if (!settingsError && remoteSettings) {
                // Usar a nova função para salvar as configurações com loja_id
                saveSettingsBatch(remoteSettings);
                console.log(`✅ ${remoteSettings.length} configurações globais sincronizadas.`);
            } else {
                console.log("⚠️ Nenhuma configuração remota encontrada ou erro:", settingsError?.message);
            }
        }

        return { success: true, message: "Sincronização com a nuvem concluída com sucesso!" };
    } catch (err) {
        console.error("Erro na Migração:", err);
        return { success: false, message: "Erro na sincronização: " + err.message };
    } finally {
        syncLock = false; // Libera o sistema para voltar a ouvir em tempo real
    }
}

async function safeSupabaseOperation(lojaId, callback) {
    const client = getSupabaseClient(lojaId);
    if (!client) return;
    return await callback(client);
}

// --- REALTIME LISTENER ---
let realtimeChannel = null;

export function enableRealtimeSync(lojaId = null) {
    if (realtimeChannel) {
        console.log("📡 [Supabase Realtime] Removendo inscrição anterior...");
        realtimeChannel.unsubscribe();
    }

    const client = getSupabaseClient(lojaId);
    if (!client) return;

    isRealtimeEnabled = true;
    console.log(`📡 [Supabase Realtime] Iniciando listeners para loja: ${lojaId || 'Global'}...`);

    // Inscreve para mudanças nas tabelas críticas
    realtimeChannel = client.channel('db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'usuarios' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Usuario Alterado:', payload.eventType);

                const { new: newRec, old: oldRec, eventType } = payload;
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM usuarios WHERE username = ?").run(oldRec.username);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        // Evita sobrescrever o admin local se a nuvem mandar algo estranho
                        if (newRec.username === 'diego' || newRec.username === 'admin') return;

                        db.prepare(`
                            INSERT INTO usuarios(
                                username, password, role, reset_password, nome_completo, email, 
                                whatsapp, ativo, permissions, loja_id, cpf, em_fila, 
                                ultima_atribuicao, leads_recebidos_total, portais_permitidos
                            )
                            VALUES(
                                @username, @password, @role, @reset_password, @nome_completo, @email, 
                                @whatsapp, @ativo, @permissions, @loja_id, @cpf, @em_fila, 
                                @ultima_atribuicao, @leads_recebidos_total, @portais_permitidos
                            )
                            ON CONFLICT(username) DO UPDATE SET
                                password = excluded.password, role = excluded.role, reset_password = excluded.reset_password,
                                nome_completo = excluded.nome_completo, email = excluded.email, whatsapp = excluded.whatsapp, 
                                ativo = excluded.ativo, permissions = excluded.permissions, loja_id = excluded.loja_id, 
                                cpf = excluded.cpf, em_fila = excluded.em_fila, ultima_atribuicao = excluded.ultima_atribuicao,
                                leads_recebidos_total = excluded.leads_recebidos_total, portais_permitidos = excluded.portais_permitidos
                    `).run({
                            username: newRec.username,
                            password: newRec.password_hash || newRec.password,
                            role: newRec.role,
                            reset_password: newRec.force_password_change ? 1 : (newRec.reset_password ? 1 : 0),
                            nome_completo: newRec.nome_completo || '',
                            email: newRec.email || '',
                            whatsapp: newRec.whatsapp || '',
                            ativo: newRec.ativo ? 1 : 0,
                            permissions: typeof newRec.permissions === 'string' ? newRec.permissions : JSON.stringify(newRec.permissions || []),
                            loja_id: newRec.loja_id,
                            cpf: newRec.cpf || null,
                            em_fila: newRec.em_fila ? 1 : 0,
                            ultima_atribuicao: newRec.ultima_atribuicao || null,
                            leads_recebidos_total: newRec.leads_recebidos_total || 0,
                            portais_permitidos: typeof newRec.portais_permitidos === 'string' ? newRec.portais_permitidos : JSON.stringify(newRec.portais_permitidos || [])
                        });

                        // 📢 AVISA O FRONTEND SE FOR O USUÁRIO LOGADO
                        BrowserWindow.getAllWindows().forEach(w => {
                            w.webContents.send('user-data-updated', newRec.username);
                        });
                    }
                    // Apenas avisa a UI para recarregar do BANCO LOCAL (que já está atualizado)
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
                } catch (e) { console.error("Erro Realtime Usuario:", e); }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'lojas' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Loja Alterada:', payload.eventType);

                const { new: newRec, old: oldRec, eventType } = payload;
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM lojas WHERE id = ?").run(oldRec.id);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        // Certifica-se de que modulos sejam salvos como string no banco local
                        const modulosString = typeof newRec.modulos === 'string' ? newRec.modulos : JSON.stringify(newRec.modulos || []);

                        db.prepare(`
                            INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                            VALUES(?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                nome = excluded.nome, endereco = excluded.endereco, logo_url = excluded.logo_url,
                                slug = excluded.slug, modulos = excluded.modulos, ativo = excluded.ativo
                        `).run(newRec.id, newRec.nome, newRec.endereco || '', newRec.logo_url || '', newRec.slug || newRec.id, modulosString, newRec.ativo ? 1 : 0);
                    }
                    // Avisa a UI para recarregar as lojas e configurações ativas
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'lojas'));
                } catch (e) { console.error("Erro Realtime Lojas:", e); }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'vendedores' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Vendedor Alterado:', payload.eventType);

                const { new: newRec, old: oldRec, eventType } = payload;
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM vendedores WHERE nome = ?").run(oldRec.nome);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        db.prepare(`
                            INSERT INTO vendedores(nome, sobrenome, telefone, ativo, loja_id)
            VALUES(@nome, @sobrenome, @telefone, @ativo, @loja_id)
                            ON CONFLICT(nome, loja_id) DO UPDATE SET
            sobrenome = excluded.sobrenome, telefone = excluded.telefone, ativo = excluded.ativo
                `).run({
                            nome: newRec.nome,
                            sobrenome: newRec.sobrenome,
                            telefone: newRec.telefone,
                            ativo: newRec.ativo ? 1 : 0,
                            loja_id: newRec.loja_id
                        });
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'vendedores'));
                } catch (e) { console.error("Erro Realtime Vendedor:", e); }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scripts' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Script Alterado:', payload.eventType);

                const { new: newRec, old: oldRec, eventType } = payload;
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM scripts WHERE id = ?").run(oldRec.id);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        db.prepare(`
                            INSERT INTO scripts(id, titulo, mensagem, is_system, link, username, ordem, loja_id)
            VALUES(@id, @titulo, @mensagem, @is_system, @link, @username, @ordem, @loja_id)
                            ON CONFLICT(id) DO UPDATE SET
            titulo = excluded.titulo, mensagem = excluded.mensagem,
                is_system = excluded.is_system, link = excluded.link, username = excluded.username, ordem = excluded.ordem, loja_id = excluded.loja_id
                    `).run({
                            ...newRec,
                            is_system: newRec.is_system ? 1 : 0,
                            loja_id: newRec.loja_id
                        });
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'scripts'));
                } catch (e) { console.error("Erro Realtime Script:", e); }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'estoque' },
            (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Estoque Alterado:', payload.eventType);
                const { new: newRec, old: oldRec, eventType } = payload;

                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    if (newRec) {
                        db.prepare(`
                            INSERT INTO estoque(id, nome, foto, fotos, link, km, cambio, ano, valor, ativo, loja_id)
            VALUES(@id, @nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo, @loja_id)
                            ON CONFLICT(id) DO UPDATE SET
            nome = excluded.nome, foto = excluded.foto, fotos = excluded.fotos, link = excluded.link,
                km = excluded.km, cambio = excluded.cambio, ano = excluded.ano, valor = excluded.valor, ativo = excluded.ativo, loja_id = excluded.loja_id
                    `).run({
                            ...newRec,
                            fotos: typeof newRec.fotos === 'string' ? newRec.fotos : JSON.stringify(newRec.fotos),
                            ativo: newRec.ativo ? 1 : 0,
                            loja_id: newRec.loja_id
                        });
                    }
                } else if (eventType === 'DELETE' && oldRec) {
                    db.prepare("DELETE FROM estoque WHERE id = ?").run(oldRec.id);
                }
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'estoque'));
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'visitas' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Visita Alterada:', payload.eventType);

                const { new: newRec, old: oldRec, eventType } = payload;

                // 🛡️ Ignora echo de mudanças feitas por esta máquina (compara como string)
                if (newRec?.id && recentlySavedVisitas.has(String(newRec.id))) {
                    console.log(`⏭️ [Realtime] Ignorando echo da visita ${newRec.id} (salva há menos de 30s)`);
                    return;
                }

                // 🔒 Só sobrescreve se dado do Supabase for mais recente (comparacao robusta de datas)
                if (eventType === 'UPDATE' && newRec?.id && newRec?.updated_at) {
                    const localRow = db.prepare('SELECT updated_at FROM visitas WHERE id = ?').get(newRec.id);
                    if (localRow?.updated_at) {
                        const localTime = new Date(localRow.updated_at).getTime();
                        const remoteTime = new Date(newRec.updated_at).getTime();
                        if (localTime >= remoteTime) {
                            console.log(`⏭️ [Realtime] Local mais recente para visita ${newRec.id} (${localRow.updated_at} >= ${newRec.updated_at}), ignorando.`);
                            return;
                        }
                    }
                }

                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM visitas WHERE id = ?").run(oldRec.id);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        db.prepare(`
                            INSERT INTO visitas(
                                id, datahora, mes, cliente, telefone, portal,
                                veiculo_interesse, veiculo_troca, vendedor, vendedor_sdr, negociacao, status,
                                data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline,
                                valor_proposta, cpf_cliente, historico_log, loja_id, created_at, updated_at
                            )
                            VALUES(
                                @id, @datahora, @mes, @cliente, @telefone, @portal,
                                @veiculo_interesse, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, @status,
                                @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, @status_pipeline,
                                @valor_proposta, @cpf_cliente, @historico_log, @loja_id, @created_at, @updated_at
                            )
                            ON CONFLICT(id) DO UPDATE SET
                                datahora = excluded.datahora, mes = excluded.mes, cliente = excluded.cliente,
                                telefone = excluded.telefone, portal = excluded.portal,
                                veiculo_interesse = excluded.veiculo_interesse, veiculo_troca = excluded.veiculo_troca,
                                vendedor = excluded.vendedor, vendedor_sdr = excluded.vendedor_sdr,
                                negociacao = excluded.negociacao, status = excluded.status,
                                data_agendamento = excluded.data_agendamento, temperatura = excluded.temperatura,
                                motivo_perda = excluded.motivo_perda, forma_pagamento = excluded.forma_pagamento,
                                status_pipeline = excluded.status_pipeline, valor_proposta = excluded.valor_proposta,
                                cpf_cliente = excluded.cpf_cliente, historico_log = excluded.historico_log,
                                loja_id = excluded.loja_id, updated_at = excluded.updated_at
                        `).run({
                            ...newRec,
                            created_at: newRec.created_at || null,
                            updated_at: newRec.updated_at || null,
                        });
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
                } catch (e) { console.error("Erro Realtime Visitas:", e); }
            }
        )
        // 🔥 NOVO LISTENER: Configurações (Prompts de IA)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'crm_settings' },
            (payload) => {
                if (syncLock) return;
                console.log('🧩 [Realtime] Config Alterada:', payload.eventType);
                const { new: newRec, old: oldRec, eventType } = payload;

                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    if (newRec) {
                        db.prepare(`
                            INSERT INTO crm_settings(key, value, updated_at, loja_id) VALUES(@key, @value, @updated_at, @loja_id)
                            ON CONFLICT(key, loja_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                `).run(newRec);
                    }
                } else if (eventType === 'DELETE' && oldRec) {
                    db.prepare("DELETE FROM crm_settings WHERE key = ?").run(oldRec.key);
                }
                // Avisa o Frontend que o prompt mudou
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('config-updated', newRec?.key));
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'config'));
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'estoque' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Estoque Alterado:', payload.eventType);
                const { new: newRec, old: oldRec, eventType } = payload;
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM estoque WHERE id = ?").run(oldRec.id);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        db.prepare(`
                            INSERT INTO estoque(id, loja_id, nome, foto, fotos, link, km, cambio, ano, valor, ativo)
                            VALUES(@id, @loja_id, @nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo)
                            ON CONFLICT(id) DO UPDATE SET
                                nome = excluded.nome, foto = excluded.foto, fotos = excluded.fotos,
                                link = excluded.link, km = excluded.km, cambio = excluded.cambio,
                                ano = excluded.ano, valor = excluded.valor, ativo = excluded.ativo,
                                loja_id = excluded.loja_id
                        `).run({
                            id: newRec.id,
                            loja_id: newRec.loja_id || lojaId,
                            nome: newRec.nome || '',
                            foto: newRec.foto || newRec.foto_url || '',
                            fotos: typeof newRec.fotos === 'string' ? newRec.fotos : JSON.stringify(newRec.fotos || []),
                            link: newRec.link || '',
                            km: newRec.km || '',
                            cambio: newRec.cambio || '',
                            ano: newRec.ano || '',
                            valor: newRec.valor || newRec.preco || '',
                            ativo: newRec.ativo ? 1 : 0
                        });
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'estoque'));
                } catch (e) { console.error("Erro Realtime Estoque:", e); }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'lojas' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Loja Alterada:', payload.eventType);
                const { new: newRec, eventType } = payload;
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    if (newRec) {
                        try {
                            db.prepare(`
                                INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                                VALUES(?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(id) DO UPDATE SET
                                    nome = excluded.nome, endereco = excluded.endereco, logo_url = excluded.logo_url,
                                    slug = excluded.slug, modulos = excluded.modulos, ativo = excluded.ativo
                            `).run(newRec.id, newRec.nome, newRec.endereco || '', newRec.logo_url || '', newRec.slug || newRec.id, newRec.modulos || '[]', newRec.ativo ? 1 : 0);

                            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'all'));
                        } catch (e) { console.error("Erro Realtime Loja:", e); }
                    }
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'portais' },
            async (payload) => {
                if (syncLock) return;
                console.log('⚡ [Realtime] Portal Alterado:', payload.eventType);
                const { new: newRec, old: oldRec, eventType } = payload;
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM portais WHERE nome = ?").run(oldRec.nome);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        db.prepare(`
                            INSERT INTO portais(nome, link, ativo, loja_id) VALUES(@nome, @link, @ativo, @loja_id)
                            ON CONFLICT(nome, loja_id) DO UPDATE SET link = excluded.link, ativo = excluded.ativo
                        `).run(newRec);
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'portais'));
                } catch (e) { console.error("Erro Realtime Portais:", e); }
            }
        )
        .subscribe((status) => {
            console.log("📡 [Supabase Status]:", status);
        });
}

// --- METAS & PERFORMANCE ---

export function getConfigMeta(lojaId = DEFAULT_STORE_ID) {
    try {
        const metaVisitas = db.prepare("SELECT valor FROM config WHERE chave = 'meta_visitas_semanal' AND loja_id = ?").get(lojaId)?.valor || '0';
        const metaVendas = db.prepare("SELECT valor FROM config WHERE chave = 'meta_vendas_mensal' AND loja_id = ?").get(lojaId)?.valor || '0';

        return { visita_semanal: parseInt(metaVisitas), venda_mensal: parseInt(metaVendas) };
    } catch (err) {
        console.error("Erro ao ler metas:", err);
        return { visita_semanal: 0, venda_mensal: 0 };
    }
}

export function setConfigMeta(visita, venda, lojaId = DEFAULT_STORE_ID) {
    try {
        const stmt = db.prepare("INSERT INTO config (chave, valor, loja_id) VALUES (?, ?, ?) ON CONFLICT(chave, loja_id) DO UPDATE SET valor=excluded.valor");
        db.transaction(() => {
            stmt.run('meta_visitas_semanal', visita.toString(), lojaId);
            stmt.run('meta_vendas_mensal', venda.toString(), lojaId);
        })();
        return { success: true };
    } catch (err) {
        console.error("Erro ao salvar metas:", err);
        throw err;
    }
}

export function getConfig(key, lojaId = DEFAULT_STORE_ID) {
    try {
        const row = db.prepare("SELECT valor FROM config WHERE chave = ? AND loja_id = ?").get(key, lojaId);
        return row ? row.valor : null;
    } catch (err) {
        console.error(`Erro ao ler config[${key}]: `, err);
        return null;
    }
}

export function saveConfig(key, value, lojaId = DEFAULT_STORE_ID) {
    try {
        db.prepare("INSERT INTO config (chave, valor, loja_id) VALUES (?, ?, ?) ON CONFLICT(chave, loja_id) DO UPDATE SET valor=excluded.valor").run(key, value, lojaId);
        return { success: true };
    } catch (err) {
        console.error(`Erro ao salvar config[${key}]: `, err);
        throw err;
    }
}

export function getSdrPerformance(lojaId = DEFAULT_STORE_ID) {
    try {
        const now = new Date();

        // Semana (Domingo a Sábado)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Mês (1º ao último dia)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const weekIsoStart = startOfWeek.toISOString(); // SQLite usa ISO string para comparações
        const weekIsoEnd = endOfWeek.toISOString();
        const monthIsoStart = startOfMonth.toISOString();
        const monthIsoEnd = endOfMonth.toISOString();

        // Pega todos que são Vendedores ou Admin que atuam como (para garantir que apareçam na lista)
        // O usuario pediu "para cada SDR". SDR deve ter role 'vendedor' ou 'sdr'. Vamos assumir 'vendedor'.
        const users = db.prepare("SELECT username FROM usuarios WHERE role IN ('vendedor', 'sdr') AND username != 'diego' COLLATE NOCASE AND loja_id = ?").all(lojaId);

        const performance = [];

        for (const u of users) {
            // Meta Semanal: Visitas AGENDADAS ou REALIZADAS na semana corrente
            // O campo é data_agendamento.
            const visitas = db.prepare(`
                SELECT COUNT(*) as count FROM visitas
                WHERE vendedor_sdr = ?
                AND(status_pipeline = 'Agendado' OR status_pipeline = 'Visita Realizada' OR status_pipeline = 'Vendido' OR status_pipeline = 'Proposta')
                AND data_agendamento BETWEEN ? AND ?
                AND loja_id = ?
                    `).get(u.username, weekIsoStart, weekIsoEnd, lojaId).count;

            // Meta Mensal: VENDAS (status_pipeline = 'Vendido') no mês corrente
            const vendas = db.prepare(`
                SELECT COUNT(*) as count FROM visitas
                WHERE vendedor_sdr = ?
                AND status_pipeline = 'Vendido'
                AND data_agendamento BETWEEN ? AND ?
                AND loja_id = ?
                    `).get(u.username, monthIsoStart, monthIsoEnd, lojaId).count;

            performance.push({
                username: u.username,
                visitas_semana: visitas,
                vendas_mes: vendas
            });
        }

        // Ordena por maior número de vendas, depois visitas
        return performance.sort((a, b) => b.vendas_mes - a.vendas_mes || b.visitas_semana - a.visitas_semana);

    } catch (err) {
        console.error("Erro ao calcular performance SDR:", err);
        return [];
    }
}


// --- NOVAS FUNCOES DA CONFIG IA ---

export function getAllSettings(lojaId = DEFAULT_STORE_ID) {
    try {
        const rows = db.prepare('SELECT key, value, category FROM crm_settings WHERE loja_id = ?').all(lojaId);
        return rows;
    } catch (err) {
        console.error("Erro ao ler todas as configurações:", err);
        return [];
    }
}

export async function saveSettingsBatch(settings, lojaId = DEFAULT_STORE_ID) {
    try {
        const updated_at = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO crm_settings(key, value, category, updated_at, loja_id) VALUES(@key, @value, @category, @updated_at, @loja_id)
            ON CONFLICT(key, loja_id) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = excluded.updated_at
                `);

        const insertMany = db.transaction((items) => {
            for (const item of items) {
                stmt.run({
                    key: item.key,
                    value: item.value === null || item.value === undefined ? '' : String(item.value),
                    category: item.category || 'default',
                    updated_at: updated_at,
                    loja_id: lojaId
                });
            }
        });

        insertMany(settings);
        return { success: true };
    } catch (err) {
        console.error("Erro ao salvar lote de configurações:", err);
        throw err;
    }
}

// --- NOTAS CRUD ---

export function getNotas({ username, lojaId }) {
    try {
        if (username) {
            return db.prepare("SELECT * FROM notas WHERE sdr_username = ? AND loja_id = ? ORDER BY data_nota DESC").all(username, lojaId);
        }
        return db.prepare("SELECT * FROM notas WHERE loja_id = ? ORDER BY data_nota DESC").all(lojaId);
    } catch (e) { return []; }
}

export function addNota({ sdr_username, texto, data_nota, lojaId }) {
    try {
        const stmt = db.prepare("INSERT INTO notas (sdr_username, texto, data_nota, loja_id) VALUES (?, ?, ?, ?)");
        return stmt.run(sdr_username, texto, data_nota, lojaId);
    } catch (e) { throw e; }
}

export function toggleNota(id, concluido, lojaId = DEFAULT_STORE_ID) {
    try {
        return db.prepare("UPDATE notas SET concluido = ? WHERE id = ? AND loja_id = ?").run(concluido ? 1 : 0, id, lojaId);
    } catch (e) { throw e; }
}

export function deleteNota(id, lojaId = DEFAULT_STORE_ID) {
    try {
        return db.prepare("DELETE FROM notas WHERE id = ? AND loja_id = ?").run(id, lojaId);
    } catch (e) { throw e; }
}

export function updateNota({ id, texto, data_nota, lojaId }) {
    try {
        return db.prepare("UPDATE notas SET texto = ?, data_nota = ? WHERE id = ? AND loja_id = ?").run(texto, data_nota, id, lojaId);
    } catch (e) { throw e; }
}

// --- Store CRUD ---

export function getStores() {
    return db.prepare("SELECT * FROM lojas ORDER BY nome ASC").all();
}

export function getStoreById(id) {
    return db.prepare("SELECT * FROM lojas WHERE id = ?").get(id);
}

export function addStore(store) {
    const id = store.id || toPerfectSlug(store.nome);
    const modulos = store.modulos || JSON.stringify(['dashboard', 'diario', 'whatsapp', 'estoque', 'visitas', 'metas', 'portais', 'ia-chat', 'usuarios']);
    const stmt = db.prepare(`
        INSERT INTO lojas(id, nome, logo_url, slug, modulos, ativo, crm_ativo)
            VALUES(?, ?, ?, ?, ?, 1, ?)
                `);
    const modulosArray = typeof modulos === 'string' ? JSON.parse(modulos) : modulos;
    const crmAtivo = modulosArray.includes('crm') ? 1 : 0;
    const result = stmt.run(id, store.nome, store.logo_url, id, modulos, crmAtivo);
    return { ...result, id };
}

export async function updateStore(store) {
    const stmt = db.prepare(`
        UPDATE lojas SET
            nome = ?,
                logo_url = ?,
                modulos = ?,
                ativo = ?,
                supabase_url = ?,
                supabase_anon_key = ?,
                crm_ativo = ?
                    WHERE id = ?
                        `);

    // Ensure modulos is stringified for SQLite
    const modulosArray = typeof store.modulos === 'string' ? JSON.parse(store.modulos) : store.modulos;
    const modulosString = JSON.stringify(modulosArray);
    const crmAtivo = modulosArray.includes('crm') ? 1 : 0;

    const result = stmt.run(
        store.nome,
        store.logo_url,
        modulosString,
        store.ativo ? 1 : 0,
        store.supabase_url || null,
        store.supabase_anon_key || null,
        crmAtivo,
        store.id
    );

    // ☁️ SYNC SUPABASE
    try {
        const client = getSupabaseClient(null);
        if (client) {
            await client.from('lojas').update({
                nome: store.nome,
                logo_url: store.logo_url,
                modulos: modulosString,
                ativo: !!store.ativo,
                supabase_url: store.supabase_url,
                supabase_anon_key: store.supabase_anon_key
            }).eq('id', store.id);
            console.log(`✅[Supabase] Loja '${store.nome}' atualizada na nuvem.`);
        }
    } catch (e) {
        console.error(`❌[Supabase] Erro ao atualizar loja: `, e.message);
    }

    // Invalida o cache do cliente Supabase para esta loja
    supabaseClients.delete(store.id);
    if (store.id === DEFAULT_STORE_ID) supabaseClients.delete('default');

    return result;
}

export function deleteStore(id) {
    if (id === DEFAULT_STORE_ID) throw new Error("A loja padrão não pode ser excluída.");
    return db.prepare("DELETE FROM lojas WHERE id = ?").run(id);
}

// ============================================
// PHASE 12: Multi-Tenant Store Management
// ============================================

/**
 * Valida se um CPF já existe no sistema
 */
export async function validateCpfUnique(cpf) {
    if (!cpf || cpf.length === 0) return { valid: true }; // CPF opcional agora

    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
        return { valid: false, message: 'CPF deve ter 11 dígitos' };
    }

    // Verifica no banco local
    const existingLocal = db.prepare('SELECT username FROM usuarios WHERE cpf = ?').get(cleanCpf);
    if (existingLocal) {
        return { valid: false, message: `CPF já cadastrado para: ${existingLocal.username} ` };
    }

    // Verifica no Supabase
    const client = getSupabaseClient(null);
    if (client) {
        const { data } = await client
            .from('usuarios')
            .select('username')
            .eq('cpf', cleanCpf)
            .single();

        if (data) {
            return { valid: false, message: `CPF já cadastrado: ${data.username} ` };
        }
    }

    return { valid: true, message: 'CPF disponível' };
}

/**
 * Cria uma loja e seu usuário administrador em transação atômica
 */
export async function createStoreWithAdmin(loja, admin) {
    try {
        // 1. Validar CPF
        const cpfValidation = await validateCpfUnique(admin.cpf);
        if (!cpfValidation.valid) {
            throw new Error(cpfValidation.message);
        }

        // 2. Gerar IDs
        const lojaId = loja.id || toPerfectSlug(loja.nome);
        const adminUsername = `admin_${lojaId} `;
        const cleanCpf = admin.cpf ? admin.cpf.replace(/\D/g, '') : null;

        // 3. Hash da senha
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        // 4. Transação atômica
        const result = db.transaction(() => {
            // 4.1 Criar loja
            const modulosJson = loja.modulos ? JSON.stringify(loja.modulos) : JSON.stringify([
                'dashboard', 'diario', 'whatsapp', 'estoque',
                'visitas', 'metas', 'portais', 'ia-chat', 'usuarios'
            ]);

            db.prepare(`
                INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
            VALUES(?, ?, ?, ?, ?, ?, 1)
                `).run(lojaId, loja.nome, loja.endereco || '', loja.logo_url || '', lojaId, modulosJson);

            // 4.2 Criar usuário ADM
            db.prepare(`
                INSERT INTO usuarios(
                    username, loja_id, password, role,
                    nome_completo, cpf, email,
                    reset_password, ativo, created_by
                )
            VALUES(?, ?, ?, 'admin', ?, ?, ?, 1, 1, 'developer')
            `).run(adminUsername, lojaId, hashedPassword, admin.nome_completo, cleanCpf, admin.email || '');

            return { lojaId, adminUsername };
        })();

        // 5. Sincronizar com Supabase
        const client = getSupabaseClient(null);
        if (client) {
            await client.from('lojas').insert({
                id: lojaId,
                nome: loja.nome,
                endereco: loja.endereco || '',
                logo_url: loja.logo_url || '',
                slug: lojaId,
                modulos: typeof loja.modulos === 'string' ? loja.modulos : JSON.stringify(loja.modulos),
                ativo: true
            });

            await client.from('usuarios').insert({
                username: adminUsername,
                loja_id: lojaId,
                password: hashedPassword,
                role: 'admin',
                nome_completo: admin.nome_completo,
                cpf: cleanCpf,
                email: admin.email || '',
                reset_password: true,
                ativo: true,
                created_by: 'developer'
            });
        }

        return {
            success: true,
            lojaId: result.lojaId,
            adminUsername: result.adminUsername,
            message: `Loja "${loja.nome}" e admin criados com sucesso!`
        };

    } catch (err) {
        console.error('[createStoreWithAdmin] Erro:', err);
        throw new Error(`Erro ao criar loja: ${err.message} `);
    }
}

/**
 * Valida se a sessão do usuário ainda é válida (sessão única)
 */
export async function validateSession(username, sessionId) {
    const user = db.prepare('SELECT session_id FROM usuarios WHERE username = ?').get(username);

    if (!user) {
        return { valid: false, message: 'Usuário não encontrado' };
    }

    if (user.session_id !== sessionId) {
        return { valid: false, message: 'SESSION_EXPIRED' };
    }

    return { valid: true, message: 'Sessão válida' };
}

/**
 * Upload de logomarca para Supabase Storage
 */
export async function uploadLogo(lojaId, base64Data) {
    const client = getSupabaseClient(lojaId);
    if (!client) {
        throw new Error('Supabase não configurado');
    }

    try {
        // Converter base64 para buffer
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Image, 'base64');

        // Gerar nome único
        const fileName = `${lojaId}_${Date.now()}.png`;
        const filePath = `logos / ${fileName} `;

        // Upload para Supabase Storage
        const { error } = await client.storage
            .from('store-assets')
            .upload(filePath, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;

        // Obter URL pública
        const { data: publicUrlData } = client.storage
            .from('store-assets')
            .getPublicUrl(filePath);

        return {
            success: true,
            url: publicUrlData.publicUrl
        };

    } catch (err) {
        console.error('[uploadLogo] Erro:', err);
        throw new Error(`Erro ao fazer upload: ${err.message} `);
    }
}

/**
 * Atualiza a senha do usuário
 */
export async function updateUserPassword({ username, newPassword, forceReset = false }) {
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update local
        db.prepare('UPDATE usuarios SET password = ?, reset_password = ? WHERE username = ?')
            .run(hashedPassword, forceReset ? 1 : 0, username);

        // Update Supabase
        const client = getSupabaseClient(null);
        if (client) {
            await client
                .from('usuarios')
                .update({
                    password: hashedPassword,
                    reset_password: forceReset
                })
                .eq('username', username);
        }

        return true;
    } catch (err) {
        console.error('[updateUserPassword] Erro:', err);
        throw err;
    }
}
/**
 * Sincronização Completa (Startup Sync)
 * Puxa todas as tabelas de configuração da nuvem para o local
 */
export async function fullCloudSync(lojaId = DEFAULT_STORE_ID) {
    if (!lojaId) lojaId = DEFAULT_STORE_ID;
    console.log(`🚀 [Startup Sync] Iniciando sincronização massiva para: ${lojaId}...`);

    const startTime = Date.now();
    const tables = ['lojas', 'usuarios', 'vendedores', 'portais', 'scripts', 'estoque', 'crm_settings'];
    const results = { success: true, tables: {}, duration: 0 };

    try {
        const client = getSupabaseClient(lojaId);
        if (!client) throw new Error("Supabase Client não disponível");

        for (const table of tables) {
            try {
                console.log(`📦 [Startup Sync] Sincronizando tabela: ${table}...`);

                let query = client.from(table).select('*');

                // Filtra por loja_id se não for a tabela de lojas (que pode ter várias unificadas)
                if (table !== 'lojas') {
                    query = query.eq('loja_id', lojaId);
                }

                const { data, error } = await query;

                if (error) {
                    console.error(`❌ [Startup Sync] Erro na tabela ${table}:`, error.message);
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
                                    INSERT OR REPLACE INTO scripts(nome, texto, categoria, ativo, loja_id)
                                    VALUES(@nome, @texto, @categoria, @ativo, @loja_id)
                                `).run({
                                    nome: item.nome,
                                    texto: item.texto || '',
                                    categoria: item.categoria || 'Geral',
                                    ativo: item.ativo ? 1 : 0,
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
                            }
                        }
                    })();
                    results.tables[table] = { success: true, count: data.length };
                } else {
                    results.tables[table] = { success: true, count: 0 };
                }

            } catch (err) {
                console.error(`❌ [Startup Sync] Falha crítica na tabela ${table}:`, err.message);
                results.tables[table] = { success: false, error: err.message };
            }
        }

        results.duration = Date.now() - startTime;
        console.log(`✅ [Startup Sync] Finalizado em ${results.duration}ms.`, results.tables);

        // Avisar frontend para atualizar componentes que dependem desses dados
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'all'));

        return results;

    } catch (err) {
        console.error('❌ [Startup Sync] Erro Global:', err.message);
        return { success: false, error: err.message };
    }
}
