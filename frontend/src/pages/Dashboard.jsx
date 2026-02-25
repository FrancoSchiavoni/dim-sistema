import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
// 1. Importamos Recharts
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const formatDateObj = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 2. Definimos las paletas de colores para los gráficos
const INCOME_COLORS = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857'];
const EXPENSE_COLORS = ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#be123c'];

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

    // 3. Componente interno del Gráfico de Dona
    const DonutChart = ({ data, colors }) => {
        if (!data || data.length === 0) return null;
        
        // Formateamos los datos para Recharts
        const chartData = data.map(item => ({
            name: item.label,
            value: Number(item.total)
        })).sort((a, b) => b.value - a.value);

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
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 'bold' }}
                            itemStyle={{ color: '#334155' }}
                        />
                        <Legend 
                            verticalAlign="middle" 
                            align="right"
                            layout="vertical"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: '600', color: '#64748b', lineHeight: '14px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Componente de las Listas Compactas
    const MetricList = ({ title, data = [], icon, isIncome }) => (
        <div className="bg-white dark:bg-slate-900 p-2 md:p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-1.5 mb-2">
                <div className={`p-1 rounded-md transition-colors ${isIncome ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h4>
            </div>
            
            <div className="overflow-y-auto overflow-x-hidden max-h-[110px] xl:max-h-[130px] flex-1 scrollbar-thin scrollbar-thumb-slate-200 pr-1">
                {loading ? (
                    <p className="text-[10px] text-slate-500 py-2 text-center">Cargando...</p>
                ) : data.length === 0 ? (
                    <p className="text-[10px] text-slate-500 bg-slate-50 rounded-md p-1.5 text-center mt-1">
                        Sin movimientos
                    </p>
                ) : (
                    <div className="space-y-0.5">
                        {data.map((item, index) => (
                            <div 
                                key={index} 
                                onClick={() => handleRowClick(item.label, isIncome)}
                                className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 py-1 px-1.5 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                                title="Ver detalle"
                            >
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate pr-2">{item.label}</span>
                                <span className={`font-bold text-[11px] whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                    {formatCurrency(item.total)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="pt-1.5 mt-1.5 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 px-1.5">
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Total:</span>
                <span className={`font-black text-xs ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(data.reduce((acc, cur) => acc + Number(cur.total), 0))}
                </span>
            </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-3 md:p-4 lg:p-5">
            <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Panel Resumen</h2>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/movimientos')} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Nueva Transacción</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap w-full md:w-auto bg-slate-100 p-1 rounded-lg">
                        {['hoy', 'semana', 'mes', 'todo'].map((filter) => (
                            <button 
                                key={filter}
                                onClick={() => handleQuickFilter(filter)}
                                className={`flex-1 md:flex-none px-3 py-1 rounded-md text-[11px] md:text-xs font-bold capitalize transition-all ${activeFilter === filter ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {filter === 'hoy' ? 'Hoy' : filter === 'semana' ? 'Esta Semana' : filter === 'mes' ? 'Este Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto px-1">
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Desde</span>
                            <input type="date" value={desde} onChange={(e) => handleCustomDateChange(setDesde, e.target.value)} className="px-2 py-1 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-primary/50 bg-white text-slate-700 font-medium" />
                        </div>
                        <div className="hidden sm:block text-slate-300 text-xs">-</div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Hasta</span>
                            <input type="date" value={hasta} onChange={(e) => handleCustomDateChange(setHasta, e.target.value)} className="px-2 py-1 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-primary/50 bg-white text-slate-700 font-medium" />
                        </div>
                    </div>
                </div>

                {/* MODIFICACIÓN PRINCIPAL: Columnas con Gráficos y Listas en Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* COLUMNA INGRESOS */}
                    <div className="flex flex-col gap-2 bg-emerald-50/50 p-3 md:p-4 rounded-2xl border border-emerald-100/50">
                        <div className="flex items-center gap-2 px-1">
                            <div className="bg-emerald-100 text-emerald-600 p-1 rounded-md flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                            </div>
                            <h3 className="text-sm md:text-base font-extrabold text-emerald-900 tracking-tight">Ingresos Generados</h3>
                        </div>

                        {/* Gráfico */}
                        <DonutChart data={metrics.ingresosCuenta} colors={INCOME_COLORS} />

                        {/* Listas lado a lado */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <MetricList title="Ingresos por Cuenta" data={metrics.ingresosCuenta} icon="account_balance" isIncome={true} />
                            <MetricList title="Ingresos por Forma de Pago" data={metrics.ingresosMetodo} icon="payments" isIncome={true} />
                        </div>
                    </div>

                    {/* COLUMNA EGRESOS */}
                    <div className="flex flex-col gap-2 bg-rose-50/50 p-3 md:p-4 rounded-2xl border border-rose-100/50">
                        <div className="flex items-center gap-2 px-1">
                            <div className="bg-rose-100 text-rose-600 p-1 rounded-md flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </div>
                            <h3 className="text-sm md:text-base font-extrabold text-rose-900 tracking-tight">Egresos y Gastos</h3>
                        </div>

                        {/* Gráfico */}
                        <DonutChart data={metrics.egresosOrigen} colors={EXPENSE_COLORS} />

                        {/* Listas lado a lado */}
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