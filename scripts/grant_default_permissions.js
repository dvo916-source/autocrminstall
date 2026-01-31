
import Database from 'better-sqlite3';

const dbPath = "d:\\VISITAS IRW\\crystal_app\\sistema_visitas.db";
const db = new Database(dbPath);

const DEFAULT_PERMISSIONS = JSON.stringify(['/', '/whatsapp', '/estoque', '/visitas', '/metas']);

try {
    const result = db.prepare(`
        UPDATE usuarios 
        SET permissions = ? 
        WHERE role = 'sdr' AND (permissions IS NULL OR permissions = '[]' OR permissions = '')
    `).run(DEFAULT_PERMISSIONS);

    console.log(`Updated ${result.changes} SDR users with default permissions.`);
} catch (e) {
    console.error("Error updating permissions:", e);
}
