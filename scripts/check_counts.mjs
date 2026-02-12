import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking Supabase URL:", process.env.VITE_SUPABASE_URL);
    const { data: v, error: ve } = await supabase.from('visitas').select('count');
    console.log("Visitas count:", v, "Error:", ve);

    const { data: e, error: ee } = await supabase.from('estoque').select('count');
    console.log("Estoque count:", e, "Error:", ee);
}

check();
