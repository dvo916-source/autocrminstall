import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

// Connect to DB directly (assuming we are in project root or can find it)
// Hardcoded path based on project structure understanding
const dbPath = './sistema_visitas.db';
const db = new Database(dbPath, { verbose: console.log });

const username = 'teste';
const password = '123';
const role = 'vendedor'; // or 'admin' to see everything

console.log(`Ensuring user '${username}' exists...`);

try {
    const existing = db.prepare("SELECT * FROM usuarios WHERE username = ?").get(username);
    const hash = bcrypt.hashSync(password, 10);

    if (existing) {
        db.prepare("UPDATE usuarios SET password = ?, role = ?, reset_password = 0 WHERE username = ?").run(hash, role, username);
        console.log(`Updated user '${username}'. Password is '${password}'.`);
    } else {
        db.prepare("INSERT INTO usuarios (username, password, role, reset_password) VALUES (?, ?, ?, 0)").run(username, hash, role);
        console.log(`Created user '${username}'. Password is '${password}'.`);
    }
} catch (e) {
    console.error("Error:", e);
}
