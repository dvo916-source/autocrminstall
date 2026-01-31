
import Database from 'better-sqlite3';

const dbPath = "d:\\VISITAS IRW\\crystal_app\\sistema_visitas.db";

function upgradeDb() {
    const migrations = [
        "ALTER TABLE usuarios ADD COLUMN permissions TEXT DEFAULT '[]'"
    ];
    const db = new Database(dbPath);
    migrations.forEach(query => {
        try {
            db.exec(query);
            console.log("Migration executed:", query);
        } catch (e) {
            console.log("Migration failed (maybe already exists):", e.message);
        }
    });
}
upgradeDb();
