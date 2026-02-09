const URL_SELECT = "https://whyfmogbayqwaeddoxwf.supabase.co/rest/v1/estoque?select=id,nome";
const URL_UPDATE = "https://whyfmogbayqwaeddoxwf.supabase.co/rest/v1/estoque";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";

async function fixNames() {
    try {
        const resp = await fetch(URL_SELECT, {
            headers: { "apikey": KEY, "Authorization": "Bearer " + KEY }
        });
        const data = await resp.json();

        for (const item of data) {
            const parts = item.nome.split(' ');
            let changed = false;
            const newParts = [];

            for (let i = 0; i < parts.length; i++) {
                if (i > 0 && parts[i] === parts[i - 1] && parts[i].length > 1) {
                    // Duplicado detectado!
                    changed = true;
                    continue; // Pula a repetição
                }
                newParts.push(parts[i]);
            }

            if (changed) {
                const newName = newParts.join(' ');
                console.log(`🔧 Corrigindo: "${item.nome}" -> "${newName}"`);

                await fetch(`${URL_UPDATE}?id=eq.${item.id}`, {
                    method: 'PATCH',
                    headers: {
                        "apikey": KEY,
                        "Authorization": "Bearer " + KEY,
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    body: JSON.stringify({ nome: newName })
                });
            }
        }
        console.log("✅ Correção concluída.");
    } catch (e) {
        console.error("Erro na correção:", e.message);
    }
}

fixNames();
