// Verifica as colunas da tabela usuarios no Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
    console.log('\n🔍 VERIFICANDO COLUNAS DA TABELA USUARIOS NO SUPABASE...\n');

    // Pegar apenas um registro para ver as chaves
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Erro:', error.message);
    } else if (data && data.length > 0) {
        console.log('✅ Colunas encontradas:');
        console.log(Object.keys(data[0]).join(', '));
    } else {
        console.log('⚠️ Tabela vazia ou não acessível.');
    }
}

checkColumns().catch(console.error);
