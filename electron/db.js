import Database from 'better-sqlite3';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIG ---
const SUPABASE_CONFIG = {
    url: "https://whyfmogbayqwaeddoxwf.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U"
};

console.log("[DB] Iniciando Supabase com:", SUPABASE_CONFIG.url); // Log para debug em produção

let supabase;
try {
    supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
} catch (err) {
    console.error("[DB] CRITICAL SUPABASE ERROR:", err);
    // Fallback nulo para não crashar o app imediatamente na inicialização
    supabase = null;
}

const dbPath = path.join(path.dirname(app.getAppPath()), 'sistema_visitas.db');
const db = new Database(dbPath); // Removido verbose para limpar o console
db.pragma('journal_mode = WAL');

// Variáveis de controle
let syncLock = false;
let isRealtimeEnabled = false;

// Helper global para normalizar URL de foto e evitar duplicatas
const normalizePhotoUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let clean = rawUrl.replace(/\\/g, '').split('?')[0].trim();
    if (clean.includes('resized-images')) {
        clean = clean.replace(/resized-images\.autoconf\.com\.br\/.*?\//, 'resized-images.autoconf.com.br/1280x0/');
    }
    return clean;
};

export function initDb() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS visitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      status TEXT DEFAULT 'Pendente'
    );
    CREATE TABLE IF NOT EXISTS estoque (
      nome TEXT PRIMARY KEY, 
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
      nome TEXT PRIMARY KEY, 
      link TEXT,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS vendedores (
      nome TEXT PRIMARY KEY, 
      sobrenome TEXT,
      telefone TEXT,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT);
    CREATE TABLE IF NOT EXISTS usuarios (
      username TEXT PRIMARY KEY, 
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
      titulo TEXT, 
      mensagem TEXT, 
      is_system INTEGER DEFAULT 0,
      link TEXT,
      username TEXT,
      ordem INTEGER
    );
  `);

    // Migrações de segurança (Essencial para manter dados em bancos existentes)
    const migrations = [
        "ALTER TABLE estoque ADD COLUMN fotos TEXT",
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
        "ALTER TABLE usuarios ADD COLUMN permissions TEXT DEFAULT '[]'"
    ];

    migrations.forEach(query => {
        try { db.exec(query); } catch (e) { }
    });

    // === SEED INICIAL (AUTO CONFIGURAÇÃO) ===
    try {
        // 1. Configurar Metas Padrão se não existirem
        const metaVisita = db.prepare("SELECT valor FROM config WHERE chave = 'meta_visita_semanal'").get();
        if (!metaVisita) {
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('meta_visita_semanal', '15');
            db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?)").run('meta_venda_mensal', '10');
            console.log('🌱 [SEED] Metas padrão configuradas.');
        }

        // 2. Configurar Portais Padrão
        const countPortais = db.prepare("SELECT count(*) as c FROM portais").get();
        if (countPortais.c === 0) {
            const defaults = [
                { nome: 'PASSANTE', link: '' }
            ];
            const insert = db.prepare("INSERT INTO portais (nome, link, ativo) VALUES (?, ?, 1)");
            defaults.forEach(p => insert.run(p.nome, p.link));
            console.log('🌱 [SEED] Portais padrão inseridos.');
        }

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
    ensureDevUser();
    console.log("✅ [DB] Banco de dados pronto e verificado.");
}

// --- Sync Hybrid Logic (API Real-time + XML Fallback) ---

export async function syncXml() {
    // 🔥 SYNC CONFIG FIRST (PULL FROM CLOUD)
    await syncConfig();

    // 🔥 REALTIME SYNC (Instant Updates)
    enableRealtimeSync();

    // Tenta primeiro o endpoint Home, se falhar ou vazio, tentamos o veiculos normal no futuro
    const API_URL = "https://api.autoconf.com.br/api/v1/veiculos";
    const FALLBACK_API_URL = "https://api.autoconf.com.br/api/v1/veiculos-home";
    const XML_URL = "https://autoconf-prod.s3-sa-east-1.amazonaws.com/facebook/cpJruq9xsptXnQRXCOa6bV9nUUpvG5QIgyiPZoji.xml";

    const TOKEN_BEARER = "q9PKfzpprz3EH9sgvIK61WOrYKDgJvivs3JZKC4vYIrnt8sYM2Rmbcs2Xgf25l6nmyNWuq8dtd4eO1zhX270nXi3kkAN1BLJ3qnJwpvjQh7VpWuESBvJEYiDH29UFrRixlyKBIBjNhEjNy5EVBLUQpv5UKsAe2xtJ0s8fnpOeHzvHhfSFjz9b7Lgr3Mhp1yY4W5D2769Yy90LRCty9geA1bMiF5l2wSrvxm2AvgiwFNzk1u6yeA9MP0waTuBw9Ku";
    const TOKEN_REVENDA = "cpJruq9xsptXnQRXCOa6bV9nUUpvG5QIgyiPZoji";

    // Função auxiliar para limpar dinheiro
    const sanitizeValor = (valRaw) => {
        if (!valRaw) return 'Consulte';
        // Se já for numérico, formata
        if (typeof valRaw === 'number') {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valRaw);
        }
        // Se for string "R$ 50.000,00", mantemos como string para visualização no App atual
        // Mas se precisar limpar para numérico:
        // return parseFloat(valRaw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
        return valRaw;
    };

    let finalVehicles = [];
    let methodUsed = '';

    // 🔥 SYNC ESTOQUE FROM CLOUD (PULL) - Ensures new machines get data immediately
    try {
        console.log("[SupabaseSync] Buscando estoque da nuvem...");
        const { data: cloudEstoque, error: ceErr } = await supabase.from('estoque').select('*');
        if (!ceErr && cloudEstoque && cloudEstoque.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO estoque (nome, foto, fotos, link, km, cambio, ano, valor, ativo) 
                VALUES (@nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo) 
                ON CONFLICT(nome) DO UPDATE SET 
                    foto=excluded.foto, fotos=excluded.fotos, link=excluded.link, 
                    km=excluded.km, cambio=excluded.cambio, ano=excluded.ano, valor=excluded.valor, ativo=excluded.ativo
            `);
            db.transaction((items) => {
                for (const v of items) {
                    stmt.run({
                        ...v,
                        fotos: typeof v.fotos === 'string' ? v.fotos : JSON.stringify(v.fotos),
                        ativo: v.ativo ? 1 : 0
                    });
                }
            })(cloudEstoque);
            console.log(`✅ [SupabaseSync] ${cloudEstoque.length} veículos carregados da nuvem.`);
        }
    } catch (e) {
        console.warn("[SupabaseSync] Falha ao puxar estoque da nuvem:", e.message);
    }

    // --- TENTATIVA 1: API (OURO) ---
    try {
        console.log(`[SupabaseSync] 1. Tentando API Autoconf (POST)...`);
        const params = new URLSearchParams();
        params.append('token', TOKEN_REVENDA);
        params.append('pagina', '1');
        params.append('registros_por_pagina', '200');

        const headers = {
            'Authorization': TOKEN_BEARER,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        };

        let resp = await fetch(`${API_URL}?t=${Date.now()}`, { method: 'POST', headers, body: params });

        // Se o endpoint home falhar, tenta o normal
        if (!resp.ok && resp.status === 404) {
            console.log("[SupabaseSync] Endpoint Home 404. Tentando endpoint padrão...");
            resp = await fetch(`${FALLBACK_API_URL}?t=${Date.now()}`, { method: 'POST', headers, body: params });
        }

        if (!resp.ok) throw new Error(`API Status ${resp.status} - ${resp.statusText}`);

        const data = await resp.json();
        let apiItems = [];
        if (Array.isArray(data)) apiItems = data;
        else if (data.data && Array.isArray(data.data)) apiItems = data.data;
        else if (data.veiculos && Array.isArray(data.veiculos)) apiItems = data.veiculos;
        else if (data.registros && Array.isArray(data.registros)) apiItems = data.registros;

        if (apiItems.length === 0) throw new Error("API retornou lista vazia");

        console.log(`[SupabaseSync] API Sucesso! Encontrados: ${apiItems.length}`);

        // Processa Itens da API
        const seenNames = {}; // Contador para nomes duplicados

        finalVehicles = apiItems.map(item => {
            // Mapeamento Flexível
            const marca = item.marca_nome || item.Marca || item.marca || '';
            const modelo = item.modelopai_nome || item.Modelo || item.modelo || '';
            const versao = item.modelo_nome || item.Versao || item.versao || '';

            // 🔥 ETIQUETA / ID ÚNICO (Prioridade para o que o usuário chamou de etiqueta)
            const etiqueta = item.CodigoVeiculo || item.veiculo_id || item.codigo || item.id || '';

            // 🔥 FILTRO DE SHOWROOM (Restaurado)
            const status = item.status || item.situacao || item.localizacao || item.Status || '';
            if (status && status.length > 2) {
                const s = status.toLowerCase();
                if (s.includes('vendid') || s.includes('entreg') || s.includes('reserv')) return null;
            }

            let nome = `${marca} ${modelo} ${versao}`.trim();
            if (nome === '') nome = item.versao_descricao || 'Veículo sem Nome';

            // Adiciona a Etiqueta ao nome para gerar unicidade absoluta "Kwid #1050" vs "Kwid #1051"
            if (etiqueta) nome += ` #${etiqueta}`;

            // 🔥 Fallback para unicidade (caso etiqueta venha vazia ou duplicada por erro da API)
            if (seenNames[nome]) {
                seenNames[nome]++;
                nome = `${nome} (${seenNames[nome]})`;
            } else {
                seenNames[nome] = 1;
            }

            const fotosRaw = item.fotos || item.Fotos || [];
            const fotosSet = new Set();

            // Tenta pegar a foto principal da API (campo 'foto' ou 'FotoPrincipal')
            const mainApiPhoto = item.foto || item.FotoPrincipal || '';
            if (mainApiPhoto) {
                const cleanMain = normalizePhotoUrl(mainApiPhoto);
                if (cleanMain) fotosSet.add(cleanMain);
            }

            if (Array.isArray(fotosRaw)) {
                fotosRaw.forEach(f => {
                    const url = typeof f === 'string' ? f : (f.url || f.Url || f.caminho || '');
                    const clean = normalizePhotoUrl(url);
                    if (clean) fotosSet.add(clean);
                });
            }
            const fotoPrincipal = fotosSet.size > 0 ? [...fotosSet][0] : '';
            if (!fotoPrincipal) {
                // console.warn(`[SupabaseSync] Veículo sem foto: ${nome}`);
            }

            // Sanitização de Valor: Prioriza o campo 'valorpromocao' (Preço de oferta/site)
            const precoRaw = item.valorpromocao || item.valorvenda || item.PrecoVenda || item.PrecoSite || item.preco || item.valor || '0';

            const valNum = parseFloat(precoRaw);
            const valor = valNum > 0
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valNum)
                : 'Consulte';

            const km = (item.km || item.Quilometragem || 'Consulte').toString();
            const cambio = (item.cambio_nome || item.Cambio || item.cambio || 'Consulte').toString();

            const anoFab = item.anofabricacao || item.AnoFabricacao || item.ano_fabricacao || '';
            const anoMod = item.anomodelo || item.AnoModelo || item.ano_modelo || '';
            const ano = (anoFab && anoMod) ? `${anoFab}/${anoMod}` : (anoFab || anoMod || 'Consulte');

            return { nome, foto: fotoPrincipal, fotos: JSON.stringify(Array.from(fotosSet)), link: '', km, cambio, ano, valor };
        }).filter(item => item !== null); // Remove itens nulos (filtrados pelo status)

        methodUsed = 'API (Tempo Real)';

    } catch (apiError) {
        console.warn(`[SupabaseSync] !!! FALHA NA API (${apiError.message}) - ATIVANDO PLANO B (XML) !!!`);

        // --- TENTATIVA 2: XML (BRONZE) ---
        try {
            const resp = await fetch(`${XML_URL}?t=${Date.now()}`);
            if (!resp.ok) throw new Error(`XML Status ${resp.status}`);
            const text = await resp.text();

            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            const titleRegex = /<(?:g:)?title>(.*?)<\/(?:g:)?title>/;
            const linkRegex = /<(?:g:)?link>(.*?)<\/(?:g:)?link>/;
            const imageRegex = /<(?:g:)?image_link>(.*?)<\/(?:g:)?image_link>/;
            const additionalImagesRegex = /<(?:g:)?additional_image_link>(.*?)<\/(?:g:)?additional_image_link>/g;
            const priceRegex = /<(?:g:)?price>(.*?)<\/(?:g:)?price>/;
            const salePriceRegex = /<(?:g:)?sale_price>(.*?)<\/(?:g:)?sale_price>/;
            const idRegex = /<(?:g:)?id>(.*?)<\/(?:g:)?id>/;
            const customLabelRegex = /<g:custom_label_(\d+)>(.*?)<\/g:custom_label_\d+>/g;

            const items = Array.from(text.matchAll(itemRegex));

            finalVehicles = [];
            for (const itemMatch of items) {
                const itemContent = itemMatch[1];
                const titleMatch = itemContent.match(titleRegex);

                if (titleMatch) {
                    const idMatch = itemContent.match(idRegex);
                    const id = idMatch ? idMatch[1].trim() : '';
                    const nomeBase = titleMatch[1].trim();
                    let nome = id ? `${nomeBase} #${id}` : nomeBase;

                    // 🔥 GARANTE UNICIDADE REAL (XML)
                    // Como não está dentro de um .map(), verificamos se já existe no array final
                    // Mas para ser mais seguro e rápido, vamos usar um map auxiliar local também se necessário,
                    // mas aqui podemos verificar direto no own array se quisermos, ou usar um Set global para o loop.
                    // Vamos usar um contador local simples como fizemos no API.

                    if (!this.xmlSeenNames) this.xmlSeenNames = {};
                    if (this.xmlSeenNames[nome]) {
                        this.xmlSeenNames[nome]++;
                        nome = `${nome} (${this.xmlSeenNames[nome]})`;
                    } else {
                        this.xmlSeenNames[nome] = 1;
                    }

                    const link = (itemContent.match(linkRegex)?.[1] || '').trim();
                    const fotoPrincipal = (itemContent.match(imageRegex)?.[1] || '').trim();

                    const fotosSet = new Set();
                    const mainClean = normalizePhotoUrl(fotoPrincipal);
                    if (mainClean) fotosSet.add(mainClean);
                    [...itemContent.matchAll(additionalImagesRegex)].forEach(m => {
                        const clean = normalizePhotoUrl(m[1].trim());
                        if (clean) fotosSet.add(clean);
                    });

                    // Lógica de Preço PROMOÇÃO > NORMAL
                    const rawRegular = itemContent.match(priceRegex)?.[1]?.trim() || '';
                    const rawSale = itemContent.match(salePriceRegex)?.[1]?.trim() || '';

                    // Se tiver sale_price (ex: 180000.00 BRL), usa ele. Senão usa o price.
                    const priceToUse = rawSale || rawRegular || '0';

                    // Remove caracteres não numéricos exceto ponto e virgula pra tentar parsear
                    // Mas o parseInt pega o primeiro inteiro. XML padrão usually is "190000.00 BRL" -> parseInt 190000
                    const valor = parseInt(priceToUse) > 0
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(priceToUse))
                        : 'Consulte';

                    const description = itemContent.match(/<(?:g:)?description>(.*?)<\/(?:g:)?description>/)?.[1] || '';
                    let km = 'Consulte';
                    let cambio = 'Consulte';
                    let ano = 'Consulte';

                    const fullText = (nome + ' ' + description).toLowerCase();
                    if (fullText.includes(' aut') || fullText.includes('at.')) cambio = 'Automático';
                    else if (fullText.includes(' mec') || fullText.includes('mt.')) cambio = 'Manual';

                    const yearMatch = fullText.match(/\b(19|20)\d{2}\b/);
                    if (yearMatch) ano = yearMatch[0];

                    if (cambio === 'Consulte' || km === 'Consulte') {
                        [...itemContent.matchAll(customLabelRegex)].forEach(m => {
                            const val = m[2].toLowerCase();
                            if (val.includes('aut')) cambio = 'Automático';
                            if (val.includes('man') || val.includes('mec')) cambio = 'Manual';
                            if (val.includes('km')) km = m[2].trim();
                        });
                    }

                    finalVehicles.push({
                        nome,
                        foto: fotoPrincipal,
                        fotos: JSON.stringify(Array.from(fotosSet)),
                        link,
                        km,
                        cambio,
                        ano,
                        valor
                    });
                }
            }
            methodUsed = 'XML (Backup)';
            console.log(`[SupabaseSync] Sucesso via XML! ${finalVehicles.length} veículos.`);

        } catch (xmlError) {
            console.error("Fatal: Ambas tentativas falharam.", xmlError);
            return { success: false, message: `Erro Fatal: API (${apiError.message}) e XML (${xmlError.message}) falharam.` };
        }
    }

    // --- SALVAMENTO (LOCAL + NUVEM) ---
    try {
        const namesInSync = [];

        const stmt = db.prepare(`
            INSERT INTO estoque (nome, foto, fotos, link, km, cambio, ano, valor, ativo) 
            VALUES (@nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, 1) 
            ON CONFLICT(nome) DO UPDATE SET 
                foto=excluded.foto, fotos=excluded.fotos, link=excluded.link, 
                km=excluded.km, cambio=excluded.cambio, ano=excluded.ano, valor=excluded.valor, ativo=1
        `);

        db.transaction((items) => {
            for (const v of items) {
                stmt.run(v);
                namesInSync.push(v.nome);
            }
        })(finalVehicles);

        if (namesInSync.length > 0) {
            const placeholders = namesInSync.map(() => '?').join(',');
            db.prepare(`DELETE FROM estoque WHERE nome NOT IN (${placeholders})`).run(...namesInSync);
        }

        // Envia para Supabase com Sanitização
        const uniqueVehicles = [...new Map(finalVehicles.map(item => [item.nome, item])).values()];
        const supabaseData = uniqueVehicles.map(v => ({
            ...v,
            fotos: JSON.parse(v.fotos),
            // Sanitização final para Supabase se necessário, por padrão mandamos o que temos
            valor: sanitizeValor(v.valor),
            ativo: true
        }));

        const { error } = await supabase.from('estoque').upsert(supabaseData, { onConflict: 'nome' });

        if (!error) {
            // 🔥 NUVEM: Sincronização de Deletados (Lógica de Auto-Limpeza)
            try {
                const { data: currentCloud, error: fetchError } = await supabase.from('estoque').select('nome');
                if (!fetchError && currentCloud) {
                    const cloudNames = currentCloud.map(c => c.nome);
                    const obsoleteNames = cloudNames.filter(n => !namesInSync.includes(n));

                    if (obsoleteNames.length > 0) {
                        console.log(`[SupabaseSync] Desativando/Removendo ${obsoleteNames.length} veículos da nuvem...`);

                        // Passo 1: Marcar como inativo (Garante que suma da UI mesmo se o DELETE falhar)
                        const obsoleteData = obsoleteNames.map(n => ({ nome: n, ativo: false }));
                        await supabase.from('estoque').upsert(obsoleteData, { onConflict: 'nome' });

                        // Passo 2: Tentar deletar de verdade
                        await supabase.from('estoque').delete().in('nome', obsoleteNames);
                    }
                }
                console.log(`[SupabaseSync] Nuvem Sincronizada com Sucesso!`);
            } catch (cleanError) {
                console.error(`[SupabaseSync] AVISO: Erro na limpeza da nuvem (Inativando como fallback):`, cleanError.message);
            }
        } else {
            console.error(`[SupabaseSync] Erro Upload Nuvem:`, error);
        }

        // 🔔 NOTIFICA O FRONT-END QUE O ESTOQUE MUDOU
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('sync-status', { table: 'estoque', loading: false }));

        return { success: true, message: `Sincronizado via ${methodUsed}: ${uniqueVehicles.length} veículos.` };

    } catch (dbError) {
        console.error("Erro Banco de Dados:", dbError);
        return { success: false, message: "Erro ao salvar dados: " + dbError.message };
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
            console.log(`✅ [Maintenance] Permissões padrão aplicadas para ${legacySdr.length} usuários SDR antigos.`);
        }
    } catch (e) { }
    ensureDevUser();
    // db.prepare("DELETE FROM usuarios WHERE username = 'admin'").run();
    ensurePortals();
}

