import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';

// Agrega esta importación arriba
import Transacciones from './pages/Transacciones';
import Dashboard from './pages/Dashboard'; // ¡Nuevo!
// Y modifica la ruta correspondiente para que quede así:



// Protector de rutas simple
const PrivateRoute = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem('token');
    return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/" />;
};

// Placeholders temporales para probar la navegación
const DashboardPlaceholder = () => <div className="p-8"><h2>Dashboard (Fase 5)</h2></div>;
const TransaccionesPlaceholder = () => <div className="p-8"><h2>Transacciones (Fase 5)</h2></div>;

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><DashboardPlaceholder /></PrivateRoute>} />
                <Route path="/transacciones" element={<PrivateRoute><Transacciones /></PrivateRoute>} />
            </Routes>
        </Router>
    );
}

export default App;