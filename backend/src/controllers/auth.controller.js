const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../config/db');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario en DB
        const users = await query('SELECT * FROM usuarios WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña (compatibilidad SQLite y Postgres)
        const hashGuardado = user.passwordHash || user.passwordhash;
        const validPassword = await bcrypt.compare(password, hashGuardado);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }


        // Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email }
        });
    } catch (error) {
        next(error); // Pasa al middleware de errores global
    }
};

module.exports = { login };