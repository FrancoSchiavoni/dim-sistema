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

// 1. Paletas de colores oscurecidas (Tonos más corporativos y profundos)
const INCOME_COLORS = ['#047857', '#059669', '#0f766e', '#115e59', '#064e3b'];
const EXPENSE_COLORS = ['#be123c', '#e11d48', '#9f1239', '#881337', '#7f1d1d'];

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('mes');
    
    // 2. NUEVO: Estados para controlar qué datos muestra el gráfico
    const [activeIncomeChart, setActiveIncomeChart] = useState('cuenta'); // 'cuenta' | 'metodo'
    const [activeExpenseChart, setActiveExpenseChart] = useState('origen'); // 'origen' | 'metodo'

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

    // Componente de Gráfico con Tooltip oscuro y porcentaje
    const DonutChart = ({ data, colors }) => {
        if (!data || data.length === 0) return null;
        
        const grandTotal = data.reduce((acc, cur) => acc + Number(cur.total), 0);
        const chartData = data.map(item => ({
            name: item.label,
            value: Number(item.total)
        })).sort((a, b) => b.value - a.value);

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
                                border: '1px solid #94a3b8', // Borde más oscuro
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                backgroundColor: '#1e293b', // Fondo casi negro para el tooltip
                                color: '#f8fafc'
                            }}
                            itemStyle={{ color: '#f1f5f9' }}
                            labelStyle={{ color: '#cbd5e1', fontWeight: '600', marginBottom: '4px' }}
                        />
                        <Legend 
                            verticalAlign="middle" 
                            align="right"
                            layout="vertical"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', fontWeight: '700', color: '#334155', lineHeight: '16px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // 3. Tarjetas Interactivas rediseñadas
    const MetricList = ({ title, data = [], icon, isIncome, isActiveChart, onMakeActive }) => (
        <div className={`bg-white dark:bg-slate-900 p-2 md:p-3 rounded-xl shadow-sm flex flex-col h-full transition-all duration-300 ${isActiveChart ? (isIncome ? 'ring-2 ring-emerald-600 border-transparent shadow-md' : 'ring-2 ring-rose-600 border-transparent shadow-md') : 'border border-slate-300 dark:border-slate-700 hover:border-slate-400'}`}>
            
            {/* Encabezado Clickeable para cambiar el gráfico */}
            <div 
                onClick={onMakeActive}
                className="flex items-center justify-between mb-2 cursor-pointer group/header"
                title="Hacer clic para ver en el gráfico"
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-md transition-colors ${isActiveChart ? (isIncome ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : (isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}`}>
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </div>
                    <h4 className={`text-xs font-extrabold transition-colors ${isActiveChart ? 'text-slate-900' : 'text-slate-600 group-hover/header:text-slate-900'}`}>{title}</h4>
                </div>
                {!isActiveChart && (
                    <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover/header:text-slate-500 transition-colors">pie_chart</span>
                )}
            </div>
            
            <div className="overflow-y-auto overflow-x-hidden max-h-[110px] xl:max-h-[130px] flex-1 scrollbar-thin scrollbar-thumb-slate-300 pr-1">
                {loading ? (
                    <p className="text-[10px] text-slate-500 py-2 text-center font-medium">Cargando...</p>
                ) : data.length === 0 ? (
                    <p className="text-[10px] text-slate-500 bg-slate-100 rounded-md p-1.5 text-center mt-1 font-medium border border-slate-200">
                        Sin movimientos
                    </p>
                ) : (
                    <div className="space-y-0.5">
                        {data.map((item, index) => (
                            <div 
                                key={index} 
                                onClick={() => handleRowClick(item.label, isIncome)}
                                className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 py-1.5 px-1.5 last:border-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                title="Ver en transacciones"
                            >
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{item.label}</span>
                                <span className={`font-black text-[11px] whitespace-nowrap ${isIncome ? 'text-emerald-700' : 'text-slate-900 dark:text-white'}`}>
                                    {formatCurrency(item.total)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="pt-2 mt-1.5 flex justify-between items-center border-t-2 border-slate-200 dark:border-slate-700 px-1.5">
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-wide">Total:</span>
                <span className={`font-black text-xs ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(data.reduce((acc, cur) => acc + Number(cur.total), 0))}
                </span>
            </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-background-dark p-3 md:p-4 lg:p-5">
            <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Panel Resumen</h2>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/movimientos')} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Nueva Transacción</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap w-full md:w-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {['hoy', 'semana', 'mes', 'todo'].map((filter) => (
                            <button 
                                key={filter}
                                onClick={() => handleQuickFilter(filter)}
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-[11px] md:text-xs font-extrabold capitalize transition-all ${activeFilter === filter ? 'bg-white shadow-sm text-primary ring-1 ring-slate-300' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                            >
                                {filter === 'hoy' ? 'Hoy' : filter === 'semana' ? 'Esta Semana' : filter === 'mes' ? 'Este Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto px-1">
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Desde</span>
                            <input type="date" value={desde} onChange={(e) => handleCustomDateChange(setDesde, e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md text-xs font-bold focus:ring-2 focus:ring-primary/50 bg-white text-slate-800 shadow-sm" />
                        </div>
                        <div className="hidden sm:block text-slate-400 text-xs font-bold">-</div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Hasta</span>
                            <input type="date" value={hasta} onChange={(e) => handleCustomDateChange(setHasta, e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md text-xs font-bold focus:ring-2 focus:ring-primary/50 bg-white text-slate-800 shadow-sm" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                    
                    {/* COLUMNA INGRESOS */}
                    <div className="flex flex-col gap-2 bg-emerald-50/80 p-3 md:p-4 rounded-2xl border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-2 px-1 border-b border-emerald-100 pb-2">
                            <div className="bg-emerald-600 text-white p-1 rounded-md flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                            </div>
                            <h3 className="text-sm md:text-base font-black text-emerald-900 tracking-tight uppercase">Ingresos</h3>
                        </div>

                        {/* El gráfico dinámico de ingresos */}
                        <DonutChart 
                            data={activeIncomeChart === 'cuenta' ? metrics.ingresosCuenta : metrics.ingresosMetodo} 
                            colors={INCOME_COLORS} 
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            <MetricList 
                                title="Por Cuenta" 
                                data={metrics.ingresosCuenta} 
                                icon="account_balance" 
                                isIncome={true} 
                                isActiveChart={activeIncomeChart === 'cuenta'}
                                onMakeActive={() => setActiveIncomeChart('cuenta')}
                            />
                            <MetricList 
                                title="Por Forma de Pago" 
                                data={metrics.ingresosMetodo} 
                                icon="payments" 
                                isIncome={true} 
                                isActiveChart={activeIncomeChart === 'metodo'}
                                onMakeActive={() => setActiveIncomeChart('metodo')}
                            />
                        </div>
                    </div>

                    {/* COLUMNA EGRESOS */}
                    <div className="flex flex-col gap-2 bg-rose-50/80 p-3 md:p-4 rounded-2xl border border-rose-200 shadow-sm">
                        <div className="flex items-center gap-2 px-1 border-b border-rose-100 pb-2">
                            <div className="bg-rose-600 text-white p-1 rounded-md flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </div>
                            <h3 className="text-sm md:text-base font-black text-rose-900 tracking-tight uppercase">Egresos</h3>
                        </div>

                        {/* El gráfico dinámico de egresos */}
                        <DonutChart 
                            data={activeExpenseChart === 'origen' ? metrics.egresosOrigen : metrics.egresosMetodo} 
                            colors={EXPENSE_COLORS} 
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            <MetricList 
                                title="Por Categoría" 
                                data={metrics.egresosOrigen} 
                                icon="category" 
                                isIncome={false} 
                                isActiveChart={activeExpenseChart === 'origen'}
                                onMakeActive={() => setActiveExpenseChart('origen')}
                            />
                            <MetricList 
                                title="Por Forma de Pago" 
                                data={metrics.egresosMetodo} 
                                icon="credit_card" 
                                isIncome={false} 
                                isActiveChart={activeExpenseChart === 'metodo'}
                                onMakeActive={() => setActiveExpenseChart('metodo')}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}