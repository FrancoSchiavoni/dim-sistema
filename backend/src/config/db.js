const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta al archivo SQLite
const dbPath = path.resolve(__dirname, '../../database/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Wrapper para consultas SELECT (devuelve arrays)
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Wrapper para INSERT/UPDATE/DELETE
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this); // Retorna { lastID, changes }
        });
    });
};

module.exports = { query, run };