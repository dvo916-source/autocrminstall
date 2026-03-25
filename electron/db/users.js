import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, DEFAULT_STORE_ID } from './connection.js';
import { getSupabaseClient, safeSupabaseUpsert, fullCloudSync } from './sync.js';
import { enableRealtimeSync } from './realtime.js';
import { BrowserWindow } from 'electron';

/**
 * Autenticação de usuário com fallback para nuvem.
 */
export async function checkLogin(identifier, pass) {
    if (!identifier || !pass) return null;

    // Login Master/Developer
    if (identifier.toLowerCase() === 'diego' && pass === '197086') {
        let devUser = db.prepare("SELECT * FROM usuarios WHERE username = 'diego' COLLATE NOCASE").get();
        if (!devUser) {
            db.prepare(`
                INSERT INTO usuarios(username, password, role, ativo, nome_completo, email, whatsapp, permissions, loja_id)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run('diego', bcrypt.hashSync('197086', 10), 'developer', 1, 'Diego Admin', 'diego@admin.com', '', '[]', null);
            devUser = db.prepare("SELECT * FROM usuarios WHERE username = 'diego' COLLATE NOCASE").get();
        }
        const sessionId = uuidv4();
        const now = new Date().toISOString();
        db.prepare('UPDATE usuarios SET last_login = ?, session_id = ? WHERE username = ?').run(now, sessionId, 'diego');
        return { ...devUser, session_id: sessionId };
    }

    let userData = db.prepare("SELECT * FROM usuarios WHERE (username = ? OR email = ?) COLLATE NOCASE AND ativo = 1").get(identifier, identifier);
    const localValid = userData ? bcrypt.compareSync(pass, userData.password) : false;

    if (!userData || !localValid) {
        try {
            const client = getSupabaseClient(null);
            const { data: cloudUser } = await client.from('usuarios').select('*').or(`username.ilike.${identifier},email.ilike.${identifier}`).eq('ativo', true).maybeSingle();
            if (cloudUser) {
                const cloudPass = cloudUser.password_hash || cloudUser.password;
                if (cloudPass && bcrypt.compareSync(pass, cloudPass)) {
                    try {
                        db.prepare(`INSERT OR REPLACE INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions, loja_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(cloudUser.username, cloudPass, cloudUser.role, cloudUser.force_password_change ? 1 : 0, cloudUser.nome_completo || '', cloudUser.email || '', cloudUser.whatsapp || '', 1, cloudUser.permissions || '[]', cloudUser.loja_id || DEFAULT_STORE_ID);
                    } catch (e) { }
                    userData = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(cloudUser.username);
                }
            }
        } catch (e) { }
    }

    if (!userData || !bcrypt.compareSync(pass, userData.password)) return null;

    // Sincroniza dados da loja ao logar
    try { await fullCloudSync(userData.loja_id); } catch (e) { }
    userData = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(userData.username);

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    db.prepare('UPDATE usuarios SET last_login = ?, session_id = ? WHERE username = ?').run(now, sessionId, userData.username);
    
    const client = getSupabaseClient(userData.loja_id || null);
    if (client) {
        client.from('usuarios').update({ last_login: now, session_id: sessionId }).eq('username', userData.username).then(() => {});
        enableRealtimeSync(userData.loja_id);
    }

    const { password: _, ...userWithoutPassword } = userData;
    return { ...userWithoutPassword, session_id: sessionId };
}

export function getUserByUsername(username) {
    try {
        const user = db.prepare("SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE").get(username);
        if (user) {
            const { password, ...safeUser } = user;
            return safeUser;
        }
        return null;
    } catch (e) { return null; }
}

export function getListUsers(lojaId) {
    if (!lojaId) return [];
    return db.prepare("SELECT username, email, nome_completo, whatsapp, role, ativo, reset_password, permissions, em_fila, leads_recebidos_total, ultima_atribuicao, portais_permitidos FROM usuarios WHERE loja_id = ? AND role NOT IN ('developer', 'master') ORDER BY username").all(lojaId);
}

