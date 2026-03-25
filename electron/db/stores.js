import bcrypt from 'bcryptjs';
import { db, DEFAULT_STORE_ID, toPerfectSlug } from './connection.js';
import { getSupabaseClient } from './sync.js';

export function getStores() {
    try {
        return db.prepare("SELECT * FROM lojas ORDER BY nome").all();
    } catch (e) { return []; }
}

export function getStore(id) {
    return db.prepare("SELECT * FROM lojas WHERE id = ?").get(id);
}

export async function updateLojaModules(lojaId, modules) {
    try {
        const modulesString = JSON.stringify(modules);
        const crmAtivo = modules.includes('crm') ? 1 : 0;
        db.prepare('UPDATE lojas SET modulos = ?, crm_ativo = ? WHERE id = ?').run(modulesString, crmAtivo, lojaId);

        const client = getSupabaseClient(null);
        if (client) {
            await client.from('lojas').update({ modulos: modulesString, crm_ativo: !!crmAtivo }).eq('id', lojaId);
        }
        return { success: true };
    } catch (err) { throw err; }
}

export async function createStoreWithAdmin(loja, admin) {
    const lojaId = loja.id || toPerfectSlug(loja.nome);
    const adminUsername = `admin_${lojaId}`;
    const cleanCpf = admin.cpf ? admin.cpf.replace(/\D/g, '') : null;
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    db.transaction(() => {
        const mod = JSON.stringify(loja.modulos || ['dashboard', 'diario', 'whatsapp', 'estoque', 'visitas', 'metas', 'portais', 'ia-chat', 'usuarios']);
        db.prepare(`INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo) VALUES(?, ?, ?, ?, ?, ?, 1)`)
          .run(lojaId, loja.nome, loja.endereco || '', loja.logo_url || '', lojaId, mod);

        db.prepare(`INSERT INTO usuarios(username, loja_id, password, role, nome_completo, cpf, email, reset_password, ativo, created_by) VALUES(?, ?, ?, 'admin', ?, ?, ?, 1, 1, 'developer')`)
          .run(adminUsername, lojaId, hashedPassword, admin.nome_completo, cleanCpf, admin.email || '');
    })();

    const client = getSupabaseClient(null);
    if (client) {
        await client.from('lojas').insert({ id: lojaId, nome: loja.nome, endereco: loja.endereco || '', logo_url: loja.logo_url || '', slug: lojaId, modulos: JSON.stringify(loja.modulos || []), ativo: true });
        await client.from('usuarios').insert({ username: adminUsername, loja_id: lojaId, password: hashedPassword, role: 'admin', nome_completo: admin.nome_completo, cpf: cleanCpf, email: admin.email || '', reset_password: true, ativo: true, created_by: 'developer' });
    }
    return { success: true, lojaId, adminUsername };
}

export async function uploadLogo(lojaId, base64Data) {
    const client = getSupabaseClient(lojaId);
    if (!client) throw new Error('Supabase não configurado');
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    const fileName = `${lojaId}_${Date.now()}.png`;
    const filePath = `logos/${fileName}`;

    const { error } = await client.storage.from('store-assets').upload(filePath, buffer, { contentType: 'image/png', upsert: true });
    if (error) throw error;

    const { data } = client.storage.from('store-assets').getPublicUrl(filePath);
    return { success: true, url: data.publicUrl };
}
