const { query, run } = require('../config/db');

const getMovimientos = async (req, res, next) => {
    try {
        const { desde, hasta } = req.query;
        const whereClause = desde && hasta ? `WHERE i.fecha BETWEEN ? AND ?` : '';
        const egresosWhereClause = desde && hasta ? `WHERE e.fecha BETWEEN ? AND ?` : '';
        const params = desde && hasta ? [desde, hasta] : [];

        const sqlIngresos = `
            SELECT i.id, i.fecha, i.importe as monto, i.cliente as detalle, 
                   c.nombre as cuenta, i.cuenta_id, 
                   m.nombre as metodo_pago, i.metodoPago_id,
                   i.registradoPor,
                   i.fecha_registro, 
                   'ingreso' as tipo
            FROM ingresos i
            LEFT JOIN cuentas c ON i.cuenta_id = c.id
            LEFT JOIN metodosPago m ON i.metodoPago_id = m.id
            ${whereClause}
            ORDER BY i.fecha DESC
        `;
        
        const sqlEgresos = `
            SELECT e.id, e.fecha, e.importe as monto, e.detalle, 
                   o.nombre as origen, e.origen_id, 
                   m.nombre as metodo_pago, e.metodoPago_id,
                   i.registradoPor,
                   i.fecha_registro, 
                   'egreso' as tipo
            FROM egresos e
            LEFT JOIN origenes o ON e.origen_id = o.id
            LEFT JOIN metodosPago m ON e.metodoPago_id = m.id
            ${egresosWhereClause}
            ORDER BY e.fecha DESC
        `;

        const ingresos = desde && hasta ? await query(sqlIngresos, params) : await query(sqlIngresos);
        const egresos = desde && hasta ? await query(sqlEgresos, params) : await query(sqlEgresos);
        res.json({ ingresos, egresos });
    } catch (error) { next(error); }
};

const actualizarMovimiento = async (req, res, next) => {
    try {
        const { tipo, id } = req.params;
        const { fecha, importe, cliente, cuenta_id, detalle, origen_id, metodoPago_id } = req.body;
        
        if (tipo === 'ingreso') {
            await run(`UPDATE ingresos SET fecha=?, importe=?, cliente=?, cuenta_id=?, metodoPago_id=? WHERE id=?`, 
                [fecha, importe, cliente, cuenta_id, metodoPago_id, id]);
        } else {
            await run(`UPDATE egresos SET fecha=?, importe=?, detalle=?, origen_id=?, metodoPago_id=? WHERE id=?`, 
                [fecha, importe, detalle, origen_id, metodoPago_id, id]);
        }
        res.json({ message: 'Actualizado exitosamente' });
    } catch (error) { next(error); }
};

const eliminarMovimiento = async (req, res, next) => {
    try {
        const { tipo, id } = req.params;
        if (tipo === 'ingresos') await run(`DELETE FROM ingresos WHERE id=?`, [id]);
        else await run(`DELETE FROM egresos WHERE id=?`, [id]);
        res.json({ message: 'Eliminado exitosamente' });
    } catch (error) { next(error); }
};


const crearMovimiento = async (req, res, next) => {
    try {
        const { tipo, fecha, importe, cliente, cuenta_id, detalle, origen_id, metodoPago_id } = req.body;
        const registradoPor = req.user.id;
        
        if (tipo === 'ingreso') {
            await run(
                `INSERT INTO ingresos (fecha, importe, cliente, cuenta_id, metodoPago_id, registradoPor) VALUES (?, ?, ?, ?, ?, ?)`,
                [fecha, importe, cliente || 'Consumidor Final', cuenta_id, metodoPago_id, registradoPor]
            );
        } else {
            await run(
                `INSERT INTO egresos (fecha, importe, detalle, origen_id, metodoPago_id, registradoPor) VALUES (?, ?, ?, ?, ?, ?)`,
                [fecha, importe, detalle || 'Sin detalle', origen_id, metodoPago_id, registradoPor]
            );
        }
        res.status(201).json({ message: 'Transacción guardada exitosamente' });
    } catch (error) {
        next(error);
    }
};

