import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_CONFIG = {
    url: "https://whyfmogbayqwaeddoxwf.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U"
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
const dbPath = path.join(__dirname, 'electron', 'sdr.db');
const db = new Database(dbPath);

console.log('🔄 SINCRONIZANDO ESTOQUE DO SUPABASE PARA O BANCO LOCAL\n');
console.log('='.repeat(60));

// 1. Buscar veículos do Supabase
console.log('\n📡 Buscando veículos do Supabase...\n');
const { data: veiculos, error } = await supabase
    .from('estoque')
    .select('*')
    .eq('loja_id', 'irw-motors-main')
    .eq('ativo', true);

if (error) {
    console.error('❌ Erro ao buscar veículos:', error.message);
    process.exit(1);
}

console.log(`✅ Encontrados ${veiculos?.length || 0} veículos no Supabase.\n`);

if (!veiculos || veiculos.length === 0) {
    console.log('⚠️  Nenhum veículo encontrado. Execute primeiro: node manutencao_estoque.mjs');
    process.exit(0);
}

// 2. Limpar estoque local da loja
console.log('🗑️  Limpando estoque local da loja irw-motors-main...\n');
db.prepare('DELETE FROM estoque WHERE loja_id = ?').run('irw-motors-main');

// 3. Inserir veículos no banco local
console.log('💾 Inserindo veículos no banco local...\n');

const stmt = db.prepare(`
    INSERT INTO estoque (
        nome, marca, modelo, ano, km, valor, cor, combustivel, 
        cambio, portas, placa, chassi, renavam, observacoes, 
        fotos, ativo, loja_id
    ) VALUES (
        @nome, @marca, @modelo, @ano, @km, @valor, @cor, @combustivel,
        @cambio, @portas, @placa, @chassi, @renavam, @observacoes,
        @fotos, @ativo, @loja_id
    )
`);

let inserted = 0;
for (const veiculo of veiculos) {
    try {
        stmt.run({
            nome: veiculo.nome || '',
            marca: veiculo.marca || '',
            modelo: veiculo.modelo || '',
            ano: veiculo.ano || '',
            km: veiculo.km || '',
            valor: veiculo.valor || '',
            cor: veiculo.cor || '',
            combustivel: veiculo.combustivel || '',
            cambio: veiculo.cambio || '',
            portas: veiculo.portas || '',
            placa: veiculo.placa || '',
            chassi: veiculo.chassi || '',
            renavam: veiculo.renavam || '',
            observacoes: veiculo.observacoes || '',
            fotos: veiculo.fotos || '',
            ativo: veiculo.ativo ? 1 : 0,
            loja_id: veiculo.loja_id || 'irw-motors-main'
        });
        inserted++;
    } catch (err) {
        console.error(`❌ Erro ao inserir ${veiculo.nome}:`, err.message);
    }
}

console.log(`✅ ${inserted} veículos inseridos no banco local!\n`);

// 4. Verificação final
const localCount = db.prepare('SELECT COUNT(*) as count FROM estoque WHERE loja_id = ? AND ativo = 1')
    .get('irw-motors-main');

console.log(`✅ Total de veículos ATIVOS no banco local: ${localCount.count}\n`);

// Mostrar alguns veículos
const sample = db.prepare('SELECT * FROM estoque WHERE loja_id = ? AND ativo = 1 LIMIT 5')
    .all('irw-motors-main');

if (sample.length > 0) {
    console.log('Primeiros 5 veículos no banco local:');
    sample.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.nome} - ${v.valor}`);
    });
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ SINCRONIZAÇÃO CONCLUÍDA!\n');
console.log('💡 Agora reinicie o aplicativo (Ctrl+C e npm run dev).\n');
console.log('💡 O estoque deve aparecer normalmente no WhatsApp.\n');

db.close();
