import { useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Obtener datos del usuario logueado
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { nombre: 'Usuario' };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Finanzas DIM</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Gestión Interna</p>
                        </div>
                    </div>
                    <nav className="flex flex-col gap-1">
                        <button onClick={() => navigate('/dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors w-full text-left ${isActive('/dashboard') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="material-symbols-outlined">pie_chart</span>
                            <span>Dashboard</span>
                        </button>
                        <button onClick={() => navigate('/transacciones')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors w-full text-left ${isActive('/transacciones') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="material-symbols-outlined">sync_alt</span>
                            <span>Transacciones</span>
                        </button>
                        <button onClick={() => navigate('/movimientos')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors w-full text-left ${isActive('/movimientos') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="material-symbols-outlined">note_add</span>
                            <span>Movimientos</span>
                        </button>
                    </nav>
                </div>
                <div className="mt-auto p-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl text-slate-600 dark:text-slate-400">
                        <div className="h-9 w-9 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-600 font-bold">
                            {user.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.nombre}</p>
                            <p className="text-xs text-slate-500 truncate">Admin</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Cerrar sesión">
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header Mobile */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">Finanzas DIM</span>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </header>

                {/* Content injected here */}
                {children}
            </main>
        </div>
    );
}