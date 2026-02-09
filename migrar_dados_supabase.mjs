import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ========================================
// SCRIPT DE MIGRAÇÃO AUTOMÁTICA
// Migra dados do banco antigo para o novo
// ========================================

console.log('🚀 MIGRAÇÃO DE DADOS - BANCO ANTIGO → NOVO\n');

// BANCO NOVO (Dedicado IRW Motors - SEM loja_id)
const NOVO_URL = process.env.VITE_SUPABASE_URL; // O novo banco já deve estar no .env
const NOVO_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Para o banco antigo, vamos precisar das credenciais antigas (fallback)
const ANTIGO_URL = 'https://whyfmogbayqwaeddoxwf.supabase.co';
const ANTIGO_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U';

const supabaseOLD = createClient(ANTIGO_URL, ANTIGO_KEY);
const supabaseNEW = createClient(NOVO_URL, NOVO_KEY);

const LOJA_ID = 'irw-motors-main';

// ========================================
// FUNÇÕES DE MIGRAÇÃO
// ========================================

async function migrarEstoque() {
    console.log('📦 1. Migrando ESTOQUE...');

    try {
        // Busca do banco antigo
        const { data: veiculos, error: errOld } = await supabaseOLD
            .from('estoque')
            .select('*')
            .eq('loja_id', LOJA_ID);

        if (errOld) throw errOld;

        if (!veiculos || veiculos.length === 0) {
            console.log('   ⚠️  Nenhum veículo encontrado no banco antigo.');
            return;
        }

        console.log(`   📊 Encontrados ${veiculos.length} veículos`);

        // Remove loja_id antes de inserir
        const veiculosLimpos = veiculos.map(({ loja_id, ...v }) => v);

        // Insere no banco novo
        const { error: errNew } = await supabaseNEW
            .from('estoque')
            .upsert(veiculosLimpos);

        if (errNew) throw errNew;

        console.log(`   ✅ ${veiculos.length} veículos migrados!\n`);
    } catch (err) {
        console.error('   ❌ Erro ao migrar estoque:', err.message);
    }
}

async function migrarUsuarios() {
    console.log('👥 2. Migrando USUÁRIOS...');

    try {
        const { data: usuarios, error: errOld } = await supabaseOLD
            .from('usuarios')
            .select('*')
            .eq('loja_id', LOJA_ID);

        if (errOld) throw errOld;

        if (!usuarios || usuarios.length === 0) {
            console.log('   ⚠️  Nenhum usuário encontrado.');
            return;
        }

        console.log(`   📊 Encontrados ${usuarios.length} usuários`);

        const usuariosLimpos = usuarios.map(({ loja_id, ...u }) => u);

        const { error: errNew } = await supabaseNEW
            .from('usuarios')
            .upsert(usuariosLimpos);

        if (errNew) throw errNew;

        console.log(`   ✅ ${usuarios.length} usuários migrados!\n`);
    } catch (err) {
        console.error('   ❌ Erro ao migrar usuários:', err.message);
    }
}

async function migrarVendedores() {
    console.log('🤝 3. Migrando VENDEDORES...');

    try {
        const { data: vendedores, error: errOld } = await supabaseOLD
            .from('vendedores')
            .select('*')
            .eq('loja_id', LOJA_ID);

        if (errOld) throw errOld;

        if (!vendedores || vendedores.length === 0) {
            console.log('   ⚠️  Nenhum vendedor encontrado.');
            return;
        }

        console.log(`   📊 Encontrados ${vendedores.length} vendedores`);

        const vendedoresLimpos = vendedores.map(({ loja_id, ...v }) => v);

        const { error: errNew } = await supabaseNEW
            .from('vendedores')
            .upsert(vendedoresLimpos);

        if (errNew) throw errNew;

        console.log(`   ✅ ${vendedores.length} vendedores migrados!\n`);
    } catch (err) {
        console.error('   ❌ Erro ao migrar vendedores:', err.message);
    }
}

