const PROJECT_ID = 'mtbfzimnyactwhdonkgy';
const TOKEN = 'sbp_a840efcb99e2914704f8904053ec4fd811936663';

const sql = `
-- Adiciona campo para ativação modular do CRM por loja
ALTER TABLE lojas 
ADD COLUMN IF NOT EXISTS crm_ativo BOOLEAN DEFAULT false;

COMMENT ON COLUMN lojas.crm_ativo IS 'Define se o módulo de CRM está disponível para esta loja';
`;

async function run() {
    console.log('🚀 Atualizando esquema para CRM Modular...');

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
            console.log('✅ Módulo CRM preparado no Supabase com sucesso!');
        } else {
            console.error('❌ Erro na migração:', result);
        }
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
    }
}

run();
