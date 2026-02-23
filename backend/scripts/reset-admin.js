const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Apuntamos a la base de datos correcta
const dbPath = path.resolve(__dirname, '../database/database.sqlite');
const db = new sqlite3.Database(dbPath);

async function resetAdmin() {
    const password = 'admin123';
    // Generamos un hash fresco y válido en este momento
    const hash = await bcrypt.hash(password, 10);
    const email = 'admin@dim.com';

    db.run(
        `UPDATE usuarios SET passwordHash = ? WHERE email = ?`,
        [hash, email],
        function(err) {
            if (err) {
                console.error('Error actualizando:', err);
                return;
            }
            
            if (this.changes > 0) {
                console.log(`✅ Contraseña de ${email} actualizada correctamente a: ${password}`);
            } else {
                // Si el usuario no existía (quizás falló el seed original), lo creamos
                db.run(
                    `INSERT INTO usuarios (nombre, email, passwordHash) VALUES ('Carlos Ruiz', ?, ?)`, 
                    [email, hash], 
                    (err2) => {
                        if(err2) console.error('Error insertando:', err2);
                        else console.log(`✅ Usuario ${email} creado correctamente con clave: ${password}`);
                    }
                );
            }
        }
    );
}

resetAdmin();