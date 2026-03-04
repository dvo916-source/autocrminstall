import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

// --- CONFIG ---
const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

async function runSync() {
    console.log("🚀 Iniciando Sincronização LOCAL -> NUVEM (FINAL)...\n");

    const possiblePaths = [
        path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db'),
        'd:/VISITAS IRW/crystal_app/sistema_visitas.db'
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
        console.error("❌ ERRO: Banco local não encontrado");
        process.exit(1);
    }

    const db = new Database(dbPath);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        // 1. Usuarios - password -> password_hash
        console.log("👥 Sincronizando Usuários...");
        const usuarios = db.prepare("SELECT * FROM usuarios").all();
        console.log(`   Encontrados ${usuarios.length} usuários locais.`);

        if (usuarios.length > 0) {
            const usuariosMapped = usuarios.map(u => ({
                username: u.username,
                password_hash: u.password, // MAPEAMENTO CORRETO
                role: u.role,
                reset_password: !!u.reset_password,
                nome_completo: u.nome_completo,
                email: u.email,
                whatsapp: u.whatsapp,
                ativo: !!u.ativo,
                permissions: u.permissions || '[]',
                loja_id: u.loja_id
            }));

            const { error } = await supabase.from('usuarios').upsert(usuariosMapped);
            if (error) {
                console.error("   ❌ Erro Usuários:", error.message);
            } else {
                console.log("   ✅ Usuários sincronizados!");
            }
        }

        // 2. Vendedores - gerar IDs se necessário
        console.log("\n🤝 Sincronizando Vendedores...");
        const vendedores = db.prepare("SELECT * FROM vendedores").all();
        console.log(`   Encontrados ${vendedores.length} vendedores locais.`);

        if (vendedores.length > 0) {
            const vendedoresMapped = vendedores.map(v => ({
                id: v.id || randomUUID(),
                nome: v.nome,
                telefone: v.telefone,
                email: v.email,
                foto_url: v.foto_url,
                ativo: !!v.ativo,
                loja_id: v.loja_id
            }));

            const { error } = await supabase.from('vendedores').upsert(vendedoresMapped);
            if (error) {
                console.error("   ❌ Erro Vendedores:", error.message);
            } else {
                console.log("   ✅ Vendedores sincronizados!");
            }
        }

        // 3. Portais - inserir um por um
        console.log("\n🌐 Sincronizando Portais...");
        const portais = db.prepare("SELECT * FROM portais").all();
        console.log(`   Encontrados ${portais.length} portais locais.`);

        if (portais.length > 0) {
            let sucessos = 0;
            for (const p of portais) {
                const { error } = await supabase.from('portais').upsert({
                    nome: p.nome,
                    loja_id: p.loja_id,
                    ativo: !!p.ativo
                });
                if (!error) sucessos++;
            }
            console.log(`   ✅ ${sucessos}/${portais.length} portais sincronizados!`);
        }

        console.log("\n✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!");
        console.log("\n📊 Resumo:");
        console.log(`   - ${usuarios.length} usuários`);
        console.log(`   - ${vendedores.length} vendedores`);
        console.log(`   - ${portais.length} portais`);

        db.close();

    } catch (err) {
        console.error("\n❌ ERRO FATAL:", err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

runSync();
