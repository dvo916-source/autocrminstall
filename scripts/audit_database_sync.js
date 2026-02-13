import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Estrutura esperada das tabelas locais (baseado em db.js)
const LOCAL_TABLES = {
    lojas: ['id', 'nome', 'logo_url', 'slug', 'config', 'modulos', 'ativo', 'endereco', 'supabase_url', 'supabase_anon_key'],
    visitas: ['id', 'loja_id', 'datahora', 'mes', 'cliente', 'telefone', 'portal', 'veiculo_interesse', 'veiculo_troca',
        'vendedor', 'vendedor_sdr', 'negociacao', 'data_agendamento', 'temperatura', 'motivo_perda',
        'forma_pagamento', 'status_pipeline', 'valor_proposta', 'cpf_cliente', 'historico_log', 'status'],
    estoque: ['id', 'loja_id', 'nome', 'foto', 'fotos', 'link', 'km', 'cambio', 'ano', 'valor', 'ativo'],
    portais: ['nome', 'loja_id', 'link', 'ativo'],
    vendedores: ['nome', 'loja_id', 'sobrenome', 'telefone', 'ativo', 'id'],
    config: ['chave', 'loja_id', 'valor'],
    crm_settings: ['key', 'loja_id', 'category', 'value', 'updated_at'],
    usuarios: ['username', 'loja_id', 'password', 'role', 'reset_password', 'nome_completo', 'email',
        'whatsapp', 'ativo', 'permissions', 'cpf', 'session_id', 'last_login', 'created_by'],
    scripts: ['id', 'loja_id', 'titulo', 'mensagem', 'is_system', 'link', 'username', 'ordem'],
    notas: ['id', 'loja_id', 'sdr_username', 'texto', 'data_nota', 'concluido']
};

// Mapeamento de campos que têm nomes diferentes entre local e Supabase
const FIELD_MAPPINGS = {
    usuarios: {
        password: 'password_hash',
        reset_password: 'force_password_change'
    }
};

async function checkTableExists(tableName) {
    try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                return { exists: false, error: error.message };
            }
            return { exists: true, error: error.message };
        }
        return { exists: true, error: null };
    } catch (e) {
        return { exists: false, error: e.message };
    }
}

async function getTableColumns(tableName) {
    try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (error) return { columns: [], error: error.message };
        if (!data || data.length === 0) return { columns: [], error: null };
        return { columns: Object.keys(data[0]), error: null };
    } catch (e) {
        return { columns: [], error: e.message };
    }
}

async function countRecords(tableName) {
    try {
        const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        if (error) return { count: 0, error: error.message };
        return { count: count || 0, error: null };
    } catch (e) {
        return { count: 0, error: e.message };
    }
}

