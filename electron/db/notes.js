import { db, DEFAULT_STORE_ID } from './connection.js';
import { getSupabaseClient, safeSupabaseUpsert } from './sync.js';
import { BrowserWindow } from 'electron';

export function getNotas({ username, lojaId }) {
    try {
        if (username) {
            return db.prepare("SELECT * FROM notas WHERE sdr_username = ? AND loja_id = ? ORDER BY data_nota DESC").all(username, lojaId);
        }
        return db.prepare("SELECT * FROM notas WHERE loja_id = ? ORDER BY data_nota DESC").all(lojaId);
    } catch (e) { return []; }
}

export function addNota({ sdr_username, texto, data_nota, lojaId }) {
    try {
        const stmt = db.prepare("INSERT INTO notas (sdr_username, texto, data_nota, loja_id) VALUES (?, ?, ?, ?)");
        return stmt.run(sdr_username, texto, data_nota, lojaId);
    } catch (e) { throw e; }
}

export function toggleNota(id, concluido, lojaId = DEFAULT_STORE_ID) {
    try {
        return db.prepare("UPDATE notas SET concluido = ? WHERE id = ? AND loja_id = ?").run(concluido ? 1 : 0, id, lojaId);
    } catch (e) { throw e; }
}

export function deleteNota(id, lojaId = DEFAULT_STORE_ID) {
    try {
        return db.prepare("DELETE FROM notas WHERE id = ? AND loja_id = ?").run(id, lojaId);
    } catch (e) { throw e; }
}

export function updateNota({ id, texto, data_nota, lojaId }) {
    try {
        return db.prepare("UPDATE notas SET texto = ?, data_nota = ? WHERE id = ? AND loja_id = ?").run(texto, data_nota, id, lojaId);
    } catch (e) { throw e; }
}

export function getScripts({ username = null, lojaId = DEFAULT_STORE_ID }) {
    try {
        if (username) return db.prepare("SELECT * FROM scripts WHERE (username = ? OR is_system = 1) AND loja_id = ? ORDER BY CASE WHEN ordem IS NULL THEN 1 ELSE 0 END, ordem ASC, id DESC").all(username, lojaId);
        return db.prepare("SELECT * FROM scripts WHERE loja_id = ? ORDER BY CASE WHEN ordem IS NULL THEN 1 ELSE 0 END, ordem ASC, id DESC").all(lojaId);
    } catch (e) { return []; }
}

export async function addScript(script) {
    const { lojaId = DEFAULT_STORE_ID, username, titulo, mensagem, isSystem = 0, link = null } = script;
    const max = db.prepare("SELECT MAX(ordem) as m FROM scripts WHERE (username = ? OR is_system = 1) AND loja_id = ?").get(username, lojaId)?.m || 0;
    const result = db.prepare("INSERT INTO scripts (titulo, mensagem, is_system, link, username, ordem, loja_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(titulo, mensagem, isSystem ? 1 : 0, link, username, max + 1, lojaId);
    
    await safeSupabaseUpsert('scripts', [{ id: result.lastInsertRowid, ...script, is_system: isSystem ? 1 : 0, ordem: max + 1, loja_id: lojaId }], lojaId);
    return result;
}

export async function updateScript(script) {
    const { id, titulo, mensagem, isSystem, link, loja_id } = script;
    db.prepare("UPDATE scripts SET titulo = ?, mensagem = ?, is_system = ?, link = ? WHERE id = ? AND loja_id = ?")
      .run(titulo, mensagem, isSystem ? 1 : 0, link, id, loja_id);
    
    const client = getSupabaseClient(loja_id);
    if (client) await client.from('scripts').update({ titulo, mensagem, is_system: isSystem ? 1 : 0, link }).eq('id', id).eq('loja_id', loja_id);
}

export async function deleteScript(id, lojaId) {
    db.prepare("DELETE FROM scripts WHERE id = ? AND loja_id = ?").run(id, lojaId);
    const client = getSupabaseClient(lojaId);
    if (client) await client.from('scripts').delete().eq('id', id).eq('loja_id', lojaId);
}

export function updateScriptsOrder(items) {
    const stmt = db.prepare("UPDATE scripts SET ordem = ? WHERE id = ?");
    db.transaction((rows) => { for (const r of rows) stmt.run(r.ordem, r.id); })(items);
    return { success: true };
}
