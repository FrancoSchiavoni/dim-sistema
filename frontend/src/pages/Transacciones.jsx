import { useState, useEffect } from 'react';
import { api } from '../services/api';
import MovimientoModal from '../components/MovimientoModal';

export default function Transacciones() {
    const [movimientos, setMovimientos] = useState({ ingresos: [], egresos: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ingresos');

    // Estados de Notificaciones y Popups
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null); // Nuevo estado para el popup de borrar
    const [isDeleting, setIsDeleting] = useState(false); // Para mostrar estado de "Cargando..." al borrar

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal de Edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [movimientoAEditar, setMovimientoAEditar] = useState(null);

    const fetchMovimientos = async () => {
        setLoading(true);
        try {
            const data = await api.get('/transacciones');
            setMovimientos({ ingresos: data.ingresos || [], egresos: data.egresos || [] });
        } catch (error) {
            console.error('Error cargando transacciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMovimientos(); }, []);
    useEffect(() => { setCurrentPage(1); }, [activeTab, itemsPerPage]);

    // Funciones de Acción
    const handleEdit = (movimiento) => {
        setMovimientoAEditar(movimiento);
        setIsModalOpen(true);
    };

    // 1. Abre el popup de confirmación
    const promptDelete = (id, tipo) => {
        setItemToDelete({ id, tipo });
    };

    // 2. Ejecuta el borrado real si el usuario confirma
    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        
        try {
            await api.delete(`/transacciones/${itemToDelete.tipo}/${itemToDelete.id}`);
            
            setShowDeleteSuccess(true);
            setTimeout(() => setShowDeleteSuccess(false), 2000);
            
            fetchMovimientos(); 
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        } finally {
            setIsDeleting(false);
            setItemToDelete(null); // Cierra el popup
        }
    };

    // Paginación lógica
    const activeData = movimientos[activeTab];
    const totalItems = activeData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = activeData.slice(startIndex, startIndex + itemsPerPage);

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-background-light dark:bg-background-dark relative">
            
            {/* TOAST: Notificación de Borrado Exitoso */}
            {showDeleteSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 transform transition-all animate-bounce">
                    <span className="material-symbols-outlined text-3xl">delete_sweep</span>
                    <span className="text-xl font-bold tracking-wide">¡Registro eliminado correctamente!</span>
                </div>
            )}

            {/* POPUP DE CONFIRMACIÓN DE BORRADO */}
            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setItemToDelete(null)}></div>
                    <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1a2634] rounded-3xl shadow-2xl border border-slate-200 p-8 flex flex-col items-center text-center animate-fade-in">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <span className="material-symbols-outlined text-[40px]">warning</span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">¿Eliminar registro?</h3>
                        <p className="text-slate-500 mb-8 font-medium">Esta acción es permanente y no podrás recuperar los datos de esta transacción.</p>
                        
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => setItemToDelete(null)} 
                                disabled={isDeleting} 
                                className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={isDeleting} 
                                className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Borrando...
                                    </>
                                ) : (
                                    'Sí, Eliminar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[100rem] mx-auto flex flex-col gap-8">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Historial de Transacciones</h2>
                    </div>
                </div>

                <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
                    <button onClick={() => setActiveTab('ingresos')} className={`flex items-center gap-2 px-8 py-3 text-base font-bold rounded-xl transition-all ${activeTab === 'ingresos' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                        <span className="material-symbols-outlined text-[20px]">arrow_downward</span> Ingresos
                    </button>
                    <button onClick={() => setActiveTab('egresos')} className={`flex items-center gap-2 px-8 py-3 text-base font-bold rounded-xl transition-all ${activeTab === 'egresos' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-500 hover:text-slate-700'}`}>
                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span> Egresos
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="py-5 pl-8 pr-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    {activeTab === 'ingresos' ? (
                                        <>
                                            <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                            <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Cuenta Destino</th>
                                            <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Forma de Cobro</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Detalle</th>
                                            <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                                            <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Método de Pago</th>
                                        </>
                                    )}
                                    <th className="py-5 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                                    <th className="py-5 pr-8 pl-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-center w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-base">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-12 text-slate-500 text-lg">Cargando datos...</td></tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-12 text-slate-500 text-lg">No hay {activeTab} registrados.</td></tr>
                                ) : (
                                    paginatedData.map((mov) => (
                                        <tr key={`${activeTab}-${mov.id}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-5 pl-8 pr-4 text-slate-500 font-medium whitespace-nowrap">{formatDate(mov.fecha)}</td>
                                            
                                            {activeTab === 'ingresos' ? (
                                                <>
                                                    <td className="py-5 px-4 font-bold text-slate-900">{mov.detalle}</td>
                                                    <td className="py-5 px-4 text-slate-600">{mov.cuenta || 'N/A'}</td>
                                                    <td className="py-5 px-4 text-slate-600">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-5 px-4 font-bold text-slate-900">{mov.detalle}</td>
                                                    <td className="py-5 px-4 text-slate-600">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-purple-50 text-purple-700">{mov.origen || 'N/A'}</span>
                                                    </td>
                                                    <td className="py-5 px-4 text-slate-600">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            )}

                                            <td className={`py-5 px-4 text-right font-extrabold whitespace-nowrap text-lg ${activeTab === 'ingresos' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {activeTab === 'ingresos' ? '+' : '-'}{formatCurrency(mov.monto)}
                                            </td>
                                            
                                            <td className="py-5 pr-8 pl-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(mov)} className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors" title="Editar">
                                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                                    </button>
                                                    {/* Cambio aquí: ahora llama a promptDelete en lugar de la función nativa */}
                                                    <button onClick={() => promptDelete(mov.id, activeTab)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Eliminar">
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Controles de Paginación */}
                    {!loading && totalItems > 0 && (
                        <div className="px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                <span>Mostrar</span>
                                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-slate-200 rounded-lg bg-white text-slate-900 py-1.5 px-3 outline-none cursor-pointer">
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                                </select>
                                <span>filas</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-slate-500">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}</span>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
                                    <div className="px-3 font-bold text-slate-700">Pág. {currentPage} / {totalPages}</div>
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <MovimientoModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setMovimientoAEditar(null); }} 
                onSaved={fetchMovimientos}
                movimientoAEditar={movimientoAEditar}
            />
        </div>
    );
}