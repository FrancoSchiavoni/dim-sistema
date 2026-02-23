import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock simple de la función navigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => vi.fn() };
});

describe('Pantalla de Login', () => {
    it('debería renderizar el formulario correctamente', () => {
        render(<BrowserRouter><Login /></BrowserRouter>);
        
        expect(screen.getByText('Finanzas DIM')).toBeDefined();
        expect(screen.getByText('Email')).toBeDefined();
        expect(screen.getByText('Contraseña')).toBeDefined();
        expect(screen.getByRole('button', { name: /Ingresar/i })).toBeDefined();
    });

    it('debería actualizar los inputs al escribir', () => {
        render(<BrowserRouter><Login /></BrowserRouter>);
        
        const emailInput = screen.getByLabelText('Email') || screen.getByRole('textbox');
        fireEvent.change(emailInput, { target: { value: 'test@correo.com' } });
        
        expect(emailInput.value).toBe('test@correo.com');
    });
});