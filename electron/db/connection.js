import Database from 'better-sqlite3';
import path from 'path';
import fsSync from 'fs';
import { app } from 'electron';

export const DEFAULT_STORE_ID = 'irw-motors-main';

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'sistema_visitas.db');

// Exportamos a instância do banco para uso nos outros módulos
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

/**
 * Inicializa o banco de dados, cria tabelas e executa migrações.
 */
export function initDb() {
    console.log('🗄️ [DB] Inicializando banco de dados...');
    
    db.exec(`
    -- Tabela de Lojas (Unidades)
    CREATE TABLE IF NOT EXISTS lojas (
      id TEXT PRIMARY KEY,
      nome TEXT,
      logo_url TEXT,
      slug TEXT UNIQUE,
      config TEXT,
      modulos TEXT,
      ativo INTEGER DEFAULT 1,
      endereco TEXT,
      supabase_url TEXT,
      supabase_anon_key TEXT
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
      veiculo_id TEXT,
      foto_veiculo TEXT,
      detalhes_perda TEXT,
      visitou_loja INTEGER DEFAULT 0,
      nao_compareceu INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      bot_ativo INTEGER DEFAULT 1,
      localizacao TEXT,
      tem_troca INTEGER DEFAULT 0,
      troca_modelo TEXT,
      troca_ano TEXT,
      troca_km TEXT,
      agendamento_visita TEXT
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
      placa TEXT,
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
      email TEXT,
      foto_url TEXT,
      id TEXT,
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
      permissions TEXT DEFAULT '[]',
      cpf TEXT,
      session_id TEXT,
      last_login TEXT,
      created_by TEXT,
      avatar_url TEXT,
      em_fila INTEGER DEFAULT 0,
      ultima_atribuicao TEXT,
      leads_recebidos_total INTEGER DEFAULT 0,
      portais_permitidos TEXT DEFAULT '[]',
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
      remetente TEXT,
      mensagem TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS cached_images (
      veiculo_id TEXT PRIMARY KEY,
      image_url TEXT,
      image_base64 TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Executa migrações para garantir que colunas novas existam em bancos antigos
    runMigrations();
    
    // Seeds e Manutenção
    try {
        const metaVisita = db.prepare("SELECT valor FROM config WHERE chave = 'meta_visita_semanal'").get();
        if (!metaVisita) {
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('meta_visita_semanal', '15');
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('meta_venda_mensal', '10');
        }
        
        hydrateVisitasPhotos();
        ensureDefaultStore();
        checkVersionAndReset();

        db.prepare("UPDATE usuarios SET ativo = 1 WHERE ativo IS NULL").run();
    } catch (e) {
        console.error("Erro na inicialização/seed:", e.message);
    }

    console.log("✅ [DB] Inicialização concluída.");
}

function runMigrations() {
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
        "ALTER TABLE lojas ADD COLUMN endereco TEXT",
        "ALTER TABLE lojas ADD COLUMN supabase_url TEXT",
        "ALTER TABLE lojas ADD COLUMN supabase_anon_key TEXT",
        "ALTER TABLE usuarios ADD COLUMN cpf TEXT",
        "ALTER TABLE usuarios ADD COLUMN session_id TEXT",
        "ALTER TABLE usuarios ADD COLUMN last_login TEXT",
        "ALTER TABLE usuarios ADD COLUMN created_by TEXT",
        "ALTER TABLE vendedores ADD COLUMN id TEXT",
        "ALTER TABLE vendedores ADD COLUMN email TEXT",
        "ALTER TABLE vendedores ADD COLUMN foto_url TEXT",
        "ALTER TABLE usuarios ADD COLUMN avatar_url TEXT",
        "ALTER TABLE visitas ADD COLUMN created_at TEXT",
        "ALTER TABLE visitas ADD COLUMN updated_at TEXT",
        "ALTER TABLE visitas ADD COLUMN veiculo_id TEXT",
        "ALTER TABLE visitas ADD COLUMN bot_ativo INTEGER DEFAULT 1",
        "ALTER TABLE visitas ADD COLUMN localizacao TEXT",
        "ALTER TABLE visitas ADD COLUMN tem_troca INTEGER DEFAULT 0",
        "ALTER TABLE visitas ADD COLUMN troca_modelo TEXT",
        "ALTER TABLE visitas ADD COLUMN troca_ano TEXT",
        "ALTER TABLE visitas ADD COLUMN troca_km TEXT",
        "ALTER TABLE visitas ADD COLUMN agendamento_visita TEXT",
        "ALTER TABLE lojas ADD COLUMN crm_ativo INTEGER DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN em_fila INTEGER DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN ultima_atribuicao TEXT",
        "ALTER TABLE usuarios ADD COLUMN leads_recebidos_total INTEGER DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN portais_permitidos TEXT DEFAULT '[]'",
        "ALTER TABLE visitas ADD COLUMN visitou_loja INTEGER DEFAULT 0",
        "ALTER TABLE visitas ADD COLUMN nao_compareceu INTEGER DEFAULT 0",
        "ALTER TABLE estoque ADD COLUMN placa TEXT",
        "ALTER TABLE visitas ADD COLUMN detalhes_perda TEXT",
        "ALTER TABLE visitas ADD COLUMN foto_veiculo TEXT"
    ];

    migrations.forEach(query => {
        try { db.exec(query); } catch (e) {}
    });

    // Migração de reconstrução do estoque (PK: nome -> id)
    try {
        const tableInfo = db.prepare("PRAGMA table_info(estoque)").all();
        const pkColumn = tableInfo.find(c => c.pk === 1);
        if (!pkColumn || pkColumn.name === 'nome' || !tableInfo.find(c => c.name === 'id')) {
            console.log("🛠️ [DB Migration] Reconstruindo tabela 'estoque'...");
            db.transaction(() => {
                db.exec(`CREATE TABLE IF NOT EXISTS estoque_new(id TEXT PRIMARY KEY, loja_id TEXT, nome TEXT, foto TEXT, fotos TEXT, link TEXT, km TEXT, cambio TEXT, ano TEXT, valor TEXT, placa TEXT, ativo INTEGER DEFAULT 1)`);
                db.exec(`INSERT OR IGNORE INTO estoque_new(id, loja_id, nome, foto, fotos, link, km, cambio, ano, valor, placa, ativo) SELECT IFNULL(id, link), loja_id, nome, foto, fotos, link, km, cambio, ano, valor, placa, ativo FROM estoque`);
                db.exec("DROP TABLE estoque");
                db.exec("ALTER TABLE estoque_new RENAME TO estoque");
            })();
        }
    } catch (e) {
        console.error("Erro na migração de estoque:", e.message);
    }
}

function hydrateVisitasPhotos() {
    try {
        const pending = db.prepare(`SELECT id, veiculo_id, veiculo_interest, foto_veiculo FROM visitas WHERE (foto_veiculo IS NULL OR foto_veiculo = '') AND (veiculo_id IS NOT NULL OR veiculo_interesse IS NOT NULL)`).all();
        for (const lead of pending) {
            let car = null;
            if (lead.veiculo_id) car = db.prepare("SELECT foto, fotos FROM estoque WHERE id = ?").get(lead.veiculo_id);
            if (!car && lead.veiculo_interesse) car = db.prepare("SELECT foto, fotos FROM estoque WHERE nome = ?").get(lead.veiculo_interesse);
            if (car) {
                let url = car.foto;
                if (!url && car.fotos) {
                    try { const fs = JSON.parse(car.fotos); if (fs.length > 0) url = fs[0]; } catch(e){}
                }
                if (url) db.prepare("UPDATE visitas SET foto_veiculo = ? WHERE id = ?").run(url, lead.id);
            }
        }
    } catch (e) {}
}

export function ensureDefaultStore() {
    try {
        const existing = db.prepare("SELECT * FROM lojas WHERE id = ?").get(DEFAULT_STORE_ID);
        if (!existing) {
            db.prepare("INSERT INTO lojas (id, nome, modulos, ativo) VALUES (?, ?, ?, 1)")
              .run(DEFAULT_STORE_ID, 'IRW Motors', JSON.stringify(['diario', 'whatsapp', 'tabela-virtual', 'crm', 'portais', 'usuarios']));
        }
    } catch (e) {}
}

export function checkVersionAndReset() {
    try {
        const currentInternalVersion = "1.1.29";
        const row = db.prepare("SELECT valor FROM config WHERE chave = 'internal_db_version' AND loja_id = 'SYSTEM'").get();
        if (!row || row.valor !== currentInternalVersion) {
            db.prepare("INSERT OR REPLACE INTO config (chave, loja_id, valor) VALUES (?, ?, ?)").run('internal_db_version', 'SYSTEM', currentInternalVersion);
            return true;
        }
    } catch (e) {}
    return false;
}

export function toPerfectSlug(text) {
    if (!text) return "";
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getActiveStoreId() {
    try {
        const row = db.prepare("SELECT loja_id FROM usuarios WHERE username != 'diego' ORDER BY rowid LIMIT 1").get();
        return row?.loja_id || DEFAULT_STORE_ID;
    } catch (e) {
        return DEFAULT_STORE_ID;
    }
}
