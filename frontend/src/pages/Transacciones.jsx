import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import MovimientoModal from '../components/MovimientoModal';
import toast from 'react-hot-toast';

const formatDateObj = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Transacciones() {
    const navigate = useNavigate();
    const location = useLocation();

    const [movimientos, setMovimientos] = useState({ ingresos: [], egresos: [] });
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'ingresos');
    const [activeFilter, setActiveFilter] = useState('mes');
    const [searchTerm, setSearchTerm] = useState(location.state?.filterText || '');

    // NUEVO ESTADO: Controla la columna ordenada y la dirección (ascendente/descendente)
    const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

    const [desde, setDesde] = useState(() => {
        if (location.state?.desde) return location.state.desde;
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [hasta, setHasta] = useState(() => {
        if (location.state?.hasta) return location.state.hasta;
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

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
            toast.error('Error cargando transacciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMovimientos(); }, [desde, hasta]);
    useEffect(() => { setCurrentPage(1); }, [activeTab, itemsPerPage, searchTerm]);

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
            toast.success('¡Registro eliminado!');
            fetchMovimientos();
        } catch (error) {
            toast.error('Error al eliminar: ' + error.message);
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    // LÓGICA DE ORDENAMIENTO (Al hacer clic en una columna)
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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

    // Aplicamos el filtro y LUEGO el ordenamiento
    const activeData = getFilteredData().sort((a, b) => {
        if (!sortConfig.key) return 0;
        
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Reglas específicas según el tipo de dato
        if (sortConfig.key === 'monto') {
            aValue = Number(aValue || 0);
            bValue = Number(bValue || 0);
        } else if (sortConfig.key === 'fecha' || sortConfig.key === 'fecha_registro') {
            aValue = new Date(aValue || 0).getTime();
            bValue = new Date(bValue || 0).getTime();
        } else {
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalItems = activeData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = activeData.slice(startIndex, startIndex + itemsPerPage);

    const handleExportExcel = () => {
        if (activeData.length === 0) return toast.error('No hay datos en este período para exportar.');
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
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // COMPONENTE VISUAL PARA LOS ENCABEZADOS ORDENABLES
    const SortableHeader = ({ label, columnKey, align = 'left' }) => (
        <th 
            onClick={() => handleSort(columnKey)}
            className={`py-2.5 px-4 text-[11px] font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 transition-colors group select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {label}
                <span className={`material-symbols-outlined text-[14px] transition-all ${sortConfig.key === columnKey ? 'text-primary opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                    {sortConfig.key === columnKey ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert'}
                </span>
            </div>
        </th>
    );

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-5 bg-background-light dark:bg-background-dark relative">

            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setItemToDelete(null)}></div>
                    <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1a2634] rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col items-center text-center animate-fade-in">
                        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                            <span className="material-symbols-outlined text-[28px]">warning</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-2">¿Eliminar registro?</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Esta acción es permanente.</p>

                        <div className="flex gap-3 w-full">
                            <button onClick={() => setItemToDelete(null)} disabled={isDeleting} className="flex-1 py-2 px-4 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 text-xs md:text-sm">
                                Cancelar
                            </button>
                            <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-2 px-4 rounded-lg font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs md:text-sm">
                                {isDeleting ? <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Borrando...</> : 'Sí, Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto flex flex-col gap-4">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Historial de Transacciones</h2>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/movimientos')} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-700 text-white px-4 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">add_circle</span>
                        <span>Nueva Transacción</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap w-full xl:w-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {['hoy', 'semana', 'mes', 'todo'].map((filter) => (
                            <button 
                                key={filter}
                                onClick={() => handleQuickFilter(filter)}
                                className={`flex-1 xl:flex-none px-3 py-1.5 rounded-md text-[11px] md:text-xs font-extrabold capitalize transition-all ${activeFilter === filter ? 'bg-white shadow-sm text-primary ring-1 ring-slate-300' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                            >
                                {filter === 'hoy' ? 'Hoy' : filter === 'semana' ? 'Esta Semana' : filter === 'mes' ? 'Este Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto px-1">
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Desde</span>
                            <input type="date" value={desde} onChange={(e) => handleCustomDateChange(setDesde, e.target.value)} className="w-full sm:w-auto px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold focus:ring-2 focus:ring-primary/50 bg-white text-slate-800 shadow-sm" />
                        </div>
                        <div className="hidden sm:block text-slate-400 text-xs font-bold">-</div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Hasta</span>
                            <input type="date" value={hasta} onChange={(e) => handleCustomDateChange(setHasta, e.target.value)} className="w-full sm:w-auto px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold focus:ring-2 focus:ring-primary/50 bg-white text-slate-800 shadow-sm" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="flex w-full sm:w-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button 
                                onClick={() => { setActiveTab('ingresos'); setSearchTerm(''); }} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-1.5 text-[11px] md:text-xs font-bold rounded-md transition-all ${activeTab === 'ingresos' ? 'bg-white shadow-sm text-emerald-700 ring-1 ring-emerald-200' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">arrow_downward</span> Ingresos
                            </button>
                            <button 
                                onClick={() => { setActiveTab('egresos'); setSearchTerm(''); }} 
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-1.5 text-[11px] md:text-xs font-bold rounded-md transition-all ${activeTab === 'egresos' ? 'bg-white shadow-sm text-rose-700 ring-1 ring-rose-200' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span> Egresos
                            </button>
                        </div>

                        <div className="relative w-full sm:w-56">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">search</span>
                            <input 
                                type="text" 
                                placeholder={`Buscar...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-8 py-2 md:py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 bg-white text-slate-800 font-medium shadow-sm transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <button onClick={handleExportExcel} className={`w-full lg:w-auto flex items-center justify-center gap-1.5 px-4 py-2 md:py-1.5 rounded-lg font-bold text-white shadow-sm transition-all active:scale-95 text-xs md:text-sm ${activeTab === 'ingresos' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Exportar Excel
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    
                    {/* ===== VISTA MÓVIL (TARJETAS) ===== */}
                    <div className="md:hidden flex flex-col divide-y divide-slate-100">
                        {loading ? (
                            <div className="text-center py-8 text-slate-500 text-sm font-medium">Cargando datos...</div>
                        ) : paginatedData.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm font-medium bg-slate-50">
                                {searchTerm ? 'No se encontraron resultados.' : `No hay ${activeTab}.`}
                            </div>
                        ) : (
                            paginatedData.map((mov) => (
                                <div key={`${activeTab}-${mov.id}`} className="p-3.5 flex flex-col gap-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                                    <div className="flex justify-between items-start text-[10px] text-slate-500 font-bold tracking-wide uppercase">
                                        <div className="flex flex-col">
                                            <span>{formatDate(mov.fecha)}</span>
                                            <span className="text-[9px] text-slate-400 font-medium normal-case mt-0.5">Reg: {formatDateTime(mov.fecha_registro)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[8px] font-black">
                                                {mov.registrador ? mov.registrador.charAt(0) : '?'}
                                            </span>
                                            <span className="truncate max-w-[80px]">{mov.registrador || 'Desc.'}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="font-black text-slate-800 text-sm leading-tight flex-1">
                                            {mov.detalle}
                                        </span>
                                        <span className={`font-black text-sm whitespace-nowrap ${activeTab === 'ingresos' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {activeTab === 'ingresos' ? '+' : '-'}{formatCurrency(mov.monto)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-end mt-1">
                                        <div className="flex flex-wrap gap-1.5">
                                            {activeTab === 'ingresos' ? (
                                                <>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{mov.cuenta || 'N/A'}</span>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{mov.metodo_pago || 'N/A'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100">{mov.origen || 'N/A'}</span>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{mov.metodo_pago || 'N/A'}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleEdit(mov)} className="p-1.5 text-slate-500 hover:text-primary bg-slate-100 hover:bg-blue-50 rounded-md transition-colors shadow-sm border border-slate-200" title="Editar">
                                                <span className="material-symbols-outlined text-[16px] block">edit</span>
                                            </button>
                                            <button onClick={() => promptDelete(mov.id, activeTab)} className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-md transition-colors shadow-sm border border-slate-200" title="Eliminar">
                                                <span className="material-symbols-outlined text-[16px] block">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ===== VISTA ESCRITORIO (TABLA) ===== */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <SortableHeader label="Fecha" columnKey="fecha" />
                                    {activeTab === 'ingresos' ? (
                                        <>
                                            <SortableHeader label="Cliente" columnKey="detalle" />
                                            <SortableHeader label="Destino" columnKey="cuenta" />
                                            <SortableHeader label="Medio" columnKey="metodo_pago" />
                                        </>
                                    ) : (
                                        <>
                                            <SortableHeader label="Detalle" columnKey="detalle" />
                                            <SortableHeader label="Categoría" columnKey="origen" />
                                            <SortableHeader label="Medio" columnKey="metodo_pago" />
                                        </>
                                    )}
                                    <SortableHeader label="Monto" columnKey="monto" align="right" />
                                    <SortableHeader label="Registro" columnKey="fecha_registro" />
                                    <SortableHeader label="Usuario" columnKey="registrador" />
                                    <th className="py-2.5 px-4 text-[11px] font-black text-slate-600 uppercase tracking-wider text-center w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center py-6 text-slate-500 text-sm font-medium">Cargando datos...</td></tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-6 text-slate-500 text-sm bg-slate-50/50 font-medium">
                                            {searchTerm ? 'No se encontraron resultados.' : `No hay ${activeTab}.`}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((mov) => (
                                        <tr key={`${activeTab}-${mov.id}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-2 px-4 text-slate-600 font-bold whitespace-nowrap text-xs">{formatDate(mov.fecha)}</td>

                                            {activeTab === 'ingresos' ? (
                                                <>
                                                    <td className="py-2 px-4 font-bold text-slate-800 max-w-[180px] truncate">{mov.detalle}</td>
                                                    <td className="py-2 px-4 text-slate-600 truncate text-xs font-medium">{mov.cuenta || 'N/A'}</td>
                                                    <td className="py-2 px-4 text-slate-600 truncate text-xs font-medium">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-2 px-4 font-bold text-slate-800 max-w-[180px] truncate">{mov.detalle}</td>
                                                    <td className="py-2 px-4 text-slate-600 truncate">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100">{mov.origen || 'N/A'}</span>
                                                    </td>
                                                    <td className="py-2 px-4 text-slate-600 truncate text-xs font-medium">{mov.metodo_pago || 'N/A'}</td>
                                                </>
                                            )}

                                            <td className={`py-2 px-4 text-right font-black whitespace-nowrap ${activeTab === 'ingresos' ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                {activeTab === 'ingresos' ? '+' : '-'}{formatCurrency(mov.monto)}
                                            </td>
                                            
                                            <td className="py-2 px-4 text-slate-400 font-medium text-[10px] whitespace-nowrap">
                                                {formatDateTime(mov.fecha_registro)}
                                            </td>
                                            
                                            <td className="py-2 px-4 text-slate-600 font-bold text-[11px] whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] uppercase border border-slate-300">
                                                        {mov.registrador ? mov.registrador.charAt(0) : '?'}
                                                    </span>
                                                    <span className="truncate max-w-[80px]">{mov.registrador || 'Desc.'}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(mov)} className="p-1.5 text-slate-500 hover:text-primary bg-white hover:bg-blue-50 border border-slate-200 rounded-md transition-colors shadow-sm" title="Editar">
                                                        <span className="material-symbols-outlined text-[14px] block">edit</span>
                                                    </button>
                                                    <button onClick={() => promptDelete(mov.id, activeTab)} className="p-1.5 text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-md transition-colors shadow-sm" title="Eliminar">
                                                        <span className="material-symbols-outlined text-[14px] block">delete</span>
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
                        <div className="px-4 py-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
                            <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-700 font-bold">
                                <span>Mostrar</span>
                                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-slate-300 rounded-md bg-white text-slate-900 py-0.5 px-1 outline-none cursor-pointer focus:ring-2 focus:ring-primary/50 shadow-sm">
                                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                                </select>
                                <span>filas</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-50 shadow-sm"><span className="material-symbols-outlined text-[16px] block">chevron_left</span></button>
                                    <div className="px-1.5 font-black text-slate-800 text-[11px] md:text-xs">Pág. {currentPage} / {totalPages}</div>
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-50 shadow-sm"><span className="material-symbols-outlined text-[16px] block">chevron_right</span></button>
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