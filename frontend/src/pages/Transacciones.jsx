import { useState, useEffect } from 'react';
import { api } from '../services/api';
import MovimientoModal from '../components/MovimientoModal';
import * as XLSX from 'xlsx';

export default function Transacciones() {
    const [movimientos, setMovimientos] = useState({ ingresos: [], egresos: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ingresos');

    // Filtro de fechas
    const [desde, setDesde] = useState(() => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [hasta, setHasta] = useState(() => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    // Estados de Notificaciones y Popups
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal de Edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [movimientoAEditar, setMovimientoAEditar] = useState(null);

    const fetchMovimientos = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/transacciones?desde=${desde}&hasta=${hasta}`);
            setMovimientos({ ingresos: data.ingresos || [], egresos: data.egresos || [] });
        } catch (error) {
            console.error('Error cargando transacciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMovimientos(); }, [desde, hasta]);
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

    const exportToExcel = () => {
        const data = paginatedData.map(mov => ({
            Fecha: formatDate(mov.fecha),
            ...(activeTab === 'ingresos' ? {
                Cliente: mov.detalle,
                'Cuenta Destino': mov.cuenta || 'N/A',
                'Forma de Cobro': mov.metodo_pago || 'N/A',
                Monto: mov.monto
            } : {
                Detalle: mov.detalle,
                Categoría: mov.origen || 'N/A',
                'Método de Pago': mov.metodo_pago || 'N/A',
                Monto: mov.monto
            })
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
        
        const fileName = `${activeTab}-${desde}-${hasta}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-8 lg:p-10 bg-background-light dark:bg-background-dark relative">
            
            {/* TOAST: Notificación de Borrado Exitoso */}
            {showDeleteSuccess && (
                <div className="fixed top-4 md:top-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 md:gap-3 bg-emerald-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-lg md:rounded-2xl shadow-2xl shadow-emerald-500/30 transform transition-all animate-bounce text-xs md:text-base">
                    <span className="material-symbols-outlined text-lg md:text-3xl">delete_sweep</span>
                    <span className="font-bold tracking-wide">¡Registro eliminado correctamente!</span>
                </div>
            )}

            {/* POPUP DE CONFIRMACIÓN DE BORRADO */}
            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setItemToDelete(null)}></div>
                    <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1a2634] rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 p-5 md:p-8 flex flex-col items-center text-center animate-fade-in">
                        <div className="w-16 md:w-20 h-16 md:h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-inner">
                            <span className="material-symbols-outlined text-[32px] md:text-[40px]">warning</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">¿Eliminar registro?</h3>
                        <p className="text-xs md:text-base text-slate-500 mb-6 md:mb-8 font-medium">Esta acción es permanente y no podrás recuperar los datos de esta transacción.</p>
                        
                        <div className="flex gap-3 md:gap-4 w-full">
                            <button 
                                onClick={() => setItemToDelete(null)} 
                                disabled={isDeleting} 
                                className="flex-1 py-2.5 md:py-4 px-3 md:px-4 rounded-lg md:rounded-2xl font-bold text-slate-600 text-sm md:text-base bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={isDeleting} 
                                className="flex-1 py-2.5 md:py-4 px-3 md:px-4 rounded-lg md:rounded-2xl font-bold text-white text-sm md:text-base bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-1.5 md:gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[18px] md:text-[20px]">sync</span>
                                        <span className="hidden sm:inline">Borrando...</span>
                                    </>
                                ) : (
                                    'Sí, Eliminar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[100rem] mx-auto flex flex-col gap-4 md:gap-8">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Historial de Transacciones</h2>
                    </div>
                </div>

                {/* Barra de Filtros de Fechas */}
                <div className="bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-100 p-3 md:p-5 flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:flex-1">
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-xs md:text-base text-slate-500 font-semibold whitespace-nowrap">Desde:</span>
                            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="flex-1 px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-base focus:ring-2 focus:ring-primary/50 bg-slate-50" />
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-xs md:text-base text-slate-500 font-semibold whitespace-nowrap">Hasta:</span>
                            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="flex-1 px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-base focus:ring-2 focus:ring-primary/50 bg-slate-50" />
                        </div>
                    </div>
                    {paginatedData.length > 0 && (
                        <button onClick={exportToExcel} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm md:text-base rounded-lg md:rounded-xl transition-all shadow-md">
                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">download</span>
                            <span>Exportar Excel</span>
                        </button>
                    )}               </div>

                <div className="flex gap-1.5 md:gap-2 bg-slate-200/50 p-1 md:p-1.5 rounded-lg md:rounded-2xl w-full md:w-fit overflow-x-auto">
                    <button onClick={() => setActiveTab('ingresos')} className={`flex items-center gap-1 md:gap-2 px-4 md:px-8 py-2 md:py-3 text-xs md:text-base font-bold rounded-lg md:rounded-xl transition-all whitespace-nowrap ${activeTab === 'ingresos' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                        <span className="material-symbols-outlined text-[16px] md:text-[20px]">arrow_downward</span> <span className="hidden sm:inline">Ingresos</span>
                    </button>
                    <button onClick={() => setActiveTab('egresos')} className={`flex items-center gap-1 md:gap-2 px-4 md:px-8 py-2 md:py-3 text-xs md:text-base font-bold rounded-lg md:rounded-xl transition-all whitespace-nowrap ${activeTab === 'egresos' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-500 hover:text-slate-700'}`}>
                        <span className="material-symbols-outlined text-[16px] md:text-[20px]">arrow_upward</span> <span className="hidden sm:inline">Egresos</span>
                    </button>
                </div>

                <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="py-3 md:py-5 pl-3 md:pl-8 pr-2 md:pr-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    {activeTab === 'ingresos' ? (
                                        <>
                                            <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Cliente</th>
                                            <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Cuenta Destino</th>
                                            <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Forma de Cobro</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Detalle</th>
                                            <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Categoría</th>
                                            <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Método de Pago</th>
                                        </>
                                    )}
                                    <th className="py-3 md:py-5 px-2 md:px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                                    <th className="py-3 md:py-5 pr-3 md:pr-8 pl-2 md:pl-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider text-center w-auto md:w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs md:text-base">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-8 md:py-12 text-slate-500 text-base md:text-lg">Cargando datos...</td></tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-8 md:py-12 text-slate-500 text-base md:text-lg">No hay {activeTab} registrados.</td></tr>
                                ) : (
                                    paginatedData.map((mov) => (
                                        <tr key={`${activeTab}-${mov.id}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-3 md:py-5 pl-3 md:pl-8 pr-2 md:pr-4 text-slate-500 font-medium whitespace-nowrap text-xs md:text-base">{formatDate(mov.fecha)}</td>
                                            
                                            {activeTab === 'ingresos' ? (
                                                <>
                                                    <td className="py-3 md:py-5 px-2 md:px-4 font-bold text-slate-900 hidden sm:table-cell text-xs md:text-base">{mov.detalle}</td>
                                                    <td className="py-3 md:py-5 px-2 md:px-4 text-slate-600 hidden lg:table-cell text-xs md:text-base">{mov.cuenta || 'N/A'}</td>
                                                    <td className="py-3 md:py-5 px-2 md:px-4 text-slate-600 hidden lg:table-cell text-xs md:text-base">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-3 md:py-5 px-2 md:px-4 font-bold text-slate-900 hidden sm:table-cell text-xs md:text-base">{mov.detalle}</td>
                                                    <td className="py-3 md:py-5 px-2 md:px-4 text-slate-600 hidden lg:table-cell">
                                                        <span className="inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded text-xs md:text-sm font-bold bg-purple-50 text-purple-700">{mov.origen || 'N/A'}</span>
                                                    </td>
                                                    <td className="py-3 md:py-5 px-2 md:px-4 text-slate-600 hidden lg:table-cell text-xs md:text-base">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            )}

                                            <td className={`py-3 md:py-5 px-2 md:px-4 text-right font-extrabold whitespace-nowrap text-xs md:text-lg ${activeTab === 'ingresos' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {activeTab === 'ingresos' ? '+' : '-'}{formatCurrency(mov.monto)}
                                            </td>
                                            
                                            <td className="py-3 md:py-5 pr-3 md:pr-8 pl-2 md:pl-4 text-center">
                                                <div className="flex items-center justify-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(mov)} className="p-1.5 md:p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg md:rounded-xl transition-colors" title="Editar">
                                                        <span className="material-symbols-outlined text-[16px] md:text-[20px]">edit</span>
                                                    </button>
                                                    <button onClick={() => promptDelete(mov.id, activeTab)} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors" title="Eliminar">
                                                        <span className="material-symbols-outlined text-[16px] md:text-[20px]">delete</span>
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
                        <div className="px-3 md:px-8 py-3 md:py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-600 font-medium">
                                <span className="hidden sm:inline">Mostrar</span>
                                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-slate-200 rounded-lg bg-white text-slate-900 py-1.5 px-2 md:px-3 text-xs md:text-sm outline-none cursor-pointer">
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                                </select>
                                <span className="hidden sm:inline">filas</span>
                            </div>
                            <div className="flex items-center gap-3 md:gap-4">
                                <span className="text-xs md:text-sm font-medium text-slate-500 text-center">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}</span>
                                <div className="flex items-center gap-1 md:gap-1.5">
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-slate-200 bg-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[16px] md:text-[20px]">chevron_left</span></button>
                                    <div className="px-2 md:px-3 text-xs md:text-base font-bold text-slate-700 min-w-[80px] md:min-w-auto text-center">Pág. {currentPage} / {totalPages}</div>
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-slate-200 bg-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[16px] md:text-[20px]">chevron_right</span></button>
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