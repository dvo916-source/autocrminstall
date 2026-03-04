import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

// --- CONFIG ---
const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

async function runSync() {
    console.log("🚀 Iniciando Sincronização LOCAL -> NUVEM...\n");

    // Tentar encontrar o banco local em vários lugares
    const possiblePaths = [
        path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db'),
        'd:/VISITAS IRW/crystal_app/sistema_visitas.db',
        path.join(process.cwd(), 'sistema_visitas.db')
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            dbPath = p;
            console.log(`✅ Banco encontrado em: ${p}\n`);
            break;
        }
    }

    if (!dbPath) {
        console.error("❌ ERRO: Banco local não encontrado em nenhum dos caminhos:");
        possiblePaths.forEach(p => console.log(`   - ${p}`));
        process.exit(1);
    }

    const db = new Database(dbPath);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        // 1. Usuarios
        console.log("👥 Sincronizando Usuários...");
        const usuarios = db.prepare("SELECT * FROM usuarios").all();
        console.log(`   Encontrados ${usuarios.length} usuários locais.`);
        if (usuarios.length > 0) {
            const { error } = await supabase.from('usuarios').upsert(usuarios.map(u => ({
                ...u,
                ativo: !!u.ativo,
                reset_password: !!u.reset_password
            })));
            if (error) console.error("   ❌ Erro Usuários:", error.message);
            else console.log("   ✅ Usuários sincronizados!");
        }

        // 2. Lojas
        console.log("\n🏪 Sincronizando Lojas...");
        const lojas = db.prepare("SELECT * FROM lojas").all();
        console.log(`   Encontradas ${lojas.length} lojas locais.`);
        if (lojas.length > 0) {
            const { error } = await supabase.from('lojas').upsert(lojas);
            if (error) console.error("   ❌ Erro Lojas:", error.message);
            else console.log("   ✅ Lojas sincronizadas!");
        }

        // 3. Vendedores
        console.log("\n🤝 Sincronizando Vendedores...");
        const vendedores = db.prepare("SELECT * FROM vendedores").all();
        console.log(`   Encontrados ${vendedores.length} vendedores locais.`);
        if (vendedores.length > 0) {
            const { error } = await supabase.from('vendedores').upsert(vendedores);
            if (error) console.error("   ❌ Erro Vendedores:", error.message);
            else console.log("   ✅ Vendedores sincronizados!");
        }

        // 4. Portais
        console.log("\n🌐 Sincronizando Portais...");
        const portais = db.prepare("SELECT * FROM portais").all();
        console.log(`   Encontrados ${portais.length} portais locais.`);
        if (portais.length > 0) {
            const { error } = await supabase.from('portais').upsert(portais);
            if (error) console.error("   ❌ Erro Portais:", error.message);
            else console.log("   ✅ Portais sincronizados!");
        }

        console.log("\n✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!");
        db.close();

    } catch (err) {
        console.error("\n❌ ERRO FATAL:", err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

runSync();