export async function syncConfig() {
    console.log("☁️ [SyncConfig] Iniciando sincronização de configurações...");
    ensureDevUser(); // Garante o admin local antes de qualquer sync
    const stats = { users: 0, sellers: 0, scripts: 0, errors: [] };

    try {
        // 1. USUÁRIOS
        console.log("☁️ [SyncConfig] Puxando usuários do Supabase...");
        const { data: cloudUsers, error: uErr } = await supabase.from('usuarios').select('*');
        if (uErr) {
            console.error("❌ Erro ao puxar usuários da nuvem:", uErr.message);
            stats.errors.push(`Usuários: ${uErr.message}`);
        } else if (cloudUsers) {
            console.log(`👥 [SyncConfig] Sincronizando ${cloudUsers.length} usuários...`);
            const localUserIds = [];

            db.transaction(() => {
                for (const u of cloudUsers) {
                    localUserIds.push(u.username);
                    db.prepare(`
                        INSERT INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions)
                        VALUES(@username, @password, @role, @reset_password, @nome_completo, @email, @whatsapp, @ativo, @permissions)
                        ON CONFLICT(username) DO UPDATE SET
                            password = excluded.password,
                        role = excluded.role,
                        reset_password = excluded.reset_password,
                        nome_completo = excluded.nome_completo,
                        email = excluded.email,
                        whatsapp = excluded.whatsapp,
                        ativo = excluded.ativo,
                        permissions = excluded.permissions
                        WHERE excluded.username NOT IN('diego', 'Diego', 'admin', 'Admin')
                        `).run({
                        username: u.username,
                        password: u.password,
                        role: u.role,
                        reset_password: u.reset_password ? 1 : 0,
                        nome_completo: u.nome_completo || '',
                        email: u.email || '',
                        whatsapp: u.whatsapp || '',
                        ativo: u.ativo ? 1 : 0,
                        permissions: u.permissions || '[]'
                    });
                }

                // Limpeza Mirror (Remove locais que sumiram na nuvem - exceto devs)
                if (cloudUsers.length > 0) {
                    const markers = cloudUsers.map(() => '?').join(',');
                    db.prepare(`
                        DELETE FROM usuarios 
                        WHERE username NOT IN(${markers}) 
                        AND username NOT IN('diego', 'Diego', 'admin', 'Admin')
                        `).run(...localUserIds);
                }
            })();
            stats.users = cloudUsers.length;
            console.log("✅ Usuários sincronizados.");
            // Avisa UI
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        }

        // 2. Vendedores
        console.log("☁️ [SyncConfig] Puxando vendedores do Supabase...");
        const { data: cloudSellers, error: sErr } = await supabase.from('vendedores').select('*');
        if (sErr) {
            console.error("❌ Erro Sync Vendedores:", sErr.message);
            stats.errors.push(`Vendedores: ${sErr.message}`);
        } else if (cloudSellers) {
            db.transaction(() => {
                const stmt = db.prepare(`
                    INSERT INTO vendedores(nome, sobrenome, telefone, ativo) 
                    VALUES(@nome, @sobrenome, @telefone, @ativo)
                    ON CONFLICT(nome) DO UPDATE SET 
                    sobrenome = excluded.sobrenome, telefone = excluded.telefone, ativo = excluded.ativo
                        `);
                for (const s of cloudSellers) {
                    stmt.run({ ...s, ativo: s.ativo ? 1 : 0 });
                }
            })();
            stats.sellers = cloudSellers.length;
            console.log("✅ Vendedores sincronizados.");
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'vendedores'));
        }

        // 3. Scripts
        console.log("☁️ [SyncConfig] Puxando scripts do Supabase...");
        const { data: cloudScripts, error: scErr } = await supabase.from('scripts').select('*');
        if (scErr) {
            console.error("❌ Erro Sync Scripts:", scErr.message);
            stats.errors.push(`Scripts: ${scErr.message}`);
        } else if (cloudScripts) {
            db.transaction(() => {
                const stmt = db.prepare(`
                    INSERT INTO scripts(id, titulo, mensagem, is_system, link, username, ordem)
                    VALUES(@id, @titulo, @mensagem, @is_system, @link, @username, @ordem)
                    ON CONFLICT(id) DO UPDATE SET
                    titulo = excluded.titulo, mensagem = excluded.mensagem, is_system = excluded.is_system,
                        link = excluded.link, username = excluded.username, ordem = excluded.ordem
                            `);
                for (const s of cloudScripts) {
                    stmt.run({ ...s, is_system: s.is_system ? 1 : 0 });
                }
            })();
            stats.scripts = cloudScripts.length;
            console.log("✅ Scripts sincronizados.");
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'scripts'));
        }

        // 4. Visitas (Recent Pull)
        console.log("☁️ [SyncConfig] Puxando visitas recentes do Supabase...");
        const { data: cloudVisitas, error: vErr } = await supabase
            .from('visitas')
            .select('*')
            .order('id', { ascending: false })
            .limit(200);

        if (vErr) {
            console.error("❌ Erro Sync Visitas:", vErr.message);
        } else if (cloudVisitas) {
            db.transaction(() => {
                const stmt = db.prepare(`
                    INSERT INTO visitas(
                                id, datahora, mes, cliente, telefone, portal,
                                veiculo_interesse, veiculo_troca, vendedor, vendedor_sdr, negociacao, status,
                                data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline, valor_proposta, cpf_cliente, historico_log
                            )
                    VALUES(
                                @id, @datahora, @mes, @cliente, @telefone, @portal,
                                @veiculo_interesse, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, @status,
                                @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log
                            )
                    ON CONFLICT(id) DO UPDATE SET
                        datahora = excluded.datahora, mes = excluded.mes, cliente = excluded.cliente, telefone = excluded.telefone,
                        portal = excluded.portal, veiculo_interesse = excluded.veiculo_interesse, veiculo_troca = excluded.veiculo_troca,
                        vendedor = excluded.vendedor, vendedor_sdr = excluded.vendedor_sdr, negociacao = excluded.negociacao,
                        status = excluded.status, data_agendamento = excluded.data_agendamento, temperatura = excluded.temperatura,
                        motivo_perda = excluded.motivo_perda, forma_pagamento = excluded.forma_pagamento,
                        status_pipeline = excluded.status_pipeline, valor_proposta = excluded.valor_proposta,
                        cpf_cliente = excluded.cpf_cliente, historico_log = excluded.historico_log
                            `);
                for (const v of cloudVisitas) stmt.run(v);
            })();
            console.log(`✅ Visitas sincronizadas(${cloudVisitas.length}).`);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
        }

        // 5. Configs (Local -> Cloud Push)
        try {
            const localConfigs = db.prepare("SELECT * FROM config").all();
            if (localConfigs.length > 0) {
                await supabase.from('config').upsert(localConfigs);
            }
        } catch (e) { /* ignore */ }

        return { success: stats.errors.length === 0, stats };

    } catch (e) {
        console.error("❌ [SyncConfig] Erro Geral:", e.message);
        return { success: false, error: e.message, stats };
    }
}

