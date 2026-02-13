// Este script deve ser executado DENTRO do aplicativo Electron
// Adicione um handler IPC no main.js para executar este código

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const DEFAULT_STORE_ID = 'irw-motors-main';

export async function uploadAllDataToSupabase(db) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📤 UPLOAD DE DADOS LOCAIS PARA SUPABASE\n');
    console.log('='.repeat(80));

    const results = {};

    try {
        // 1. USUARIOS
        console.log('\n🔐 USUÁRIOS');
        const usuarios = db.prepare('SELECT * FROM usuarios').all();
        if (usuarios.length > 0) {
            const usuariosData = usuarios.map(u => ({
                username: u.username,
                password_hash: u.password,
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

            const { error } = await supabase.from('usuarios').upsert(usuariosData);
            results.usuarios = { success: !error, count: usuariosData.length, error: error?.message };
            console.log(`✅ ${usuariosData.length} usuários enviados`);
        }

        // 2. VENDEDORES
        console.log('\n👥 VENDEDORES');
        const vendedores = db.prepare('SELECT * FROM vendedores').all();
        if (vendedores.length > 0) {
            const vendedoresData = vendedores.map(v => ({
                id: v.id || v.nome,
                nome: v.nome,
                sobrenome: v.sobrenome || '',
                telefone: v.telefone || '',
                email: v.email || '',
                foto_url: v.foto_url || '',
                ativo: v.ativo === 1,
                loja_id: v.loja_id || DEFAULT_STORE_ID
            }));

            const { error } = await supabase.from('vendedores').upsert(vendedoresData);
            results.vendedores = { success: !error, count: vendedoresData.length, error: error?.message };
            console.log(`✅ ${vendedoresData.length} vendedores enviados`);
        }

        // 3. PORTAIS
        console.log('\n🌐 PORTAIS');
        const portais = db.prepare('SELECT * FROM portais').all();
        if (portais.length > 0) {
            const portaisData = portais.map(p => ({
                nome: p.nome,
                link: p.link || '',
                ativo: p.ativo === 1,
                loja_id: p.loja_id || DEFAULT_STORE_ID
            }));

            const { error } = await supabase.from('portais').upsert(portaisData, { onConflict: 'nome,loja_id' });
            results.portais = { success: !error, count: portaisData.length, error: error?.message };
            console.log(`✅ ${portaisData.length} portais enviados`);
        }

        // 4. SCRIPTS
        console.log('\n📝 SCRIPTS');
        const scripts = db.prepare('SELECT * FROM scripts').all();
        if (scripts.length > 0) {
            const scriptsData = scripts.map(s => ({
                id: s.id,
                titulo: s.titulo,
                mensagem: s.mensagem || '',
                is_system: s.is_system === 1,
                link: s.link || '',
                username: s.username || '',
                ordem: s.ordem || 0,
                loja_id: s.loja_id || DEFAULT_STORE_ID
            }));

            const { error } = await supabase.from('scripts').upsert(scriptsData);
            results.scripts = { success: !error, count: scriptsData.length, error: error?.message };
            console.log(`✅ ${scriptsData.length} scripts enviados`);
        }

        // 5. VISITAS
        console.log('\n📋 VISITAS');
        const visitas = db.prepare('SELECT * FROM visitas').all();
        if (visitas.length > 0) {
            const visitasData = visitas.map(v => ({
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

            const { error } = await supabase.from('visitas').upsert(visitasData);
            results.visitas = { success: !error, count: visitasData.length, error: error?.message };
            console.log(`✅ ${visitasData.length} visitas enviadas`);
        }

        // 6. CRM_SETTINGS
        console.log('\n⚙️  CRM SETTINGS');
        const crmSettings = db.prepare('SELECT * FROM crm_settings').all();
        if (crmSettings.length > 0) {
            const crmData = crmSettings.map(c => ({
                key: c.key,
                category: c.category || '',
                value: c.value || '',
                updated_at: c.updated_at || new Date().toISOString(),
                loja_id: c.loja_id || DEFAULT_STORE_ID
            }));

            const { error } = await supabase.from('crm_settings').upsert(crmData, { onConflict: 'key,loja_id' });
            results.crm_settings = { success: !error, count: crmData.length, error: error?.message };
            console.log(`✅ ${crmData.length} configurações enviadas`);
        }

        // Relatório
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 RESUMO DO UPLOAD');
        console.log('='.repeat(80));

        let totalUploaded = 0;
        let totalFailed = 0;

        for (const [table, result] of Object.entries(results)) {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${table}: ${result.count} registros`);
            if (result.success) {
                totalUploaded += result.count;
            } else {
                totalFailed++;
                if (result.error) console.log(`   Erro: ${result.error}`);
            }
        }

        console.log('\n' + '-'.repeat(80));
        console.log(`📈 Total enviado: ${totalUploaded} registros`);
        console.log(`❌ Tabelas com erro: ${totalFailed}`);
        console.log('='.repeat(80));

        if (totalFailed === 0) {
            console.log('\n🎉 TODOS OS DADOS FORAM ENVIADOS COM SUCESSO!\n');
        }

        return { success: totalFailed === 0, results, totalUploaded };

    } catch (error) {
        console.error('❌ Erro fatal:', error);
        return { success: false, error: error.message };
    }
}
