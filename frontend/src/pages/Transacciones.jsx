import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import MovimientoModal from '../components/MovimientoModal';

const formatDateObj = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Transacciones() {
    const navigate = useNavigate();
    const location = useLocation(); // <--- ATRAPAMOS LA INFO DEL DASHBOARD

    const [movimientos, setMovimientos] = useState({ ingresos: [], egresos: [] });
    const [loading, setLoading] = useState(true);
    
    // Si venimos del Dashboard, inicializamos con esos filtros
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'ingresos');
    const [activeFilter, setActiveFilter] = useState('mes');
    const [searchTerm, setSearchTerm] = useState(location.state?.filterText || '');

    const [desde, setDesde] = useState(() => {
        if (location.state?.desde) return location.state.desde;
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [hasta, setHasta] = useState(() => {
        if (location.state?.hasta) return location.state.hasta;
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
    useEffect(() => { setCurrentPage(1); }, [activeTab, itemsPerPage, searchTerm]); // Reiniciar pág al buscar

    const handleQuickFilter = (type) => {
        const today = new Date();
        setActiveFilter(type);
        
        if (type === 'hoy') {
            const todayStr = formatDateObj(today);
            setDesde(todayStr);
            setHasta(todayStr);
        } else if (type === 'semana') {
            const day = today.getDay() || 7;
            const monday = new Date(today);
            monday.setDate(today.getDate() - day + 1);
            const sunday = new Date(today);
            sunday.setDate(monday.getDate() + 6);
            setDesde(formatDateObj(monday));
            setHasta(formatDateObj(sunday));
        } else if (type === 'mes') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setDesde(formatDateObj(firstDay));
            setHasta(formatDateObj(lastDay));
        } else if (type === 'todo') {
            setDesde('2000-01-01');
            setHasta('2100-12-31');
        }
    };

    const handleCustomDateChange = (setter, value) => {
        setActiveFilter('custom');
        setter(value);
    };

    const handleEdit = (movimiento) => {
        setMovimientoAEditar(movimiento);
        setIsModalOpen(true);
    };

    const promptDelete = (id, tipo) => {
        setItemToDelete({ id, tipo });
    };

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
            setItemToDelete(null);
        }
    };

    // --- LÓGICA DE FILTRADO LOCAL (SEARCH BAR) ---
    const getFilteredData = () => {
        const data = movimientos[activeTab] || [];
        if (!searchTerm) return data;
        
        const searchLower = searchTerm.toLowerCase();
        return data.filter(mov => {
            const cuentaMatch = (mov.cuenta || 'Sin Asignar N/A').toLowerCase();
            const origenMatch = (mov.origen || 'Sin Asignar N/A').toLowerCase();
            const metodoMatch = (mov.metodo_pago || 'Sin Asignar N/A').toLowerCase();
            const detalleMatch = (mov.detalle || '').toLowerCase();
            const registradorMatch = (mov.registrador || '').toLowerCase();
            
            return (
                detalleMatch.includes(searchLower) ||
                cuentaMatch.includes(searchLower) ||
                origenMatch.includes(searchLower) ||
                metodoMatch.includes(searchLower) ||
                registradorMatch.includes(searchLower)
            );
        });
    };

    const activeData = getFilteredData();
    const totalItems = activeData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = activeData.slice(startIndex, startIndex + itemsPerPage);

    const handleExportExcel = () => {
        if (activeData.length === 0) return alert('No hay datos en este período para exportar.');

        let csvContent = '\uFEFF';
        const headers = activeTab === 'ingresos'
            ? ['Fecha', 'Cliente', 'Cuenta Destino', 'Forma de Cobro', 'Monto', 'Fecha de Registro', 'Cargado por']
            : ['Fecha', 'Detalle', 'Categoría (Origen)', 'Método de Pago', 'Monto', 'Fecha de Registro', 'Cargado por'];

        csvContent += headers.join(';') + '\n';

        activeData.forEach(mov => {
            const d = new Date(mov.fecha);
            d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
            const fechaLimpia = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const fechaRegistroLimpia = mov.fecha_registro ? new Date(mov.fecha_registro).toLocaleString('es-AR') : '';
            const montoFormateado = String(mov.monto).replace('.', ',');

            const row = [
                fechaLimpia,
                activeTab === 'ingresos' ? mov.detalle : mov.detalle,
                activeTab === 'ingresos' ? (mov.cuenta || '') : (mov.origen || ''),
                mov.metodo_pago || '',
                montoFormateado,
                fechaRegistroLimpia,
                mov.registrador || ''
            ];

            const cleanRow = row.map(item => `"${String(item).replace(/"/g, '""')}"`);
            csvContent += cleanRow.join(';') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte_${activeTab}_${desde}_al_${hasta}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background-light dark:bg-background-dark relative">

            {showDeleteSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 md:gap-3 bg-emerald-500 text-white px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-2xl shadow-2xl shadow-emerald-500/30 transform transition-all animate-bounce text-sm md:text-base">
                    <span className="material-symbols-outlined text-2xl md:text-3xl">delete_sweep</span>
                    <span className="font-bold tracking-wide">¡Registro eliminado correctamente!</span>
                </div>
            )}

            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setItemToDelete(null)}></div>
                    <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1a2634] rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 flex flex-col items-center text-center animate-fade-in">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-inner">
                            <span className="material-symbols-outlined text-[32px] md:text-[40px]">warning</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">¿Eliminar registro?</h3>
                        <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 font-medium">Esta acción es permanente y no podrás recuperar los datos.</p>

                        <div className="flex gap-3 md:gap-4 w-full">
                            <button onClick={() => setItemToDelete(null)} disabled={isDeleting} className="flex-1 py-2.5 md:py-3 px-4 rounded-xl md:rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 text-sm md:text-base">
                                Cancelar
                            </button>
                            <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-2.5 md:py-3 px-4 rounded-xl md:rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm md:text-base">
                                {isDeleting ? <><span className="material-symbols-outlined animate-spin text-[20px]">sync</span> Borrando...</> : 'Sí, Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto flex flex-col gap-6">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Historial de Transacciones</h2>
                        <p className="text-slate-500 mt-1 text-sm md:text-base">Listado detallado de todos los movimientos</p>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/movimientos')} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        <span>Nueva Transacción</span>
                    </button>
                </div>

                {/* Filtros de Fecha */}
                <div className="bg-white dark:bg-slate-900 p-2 md:p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-center justify-between gap-4">
                    
                    <div className="flex flex-wrap w-full xl:w-auto bg-slate-100 p-1 md:p-1.5 rounded-xl">
                        {['hoy', 'semana', 'mes', 'todo'].map((filter) => (
                            <button 
                                key={filter}
                                onClick={() => handleQuickFilter(filter)}
                                className={`flex-1 xl:flex-none px-2 sm:px-4 md:px-5 py-2 rounded-lg text-xs md:text-sm font-bold capitalize transition-all ${activeFilter === filter ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {filter === 'hoy' ? 'Hoy' : filter === 'semana' ? 'Esta Semana' : filter === 'mes' ? 'Este Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-4 w-full xl:w-auto px-2">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">Desde</span>
                            <input type="date" value={desde} onChange={(e) => handleCustomDateChange(setDesde, e.target.value)} className="flex-1 sm:flex-none px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 bg-white text-slate-700 font-medium" />
                        </div>
                        <div className="hidden sm:block text-slate-300">-</div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">Hasta</span>
                            <input type="date" value={hasta} onChange={(e) => handleCustomDateChange(setHasta, e.target.value)} className="flex-1 sm:flex-none px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 bg-white text-slate-700 font-medium" />
                        </div>
                    </div>
                </div>

                {/* Contenedor: Pestañas + BUSCADOR + Exportar */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        {/* Pestañas de Navegación */}
                        <div className="flex w-full sm:w-auto bg-slate-100 p-1 md:p-1.5 rounded-xl">
                            <button 
                                onClick={() => { setActiveTab('ingresos'); setSearchTerm(''); }} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-6 py-2 md:py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'ingresos' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_downward</span> Ingresos
                            </button>
                            <button 
                                onClick={() => { setActiveTab('egresos'); setSearchTerm(''); }} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-6 py-2 md:py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'egresos' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_upward</span> Egresos
                            </button>
                        </div>

                        {/* NUEVO: Barra de Búsqueda */}
                        <div className="relative w-full sm:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                            <input 
                                type="text" 
                                placeholder={`Buscar en ${activeTab}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 bg-white text-slate-700 font-medium shadow-sm transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <button onClick={handleExportExcel} className={`w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 text-sm md:text-base ${activeTab === 'ingresos' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}>
                        <span className="material-symbols-outlined">download</span>
                        Exportar a Excel
                    </button>
                </div>

                <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="py-3 md:py-4 pl-6 md:pl-8 pr-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    {activeTab === 'ingresos' ? (
                                        <>
                                            <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                            <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Cuenta Destino</th>
                                            <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Forma de Cobro</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Detalle</th>
                                            <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                                            <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Método de Pago</th>
                                        </>
                                    )}
                                    <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                                    <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Fecha Registro</th>
                                    <th className="py-3 md:py-4 px-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Cargado por</th>
                                    <th className="py-3 md:py-4 pr-6 md:pr-8 pl-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider text-center w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm md:text-base">
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center py-8 md:py-12 text-slate-500 text-sm md:text-lg">Cargando datos...</td></tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 md:py-12 text-slate-500 text-sm md:text-lg bg-slate-50/50 font-medium">
                                            {searchTerm ? 'No se encontraron resultados para la búsqueda.' : `No hay ${activeTab} registrados en este período.`}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((mov) => (
                                        <tr key={`${activeTab}-${mov.id}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-3 md:py-4 pl-6 md:pl-8 pr-4 text-slate-500 font-medium whitespace-nowrap">{formatDate(mov.fecha)}</td>

                                            {activeTab === 'ingresos' ? (
                                                <>
                                                    <td className="py-3 md:py-4 px-4 font-bold text-slate-900">{mov.detalle}</td>
                                                    <td className="py-3 md:py-4 px-4 text-slate-600">{mov.cuenta || 'N/A'}</td>
                                                    <td className="py-3 md:py-4 px-4 text-slate-600">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-3 md:py-4 px-4 font-bold text-slate-900">{mov.detalle}</td>
                                                    <td className="py-3 md:py-4 px-4 text-slate-600">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md md:rounded-lg text-xs md:text-sm font-bold bg-purple-50 text-purple-700">{mov.origen || 'N/A'}</span>
                                                    </td>
                                                    <td className="py-3 md:py-4 px-4 text-slate-600">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            )}

                                            <td className={`py-3 md:py-4 px-4 text-right font-extrabold whitespace-nowrap text-base md:text-lg ${activeTab === 'ingresos' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {activeTab === 'ingresos' ? '+' : '-'}{formatCurrency(mov.monto)}
                                            </td>
                                            <td className="py-3 md:py-4 px-4 text-slate-400 text-xs font-medium whitespace-nowrap">
                                                {formatDateTime(mov.fecha_registro)}
                                            </td>
                                            <td className="py-3 md:py-4 px-4 text-slate-600 font-bold text-xs md:text-sm whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] uppercase">
                                                        {mov.registrador ? mov.registrador.charAt(0) : '?'}
                                                    </span>
                                                    {mov.registrador || 'Desconocido'}
                                                </div>
                                            </td>
                                            <td className="py-3 md:py-4 pr-6 md:pr-8 pl-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(mov)} className="p-1.5 md:p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg md:rounded-xl transition-colors" title="Editar">
                                                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">edit</span>
                                                    </button>
                                                    <button onClick={() => promptDelete(mov.id, activeTab)} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors" title="Eliminar">
                                                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!loading && totalItems > 0 && (
                        <div className="px-6 md:px-8 py-4 md:py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-600 font-medium">
                                <span>Mostrar</span>
                                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-slate-200 rounded-md md:rounded-lg bg-white text-slate-900 py-1 md:py-1.5 px-2 md:px-3 outline-none cursor-pointer">
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                                </select>
                                <span>filas</span>
                            </div>
                            <div className="flex items-center gap-3 md:gap-4">
                                <span className="text-xs md:text-sm font-medium text-slate-500">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}</span>
                                <div className="flex items-center gap-1 md:gap-1.5">
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-slate-200 bg-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[18px] md:text-[20px]">chevron_left</span></button>
                                    <div className="px-2 md:px-3 font-bold text-slate-700 text-xs md:text-sm">Pág. {currentPage} / {totalPages}</div>
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-slate-200 bg-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[18px] md:text-[20px]">chevron_right</span></button>
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