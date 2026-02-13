// Script simplificado para verificar dados no Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://mtbfzimnyactwhdonkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyData() {
    console.log('\n✅ VERIFICAÇÃO RÁPIDA DE DADOS NO SUPABASE\n');
    console.log('='.repeat(60));

    const tables = ['usuarios', 'vendedores', 'portais', 'scripts', 'visitas', 'crm_settings'];

    for (const table of tables) {
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: false });

        if (error) {
            console.log(`❌ ${table}: ERRO - ${error.message}`);
        } else {
            console.log(`✅ ${table}: ${data.length} registros`);
        }
    }

    console.log('='.repeat(60));
    console.log('\n🎉 Verificação concluída!\n');
}

verifyData().catch(console.error);
