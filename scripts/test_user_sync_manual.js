
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIG ---
const SUPABASE_URL = "https://whyfmogbayqwaeddoxwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";
const DB_PATH = "d:\\VISITAS IRW\\crystal_app\\sistema_visitas.db";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new Database(DB_PATH);

async function testSync() {
    console.log("🚀 Iniciando Teste de Sincronização de Usuário...");

    const testUser = {
        username: `test_user_${Date.now()}@test.com`,
        password: 'password123',
        role: 'sdr',
        nome_completo: `Test User ${Date.now()}`,
        email: `test_user_${Date.now()}@test.com`,
        whatsapp: '61999999999',
        ativo: 1
    };

    console.log(`👤 Criando usuário de teste localmente: ${testUser.username}`);

    try {
        // 1. Simula Inserção Local (como o Electron faz)
        const stmt = db.prepare(`
            INSERT INTO usuarios (username, password, role, reset_password, nome_completo, email, whatsapp, ativo)
            VALUES (@username, @password, @role, 1, @nome_completo, @email, @whatsapp, 1)
        `);

        stmt.run({
            username: testUser.username,
            password: 'hashed_password_123',
            role: testUser.role,
            nome_completo: testUser.nome_completo,
            email: testUser.email,
            whatsapp: testUser.whatsapp
        });

        console.log("✅ Usuário inserido no SQLite Local com sucesso.");

        // 2. Tenta Sync com Supabase
        console.log("☁️ Tentando sincronizar com Supabase...");

        const { data, error } = await supabase.from('usuarios').insert([{
            username: testUser.username,
            password: 'hashed_password_123',
            role: testUser.role,
            reset_password: 1,
            nome_completo: testUser.nome_completo,
            email: testUser.email,
            whatsapp: testUser.whatsapp,
            ativo: true
        }]);

        if (error) {
            console.error("❌ ERRO NO SYNC SUPABASE:", error);
        } else {
            console.log("✅ Sincronização com Supabase realizada com sucesso!");
        }

        // 3. Verifica se realmente está lá
        console.log("🔍 Verificando usuário no Supabase...");
        const { data: checkData, error: checkError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('username', testUser.username)
            .single();

        if (checkError || !checkData) {
            console.error("❌ Usuário NÃO encontrado no Supabase após inserção.");
        } else {
            console.log(`✅ Usuário confirmado no Supabase: ${checkData.username} (Role: ${checkData.role})`);
        }

        // Limpeza
        console.log("🧹 Limpando dados de teste...");
        db.prepare("DELETE FROM usuarios WHERE username = ?").run(testUser.username);
        await supabase.from('usuarios').delete().eq('username', testUser.username);
        console.log("✅ Limpeza concluída.");

    } catch (err) {
        console.error("❌ ERRO FATAL:", err);
    }
}

testSync();
