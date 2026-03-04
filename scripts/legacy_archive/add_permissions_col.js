import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// Mock app.getAppPath for standalone script if needed, but since this is designed to be run via node,
// we might need to hardcode path or use process.cwd()
const dbPath = "d:\\VISITAS IRW\\crystal_app\\sistema_visitas.db";

const migrations = [
    "ALTER TABLE usuarios ADD COLUMN permissions TEXT DEFAULT '[]'"
];
const db = new Database(dbPath);
migrations.forEach(query => {
    try { db.exec(query); } catch (e) { } // Ignore if exists
});
}
upgradeDb();
