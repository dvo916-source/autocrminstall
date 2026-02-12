const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

async function debugUser() {
    try {
        const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'vexcore', 'sistema_visitas.db');
        console.log('📂 Abrindo banco:', dbPath);
        const db = new Database(dbPath);

        const username = 'rafaelairwmotors@gmail.com';
        const user = db.prepare("SELECT * FROM usuarios WHERE username = ?").get(username);

        if (user) {
            console.log('✅ Usuário encontrado:');
            console.log(JSON.stringify(user, null, 2));
        } else {
            console.log('❌ Usuário não encontrado.');
            // List all users to see what's there
            const allUsers = db.prepare("SELECT username, email, role, ativo, reset_password FROM usuarios").all();
            console.table(allUsers);
        }

    } catch (e) {
        console.error('🔥 Erro:', e.message);
    }
}

app.whenReady().then(() => {
    debugUser().then(() => app.quit());
});