async function migrarPortais() {
    console.log('🌐 4. Migrando PORTAIS...');

    try {
        const { data: portais, error: errOld } = await supabaseOLD
            .from('portais')
            .select('*')
            .eq('loja_id', LOJA_ID);

        if (errOld) throw errOld;

        if (!portais || portais.length === 0) {
            console.log('   ⚠️  Nenhum portal encontrado.');
            return;
        }

        console.log(`   📊 Encontrados ${portais.length} portais`);

        const portaisLimpos = portais.map(({ loja_id, ...p }) => ({
            ...p,
            link: p.link || p.url || '' // Garante que tenha o campo link se o banco destino exigir
        }));

        const { error: errNew } = await supabaseNEW
            .from('portais')
            .upsert(portaisLimpos);

        if (errNew) throw errNew;

        console.log(`   ✅ ${portais.length} portais migrados!\n`);
    } catch (err) {
        console.error('   ❌ Erro ao migrar portais:', err.message);
    }
}

async function migrarScripts() {
    console.log('📝 5. Migrando SCRIPTS...');

    try {
        const { data: scripts, error: errOld } = await supabaseOLD
            .from('scripts')
            .select('*')
            .eq('loja_id', LOJA_ID);

        if (errOld) throw errOld;

        if (!scripts || scripts.length === 0) {
            console.log('   ⚠️  Nenhum script encontrado.');
            return;
        }

        console.log(`   📊 Encontrados ${scripts.length} scripts`);

        const scriptsLimpos = scripts.map(({ loja_id, ...s }) => s);

        const { error: errNew } = await supabaseNEW
            .from('scripts')
            .upsert(scriptsLimpos);

        if (errNew) throw errNew;

        console.log(`   ✅ ${scripts.length} scripts migrados!\n`);
    } catch (err) {
        console.error('   ❌ Erro ao migrar scripts:', err.message);
    }
}

async function migrarVisitas() {
    console.log('📅 6. Migrando VISITAS...');

    try {
        const { data: visitas, error: errOld } = await supabaseOLD
            .from('visitas')
            .select('*')
            .eq('loja_id', LOJA_ID);

        if (errOld) throw errOld;

        if (!visitas || visitas.length === 0) {
            console.log('   ⚠️  Nenhuma visita encontrada.');
            return;
        }

        console.log(`   📊 Encontradas ${visitas.length} visitas`);

        const visitasLimpas = visitas.map(({ loja_id, ...v }) => v);

        const { error: errNew } = await supabaseNEW
            .from('visitas')
            .upsert(visitasLimpas);

        if (errNew) throw errNew;

        console.log(`   ✅ ${visitas.length} visitas migradas!\n`);
    } catch (err) {
        console.error('   ❌ Erro ao migrar visitas:', err.message);
    }
}

// ========================================
// EXECUÇÃO
// ========================================

async function executarMigracao() {
    console.log('============================================');
    console.log('🔄 INICIANDO MIGRAÇÃO COMPLETA');
    console.log('============================================\n');

    console.log(`📍 Loja: ${LOJA_ID}`);
    console.log(`📍 Banco Antigo (Migração): ${ANTIGO_URL}`);
    console.log(`📍 Banco Novo (Destino): ${NOVO_URL}\n`);

    await migrarEstoque();
    await migrarUsuarios();
    await migrarVendedores();
    await migrarPortais();
    await migrarScripts();
    await migrarVisitas();

    console.log('============================================');
    console.log('✅ MIGRAÇÃO CONCLUÍDA!');
    console.log('============================================\n');

    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Verifique os dados no novo Supabase');
    console.log('2. Atualize o .env com as novas credenciais');
    console.log('3. Reinicie o aplicativo');
    console.log('4. Teste todas as funcionalidades\n');
}

// Executa
executarMigracao().catch(err => {
    console.error('❌ ERRO FATAL:', err);
    process.exit(1);
});
