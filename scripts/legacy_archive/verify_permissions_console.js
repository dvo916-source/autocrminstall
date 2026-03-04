// Script para executar no console do aplicativo (F12)
// Verifica permissões dos usuários

const { ipcRenderer } = require('electron');

async function verifyPermissions() {
    console.log('🔐 VERIFICAÇÃO DE PERMISSÕES DE USUÁRIOS\n');
    console.log('='.repeat(80));

    try {
        // Buscar usuários locais
        const localUsers = await ipcRenderer.invoke('get-list-users', 'irw-motors-main');

        console.log(`\n📊 Usuários Locais: ${localUsers.length}\n`);

        // Exibir cada usuário
        for (const user of localUsers) {
            console.log(`\n👤 ${user.username} (${user.role})`);
            console.log('-'.repeat(80));
            console.log(`   Permissões: ${user.permissions || '[]'}`);
            console.log(`   Ativo: ${user.ativo === 1 ? 'Sim' : 'Não'}`);
            console.log(`   Email: ${user.email || 'N/A'}`);
            console.log(`   WhatsApp: ${user.whatsapp || 'N/A'}`);
            console.log(`   Avatar URL: ${user.avatar_url || 'N/A'}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ Verificação concluída!\n');

        return localUsers;

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// Executar
verifyPermissions();
