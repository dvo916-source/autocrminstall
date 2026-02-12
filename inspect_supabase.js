import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectAll() {
    console.log('--- Lojas ---');
    const { data: lojas } = await supabase.from('lojas').select('*');
    console.log(JSON.stringify(lojas, null, 2));

    console.log('--- Portais ---');
    const { data: portais } = await supabase.from('portais').select('*');
    console.log(JSON.stringify(portais, null, 2));

    console.log('--- Vendedores ---');
    const { data: vendedores } = await supabase.from('vendedores').select('*');
    console.log(JSON.stringify(vendedores, null, 2));
}

inspectAll();