async function auditDatabase() {
    console.log('🔍 AUDITORIA DE SINCRONIZAÇÃO DE BANCO DE DADOS\n');
    console.log(`📡 Conectando ao Supabase: ${SUPABASE_URL}\n`);
    console.log('='.repeat(80));

    const report = {
        missingTables: [],
        existingTables: [],
        missingFields: {},
        extraFields: {},
        fieldMappingIssues: {},
        recordCounts: {}
    };

    for (const [tableName, localFields] of Object.entries(LOCAL_TABLES)) {
        console.log(`\n📊 Verificando tabela: ${tableName}`);
        console.log('-'.repeat(80));

        // 1. Verificar se a tabela existe
        const { exists, error: existsError } = await checkTableExists(tableName);

        if (!exists) {
            console.log(`❌ TABELA NÃO EXISTE NO SUPABASE`);
            report.missingTables.push(tableName);
            continue;
        }

        console.log(`✅ Tabela existe no Supabase`);
        report.existingTables.push(tableName);

        // 2. Obter colunas do Supabase
        const { columns: supabaseColumns, error: colError } = await getTableColumns(tableName);

        if (colError) {
            console.log(`⚠️  Erro ao obter colunas: ${colError}`);
            continue;
        }

        // 3. Contar registros
        const { count, error: countError } = await countRecords(tableName);
        report.recordCounts[tableName] = count;
        console.log(`📈 Registros no Supabase: ${count}`);

        // 4. Comparar campos
        const expectedSupabaseFields = localFields.map(field => {
            if (FIELD_MAPPINGS[tableName] && FIELD_MAPPINGS[tableName][field]) {
                return FIELD_MAPPINGS[tableName][field];
            }
            return field;
        });

        const missingInSupabase = expectedSupabaseFields.filter(f => !supabaseColumns.includes(f));
        const extraInSupabase = supabaseColumns.filter(f =>
            !expectedSupabaseFields.includes(f) &&
            !['created_at', 'updated_at'].includes(f) // Campos padrão do Supabase
        );

        if (missingInSupabase.length > 0) {
            console.log(`\n⚠️  Campos FALTANDO no Supabase:`);
            missingInSupabase.forEach(f => console.log(`   - ${f}`));
            report.missingFields[tableName] = missingInSupabase;
        }

        if (extraInSupabase.length > 0) {
            console.log(`\n📝 Campos EXTRAS no Supabase (não existem no local):`);
            extraInSupabase.forEach(f => console.log(`   - ${f}`));
            report.extraFields[tableName] = extraInSupabase;
        }

        // 5. Verificar mapeamento de campos
        if (FIELD_MAPPINGS[tableName]) {
            console.log(`\n🔄 Mapeamento de campos:`);
            for (const [localField, supabaseField] of Object.entries(FIELD_MAPPINGS[tableName])) {
                const hasLocal = localFields.includes(localField);
                const hasSupabase = supabaseColumns.includes(supabaseField);

                if (hasLocal && hasSupabase) {
                    console.log(`   ✅ ${localField} → ${supabaseField}`);
                } else {
                    console.log(`   ❌ ${localField} → ${supabaseField} (PROBLEMA)`);
                    if (!report.fieldMappingIssues[tableName]) {
                        report.fieldMappingIssues[tableName] = [];
                    }
                    report.fieldMappingIssues[tableName].push({ localField, supabaseField, hasLocal, hasSupabase });
                }
            }
        }

        console.log(`\n✅ Campos OK: ${supabaseColumns.length - missingInSupabase.length - extraInSupabase.length}`);
    }

    // Relatório Final
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 RELATÓRIO FINAL DE AUDITORIA');
    console.log('='.repeat(80));

    console.log(`\n✅ Tabelas existentes no Supabase: ${report.existingTables.length}/${Object.keys(LOCAL_TABLES).length}`);
    report.existingTables.forEach(t => console.log(`   - ${t} (${report.recordCounts[t]} registros)`));

    if (report.missingTables.length > 0) {
        console.log(`\n❌ Tabelas FALTANDO no Supabase: ${report.missingTables.length}`);
        report.missingTables.forEach(t => console.log(`   - ${t}`));
    }

    if (Object.keys(report.missingFields).length > 0) {
        console.log(`\n⚠️  Tabelas com campos FALTANDO:`);
        for (const [table, fields] of Object.entries(report.missingFields)) {
            console.log(`\n   ${table}:`);
            fields.forEach(f => console.log(`      - ${f}`));
        }
    }

    if (Object.keys(report.extraFields).length > 0) {
        console.log(`\n📝 Tabelas com campos EXTRAS (não mapeados):`);
        for (const [table, fields] of Object.entries(report.extraFields)) {
            console.log(`\n   ${table}:`);
            fields.forEach(f => console.log(`      - ${f}`));
        }
    }

    if (Object.keys(report.fieldMappingIssues).length > 0) {
        console.log(`\n❌ Problemas de mapeamento de campos:`);
        for (const [table, issues] of Object.entries(report.fieldMappingIssues)) {
            console.log(`\n   ${table}:`);
            issues.forEach(i => console.log(`      - ${i.localField} → ${i.supabaseField}`));
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 RECOMENDAÇÕES\n');

    if (report.missingTables.length > 0) {
        console.log('1️⃣ CRIAR TABELAS FALTANTES NO SUPABASE:');
        report.missingTables.forEach(t => {
            console.log(`\n   CREATE TABLE ${t} (`);
            LOCAL_TABLES[t].forEach((field, idx) => {
                const comma = idx < LOCAL_TABLES[t].length - 1 ? ',' : '';
                console.log(`      ${field} TEXT${comma}`);
            });
            console.log(`   );`);
        });
    }

    if (Object.keys(report.missingFields).length > 0) {
        console.log('\n2️⃣ ADICIONAR CAMPOS FALTANTES:');
        for (const [table, fields] of Object.entries(report.missingFields)) {
            console.log(`\n   Tabela: ${table}`);
            fields.forEach(f => {
                console.log(`      ALTER TABLE ${table} ADD COLUMN ${f} TEXT;`);
            });
        }
    }

    console.log('\n' + '='.repeat(80));
}

// Executar auditoria
auditDatabase().catch(console.error);
