const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

// --- CONFIGURACIÓN POSTGRES (PROD) ---
const pool = isProd ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
}) : null;

// --- CONFIGURACIÓN SQLITE (LOCAL) ---
const dbPath = path.resolve(__dirname, '../../database/database.sqlite');
const sqliteDb = !isProd ? new sqlite3.Database(dbPath) : null;

/**
 * Función auxiliar para convertir placeholders de "?" (SQLite) a "$1, $2" (Postgres)
 * Esto te permite mantener tus consultas iguales en ambos entornos.
 */
const formatQuery = (sql) => {
    if (!isProd) return sql;
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
};

const query = async (sql, params = []) => {
    const formattedSql = formatQuery(sql);
    
    if (isProd) {
        const res = await pool.query(formattedSql, params);
        return res.rows;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb.all(formattedSql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

const run = async (sql, params = []) => {
    const formattedSql = formatQuery(sql);

    if (isProd) {
        return await pool.query(formattedSql, params);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb.run(formattedSql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }
};

module.exports = { query, run };