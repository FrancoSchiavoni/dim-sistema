const bcrypt = require('bcrypt');
const { run } = require('../src/config/db');

// Obtenemos los datos desde la terminal: node create-user.js "Nombre" "email" "password"
const [,, nombre, email, password] = process.argv;

async function createUser() {
    if (!nombre || !email || !password) {
        console.log('⚠️ Uso: node scripts/create-user.js "Nombre" "email" "password"');
        return;
    }

    try {
        console.log(`⏳ Generando acceso para ${nombre}...`);
        
        // Encriptamos la contraseña por seguridad
        const hash = await bcrypt.hash(password, 10);

        // Insertamos en la tabla (funciona tanto en SQLite como en Postgres)
        await run(
            `INSERT INTO usuarios (nombre, email, passwordHash) VALUES (?, ?, ?)`,
            [nombre, email, hash]
        );

        console.log(`✅ Usuario creado con éxito:`);
        console.log(`   - Email: ${email}`);
        console.log(`   - Nombre: ${nombre}`);
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            console.error("❌ Error: Ya existe un usuario con ese correo electrónico.");
        } else {
            console.error("❌ Error al crear usuario:", error.message);
        }
    }
}

createUser();