// Script para verificar e resetar o status de alteração de senha
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

dotenv.config();

const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'crystal_app');
const dbPath = path.join(appDataPath, 'sistema_visitas.db');

async function fixPasswordReset() {
    console.log('\n🔍 VERIFICANDO STATUS DE SENHA NO SUPABASE...\n');

    const { data: users, error } = await supabase
        .from('usuarios')
        .select('username, role, force_password_change');

    if (error) {
        console.error('❌ Erro no Supabase:', error.message);
    } else {
        console.table(users);

        const forcedUsers = users.filter(u => u.force_password_change);
        if (forcedUsers.length > 0) {
            console.log(`\n⚠️ Encontrados ${forcedUsers.length} usuários com reset forçado.`);
            console.log('🛠️ Corrigindo no Supabase...');
            const { error: updError } = await supabase
                .from('usuarios')
                .update({ force_password_change: false })
                .neq('username', 'non_existent_user'); // Update all

            if (updError) {
                console.error('❌ Erro ao atualizar Supabase:', updError.message);
            } else {
                console.log('✅ Supabase atualizado com sucesso (force_password_change = false para todos).');
            }
        } else {
            console.log('\n✅ Todos os usuários no Supabase estão com force_password_change = false.');
        }
    }

    console.log('\n🛠️ CORRIGINDO BANCO LOCAL...');
    try {
        const db = new Database(dbPath);
        const result = db.prepare('UPDATE usuarios SET reset_password = 0').run();
        console.log(`✅ Banco local atualizado: ${result.changes} usuários resetados.`);
        db.close();
    } catch (e) {
        console.error('❌ Erro no banco local:', e.message);
    }

    console.log('\n🎉 Processo concluído!\n');
}

fixPasswordReset().catch(console.error);
