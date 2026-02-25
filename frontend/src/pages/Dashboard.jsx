import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const formatDateObj = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Paletas de colores ligeramente más profundas y serias
const INCOME_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#065f46'];
const EXPENSE_COLORS = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#9f1239'];

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('mes');
    
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

    const handleRowClick = (label, isIncome) => {
        navigate('/transacciones', {
            state: {
                tab: isIncome ? 'ingresos' : 'egresos',
                filterText: label,
                desde: desde,
                hasta: hasta
            }
        });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    // Componente de Gráfico con Porcentajes en Tooltip
    const DonutChart = ({ data, colors }) => {
        if (!data || data.length === 0) return null;
        
        // Calcular el total absoluto para sacar los porcentajes
        const grandTotal = data.reduce((acc, cur) => acc + Number(cur.total), 0);

        const chartData = data.map(item => ({
            name: item.label,
            value: Number(item.total)
        })).sort((a, b) => b.value - a.value);

        // Formateador personalizado para el tooltip
        const tooltipFormatter = (value) => {
            const percent = grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : 0;
            return `${formatCurrency(value)} (${percent}%)`;
        };

        return (
            <div className="h-[140px] md:h-[160px] w-full mt-1 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={tooltipFormatter}
                            contentStyle={{ 
                                borderRadius: '8px', 
                                border: '1px solid #cbd5e1', // Borde más definido (slate-300)
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                                fontSize: '11px', 
                                fontWeight: 'bold',
                                backgroundColor: '#f8fafc' // Fondo ligeramente gris (slate-50)
                            }}
                            itemStyle={{ color: '#334155' }} // Texto oscuro (slate-700)
                            labelStyle={{ color: '#475569', fontWeight: '600' }} // Título oscuro (slate-600)
                        />
                        <Legend 
                            verticalAlign="middle" 
                            align="right"
                            layout="vertical"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: '600', color: '#475569', lineHeight: '14px' }} // Texto leyenda más oscuro
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Listas Compactas con colores más serios
    const MetricList = ({ title, data = [], icon, isIncome }) => (
        // Cambio de fondo a slate-50 y borde más oscuro slate-200
        <div className="bg-slate-50 dark:bg-slate-900 p-2 md:p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-1.5 mb-2">
                {/* Fondos de iconos más saturados */}
                <div className={`p-1 rounded-md transition-colors ${isIncome ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 group-hover:bg-rose-200'}`}>
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                </div>
                {/* Título más oscuro */}
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h4>
            </div>
            
            <div className="overflow-y-auto overflow-x-hidden max-h-[110px] xl:max-h-[130px] flex-1 scrollbar-thin scrollbar-thumb-slate-300 pr-1">
                {loading ? (
                    <p className="text-[10px] text-slate-600 py-2 text-center">Cargando...</p>
                ) : data.length === 0 ? (
                    // Fondo de estado vacío más oscuro
                    <p className="text-[10px] text-slate-600 bg-slate-100 rounded-md p-1.5 text-center mt-1">
                        Sin movimientos
                    </p>
                ) : (
                    <div className="space-y-0.5">
                        {data.map((item, index) => (
                            // Bordes de separación más oscuros (slate-200) y hover más notorio (slate-100)
                            <div 
                                key={index} 
                                onClick={() => handleRowClick(item.label, isIncome)}
                                className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 py-1 px-1.5 last:border-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                title="Ver detalle"
                            >
                                {/* Texto de items más oscuro */}
                                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate pr-2">{item.label}</span>
                                {/* Montos con colores más profundos */}
                                <span className={`font-bold text-[11px] whitespace-nowrap ${isIncome ? 'text-emerald-700' : 'text-slate-900 dark:text-white'}`}>
                                    {formatCurrency(item.total)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Borde superior del total más oscuro */}
            <div className="pt-1.5 mt-1.5 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 px-1.5">
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Total:</span>
                <span className={`font-black text-xs ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(data.reduce((acc, cur) => acc + Number(cur.total), 0))}
                </span>
            </div>
        </div>
    );

    return (
        // Fondo principal un poco más denso si se usa tailwind default (slate-100 en vez de 50)
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-background-dark p-3 md:p-4 lg:p-5">
            <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        {/* Título principal más oscuro */}
                        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Panel Resumen</h2>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/movimientos')} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Nueva Transacción</span>
                    </button>
                </div>

                {/* Contenedor de Filtros con bordes más definidos */}
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap w-full md:w-auto bg-slate-100 p-1 rounded-lg">
                        {['hoy', 'semana', 'mes', 'todo'].map((filter) => (
                            <button 
                                key={filter}
                                onClick={() => handleQuickFilter(filter)}
                                className={`flex-1 md:flex-none px-3 py-1 rounded-md text-[11px] md:text-xs font-bold capitalize transition-all ${activeFilter === filter ? 'bg-white shadow-sm text-primary ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                {filter === 'hoy' ? 'Hoy' : filter === 'semana' ? 'Esta Semana' : filter === 'mes' ? 'Este Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto px-1">
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Desde</span>
                            <input type="date" value={desde} onChange={(e) => handleCustomDateChange(setDesde, e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-primary/50 bg-white text-slate-700 font-medium" />
                        </div>
                        <div className="hidden sm:block text-slate-400 text-xs">-</div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Hasta</span>
                            <input type="date" value={hasta} onChange={(e) => handleCustomDateChange(setHasta, e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-primary/50 bg-white text-slate-700 font-medium" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* COLUMNA INGRESOS - Colores más serios */}
                    <div className="flex flex-col gap-2 bg-emerald-100/40 p-3 md:p-4 rounded-2xl border border-emerald-200/60">
                        <div className="flex items-center gap-2 px-1">
                            <div className="bg-emerald-200 text-emerald-800 p-1 rounded-md flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                            </div>
                            <h3 className="text-sm md:text-base font-extrabold text-emerald-900 tracking-tight">Ingresos Generados</h3>
                        </div>

                        <DonutChart data={metrics.ingresosCuenta} colors={INCOME_COLORS} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <MetricList title="Ingresos por Cuenta" data={metrics.ingresosCuenta} icon="account_balance" isIncome={true} />
                            <MetricList title="Ingresos por Forma de Pago" data={metrics.ingresosMetodo} icon="payments" isIncome={true} />
                        </div>
                    </div>

                    {/* COLUMNA EGRESOS - Colores más serios */}
                    <div className="flex flex-col gap-2 bg-rose-100/40 p-3 md:p-4 rounded-2xl border border-rose-200/60">
                        <div className="flex items-center gap-2 px-1">
                            <div className="bg-rose-200 text-rose-800 p-1 rounded-md flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </div>
                            <h3 className="text-sm md:text-base font-extrabold text-rose-900 tracking-tight">Egresos y Gastos</h3>
                        </div>

                        <DonutChart data={metrics.egresosOrigen} colors={EXPENSE_COLORS} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <MetricList title="Egresos por Categoría" data={metrics.egresosOrigen} icon="category" isIncome={false} />
                            <MetricList title="Egresos por Forma de Pago" data={metrics.egresosMetodo} icon="credit_card" isIncome={false} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}