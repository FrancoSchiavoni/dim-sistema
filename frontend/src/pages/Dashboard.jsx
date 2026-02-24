import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// Utilidad para obtener fechas en formato YYYY-MM-DD sin problemas de zona horaria local
const formatDateObj = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Dashboard() {
    const navigate = useNavigate(); // <-- Agregamos el hook de navegación
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('mes'); // hoy, semana, mes, todo, custom
    
    const [desde, setDesde] = useState(() => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [hasta, setHasta] = useState(() => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const [metrics, setMetrics] = useState({
        ingresosCuenta: [], ingresosMetodo: [], egresosOrigen: [], egresosMetodo: []
    });

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/transacciones/dashboard?desde=${desde}&hasta=${hasta}`);
            setMetrics({
                ingresosCuenta: data.ingresosCuenta || [],
                ingresosMetodo: data.ingresosMetodo || [],
                egresosOrigen: data.egresosOrigen || [],
                egresosMetodo: data.egresosMetodo || []
            });
        } catch (error) {
            console.error("Error cargando métricas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [desde, hasta]);

    const handleQuickFilter = (type) => {
        const today = new Date();
        setActiveFilter(type);
        
        if (type === 'hoy') {
            const todayStr = formatDateObj(today);
            setDesde(todayStr);
            setHasta(todayStr);
        } else if (type === 'semana') {
            const day = today.getDay() || 7; // Domingo es 7
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

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    const MetricList = ({ title, data = [], icon, isIncome }) => (
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl transition-colors ${isIncome ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">{icon}</span>
                </div>
                <h4 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h4>
            </div>
            
            <div className="overflow-y-auto max-h-[180px] md:max-h-[220px] pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                {loading ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Cargando datos...</p>
                ) : data.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center mt-2">
                        Sin movimientos
                    </p>
                ) : (
                    <div className="space-y-3">
                        {data.map((item, index) => (
                            <div key={index} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate pr-2">{item.label}</span>
                                <span className={`font-bold text-sm whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                    {formatCurrency(item.total)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="pt-3 mt-3 flex justify-between items-center border-t-2 border-slate-50 dark:border-slate-800">
                <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Total:</span>
                <span className={`font-black text-lg ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(data.reduce((acc, cur) => acc + Number(cur.total), 0))}
                </span>
            </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Panel Resumen</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">Vista general del rendimiento financiero</p>
                    </div>
                    
                    {/* Botón modificado para redirigir en lugar de abrir el modal */}
                    <button 
                        onClick={() => navigate('/movimientos')} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        <span>Nueva Transacción</span>
                    </button>
                </div>

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pt-2">
                    
                    <div className="flex flex-col gap-4 md:gap-5 bg-emerald-50/50 p-4 md:p-6 rounded-3xl border border-emerald-100/50">
                        <div className="flex items-center gap-2 md:gap-3 px-1">
                            <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">arrow_downward</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-extrabold text-emerald-900 tracking-tight">Ingresos Generados</h3>
                        </div>
                        <MetricList title="Ingresos por Cuenta" data={metrics.ingresosCuenta} icon="account_balance" isIncome={true} />
                        <MetricList title="Ingresos por Forma de Pago" data={metrics.ingresosMetodo} icon="payments" isIncome={true} />
                    </div>

                    <div className="flex flex-col gap-4 md:gap-5 bg-rose-50/50 p-4 md:p-6 rounded-3xl border border-rose-100/50">
                        <div className="flex items-center gap-2 md:gap-3 px-1">
                            <div className="bg-rose-100 text-rose-600 p-1.5 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">arrow_upward</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-extrabold text-rose-900 tracking-tight">Egresos y Gastos</h3>
                        </div>
                        <MetricList title="Egresos por Categoría" data={metrics.egresosOrigen} icon="category" isIncome={false} />
                        <MetricList title="Egresos por Forma de Pago" data={metrics.egresosMetodo} icon="credit_card" isIncome={false} />
                    </div>

                </div>

            </div>
        </div>
    );
}