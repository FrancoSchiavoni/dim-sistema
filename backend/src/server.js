require('dotenv').config();

const initDB = require('../scripts/init-db');
const express = require('express');
const cors = require('cors');
const { login } = require('./controllers/auth.controller');
const { verifyToken } = require('./middlewares/auth.middleware');
const transaccionesRoutes = require('./routes/transaction.routes'); // <-- Agrega esto arriba

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas Públicas
app.post('/api/auth/login', login);

// Ruta Protegida (Prueba)
app.get('/api/me', verifyToken, (req, res) => {
    res.json({ mensaje: 'Token válido', usuario: req.user });
});
app.use('/api/transacciones', transaccionesRoutes);

// Middleware Global de Manejo de Errores
app.use((err, req, res, next) => {
    console.error('[Error en Servidor]:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});


const startServer = async () => {
    // Ejecutamos la validación de la DB
    await initDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();