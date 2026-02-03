
const { execSync } = require('child_process');

async function testGithubToken() {
    console.log('--- INICIO DO DIAGNOSTICO ---');
    const token = process.env.GH_TOKEN;
    console.log('Verificando process.env.GH_TOKEN...');

    if (!token) {
        console.error('❌ [ERRO] Variável GH_TOKEN não encontrada no ambiente (process.env).');
        console.log('Dica: Tente rodar "set GH_TOKEN=seu_token" antes de rodar o script.');
        process.exit(1);
    }

    // Mascarar o token para exibição segura
    const maskedToken = token.substring(0, 4) + '...' + token.substring(token.length - 4);
    console.log(`🔍 Token detectado: ${maskedToken}`);
    console.log(`📦 Repositório alvo: dvo916-source/autocrminstall\n`);

    try {
        console.log('📡 Testando conexão com a API do GitHub...');

        // Usando CURL para testar (comum em Windows/Git Bash) ou fetch se disponível
        const response = await fetch('https://api.github.com/repos/dvo916-source/autocrminstall', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'SDR-Motors-App'
            }
        });

        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ [SUCESSO] Token é válido!');
            console.log(`🔗 Nome do Repo: ${data.full_name}`);
            console.log(`🔒 Privado: ${data.private ? 'Sim' : 'Não'}`);
            console.log(`⭐ Permissões: ${JSON.stringify(data.permissions || 'N/A')}`);

            // Testa permissão de escrita especificamente
            if (data.permissions && data.permissions.push) {
                console.log('\n🚀 [EXCELENTE] Você tem permissão de ESCRITA (Push/Release).');
            } else {
                console.log('\n⚠️ [ATENÇÃO] O token é válido, mas parece NÃO ter permissão de escrita.');
                console.log('Verifique se você marcou a caixa "repo" ao criar o token.');
            }
        } else {
            console.error(`❌ [ERRO] GitHub retornou status ${response.status}`);
            if (response.status === 401) console.log('Dica: O token é inválido ou expirou.');
            if (response.status === 404) console.log('Dica: Repositório não encontrado ou você não tem acesso.');
        }

    } catch (err) {
        console.error('❌ [ERRO CRÍTICO] Falha ao conectar:', err.message);
    }

    console.log('\n==========================================');
}

testGithubToken();
