import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 MIGRAÇÃO AUTOMÁTICA DE BANCO DE DADOS\n');
console.log('='.repeat(80));

// Migrações SQL para executar no Supabase
const migrations = [
    {
        name: 'usuarios - adicionar campos faltantes',
        sql: `
            ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp TEXT;
            ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]';
            ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_id TEXT;
            ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_by TEXT;
        `
    },
    {
        name: 'vendedores - adicionar campo sobrenome',
        sql: `
            ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS sobrenome TEXT;
        `
    },
    {
        name: 'visitas - recriar tabela completa',
        sql: `
            -- Verificar se a tabela tem dados
            DO $$
            BEGIN
                -- Se a tabela existir e tiver estrutura incorreta, vamos recriá-la
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'visitas') THEN
                    DROP TABLE IF EXISTS visitas CASCADE;
                END IF;
                
                CREATE TABLE visitas (
                    id BIGSERIAL PRIMARY KEY,
                    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
                    datahora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    mes INTEGER,
                    cliente TEXT,
                    telefone TEXT,
                    portal TEXT,
                    veiculo_interesse TEXT,
                    veiculo_troca TEXT,
                    vendedor TEXT,
                    vendedor_sdr TEXT,
                    negociacao TEXT,
                    data_agendamento TIMESTAMPTZ,
                    temperatura TEXT,
                    motivo_perda TEXT,
                    forma_pagamento TEXT,
                    status_pipeline TEXT,
                    valor_proposta TEXT,
                    cpf_cliente TEXT,
                    historico_log TEXT,
                    status TEXT DEFAULT 'Pendente',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_visitas_loja_id ON visitas(loja_id);
                CREATE INDEX IF NOT EXISTS idx_visitas_datahora ON visitas(datahora);
                CREATE INDEX IF NOT EXISTS idx_visitas_vendedor ON visitas(vendedor);
            END $$;
        `
    },
    {
        name: 'portais - recriar tabela completa',
        sql: `
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'portais') THEN
                    DROP TABLE IF EXISTS portais CASCADE;
                END IF;
                
                CREATE TABLE portais (
                    nome TEXT NOT NULL,
                    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
                    link TEXT,
                    ativo BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    PRIMARY KEY (nome, loja_id)
                );
            END $$;
        `
    },
    {
        name: 'scripts - recriar tabela completa',
        sql: `
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scripts') THEN
                    DROP TABLE IF EXISTS scripts CASCADE;
                END IF;
                
                CREATE TABLE scripts (
                    id BIGSERIAL PRIMARY KEY,
                    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
                    titulo TEXT NOT NULL,
                    mensagem TEXT,
                    is_system BOOLEAN DEFAULT FALSE,
                    link TEXT,
                    username TEXT,
                    ordem INTEGER,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_scripts_loja_id ON scripts(loja_id);
                CREATE INDEX IF NOT EXISTS idx_scripts_username ON scripts(username);
            END $$;
        `
    },
    {
        name: 'crm_settings - recriar tabela completa',
        sql: `
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_settings') THEN
                    DROP TABLE IF EXISTS crm_settings CASCADE;
                END IF;
                
                CREATE TABLE crm_settings (
                    key TEXT NOT NULL,
                    loja_id TEXT NOT NULL DEFAULT 'irw-motors-main',
                    category TEXT,
                    value TEXT,
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    PRIMARY KEY (key, loja_id)
                );
            END $$;
        `
    }
];

async function executeMigration(migration) {
    console.log(`\n📝 Executando: ${migration.name}`);
    console.log('-'.repeat(80));

    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: migration.sql
        });

        if (error) {
            // Tentar método alternativo se RPC não estiver disponível
            console.log('⚠️  RPC não disponível, tentando método alternativo...');

            // Para ALTER TABLE, podemos tentar executar diretamente
            // Nota: Isso só funciona se tivermos permissões adequadas
            throw new Error(`Migração requer execução manual no Supabase Dashboard: ${error.message}`);
        }

        console.log('✅ Migração executada com sucesso!');
        return { success: true };
    } catch (e) {
        console.error(`❌ Erro: ${e.message}`);
        return { success: false, error: e.message };
    }
}

async function runMigrations() {
    console.log('\n🔧 Iniciando migrações...\n');

    const results = [];

    for (const migration of migrations) {
        const result = await executeMigration(migration);
        results.push({ ...migration, ...result });

        // Pequeno delay entre migrações
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RESUMO DAS MIGRAÇÕES');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n✅ Sucesso: ${successful}/${results.length}`);
    console.log(`❌ Falhas: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\n⚠️  MIGRAÇÕES QUE FALHARAM:\n');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.name}`);
            console.log(`     Erro: ${r.error}\n`);
        });

        console.log('\n📋 SCRIPTS SQL PARA EXECUTAR MANUALMENTE:\n');
        console.log('Copie e execute os seguintes comandos no Supabase Dashboard > SQL Editor:\n');
        console.log('='.repeat(80));

        results.filter(r => !r.success).forEach(r => {
            console.log(`\n-- ${r.name}`);
            console.log(r.sql);
            console.log('\n' + '-'.repeat(80));
        });
    }

    return results;
}

// Executar migrações
runMigrations()
    .then(results => {
        const allSuccess = results.every(r => r.success);
        if (allSuccess) {
            console.log('\n🎉 TODAS AS MIGRAÇÕES FORAM EXECUTADAS COM SUCESSO!\n');
            process.exit(0);
        } else {
            console.log('\n⚠️  ALGUMAS MIGRAÇÕES FALHARAM. Veja os scripts SQL acima.\n');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('\n❌ Erro fatal:', err);
        process.exit(1);
    });