function ensureDevUser() {
    const DevEmail = 'diego';
    const DevPass = '197086';
    const hash = bcrypt.hashSync(DevPass, 10);

    try {
        const devCheck = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(DevEmail);
        if (!devCheck) {
            db.prepare(`
                INSERT INTO usuarios(username, password, role, reset_password, ativo, nome_completo) 
                VALUES(?, ?, ?, ?, ?, ?)
                            `).run(DevEmail, hash, 'developer', 0, 1, 'Diego Admin');
            console.log('✅ Usuário desenvolvedor criado (diego)');
        } else {
            db.prepare("UPDATE usuarios SET password = ?, role = ?, reset_password = 0, ativo = 1 WHERE username = ? COLLATE NOCASE")
                .run(hash, 'developer', DevEmail);
            console.log('✅ Usuário desenvolvedor atualizado (diego)');
        }
    } catch (e) {
        console.error("Erro ao garantir usuário dev:", e.message);
    }
}

function ensurePortals() {
    const portalCheck = db.prepare("SELECT COUNT(*) as c FROM portais").get();
    if (portalCheck.c === 0) {
        const insertPortal = db.prepare("INSERT INTO portais (nome) VALUES (?)");
        ["OLX", "Facebook", "Instagram", "iCarros", "Webmotors", "Site", "Loja (Presencial)"].forEach(p => insertPortal.run(p));
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

export function getStats(days = 30) {
    // Calcula a data de corte (hoje - dias)
    // SQLite: date('now', '-X days')
    // javascript: new Date(...) to ISO string
    const dateOffset = new Date();
    dateOffset.setDate(dateOffset.getDate() - days);
    // Ajusta para o início do dia para pegar tudo
    dateOffset.setHours(0, 0, 0, 0);
    const dateLimit = dateOffset.toISOString();

    // 1. Total Leads (Entrada) no período
    const leadsTotal = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE datahora >= ?").get(dateLimit).c;

    // 2. Atendidos (Com vendedor atribuído) no período
    const leadsAtendidos = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE vendedor IS NOT NULL AND vendedor != '' AND datahora >= ?").get(dateLimit).c;

    // 3. Agendados (Com data de agendamento) no período
    const leadsAgendados = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE data_agendamento IS NOT NULL AND data_agendamento != '' AND datahora >= ?").get(dateLimit).c;

    // 4. Vendas (Fechamentos) no período
    const leadsVendidos = db.prepare("SELECT COUNT(*) as c FROM visitas WHERE status = 'Vendido' AND datahora >= ?").get(dateLimit).c;

    // 5. Origem (Portais) no período
    const leadsPorPortal = db.prepare(`
        SELECT 
            portal as name, 
            COUNT(*) as value,
            SUM(CASE WHEN status = 'Vendido' THEN 1 ELSE 0 END) as sales
        FROM visitas 
        WHERE portal IS NOT NULL AND portal != '' AND datahora >= ?
        GROUP BY portal 
        ORDER BY value DESC
    `).all(dateLimit);

    // 6. Fluxo de Vendedores (Mantém lógica atual, independente de período, pois é snapshot do momento)
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

    // 7. Dados do Gráfico (Dinâmico conforme dias)
    // Se dias > 30, agrupar por semana ou mês seria ideal, mas por agora vamos limitar a mostrar os últimos 'days' ou max 30 pontos para não poluir.
    // Vamos mostrar o gráfico do período solicitado (diário).

    // Otimização: Se for > 60 dias, talvez agrupar. Mas o usuário pediu 7, 15, 30. Então diário está ótimo.
    const chartData = [];
    const visitasPorDiaRaw = db.prepare(`
        SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total 
        FROM visitas 
        WHERE datahora >= ? 
        GROUP BY dia 
        ORDER BY dia ASC
    `).all(dateLimit);

    const vendasPorDiaRaw = db.prepare(`
        SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total 
        FROM visitas 
        WHERE status = 'Vendido' AND datahora >= ? 
        GROUP BY dia 
        ORDER BY dia ASC
    `).all(dateLimit);

    // Preenche os dias vazios para o gráfico ficar bonito contínuo
    for (let i = days - 1; i >= 0; i--) { // De X dias atrás até hoje
        const d = new Date();
        d.setDate(d.getDate() - i);
        const diaStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const diaDisplay = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const visitas = visitasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
        const vendas = vendasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;

        chartData.push({ name: diaDisplay, leads: visitas, atendimentos: 0, vendas }); // Ajustei chave para match frontend (leads, vendas)
        // Nota: frontend usa 'leads' e 'atendimentos'. Vou mandar 'vendas' também ou mapear atendimentos?
        // No frontend: AreaChart dataKey="leads" e "atendimentos".
        // Vamos buscar atendimentos por dia também.
    }

    // 7b. Atendimentos por dia (para o gráfico ficar completo)
    const atendimentosPorDiaRaw = db.prepare(`
        SELECT substr(datahora, 1, 10) as dia, COUNT(*) as total 
        FROM visitas 
        WHERE vendedor IS NOT NULL AND vendedor != '' AND datahora >= ? 
        GROUP BY dia 
        ORDER BY dia ASC
    `).all(dateLimit);

    // Atualiza o loop acima para incluir atendimentos
    chartData.forEach(item => {
        // Preciso reconstruir a data original para bater... item.name é 'DD/MM'.
        // Mais fácil rodar o map de novo com acesso aos dados Raw
    });

    // Refazendo loop do gráfico corretamente
    const finalChartData = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const diaStr = d.toISOString().split('T')[0];
        const diaDisplay = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const leads = visitasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
        const atendimentos = atendimentosPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;
        const vendas = vendasPorDiaRaw.find(r => r.dia === diaStr)?.total || 0;

        finalChartData.push({ name: diaDisplay, leads, atendimentos, vendas });
    }

    return {
        leadsTotal,
        leadsAtendidos,
        leadsAgendados,
        leadsVendidos,
        leadsPorPortal,
        fluxoVendedores,
        chartData: finalChartData
    };
}

// --- COMPETITION & GAMIFICATION ---

export function getCompetitionData() {
    try {
        // 1. Busca a configuração da campanha ativa
        const configRaw = db.prepare("SELECT valor FROM config WHERE chave = 'active_campaign'").get();
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

export function getVisitas(userRole = 'vendedor', username = null) {
    if (userRole === 'developer' || userRole === 'admin' || userRole === 'master') {
        return db.prepare("SELECT * FROM visitas ORDER BY id DESC LIMIT 200").all();
    } else {
        return db.prepare("SELECT * FROM visitas WHERE vendedor_sdr = ? OR vendedor = ? ORDER BY id DESC LIMIT 200").all(username, username);
    }
}

export async function addVisita(visita) {
    const stmt = db.prepare(`
        INSERT INTO visitas (
            mes, datahora, cliente, telefone, portal, 
            veiculo_interesse, veiculo_troca, vendedor, vendedor_sdr, negociacao, 
            status, data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline, valor_proposta, cpf_cliente, historico_log
        )
        VALUES (
            @mes, @datahora, @cliente, @telefone, @portal, 
            @veiculo_interesse, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, 
            'Pendente', @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, 
            @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log
        )
    `);
    const result = stmt.run(visita);
    const id = result.lastInsertRowid;

    // ☁️ SYNC SUPABASE
    try {
        const { error } = await supabase.from('visitas').insert([{ ...visita, id, status: 'Pendente' }]);
        if (error) console.error("Supabase Sync Error (addVisita):", error);
    } catch (e) { console.error("Supabase Connection Error:", e); }

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
        const updateData = pipeline ? { status, status_pipeline: pipeline } : { status };
        await supabase.from('visitas').update(updateData).eq('id', id);
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function updateVisitaFull(visita) {
    const stmt = db.prepare(`
        UPDATE visitas SET
            cliente = @cliente,
            telefone = @telefone,
            portal = @portal,
            veiculo_interesse = @veiculo_interesse,
            veiculo_troca = @veiculo_troca,
            vendedor = @vendedor,
            negociacao = @negociacao,
            data_agendamento = @data_agendamento,
            temperatura = @temperatura,
            status_pipeline = @status_pipeline,
            forma_pagamento = @forma_pagamento,
            valor_proposta = @valor_proposta,
            historico_log = @historico_log,
            status = @status
        WHERE id = @id
    `);
    const result = stmt.run(visita);

    // ☁️ SYNC SUPABASE
    try {
        await supabase.from('visitas').update(visita).eq('id', visita.id);
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function deleteVisita(id) {
    const result = db.prepare("DELETE FROM visitas WHERE id = ?").run(id);
    // ☁️ SYNC SUPABASE
    try {
        await supabase.from('visitas').delete().eq('id', id);
    } catch (e) { }

    // 📣 REFRESH UI
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));

    return result;
}

export async function addUser(user) {
    const hash = await bcrypt.hash(user.password, 10);

    // SQLite - Username é o Email
    const stmt = db.prepare(`
        INSERT INTO usuarios (username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions)
        VALUES (@username, @password, @role, 1, @nome_completo, @email, @whatsapp, 1, @permissions)
    `);

    try {
        const result = stmt.run({
            username: user.email.toLowerCase(),
            password: hash,
            role: user.role,
            nome_completo: user.nome_completo,
            email: user.email.toLowerCase(),
            whatsapp: user.whatsapp,
            permissions: user.permissions ? JSON.stringify(user.permissions) : '[]'
        });

        // ☁️ SYNC SUPABASE
        try {
            await supabase.from('usuarios').insert([{
                username: user.email.toLowerCase(),
                password: hash,
                role: user.role,
                reset_password: 1,
                nome_completo: user.nome_completo,
                email: user.email.toLowerCase(),
                whatsapp: user.whatsapp,
                ativo: true,
                permissions: user.permissions ? JSON.stringify(user.permissions) : '[]'
            }]);
        } catch (e) {
            // Ignora erro de duplicidade no Supabase se já existir lá
            console.error("Erro Sync Supabase:", e.message);
        }

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        return result;

    } catch (err) {
        // Se for erro de duplicidade local, tenta atualizar
        if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('already exists'))) {
            console.log("Usuário já existe. Tentando atualizar...");
            return updateUser({ ...user, username: user.email.toLowerCase(), ativo: 1 });
        }
        console.error("Erro fatal ao criar usuário:", err);
        throw err;
    }
}

export async function deleteUser(username) {
    // The original code had a check for 'admin'/'diego' and a delayed delete.
    // The instruction simplifies this, removing the check and delay.
    // Following the instruction's structure for the delete logic.
    const result = db.prepare("DELETE FROM usuarios WHERE username = ?").run(username);
    // ☁️ SYNC SUPABASE
    try {
        await supabase.from('usuarios').delete().eq('username', username);
    } catch (e) { }

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));

    return result;
}

