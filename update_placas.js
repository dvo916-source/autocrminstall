// Script temporário: Busca placas da Autoconf e atualiza o Supabase diretamente
const AUTOCONF_URL = 'https://api.autoconf.com.br/api/v1/veiculos';
const AUTOCONF_TOKEN = 'cpJruq9xsptXnQRXCOa6bV9nUUpvG5QIgyiPZoji';
const AUTOCONF_AUTH = 'q9PKfzpprz3EH9sgvIK61WOrYKDgJvivs3JZKC4vYIrnt8sYM2Rmbcs2Xgf25l6nmyNWuq8dtd4eO1zhX270nXi3kkAN1BLJ3qnJwpvjQh7VpWuESBvJEYiDH29UFrRixlyKBIBjNhEjNy5EVBLUQpv5UKsAe2xtJ0s8fnpOeHzvHhfSFjz9b7Lgr3Mhp1yY4W5D2769Yy90LRCty9geA1bMiF5l2wSrvxm2AvgiwFNzk1u6yeA9MP0waTuBw9Ku';

const SUPABASE_URL = 'https://mtbfzimnyactwhdonkgy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YmZ6aW1ueWFjdHdoZG9ua2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMTYsImV4cCI6MjA4NjA0NjAxNn0.drl9-iMcddxdyKSR5PnUoKoSdzU3Fw2n00MFd9p9uys';

async function main() {
    console.log('🔍 Buscando veículos na Autoconf...');

    const formData = new URLSearchParams({
        token: AUTOCONF_TOKEN,
        pagina: '1',
        registros_por_pagina: '200'
    });

    const res = await fetch(AUTOCONF_URL, {
        method: 'POST',
        headers: { Authorization: AUTOCONF_AUTH, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });

    const data = await res.json();
    const veiculos = data.veiculos || data.data || [];
    console.log(`✅ ${veiculos.length} veículos recebidos da Autoconf`);

    let atualizados = 0;
    let semPlaca = 0;

    for (const v of veiculos) {
        const placa = v.placa_completa || v.placa || null;
        const id = String(v.id || v.id_veiculo);

        if (!placa || placa.includes('*')) {
            semPlaca++;
            continue;
        }

        // PATCH direto no Supabase
        const patch = await fetch(`${SUPABASE_URL}/rest/v1/estoque?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ placa })
        });

        if (patch.ok) {
            atualizados++;
            if (atualizados <= 5) console.log(`  ✅ ${id} → ${placa}`);
        } else {
            const errText = await patch.text();
            console.log(`  ❌ Erro ${patch.status} para ${id}: ${errText.substring(0, 100)}`);
        }
    }

    console.log(`\n✅ Placas atualizadas: ${atualizados}`);
    console.log(`⚠️  Sem placa_completa: ${semPlaca}`);
}

main().catch(console.error);