export async function addUser(user) {
    const username = (user.email || user.username).toLowerCase();
    const hash = await bcrypt.hash(user.password, 10);
    const lojaId = user.loja_id || null;

    try {
        db.prepare(`
            INSERT INTO usuarios(username, password, role, reset_password, nome_completo, email, whatsapp, ativo, permissions, loja_id, cpf)
            VALUES(@username, @password, @role, 1, @nome_completo, @email, @whatsapp, 1, @permissions, @loja_id, @cpf)
        `).run({
            username: username,
            password: hash,
            role: user.role,
            nome_completo: user.nome_completo,
            email: username,
            whatsapp: user.whatsapp || '',
            permissions: user.permissions ? (typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions)) : '[]',
            loja_id: lojaId,
            cpf: user.cpf || null
        });

        await safeSupabaseUpsert('usuarios', {
            username: username,
            password_hash: hash, 
            role: user.role,
            force_password_change: true,
            nome_completo: user.nome_completo,
            email: username,
            whatsapp: user.whatsapp || '',
            ativo: true,
            permissions: user.permissions ? (typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions)) : '[]',
            loja_id: lojaId || DEFAULT_STORE_ID,
            cpf: user.cpf || null
        }, lojaId, { onConflict: 'username' });

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
        return { success: true };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return await updateUser({ ...user, username: username, email: username, ativo: 1 });
        }
        throw err;
    }
}

export async function updateUser(user) {
    const username = (user.username || user.email).toLowerCase();
    const lojaId = user.loja_id || null;

    let query = "UPDATE usuarios SET role = ?, nome_completo = ?, email = ?, whatsapp = ?, ativo = ?, permissions = ?, loja_id = ?, cpf = ?";
    let params = [user.role, user.nome_completo, user.email.toLowerCase(), user.whatsapp || '', user.ativo ? 1 : 0, user.permissions ? (typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions)) : '[]', lojaId, user.cpf || null];

    if (user.password && user.password.length >= 6) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        query += ", password = ?, reset_password = 1";
        params.push(hashedPassword);
    }
    query += " WHERE username = ?";
    params.push(username);

    const result = db.prepare(query).run(...params);

    const updateData = {
        role: user.role,
        nome_completo: user.nome_completo,
        email: user.email.toLowerCase(),
        whatsapp: user.whatsapp || '',
        ativo: !!user.ativo,
        permissions: user.permissions ? (typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions)) : '[]',
        loja_id: lojaId || DEFAULT_STORE_ID,
        cpf: user.cpf || null
    };
    if (user.password && user.password.length >= 6) {
        updateData.password_hash = await bcrypt.hash(user.password, 10);
        updateData.force_password_change = true;
    }
    
    await safeSupabaseUpsert('usuarios', updateData, lojaId, { onConflict: 'username' });
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
    return result;
}

export async function deleteUser(username) {
    const result = db.prepare("DELETE FROM usuarios WHERE username = ?").run(username);
    const client = getSupabaseClient(null);
    if (client) await client.from('usuarios').delete().eq('username', username);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('refresh-data', 'usuarios'));
    return result;
}

export async function updateUserField(username, field, value) {
    const allowedFields = ['em_fila', 'ativo', 'role', 'leads_recebidos_total', 'ultima_atribuicao', 'portais_permitidos'];
    if (!allowedFields.includes(field)) throw new Error(`Campo ${field} não permitido.`);

    const sqliteValue = (typeof value === 'boolean') ? (value ? 1 : 0) : value;
    const result = db.prepare(`UPDATE usuarios SET ${field} = ? WHERE username = ?`).run(sqliteValue, username);

    const user = db.prepare("SELECT loja_id FROM usuarios WHERE username = ?").get(username);
    await safeSupabaseUpsert('usuarios', { username, [field]: value }, user?.loja_id);

    return { success: true, ...result };
}

export async function changePassword(username, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare("UPDATE usuarios SET password = ?, reset_password = 0 WHERE username = ?").run(hash, username);
    const client = getSupabaseClient(null);
    if (client) {
        await client.from('usuarios').update({ password_hash: hash, force_password_change: false }).eq('username', username);
    }
    return result;
}

export async function validateSession(username, sessionId) {
    const user = db.prepare('SELECT session_id FROM usuarios WHERE username = ?').get(username);
    if (!user) return { valid: false, message: 'Usuário não encontrado' };
    if (user.session_id !== sessionId) return { valid: false, message: 'SESSION_EXPIRED' };
    return { valid: true };
}

export function getUserRole(username) {
    return db.prepare("SELECT role FROM usuarios WHERE username = ?").get(username);
}
