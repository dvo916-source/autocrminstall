import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Caminho do banco local (mesmo caminho que o Electron usa)
// Windows: C:\Users\{username}\AppData\Roaming\crystal_app\sistema_visitas.db
const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'crystal_app');
const dbPath = path.join(appDataPath, 'sistema_visitas.db');

console.log(`📂 Caminho do banco: ${dbPath}\n`);

const db = new Database(dbPath);

const DEFAULT_STORE_ID = 'irw-motors-main';

console.log('📤 UPLOAD DE DADOS LOCAIS PARA SUPABASE\n');
console.log('='.repeat(80));

async function uploadTable(tableName, transformFn = null) {
    console.log(`\n📊 Processando tabela: ${tableName}`);
    console.log('-'.repeat(80));

    try {
        // Buscar dados locais
        const localData = db.prepare(`SELECT * FROM ${tableName}`).all();

        if (!localData || localData.length === 0) {
            console.log(`⚠️  Nenhum dado local encontrado`);
            return { success: true, uploaded: 0 };
        }

        console.log(`📋 ${localData.length} registros encontrados localmente`);

        // Transformar dados se necessário
        const dataToUpload = transformFn ? localData.map(transformFn) : localData;

        // Garantir que todos tenham loja_id
        const safeData = dataToUpload.map(item => ({
            ...item,
            loja_id: item.loja_id || DEFAULT_STORE_ID
        }));

        // Upload para Supabase
        const { data, error } = await supabase
            .from(tableName)
            .upsert(safeData, { onConflict: tableName === 'portais' ? 'nome,loja_id' : 'id' });

        if (error) {
            console.error(`❌ Erro ao fazer upload: ${error.message}`);
            return { success: false, error: error.message, uploaded: 0 };
        }

        console.log(`✅ ${safeData.length} registros enviados com sucesso`);
        return { success: true, uploaded: safeData.length };

    } catch (e) {
        console.error(`❌ Erro: ${e.message}`);
        return { success: false, error: e.message, uploaded: 0 };
    }
}

async function uploadAllData() {
    const results = {};

    // 1. USUARIOS
    console.log('\n🔐 USUÁRIOS');
    results.usuarios = await uploadTable('usuarios', (u) => ({
        username: u.username,
        password_hash: u.password, // Local usa 'password', Supabase usa 'password_hash'
        role: u.role,
        force_password_change: u.reset_password === 1,
        nome_completo: u.nome_completo || '',
        email: u.email || '',
        whatsapp: u.whatsapp || '',
        avatar_url: u.avatar_url || '',
        ativo: u.ativo === 1,
        permissions: u.permissions || '[]',
        cpf: u.cpf || '',
        session_id: u.session_id || '',
        last_login: u.last_login || null,
        created_by: u.created_by || '',
        loja_id: u.loja_id || DEFAULT_STORE_ID
    }));

    // 2. VENDEDORES
    console.log('\n👥 VENDEDORES');
    results.vendedores = await uploadTable('vendedores', (v) => ({
        id: v.id || v.nome, // Usar nome como fallback se não tiver ID
        nome: v.nome,
        sobrenome: v.sobrenome || '',
        telefone: v.telefone || '',
        email: v.email || '',
        foto_url: v.foto_url || '',
        ativo: v.ativo === 1,
        loja_id: v.loja_id || DEFAULT_STORE_ID
    }));

    // 3. PORTAIS
    console.log('\n🌐 PORTAIS');
    results.portais = await uploadTable('portais', (p) => ({
        nome: p.nome,
        link: p.link || '',
        ativo: p.ativo === 1,
        loja_id: p.loja_id || DEFAULT_STORE_ID
    }));

    // 4. SCRIPTS
    console.log('\n📝 SCRIPTS');
    results.scripts = await uploadTable('scripts', (s) => ({
        id: s.id,
        titulo: s.titulo,
        mensagem: s.mensagem || '',
        is_system: s.is_system === 1,
        link: s.link || '',
        username: s.username || '',
        ordem: s.ordem || 0,
        loja_id: s.loja_id || DEFAULT_STORE_ID
    }));

    // 5. VISITAS
    console.log('\n📋 VISITAS');
    results.visitas = await uploadTable('visitas', (v) => ({
        id: v.id,
        datahora: v.datahora,
        mes: v.mes,
        cliente: v.cliente || '',
        telefone: v.telefone || '',
        portal: v.portal || '',
        veiculo_interesse: v.veiculo_interesse || '',
        veiculo_troca: v.veiculo_troca || '',
        vendedor: v.vendedor || '',
        vendedor_sdr: v.vendedor_sdr || '',
        negociacao: v.negociacao || '',
        data_agendamento: v.data_agendamento || null,
        temperatura: v.temperatura || '',
        motivo_perda: v.motivo_perda || '',
        forma_pagamento: v.forma_pagamento || '',
        status_pipeline: v.status_pipeline || '',
        valor_proposta: v.valor_proposta || '',
        cpf_cliente: v.cpf_cliente || '',
        historico_log: v.historico_log || '',
        status: v.status || 'Pendente',
        loja_id: v.loja_id || DEFAULT_STORE_ID
    }));

    // 6. CRM_SETTINGS
    console.log('\n⚙️  CRM SETTINGS');
    results.crm_settings = await uploadTable('crm_settings', (c) => ({
        key: c.key,
        category: c.category || '',
        value: c.value || '',
        updated_at: c.updated_at || new Date().toISOString(),
        loja_id: c.loja_id || DEFAULT_STORE_ID
    }));

    // Relatório Final
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RESUMO DO UPLOAD');
    console.log('='.repeat(80));

    let totalUploaded = 0;
    let totalFailed = 0;

    for (const [table, result] of Object.entries(results)) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${table}: ${result.uploaded} registros`);

        if (result.success) {
            totalUploaded += result.uploaded;
        } else {
            totalFailed++;
            console.log(`   Erro: ${result.error}`);
        }
    }

    console.log('\n' + '-'.repeat(80));
    console.log(`📈 Total enviado: ${totalUploaded} registros`);
    console.log(`❌ Tabelas com erro: ${totalFailed}`);
    console.log('='.repeat(80));

    if (totalFailed === 0) {
        console.log('\n🎉 TODOS OS DADOS FORAM ENVIADOS COM SUCESSO!\n');
    } else {
        console.log('\n⚠️  ALGUNS DADOS NÃO FORAM ENVIADOS. Verifique os erros acima.\n');
    }
}

// Executar upload
uploadAllData()
    .then(() => {
        console.log('✅ Upload concluído!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erro fatal:', err);
        process.exit(1);
    });
