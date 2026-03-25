import { db, DEFAULT_STORE_ID, getActiveStoreId } from './connection.js';
import { getSupabaseClient, safeSupabaseUpsert } from './sync.js';

export function getList(table, lojaId = DEFAULT_STORE_ID) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return [];
    return db.prepare(`SELECT * FROM ${table} WHERE loja_id = ? ORDER BY nome`).all(lojaId || DEFAULT_STORE_ID);
}

export async function addItem(table, data) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;
    const lojaId = data.loja_id || getActiveStoreId() || DEFAULT_STORE_ID;
    let syncData = { ...data, ativo: true, loja_id: lojaId };
    
    let stmt;
    if (table === 'vendedores') {
        stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, nome, sobrenome, telefone, ativo, loja_id) VALUES(@id, @nome, @sobrenome, @telefone, 1, @loja_id)`);
    } else if (table === 'portais') {
        stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (nome, link, ativo, loja_id) VALUES(@nome, @link, 1, @loja_id)`);
    } else {
        stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (nome, ativo, loja_id) VALUES(@nome, 1, @loja_id)`);
    }
    
    const result = stmt.run(syncData);
    await safeSupabaseUpsert(table, [syncData], lojaId, { onConflict: table === 'estoque' ? 'id' : 'nome' });
    return result;
}

export async function updateItem(table, oldIdOrNome, data) {
    if (!['estoque', 'portais', 'vendedores'].includes(table)) return;
    const lojaId = data.loja_id || getActiveStoreId() || DEFAULT_STORE_ID;
    
    let query, params;
    if (table === 'vendedores') {
        query = `UPDATE vendedores SET nome = ?, sobrenome = ?, telefone = ?, ativo = ? WHERE (id = ? OR nome = ?) AND loja_id = ?`;
        params = [data.nome, data.sobrenome || '', data.telefone || '', data.ativo !== undefined ? (data.ativo ? 1 : 0) : 1, data.id || null, oldIdOrNome, lojaId];
    } else if (table === 'portais') {
        query = `UPDATE portais SET nome = ?, link = ?, ativo = ? WHERE nome = ? AND loja_id = ?`;
        params = [data.nome, data.link || '', data.ativo !== undefined ? (data.ativo ? 1 : 0) : 1, oldIdOrNome, lojaId];
    } else {
        query = `UPDATE ${table} SET nome = ?, ativo = ? WHERE nome = ? AND loja_id = ?`;
        params = [data.nome, data.ativo !== undefined ? (data.ativo ? 1 : 0) : 1, oldIdOrNome, lojaId];
    }
    
    const result = db.prepare(query).run(...params);
    const client = getSupabaseClient(lojaId);
    if (client) {
        const up = { nome: data.nome, ativo: data.ativo !== undefined ? !!data.ativo : true };
        if (table === 'vendedores') { up.sobrenome = data.sobrenome || ''; up.telefone = data.telefone || ''; }
        else if (table === 'portais') { up.link = data.link || ''; }
        
        let syncQuery = client.from(table).update(up);
        if (table === 'vendedores' && (data.id || oldIdOrNome.length > 20)) syncQuery = syncQuery.eq('id', data.id || oldIdOrNome);
        else syncQuery = syncQuery.eq('nome', oldIdOrNome);
        await syncQuery.eq('loja_id', lojaId);
    }
    return result;
}

export async function toggleItem(table, identifier, ativo, lojaId) {
    const activeLojaId = lojaId || getActiveStoreId() || DEFAULT_STORE_ID;
    const isObj = typeof identifier === 'object';
    const id = isObj ? identifier.id : null;
    const nome = isObj ? identifier.nome : identifier;
    
    let query = id ? `UPDATE ${table} SET ativo = ? WHERE (id = ? OR nome = ?) AND loja_id = ?` : `UPDATE ${table} SET ativo = ? WHERE nome = ? AND loja_id = ?`;
    let params = id ? [ativo ? 1 : 0, id, nome, activeLojaId] : [ativo ? 1 : 0, nome, activeLojaId];
    
    db.prepare(query).run(...params);
    const client = getSupabaseClient(activeLojaId);
    if (client) {
        let q = client.from(table).update({ ativo: !!ativo });
        if (id) q = q.or(`id.eq.${id},nome.eq.${nome}`).eq('loja_id', activeLojaId);
        else q = q.eq('nome', nome).eq('loja_id', activeLojaId);
        await q;
    }
}

export async function scrapeKmAndPhotos(url, nome, carId = null) {
    try {
        const resp = await fetch(url);
        const html = await resp.text();
        const kmMatch = html.match(/class="[^"]*?km[^"]*?">([\d.]+)\s*km/i) || html.match(/(\d[\d.]*)\s*km/i);
        const km = kmMatch ? kmMatch[1].replace(/\D/g, '') : 'Consulte';

        const photosMap = new Map();
        const addPhoto = (u) => {
            const clean = u.split('?')[0];
            const m = clean.match(/\/([^\/]+\.(?:jpeg|jpg|png|webp))$/i);
            if (m) photosMap.set(m[1].toLowerCase(), clean);
        };

        const photosMatch = html.match(/let photos = (\[.*?\]);/s);
        if (photosMatch) {
            try {
                const arr = JSON.parse(photosMatch[1].replace(/\\'/g, "'"));
                arr.forEach(p => {
                    const img = p.url || p.photo_url || p.desktop || p.src;
                    if (img && carId && img.includes(`/fotos/${carId}/`)) addPhoto(img);
                });
            } catch (e) {}
        }
        
        const list = Array.from(photosMap.values());
        if (list.length > 0) {
            const first = list[0];
            if (carId) {
                try {
                    const imgR = await fetch(first);
                    const buff = Buffer.from(await imgR.arrayBuffer());
                    const b64 = `data:${imgR.headers.get('content-type') || 'image/jpeg'};base64,${buff.toString('base64')}`;
                    db.prepare("INSERT OR REPLACE INTO cached_images (veiculo_id, image_url, image_base64) VALUES (?, ?, ?)").run(carId, first, b64);
                } catch (e) {}
            }
            db.prepare("UPDATE estoque SET km = ?, fotos = ? WHERE nome = ?").run(km, JSON.stringify(list), nome);
            return { km, fotos: list };
        }
        db.prepare("UPDATE estoque SET km = ? WHERE nome = ?").run(km, nome);
        return { km };
    } catch (e) { return null; }
}
