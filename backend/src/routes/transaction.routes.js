const express = require('express');
const { getMovimientos, crearMovimiento, getCatalogos, actualizarMovimiento, eliminarMovimiento, getDashboardMetrics } = require('../controllers/transaction.controller'); // Importa getCatalogos
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(verifyToken);

// NUEVA RUTA: Obtener catálogos para los selects
router.get('/catalogos', getCatalogos); 
router.get('/dashboard', getDashboardMetrics);
router.put('/:tipo/:id', actualizarMovimiento); // <-- Nueva
router.delete('/:tipo/:id', eliminarMovimiento); // <-- Nueva

router.get('/', getMovimientos);
router.post('/', crearMovimiento);

module.exports = router;