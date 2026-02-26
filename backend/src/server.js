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
// Definimos los dominios de confianza
const allowedOrigins = [
    'http://localhost:5173', // Frontend en desarrollo local (Vite)
    process.env.FRONTEND_URL // Frontend en producción (Railway)
].filter(Boolean); // filter(Boolean) elimina valores undefined si la variable de entorno no está seteada

const corsOptions = {
    origin: function (origin, callback) {
        // Permitimos peticiones sin origin (como Postman en desarrollo o conexiones server-to-server)
        // O si el origen exacto está dentro de nuestra lista permitida
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por política CORS'));
        }
    },
    credentials: true, // Necesario si en el futuro envías cookies o ciertos headers de autorización
    optionsSuccessStatus: 200
};

// Aplicamos el middleware globalmente
app.use(cors(corsOptions));
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