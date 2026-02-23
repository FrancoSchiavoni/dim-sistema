-- Tablas auxiliares
CREATE TABLE IF NOT EXISTS cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- En Postgres lo migraremos a SERIAL
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metodosPago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS origenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Ingresos
CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    importe REAL NOT NULL,
    cliente TEXT,
    cuenta_id INTEGER,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    registradoPor INTEGER,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id),
    FOREIGN KEY (registradoPor) REFERENCES usuarios(id)
);

-- Tabla de Egresos
CREATE TABLE IF NOT EXISTS egresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    importe REAL NOT NULL,
    metodoPago_id INTEGER,
    detalle TEXT,
    origen_id INTEGER,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    registradoPor INTEGER,
    FOREIGN KEY (metodoPago_id) REFERENCES metodosPago(id),
    FOREIGN KEY (origen_id) REFERENCES origenes(id),
    FOREIGN KEY (registradoPor) REFERENCES usuarios(id)
);