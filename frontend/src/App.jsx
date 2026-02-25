import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- IMPORTAMOS TOAST
import Login from './pages/Login';
import Layout from './components/Layout';
import Transacciones from './pages/Transacciones';
import Dashboard from './pages/Dashboard';
import Movimientos from './pages/Movimientos';

const PrivateRoute = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem('token');
    return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/" />;
};

function App() {
    return (
        <Router>
            {/* CONFIGURAMOS LAS NOTIFICACIONES GLOBALES */}
            <Toaster 
                position="top-center" 
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1e293b', // Color oscuro elegante
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        padding: '12px 20px',
                    },
                    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }} 
            />
            
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/movimientos" element={<PrivateRoute><Movimientos /></PrivateRoute>} />
                <Route path="/transacciones" element={<PrivateRoute><Transacciones /></PrivateRoute>} />
            </Routes>
        </Router>
    );
}

export default App;