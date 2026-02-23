const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// CORRECCIÓN: Usamos '../database' para subir solo un nivel (de 'scripts' a 'backend')
const dbDir = path.resolve(__dirname, '../database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const dbPath = path.resolve(dbDir, 'database.sqlite');
const schemaPath = path.resolve(dbDir, 'schema.sql');
const seedsPath = path.resolve(dbDir, 'seeds.sql');

const db = new sqlite3.Database(dbPath);

const executeSqlFile = (filePath) => {
    if (!fs.existsSync(filePath)) return console.log(`Archivo no encontrado: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    db.exec(sql, (err) => {
        if (err) console.error(`Error ejecutando ${path.basename(filePath)}:`, err);
        else console.log(`✅ Ok: ${path.basename(filePath)}`);
    });
};

db.serialize(() => {
    executeSqlFile(schemaPath);
    executeSqlFile(seedsPath);
    console.log('BD Inicializada correctamente.');
});