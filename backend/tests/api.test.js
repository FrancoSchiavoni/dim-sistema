const test = require('node:test');
const assert = require('node:assert');

const API_URL = 'http://localhost:3000/api';
let authToken = '';

test('Pruebas de la API de Finanzas', async (t) => {
    
    await t.test('1. Debería fallar el login con credenciales incorrectas', async () => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@finanzas.corp', password: 'clave-equivocada' })
        });
        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.error, 'Credenciales inválidas');
    });

    await t.test('2. Debería hacer login exitoso y devolver un JWT', async () => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@finanzas.corp', password: 'admin123' })
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.token, 'El token no fue generado');
        authToken = data.token; // Guardamos el token para las siguientes pruebas
    });

    await t.test('3. Debería rechazar acceso a ruta protegida sin token', async () => {
        const res = await fetch(`${API_URL}/transacciones`);
        assert.strictEqual(res.status, 403);
    });

    await t.test('4. Debería crear un ingreso correctamente', async () => {
        const res = await fetch(`${API_URL}/transacciones`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                tipo: 'ingreso',
                fecha: '2026-10-15',
                importe: 5000,
                cliente: 'Cliente Test',
                cuenta_id: 1
            })
        });
        assert.strictEqual(res.status, 201);
    });
});