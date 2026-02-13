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
    console.log("🚀 SINCRONIZAÇÃO FINAL - LOCAL -> NUVEM\n");

    const possiblePaths = [
        path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db'),
        'd:/VISITAS IRW/crystal_app/sistema_visitas.db'
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            dbPath = p;
            console.log(`✅ Banco: ${p}\n`);
            break;
        }
    }

    if (!dbPath) {
        console.error("❌ Banco não encontrado");
        process.exit(1);
    }

    const db = new Database(dbPath);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        // 1. USUARIOS - Apenas campos que existem no Supabase
        console.log("👥 Sincronizando Usuários...");
        const usuarios = db.prepare("SELECT * FROM usuarios").all();
        console.log(`   ${usuarios.length} usuários encontrados`);

        if (usuarios.length > 0) {
            // Schema mínimo baseado no GUIA_CRIAR_SUPABASE_IRW.md
            const usuariosMapped = usuarios.map(u => ({
                username: u.username,
                nome_completo: u.nome_completo || '',
                cpf: u.cpf || null,
                email: u.email || null,
                password_hash: u.password,
                role: u.role || 'user',
                avatar_url: u.avatar_url || null,
                force_password_change: !!u.reset_password,
                ativo: !!u.ativo,
                loja_id: u.loja_id || 'irw-motors-main' // DEFAULT STORE
            }));

            const { data, error } = await supabase.from('usuarios').upsert(usuariosMapped);
            if (error) {
                console.error("   ❌ Erro:", error.message);
                console.error("   Detalhes:", error);
            } else {
                console.log("   ✅ Usuários sincronizados!");
            }
        }

        // 2. VENDEDORES
        console.log("\n🤝 Sincronizando Vendedores...");
        const vendedores = db.prepare("SELECT * FROM vendedores").all();
        console.log(`   ${vendedores.length} vendedores encontrados`);

        if (vendedores.length > 0) {
            const vendedoresMapped = vendedores.map(v => ({
                id: v.id || randomUUID(),
                nome: v.nome,
                telefone: v.telefone,
                email: v.email,
                foto_url: v.foto_url,
                ativo: !!v.ativo,
                loja_id: v.loja_id || 'irw-motors-main' // DEFAULT STORE
            }));

            const { error } = await supabase.from('vendedores').upsert(vendedoresMapped);
            if (error) {
                console.error("   ❌ Erro:", error.message);
            } else {
                console.log("   ✅ Vendedores sincronizados!");
            }
        }

        // 3. PORTAIS
        console.log("\n🌐 Sincronizando Portais...");
        const portais = db.prepare("SELECT * FROM portais").all();
        console.log(`   ${portais.length} portais encontrados`);

        if (portais.length > 0) {
            let sucessos = 0;
            for (const p of portais) {
                const { error } = await supabase.from('portais').upsert({
                    id: p.id || randomUUID(),
                    nome: p.nome,
                    url: p.url || null,
                    logo_url: p.logo_url || null,
                    ativo: !!p.ativo
                });
                if (!error) sucessos++;
            }
            console.log(`   ✅ ${sucessos}/${portais.length} portais sincronizados`);
        }

        console.log("\n✅ SINCRONIZAÇÃO CONCLUÍDA!");
        console.log(`\n📊 Total: ${usuarios.length} users, ${vendedores.length} sellers, ${portais.length} portals`);

        db.close();

    } catch (err) {
        console.error("\n❌ ERRO:", err.message);
        process.exit(1);
    }
}

runSync();