export async function updateUser(user) {
    let query = "UPDATE usuarios SET role = ?, nome_completo = ?, email = ?, whatsapp = ?, ativo = ?, permissions = ?";
    let params = [
        user.role,
        user.nome_completo,
        user.email,
        user.whatsapp,
        user.ativo ? 1 : 0,
        user.permissions ? JSON.stringify(user.permissions) : '[]'
    ];

    if (user.password && user.password.length >= 6) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        query += ", password = ?, reset_password = 1";
        params.push(hashedPassword);
    }

    query += " WHERE username = ?";
    params.push(user.username);

    const result = db.prepare(query).run(...params);

    // ☁️ SYNC SUPABASE
    try {
        const updateData = {
            role: user.role,
            nome_completo: user.nome_completo,
            email: user.email,
            whatsapp: user.whatsapp,
            ativo: !!user.ativo,
            permissions: user.permissions ? JSON.stringify(user.permissions) : '[]'
        };
        if (user.password && user.password.length >= 6) {
            updateData.password = await bcrypt.hash(user.password, 10);
            updateData.reset_password = 1;
        }
        await supabase.from('usuarios').update(updateData).eq('username', user.username);
    } catch (e) { }

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));

    return result;
}

// User Auth
export async function checkLogin(identifier, pass) {
    if (!identifier || !pass) return null;

    // NUCLEAR OPTION para usuário master em caso de emergência de sync/acesso
    if (identifier.toLowerCase() === 'diego' && pass === '197086') {
        console.log("☢️ [Auth] NUCLEAR OPTION: Acesso forçado concebido para 'diego'.");
        return { username: 'diego', role: 'developer', ativo: 1, nome_completo: 'Diego Admin' };
    }

    // 1. TENTA LOCALMENTE
    console.log(`🔑 [Auth] Tentativa de login para: ${identifier}`);
    let userData = db.prepare(`
        SELECT * FROM usuarios 
        WHERE (username = ? OR email = ?) COLLATE NOCASE 
        AND ativo = 1
    `).get(identifier, identifier);

    if (userData) {
        console.log(`✅ [Auth] Usuário '${identifier}' encontrado localmente.`);
    } else {
        console.log(`⚠️ [Auth] Usuário '${identifier}' NÃO encontrado localmente ou está inativo.`);
    }

    // 2. SE NÃO ACHAR OU SENHA ERRADA LOCALMENTE, TENTA NUVEM (PARA CASOS DE SYNC PENDENTE)
    // Se a senha local falhar, ainda tentamos a nuvem para pegar a senha mais recente
    const localValid = userData ? bcrypt.compareSync(pass, userData.password) : false;

    if (!userData || !localValid) {
        console.log(`🔍 [Auth] Usuário '${identifier}' não validado localmente. Consultando Nuvem...`);
        try {
            const { data: cloudUser, error } = await supabase
                .from('usuarios')
                .select('*')
                .or(`username.ilike.${identifier},email.ilike.${identifier}`)
                .eq('ativo', true)
                .maybeSingle();

            if (!error && cloudUser) {
                // Valida a senha na nuvem antes de sincronizar
                const cloudValid = bcrypt.compareSync(pass, cloudUser.password);

                if (cloudValid) {
                    console.log(`✅ [Auth] Usuário '${identifier}' validado via Nuvem. Sincronizando dados locais...`);
                    db.prepare(`
                        INSERT INTO usuarios (username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions)
                        VALUES (@username, @password, @role, @reset_password, @nome_completo, @email, @whatsapp, @ativo, @permissions)
                        ON CONFLICT(username) DO UPDATE SET 
                            password=excluded.password, role=excluded.role, 
                            nome_completo=excluded.nome_completo, email=excluded.email, 
                            whatsapp=excluded.whatsapp, ativo=excluded.ativo,
                            reset_password=excluded.reset_password,
                            permissions=excluded.permissions
                    `).run({
                        username: cloudUser.username,
                        password: cloudUser.password,
                        role: cloudUser.role,
                        reset_password: cloudUser.reset_password ? 1 : 0,
                        nome_completo: cloudUser.nome_completo || '',
                        email: cloudUser.email || '',
                        whatsapp: cloudUser.whatsapp || '',
                        ativo: cloudUser.ativo ? 1 : 0,
                        permissions: cloudUser.permissions || '[]'
                    });


                    userData = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(cloudUser.username);
                } else {
                    console.log(`❌ [Auth] Senha inválida para usuário '${identifier}' na Nuvem.`);
                }
            }
        } catch (e) {
            console.error(`❌ [Auth] Erro catastrófico na validação em nuvem:`, e.message);
        }
    }

    if (!userData) return null;

    // Validação final (pode ser repetitiva mas garante segurança)
    const finalValid = bcrypt.compareSync(pass, userData.password);
    if (!finalValid) return null;

    const { password, ...userWithoutPassword } = userData;
    return userWithoutPassword;
}

