import { createClient } from '@supabase/supabase-js';

const projects = [
    { name: 'current (VexCORE)', url: 'https://mtbfzimnyactwhdonkgy.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys' },
    { name: 'old (Diego/IRW)', url: 'https://whyfmogbayqwaeddoxwf.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U' }
];

const tables = ['usuarios', 'lojas', 'estoque', 'visitas', 'vendedores'];

async function check() {
    for (const p of projects) {
        console.log(`\n--- Project: ${p.name} (${p.url}) ---`);
        const client = createClient(p.url, p.key);

        for (const table of tables) {
            try {
                const { count, error } = await client
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.log(`  ❌ ${table}: ${error.message}`);
                } else {
                    console.log(`  ✅ ${table}: ${count} rows`);
                    if (count > 0 && table === 'usuarios') {
                        const { data } = await client.from(table).select('username, role').limit(5);
                        console.log(`     Sample: ${data.map(u => u.username).join(', ')}`);
                    }
                }
            } catch (e) {
                console.log(`  💥 ${table}: EXCEPTION - ${e.message}`);
            }
        }
    }
}

check();
