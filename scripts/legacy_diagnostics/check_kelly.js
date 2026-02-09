import Database from 'better-sqlite3';
import path from 'path';

const dbPath = 'C:\\Users\\Windows 11\\AppData\\Roaming\\sdr-irw-motors\\sistema_visitas.db';
const db = new Database(dbPath);

console.log('--- BUSCANDO KELLY ---');

const vendedores = db.prepare("SELECT * FROM vendedores WHERE nome LIKE '%KELLY%' OR sobrenome LIKE '%KELLY%'").all();
console.log('Vendedores encontrados:', vendedores);

const usuarios = db.prepare("SELECT username, email, nome_completo FROM usuarios WHERE username LIKE '%kelly%' OR email LIKE '%kelly%' OR nome_completo LIKE '%kelly%'").all();
console.log('Usuários encontrados:', usuarios);

const allVends = db.prepare("SELECT * FROM vendedores").all();
console.log('Todos os Vendedores (Total):', allVends.length);
console.log('Nomes dos Vendedores:', allVends.map(v => v.nome));

db.close();
