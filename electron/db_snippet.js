export async function addUser(user) {
    const hash = await bcrypt.hash(user.password, 10);

    // SQLite - Username é o Email
    const stmt = db.prepare(`
        INSERT INTO usuarios (username, password, role, reset_password, nome_completo, email, whatsapp, ativo)
        VALUES (@username, @password, @role, 1, @nome_completo, @email, @whatsapp, 1)
    `);

    try {
        const result = stmt.run({
            username: user.email.toLowerCase(),
            password: hash,
            role: user.role,
            nome_completo: user.nome_completo,
            email: user.email.toLowerCase(),
            whatsapp: user.whatsapp
        });

        // ☁️ SYNC SUPABASE
        try {
            await supabase.from('usuarios').insert([{
                username: user.email.toLowerCase(),
                password: hash,
                role: user.role,
                reset_password: 1,
                nome_completo: user.nome_completo,
                email: user.email.toLowerCase(),
                whatsapp: user.whatsapp,
                ativo: true
            }]);
        } catch (e) { console.error("Erro Sync Supabase:", e); }

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        return result;

    } catch (err) {
        // Se for erro de duplicidade local, tenta resgatar (caso tenha sido deletado soft)
        if (err.message.includes('UNIQUE constraint failed')) {
            // Tenta reativar se existir
            const existing = db.prepare("SELECT username FROM usuarios WHERE username = ?").get(user.email.toLowerCase());
            if (existing) {
                // UPDATE
                return updateUser({ ...user, username: user.email.toLowerCase(), ativo: 1 });
            }
        }
        throw err;
    }
}
