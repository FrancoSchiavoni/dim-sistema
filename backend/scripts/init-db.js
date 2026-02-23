const { query } = require('../src/config/db');

const initDB = async () => {
    console.log("🚀 Iniciando validación de estructura de base de datos...");

    try {
        // 1. Tabla de Usuarios
        await query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                passwordHash TEXT NOT NULL,
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Tablas de Catálogos
        await query(`CREATE TABLE IF NOT EXISTS cuentas (id SERIAL PRIMARY KEY, nombre TEXT UNIQUE NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS origenes (id SERIAL PRIMARY KEY, nombre TEXT UNIQUE NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS metodosPago (id SERIAL PRIMARY KEY, nombre TEXT UNIQUE NOT NULL)`);

        // 3. Tablas de Movimientos (Ajustadas para Postgres)
        await query(`
            CREATE TABLE IF NOT EXISTS ingresos (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                importe DECIMAL(12,2) NOT NULL,
                cliente TEXT,
                cuenta_id INTEGER REFERENCES cuentas(id),
                metodoPago_id INTEGER REFERENCES metodosPago(id),
                registradoPor INTEGER REFERENCES usuarios(id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS egresos (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                importe DECIMAL(12,2) NOT NULL,
                detalle TEXT,
                origen_id INTEGER REFERENCES origenes(id),
                metodoPago_id INTEGER REFERENCES metodosPago(id),
                registradoPor INTEGER REFERENCES usuarios(id)
            )
        `);

        // 4. Inserción de Datos Iniciales (Solo si están vacías)
        const checkCuentas = await query("SELECT COUNT(*) as count FROM cuentas");
        if (parseInt(checkCuentas[0].count || checkCuentas[0].count_all) === 0) {
            console.log("📦 Insertando datos maestros iniciales...");
            await query("INSERT INTO cuentas (nombre) VALUES ('Banco Principal'), ('Caja Chica'), ('Cuenta Inversiones')");
            await query("INSERT INTO origenes (nombre) VALUES ('Ventas'), ('Servicios'), ('Infraestructura'), ('Recursos Humanos'), ('Operaciones')");
            await query("INSERT INTO metodosPago (nombre) VALUES ('Transferencia Bancaria'), ('Tarjeta de Débito'), ('Efectivo'), ('Cheque'), ('Tarjeta de Crédito')");
        }

        console.log("✅ Estructura de base de datos verificada y lista.");
    } catch (error) {
        console.error("❌ Error inicializando la base de datos:", error);
        process.exit(1);
    }
};

// Si se ejecuta directamente desde la terminal
if (require.main === module) {
    initDB();
}

module.exports = initDB;