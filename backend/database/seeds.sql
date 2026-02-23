-- Insertar Cuentas
INSERT INTO cuentas (nombre) VALUES 
('COINAG MATEO'), 
('COINAG DIM'),
('SANTANDER DIM');

-- Insertar Métodos de Pago
INSERT INTO metodosPago (nombre) VALUES 
('Transferencia Bancaria'),
('Tarjeta de Debito'),  
('Tarjeta de Crédito'),
('Cheque'),
('Efectivo');

-- Insertar Orígenes (Categorías) basadas en el ZIP
INSERT INTO origenes (nombre) VALUES 
('Ivan'), 
('Mateo'), 
('Patricia'), 
('Local');

-- Insertar Usuario Admin por defecto
-- La contraseña es: admin123 (hasheada con bcrypt lista para producción)
INSERT INTO usuarios (nombre, email, passwordHash)
VALUES (
    'Mateo Admin', 
    'admin@dim.com', 
    '$2b$10$TKh8H1.PfQx37YgCzwiVce6RMk.8rT6.hJ9IxgE0uO9fO4x9/jG9q'
);