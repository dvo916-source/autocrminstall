// Verifica se as permissões dos usuários estão sincronizadas
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'crystal_app');
const dbPath = path.join(appDataPath, 'sistema_visitas.db');

console.log(`📂 Banco local: ${dbPath}\n`);

const db = new Database(dbPath);

async function verifyPermissions() {
    console.log('🔐 VERIFICAÇÃO DE PERMISSÕES DE USUÁRIOS\n');
    console.log('='.repeat(80));

    // Buscar usuários locais
    const localUsers = db.prepare('SELECT username, role, permissions, ativo FROM usuarios').all();

    // Buscar usuários no Supabase
    const { data: supabaseUsers, error } = await supabase
        .from('usuarios')
        .select('username, role, permissions, ativo');

    if (error) {
        console.error('❌ Erro ao buscar usuários do Supabase:', error.message);
        return;
    }

    console.log(`\n📊 Usuários Locais: ${localUsers.length}`);
    console.log(`📊 Usuários Supabase: ${supabaseUsers.length}\n`);

    console.log('='.repeat(80));
    console.log('COMPARAÇÃO DE PERMISSÕES\n');

    const issues = [];

    for (const localUser of localUsers) {
        const supabaseUser = supabaseUsers.find(u => u.username === localUser.username);

        if (!supabaseUser) {
            issues.push(`❌ Usuário "${localUser.username}" existe localmente mas NÃO existe no Supabase`);
            continue;
        }

        console.log(`\n👤 ${localUser.username} (${localUser.role})`);
        console.log('-'.repeat(80));

        // Comparar permissões
        const localPerms = localUser.permissions || '[]';
        const supabasePerms = supabaseUser.permissions || '[]';

        if (localPerms !== supabasePerms) {
            console.log(`⚠️  PERMISSÕES DIFERENTES:`);
            console.log(`   Local:     ${localPerms}`);
            console.log(`   Supabase:  ${supabasePerms}`);
            issues.push(`Permissões diferentes para ${localUser.username}`);
        } else {
            console.log(`✅ Permissões sincronizadas: ${localPerms}`);
        }

        // Comparar role
        if (localUser.role !== supabaseUser.role) {
            console.log(`⚠️  ROLE DIFERENTE:`);
            console.log(`   Local:     ${localUser.role}`);
            console.log(`   Supabase:  ${supabaseUser.role}`);
            issues.push(`Role diferente para ${localUser.username}`);
        } else {
            console.log(`✅ Role sincronizada: ${localUser.role}`);
        }

        // Comparar status ativo
        const localAtivo = localUser.ativo === 1;
        const supabaseAtivo = supabaseUser.ativo === true;

        if (localAtivo !== supabaseAtivo) {
            console.log(`⚠️  STATUS ATIVO DIFERENTE:`);
            console.log(`   Local:     ${localAtivo}`);
            console.log(`   Supabase:  ${supabaseAtivo}`);
            issues.push(`Status ativo diferente para ${localUser.username}`);
        } else {
            console.log(`✅ Status ativo sincronizado: ${localAtivo}`);
        }
    }

    // Verificar usuários que existem no Supabase mas não localmente
    for (const supabaseUser of supabaseUsers) {
        const localUser = localUsers.find(u => u.username === supabaseUser.username);
        if (!localUser) {
            issues.push(`❌ Usuário "${supabaseUser.username}" existe no Supabase mas NÃO existe localmente`);
        }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📋 RESUMO DA VERIFICAÇÃO\n');

    if (issues.length === 0) {
        console.log('🎉 TUDO SINCRONIZADO! Nenhum problema encontrado.\n');
    } else {
        console.log(`⚠️  ${issues.length} PROBLEMA(S) ENCONTRADO(S):\n`);
        issues.forEach((issue, i) => {
            console.log(`${i + 1}. ${issue}`);
        });
        console.log('\n💡 Recomendação: Execute o upload de dados novamente para corrigir.\n');
    }

    console.log('='.repeat(80));

    db.close();
}

verifyPermissions().catch(console.error);
