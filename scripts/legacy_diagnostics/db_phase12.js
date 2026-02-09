import 'dotenv/config';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(app.getPath('userData'), 'database.db');
const db = new Database(dbPath);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULT_STORE_ID = 'irw-motors-main';

// ============================================
// PHASE 12: Multi-Tenant Store Management
// ============================================

/**
 * Valida se um CPF já existe no sistema
 * @param {string} cpf - CPF a ser validado
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function validateCpfUnique(cpf) {
    if (!cpf) return { valid: false, message: 'CPF é obrigatório' };

    // Remove formatação
    const cleanCpf = cpf.replace(/\D/g, '');

    // Validação básica de formato
    if (cleanCpf.length !== 11) {
        return { valid: false, message: 'CPF deve ter 11 dígitos' };
    }

    // Verifica se já existe no banco local
    const existingLocal = db.prepare('SELECT username FROM usuarios WHERE cpf = ?').get(cleanCpf);
    if (existingLocal) {
        return { valid: false, message: `CPF já cadastrado para o usuário: ${existingLocal.username}` };
    }

    // Verifica no Supabase
    if (supabase) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('username')
            .eq('cpf', cleanCpf)
            .single();

        if (data) {
            return { valid: false, message: `CPF já cadastrado no sistema: ${data.username}` };
        }
    }

    return { valid: true, message: 'CPF disponível' };
}

/**
 * Cria uma loja e seu usuário administrador em uma transação atômica
 * @param {Object} loja - Dados da loja {nome, endereco, logo_url, modulos}
 * @param {Object} admin - Dados do admin {nome_completo, cpf, email, password}
 * @returns {Promise<{success: boolean, lojaId: string, adminUsername: string}>}
 */
export async function createStoreWithAdmin(loja, admin) {
    try {
        // 1. Validar CPF
        const cpfValidation = await validateCpfUnique(admin.cpf);
        if (!cpfValidation.valid) {
            throw new Error(cpfValidation.message);
        }

        // 2. Gerar IDs
        const lojaId = loja.id || toPerfectSlug(loja.nome);
        const adminUsername = `admin_${lojaId}`;
        const cleanCpf = admin.cpf.replace(/\D/g, '');

        // 3. Hash da senha
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        // 4. Transação atômica
        const result = db.transaction(() => {
            // 4.1 Criar loja
            const modulosJson = loja.modulos || JSON.stringify([
                'dashboard', 'diario', 'whatsapp', 'estoque',
                'visitas', 'metas', 'portais', 'ia-chat', 'usuarios'
            ]);

            db.prepare(`
                INSERT INTO lojas(id, nome, endereco, logo_url, slug, modulos, ativo)
                VALUES(?, ?, ?, ?, ?, ?, 1)
            `).run(lojaId, loja.nome, loja.endereco, loja.logo_url, lojaId, modulosJson);

            // 4.2 Criar usuário ADM
            db.prepare(`
                INSERT INTO usuarios(
                    username, loja_id, password, role, 
                    nome_completo, cpf, email, 
                    reset_password, ativo, created_by
                )
                VALUES(?, ?, ?, 'admin', ?, ?, ?, 1, 1, 'developer')
            `).run(adminUsername, lojaId, hashedPassword, admin.nome_completo, cleanCpf, admin.email);

            return { lojaId, adminUsername };
        })();

        // 5. Sincronizar com Supabase
        if (supabase) {
            // 5.1 Sync loja
            await supabase.from('lojas').insert({
                id: lojaId,
                nome: loja.nome,
                endereco: loja.endereco,
                logo_url: loja.logo_url,
                slug: lojaId,
                modulos: loja.modulos,
                ativo: true
            });

            // 5.2 Sync usuário
            await supabase.from('usuarios').insert({
                username: adminUsername,
                loja_id: lojaId,
                password: hashedPassword,
                role: 'admin',
                nome_completo: admin.nome_completo,
                cpf: cleanCpf,
                email: admin.email,
                reset_password: true,
                ativo: true,
                created_by: 'developer'
            });
        }

        return {
            success: true,
            lojaId: result.lojaId,
            adminUsername: result.adminUsername,
            message: `Loja "${loja.nome}" e usuário administrador criados com sucesso!`
        };

    } catch (err) {
        console.error('[createStoreWithAdmin] Erro:', err);
        throw new Error(`Erro ao criar loja: ${err.message}`);
    }
}

/**
 * Valida se a sessão do usuário ainda é válida
 * @param {string} username
 * @param {string} sessionId
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function validateSession(username, sessionId) {
    const user = db.prepare('SELECT session_id FROM usuarios WHERE username = ?').get(username);

    if (!user) {
        return { valid: false, message: 'Usuário não encontrado' };
    }

    if (user.session_id !== sessionId) {
        return { valid: false, message: 'SESSION_EXPIRED' };
    }

    return { valid: true, message: 'Sessão válida' };
}

/**
 * Upload de logomarca para Supabase Storage
 * @param {string} lojaId
 * @param {string} base64Data - Imagem em base64
 * @returns {Promise<{success: boolean, url: string}>}
 */
export async function uploadLogo(lojaId, base64Data) {
    if (!supabase) {
        throw new Error('Supabase não configurado');
    }

    try {
        // 1. Converter base64 para buffer
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Image, 'base64');

        // 2. Gerar nome único
        const fileName = `${lojaId}_${Date.now()}.png`;
        const filePath = `logos/${fileName}`;

        // 3. Upload para Supabase Storage
        const { data, error } = await supabase.storage
            .from('store-assets')
            .upload(filePath, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;

        // 4. Obter URL pública
        const { data: publicUrlData } = supabase.storage
            .from('store-assets')
            .getPublicUrl(filePath);

        return {
            success: true,
            url: publicUrlData.publicUrl
        };

    } catch (err) {
        console.error('[uploadLogo] Erro:', err);
        throw new Error(`Erro ao fazer upload: ${err.message}`);
    }
}

// Helper function (se não existir)
function toPerfectSlug(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
