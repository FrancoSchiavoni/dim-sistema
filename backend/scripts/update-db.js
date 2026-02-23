const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.run(`ALTER TABLE ingresos ADD COLUMN metodoPago_id INTEGER REFERENCES metodosPago(id)`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.error("Error:", err.message);
    } else {
        console.log("✅ Columna metodoPago_id asegurada en la tabla ingresos.");
    }
});