// Generic CRUD
export function getList(table) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return [];
    return db.prepare(`SELECT * FROM ${table} ORDER BY nome`).all();
}

export async function addItem(table, data) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;

    let syncData = { nome: data.nome, ativo: true };
    let stmt;

    if (table === 'vendedores') {
        syncData = { ...syncData, sobrenome: data.sobrenome || '', telefone: data.telefone || '' };
        stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (nome, sobrenome, telefone, ativo) VALUES (@nome, @sobrenome, @telefone, 1)`);
    } else if (table === 'portais') {
        syncData = { ...syncData, link: data.link || '' };
        stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (nome, link, ativo) VALUES (@nome, @link, 1)`);
    } else {
        stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (nome, ativo) VALUES (@nome, 1)`);
    }

    const result = stmt.run(syncData);

    // ☁️ SYNC SUPABASE
    try {
        await supabase.from(table).upsert([syncData], { onConflict: 'nome' });
    } catch (e) {
        console.error(`❌ [Supabase] Erro Sync ${table}:`, e.message);
    }

    return result;
}

export async function toggleItem(table, nome, ativo) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;
    const result = db.prepare(`UPDATE ${table} SET ativo = ? WHERE nome = ?`).run(ativo ? 1 : 0, nome);

    // ☁️ SYNC SUPABASE
    try {
        await supabase.from(table).update({ ativo: !!ativo }).eq('nome', nome);
    } catch (e) { }

    return result;
}

export async function deleteItem(table, nome) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;
    const result = db.prepare(`DELETE FROM ${table} WHERE nome = ?`).run(nome);

    setTimeout(async () => {
        try {
            await supabase.from(table).delete().eq('nome', nome);
        } catch (e) { }
    }, 2000);

    return result;
}

// User Management
export function getListUsers() {
    const users = db.prepare("SELECT username, email, nome_completo, whatsapp, role, ativo, reset_password, permissions FROM usuarios ORDER BY username").all();
    console.log("🔍 [DEBUG] getListUsers result:", users);
    return users;
}

export async function changePassword(username, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare("UPDATE usuarios SET password = ?, reset_password = 0 WHERE username = ?").run(hash, username);

    // ☁️ SYNC SUPABASE
    try {
        await supabase.from('usuarios').update({ password: hash, reset_password: 0 }).eq('username', username);
        console.log(`✅ [Supabase] Senha de '${username}' atualizada na nuvem.`);
    } catch (e) {
        console.error(`❌ [Supabase] Erro ao atualizar senha:`, e.message);
    }
    return result;
}

export function getUserRole(username) {
    return db.prepare("SELECT role FROM usuarios WHERE username = ?").get(username);
}

// Scripts
export function getScripts(username = null) {
    if (username) {
        return db.prepare("SELECT * FROM scripts WHERE username = ? OR is_system = 1 ORDER BY CASE WHEN ordem IS NULL THEN 1 ELSE 0 END, ordem ASC, is_system DESC, id DESC").all(username);
    }
    return db.prepare("SELECT * FROM scripts ORDER BY CASE WHEN ordem IS NULL THEN 1 ELSE 0 END, ordem ASC, id DESC").all();
}

export async function addScript(titulo, mensagem, isSystem = 0, userRole = null, link = null, username = null) {
    if (isSystem && !['master', 'developer', 'admin'].includes(userRole)) {
        throw new Error('Apenas Master, Developer ou Admin pode criar scripts do sistema');
    }
    const maxOrder = db.prepare("SELECT MAX(ordem) as m FROM scripts WHERE username = ? OR is_system = 1").get(username)?.m || 0;
    const result = db.prepare("INSERT INTO scripts (titulo, mensagem, is_system, link, username, ordem) VALUES (?, ?, ?, ?, ?, ?)").run(titulo, mensagem, isSystem ? 1 : 0, link, username, maxOrder + 1);

    // ☁️ SYNC SUPABASE
    try {
        const id = result.lastInsertRowid;
        await supabase.from('scripts').insert([{ id, titulo, mensagem, is_system: isSystem ? 1 : 0, link, username, ordem: maxOrder + 1 }]);
    } catch (e) { }

    return result;
}

export async function updateScript(id, titulo, mensagem, isSystem, userRole, link = null, username = null) {
    const existing = db.prepare("SELECT is_system, username FROM scripts WHERE id = ?").get(id);
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

    const result = db.prepare("UPDATE scripts SET titulo = ?, mensagem = ?, is_system = ?, link = ? WHERE id = ?").run(titulo, mensagem, isSystem ? 1 : 0, link, id);

    // ☁️ SYNC SUPABASE
    try {
        await supabase.from('scripts').update({ titulo, mensagem, is_system: isSystem ? 1 : 0, link }).eq('id', id);
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

export async function deleteScript(id, userRole, username = null) {
    const existing = db.prepare("SELECT is_system, username FROM scripts WHERE id = ?").get(id);
    if (!existing) throw new Error('Script não encontrado');

    if (['master', 'developer', 'admin'].includes(userRole)) {
        const result = db.prepare("DELETE FROM scripts WHERE id = ?").run(id);
        try { await supabase.from('scripts').delete().eq('id', id); } catch (e) { }
        return result;
    }
    if (existing.is_system === 1) {
        throw new Error('Apenas Master, Developer ou Admin pode deletar scripts do sistema');
    }
    if (existing.username && existing.username !== username) {
        throw new Error('Você não pode deletar scripts de outros usuários');
    }
    const result = db.prepare("DELETE FROM scripts WHERE id = ?").run(id);
    try { await supabase.from('scripts').delete().eq('id', id); } catch (e) { }
    return result;
}

export function getVehiclesStats() {
    const stats = db.prepare("SELECT veiculo_interesse, COUNT(*) as c FROM visitas GROUP BY veiculo_interesse").all();
    return stats.reduce((acc, row) => {
        acc[row.veiculo_interesse] = row.c;
        return acc;
    }, {});
}

export function getVisitsByVehicle(vehicleName) {
    return db.prepare("SELECT * FROM visitas WHERE veiculo_interesse = ? ORDER BY id DESC").all(vehicleName);
}

export function getAgendamentosPorUsuario() {
    return db.prepare(`
        SELECT 
            u.username as nome, 
            u.nome_completo, 
            u.email, 
            u.whatsapp, 
            u.ativo, 
            u.role,
            COUNT(v.id) as total 
        FROM usuarios u
        LEFT JOIN visitas v ON u.username = v.vendedor_sdr
        WHERE u.role = 'sdr'
        GROUP BY u.username
    `).all();
}

export function getTemperatureStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = db.prepare(`
            SELECT 
                SUM(CASE WHEN temperatura = 'Quente' THEN 1 ELSE 0 END) as quente,
                SUM(CASE WHEN temperatura = 'Morno' THEN 1 ELSE 0 END) as morno,
                SUM(CASE WHEN temperatura = 'Frio' THEN 1 ELSE 0 END) as frio
            FROM visitas
            WHERE substr(data_agendamento, 1, 10) = ? OR substr(datahora, 1, 10) = ?
        `).get(today, today);

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
    try {
        // 1. Portais
        const portais = db.prepare("SELECT * FROM portais").all();
        if (portais.length > 0) {
            await supabase.from('portais').upsert(portais.map(p => ({ ...p, ativo: !!p.ativo })));
            console.log(`✅ ${portais.length} portais sincronizados`);
        }

        // 2. Vendedores
        const vendedores = db.prepare("SELECT * FROM vendedores").all();
        if (vendedores.length > 0) {
            await supabase.from('vendedores').upsert(vendedores.map(v => ({ ...v, ativo: !!v.ativo })));
            console.log(`✅ ${vendedores.length} vendedores sincronizados`);
        }

        // 3. Usuários (Agora COM senhas para permitir login em outros PCs)
        const usuarios = db.prepare("SELECT username, password, role, reset_password FROM usuarios").all();
        if (usuarios.length > 0) {
            await supabase.from('usuarios').upsert(usuarios);
            console.log(`✅ ${usuarios.length} usuários sincronizados`);
        }

        // 4. Visitas (Histórico Completo)
        const visitas = db.prepare("SELECT * FROM visitas").all();
        if (visitas.length > 0) {
            // Chunk de 100 para evitar timeout
            const chunkSize = 100;
            for (let i = 0; i < visitas.length; i += chunkSize) {
                const chunk = visitas.slice(i, i + chunkSize);
                const { error } = await supabase.from('visitas').upsert(chunk);
                if (error) throw error;
            }
            console.log(`✅ ${visitas.length} visitas sincronizadas`);
        }

        // 5. Scripts
        const scripts = db.prepare("SELECT * FROM scripts").all();
        if (scripts.length > 0) {
            const { error } = await supabase.from('scripts').upsert(scripts.map(({ id, ...s }) => s));
            if (error) console.warn("Erro ao sincronizar scripts:", error.message);
            else console.log(`✅ ${scripts.length} scripts sincronizados`);
        }

        return { success: true, message: "Sincronização com a nuvem concluída com sucesso!" };
    } catch (err) {
        console.error("Erro na Migração:", err);
        return { success: false, message: "Erro na sincronização: " + err.message };
    } finally {
        syncLock = false; // Libera o sistema para voltar a ouvir em tempo real
    }
}

// --- REALTIME LISTENER ---
export function enableRealtimeSync() {
    if (isRealtimeEnabled) {
        console.log("📡 [Supabase Realtime] Já ativo. Ignorando nova inscrição.");
        return;
    }
    isRealtimeEnabled = true;
    console.log("📡 [Supabase Realtime] Iniciando listeners de tabelas...");

    // Inscreve para mudanças nas tabelas críticas
    const channel = supabase.channel('db-changes')
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
                            INSERT INTO usuarios (username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions)
                            VALUES (@username, @password, @role, @reset_password, @nome_completo, @email, @whatsapp, @ativo, @permissions)
                            ON CONFLICT(username) DO UPDATE SET
                            password=excluded.password, role=excluded.role, reset_password=excluded.reset_password,
                            nome_completo=excluded.nome_completo, email=excluded.email, whatsapp=excluded.whatsapp, ativo=excluded.ativo, permissions=excluded.permissions
                         `).run({
                            username: newRec.username,
                            password: newRec.password,
                            role: newRec.role,
                            reset_password: newRec.reset_password ? 1 : 0,
                            nome_completo: newRec.nome_completo || '',
                            email: newRec.email || '',
                            whatsapp: newRec.whatsapp || '',
                            ativo: newRec.ativo ? 1 : 0,
                            permissions: newRec.permissions || '[]'
                        });
                    }
                    // Apenas avisa a UI para recarregar do BANCO LOCAL (que já está atualizado)
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
                } catch (e) { console.error("Erro Realtime Usuario:", e); }
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
                            INSERT INTO vendedores (nome, sobrenome, telefone, ativo) 
                            VALUES (@nome, @sobrenome, @telefone, @ativo)
                            ON CONFLICT(nome) DO UPDATE SET 
                            sobrenome=excluded.sobrenome, telefone=excluded.telefone, ativo=excluded.ativo
                         `).run({
                            nome: newRec.nome,
                            sobrenome: newRec.sobrenome,
                            telefone: newRec.telefone,
                            ativo: newRec.ativo ? 1 : 0
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
                            INSERT INTO scripts (id, titulo, mensagem, is_system, link, username, ordem) 
                            VALUES (@id, @titulo, @mensagem, @is_system, @link, @username, @ordem)
                            ON CONFLICT(id) DO UPDATE SET 
                            titulo=excluded.titulo, mensagem=excluded.mensagem, 
                            is_system=excluded.is_system, link=excluded.link, username=excluded.username, ordem=excluded.ordem
                         `).run({
                            ...newRec,
                            is_system: newRec.is_system ? 1 : 0
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
                            INSERT INTO estoque (nome, foto, fotos, link, km, cambio, ano, valor, ativo) 
                            VALUES (@nome, @foto, @fotos, @link, @km, @cambio, @ano, @valor, @ativo) 
                            ON CONFLICT(nome) DO UPDATE SET 
                            foto=excluded.foto, fotos=excluded.fotos, link=excluded.link, 
                            km=excluded.km, cambio=excluded.cambio, ano=excluded.ano, valor=excluded.valor, ativo=excluded.ativo
                         `).run({
                            ...newRec,
                            fotos: typeof newRec.fotos === 'string' ? newRec.fotos : JSON.stringify(newRec.fotos),
                            ativo: newRec.ativo ? 1 : 0
                        });
                    }
                } else if (eventType === 'DELETE' && oldRec) {
                    db.prepare("DELETE FROM estoque WHERE nome = ?").run(oldRec.nome);
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
                try {
                    if (eventType === 'DELETE' && oldRec) {
                        db.prepare("DELETE FROM visitas WHERE id = ?").run(oldRec.id);
                    } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
                        db.prepare(`
                            INSERT INTO visitas (
                                id, datahora, mes, cliente, telefone, portal, 
                                veiculo_interesse, veiculo_troca, vendedor, vendedor_sdr, negociacao, status,
                                data_agendamento, temperatura, motivo_perda, forma_pagamento, status_pipeline, valor_proposta, cpf_cliente, historico_log
                            )
                            VALUES (
                                @id, @datahora, @mes, @cliente, @telefone, @portal, 
                                @veiculo_interesse, @veiculo_troca, @vendedor, @vendedor_sdr, @negociacao, @status,
                                @data_agendamento, @temperatura, @motivo_perda, @forma_pagamento, @status_pipeline, @valor_proposta, @cpf_cliente, @historico_log
                            )
                            ON CONFLICT(id) DO UPDATE SET
                                datahora=excluded.datahora, mes=excluded.mes, cliente=excluded.cliente, telefone=excluded.telefone,
                                portal=excluded.portal, veiculo_interesse=excluded.veiculo_interesse, veiculo_troca=excluded.veiculo_troca,
                                vendedor=excluded.vendedor, vendedor_sdr=excluded.vendedor_sdr, negociacao=excluded.negociacao,
                                status=excluded.status, data_agendamento=excluded.data_agendamento, temperatura=excluded.temperatura,
                                motivo_perda=excluded.motivo_perda, forma_pagamento=excluded.forma_pagamento,
                                status_pipeline=excluded.status_pipeline, valor_proposta=excluded.valor_proposta,
                                cpf_cliente=excluded.cpf_cliente, historico_log=excluded.historico_log
                         `).run(newRec);
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'visitas'));
                } catch (e) { console.error("Erro Realtime Visitas:", e); }
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
                        db.prepare("INSERT INTO portais (nome, ativo) VALUES (@nome, @ativo) ON CONFLICT(nome) DO UPDATE SET ativo=excluded.ativo")
                            .run({ nome: newRec.nome, ativo: newRec.ativo ? 1 : 0 });
                    }
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'portais'));
                } catch (e) { console.error("Erro Realtime Portais:", e); }
            }
        )
        .subscribe();
}

// --- METAS & PERFORMANCE ---

export function getConfigMeta() {
    try {
        const metaVisitas = db.prepare("SELECT valor FROM config WHERE chave = 'meta_visitas_semanal'").get()?.valor || '0';
        const metaVendas = db.prepare("SELECT valor FROM config WHERE chave = 'meta_vendas_mensal'").get()?.valor || '0';
        return { visita_semanal: parseInt(metaVisitas), venda_mensal: parseInt(metaVendas) };
    } catch (err) {
        console.error("Erro ao ler metas:", err);
        return { visita_semanal: 0, venda_mensal: 0 };
    }
}

export function setConfigMeta(visita, venda) {
    try {
        const stmt = db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor");
        db.transaction(() => {
            stmt.run('meta_visitas_semanal', visita.toString());
            stmt.run('meta_vendas_mensal', venda.toString());
        })();
        return { success: true };
    } catch (err) {
        console.error("Erro ao salvar metas:", err);
        throw err;
    }
}

export function getConfig(key) {
    try {
        const row = db.prepare("SELECT valor FROM config WHERE chave = ?").get(key);
        return row ? row.valor : null;
    } catch (err) {
        console.error(`Erro ao ler config [${key}]:`, err);
        return null;
    }
}

export function saveConfig(key, value) {
    try {
        db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor").run(key, value);
        return { success: true };
    } catch (err) {
        console.error(`Erro ao salvar config [${key}]:`, err);
        throw err;
    }
}

export function getSdrPerformance() {
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
        const users = db.prepare("SELECT username FROM usuarios WHERE role IN ('vendedor', 'sdr')").all();

        const performance = [];

        for (const u of users) {
            // Meta Semanal: Visitas AGENDADAS ou REALIZADAS na semana corrente
            // O campo é data_agendamento.
            const visitas = db.prepare(`
                SELECT COUNT(*) as count FROM visitas
                WHERE vendedor_sdr = ?
                AND (status_pipeline = 'Agendado' OR status_pipeline = 'Visita Realizada' OR status_pipeline = 'Vendido' OR status_pipeline = 'Proposta')
                AND data_agendamento BETWEEN ? AND ?
             `).get(u.username, weekIsoStart, weekIsoEnd).count;

            // Meta Mensal: VENDAS (status_pipeline = 'Vendido') no mês corrente
            const vendas = db.prepare(`
                SELECT COUNT(*) as count FROM visitas
                WHERE vendedor_sdr = ?
                AND status_pipeline = 'Vendido'
                AND data_agendamento BETWEEN ? AND ?
             `).get(u.username, monthIsoStart, monthIsoEnd).count;

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

