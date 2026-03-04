const PROJECT_ID = 'mtbfzimnyactwhdonkgy';
const TOKEN = 'sbp_a840efcb99e2914704f8904053ec4fd811936663';

const sql = `
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
`;

async function run() {
    console.log('🔍 Listando tabelas no Supabase...');

    try {
        const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('📋 Tabelas encontradas:', JSON.stringify(result, null, 2));
        } else {
            console.error('❌ Erro na consulta:', result);
        }
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
    }
}

run();