// Agrega esta nueva función
const getCatalogos = async (req, res, next) => {
    try {
        const cuentas = await query('SELECT id, nombre FROM cuentas ORDER BY nombre');
        const origenes = await query('SELECT id, nombre FROM origenes ORDER BY nombre');
        const metodosPago = await query('SELECT id, nombre FROM metodosPago ORDER BY nombre');
        
        res.json({ cuentas, origenes, metodosPago });
    } catch (error) {
        next(error);
    }
};

const getDashboardStats = async (req, res, next) => {
    try {
        // Sumamos todos los ingresos
        const ingresosRes = await query('SELECT SUM(importe) as total FROM ingresos');
        // Sumamos todos los egresos
        const egresosRes = await query('SELECT SUM(importe) as total FROM egresos');

        const totalIngresos = ingresosRes[0].total || 0;
        const totalEgresos = egresosRes[0].total || 0;
        const saldoTotal = totalIngresos - totalEgresos;

        res.json({
            totalIngresos,
            totalEgresos,
            saldoTotal
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardMetrics = async (req, res, next) => {
    try {
        const { desde, hasta } = req.query;
        
        // Fechas seguras por defecto
        const date = new Date();
        const firstDay = desde || new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = hasta || new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];


        // Separamos las consultas para aislar errores
        // Separamos las consultas para aislar errores (Ajustadas para PostgreSQL estricto)
        const queries = {
            ingresosCuenta: `
                SELECT COALESCE(c.nombre, 'Sin Asignar') as label, SUM(i.importe) as total 
                FROM ingresos i 
                LEFT JOIN cuentas c ON i.cuenta_id = c.id 
                WHERE i.fecha >= ? AND i.fecha <= ? 
                GROUP BY COALESCE(c.nombre, 'Sin Asignar') 
                HAVING SUM(i.importe) > 0 
                ORDER BY total DESC
            `,
            ingresosMetodo: `
                SELECT COALESCE(m.nombre, 'Sin Asignar') as label, SUM(i.importe) as total 
                FROM ingresos i 
                LEFT JOIN metodosPago m ON i.metodoPago_id = m.id 
                WHERE i.fecha >= ? AND i.fecha <= ? 
                GROUP BY COALESCE(m.nombre, 'Sin Asignar') 
                HAVING SUM(i.importe) > 0 
                ORDER BY total DESC
            `,
            egresosOrigen: `
                SELECT COALESCE(o.nombre, 'Sin Asignar') as label, SUM(e.importe) as total 
                FROM egresos e 
                LEFT JOIN origenes o ON e.origen_id = o.id 
                WHERE e.fecha >= ? AND e.fecha <= ? 
                GROUP BY COALESCE(o.nombre, 'Sin Asignar') 
                HAVING SUM(e.importe) > 0 
                ORDER BY total DESC
            `,
            egresosMetodo: `
                SELECT COALESCE(m.nombre, 'Sin Asignar') as label, SUM(e.importe) as total 
                FROM egresos e 
                LEFT JOIN metodosPago m ON e.metodoPago_id = m.id 
                WHERE e.fecha >= ? AND e.fecha <= ? 
                GROUP BY COALESCE(m.nombre, 'Sin Asignar') 
                HAVING SUM(e.importe) > 0 
                ORDER BY total DESC
            `
        };

        // Preparamos el objeto de respuesta
        const results = {
            ingresosCuenta: [], ingresosMetodo: [], egresosOrigen: [], egresosMetodo: []
        };

        // Ejecutamos cada consulta por separado
        for (const [key, sql] of Object.entries(queries)) {
            try {
                results[key] = await query(sql, [firstDay, lastDay]);
            } catch (err) {
                console.error(`❌ Error en la consulta [${key}]:`, err.message);
                // Si falla una, devuelve vacío solo para ese bloque, pero no rompe el resto
            }
        }

        res.json(results);
    } catch (error) {
        console.error("❌ Error crítico en métricas:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = { getMovimientos, crearMovimiento, getCatalogos, getDashboardMetrics, actualizarMovimiento, eliminarMovimiento };
