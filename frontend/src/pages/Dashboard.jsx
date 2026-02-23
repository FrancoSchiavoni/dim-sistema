import { useState, useEffect } from 'react';
import MovimientoModal from '../components/MovimientoModal';
import { api } from '../services/api';

export default function Dashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Fechas por defecto
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

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    // Sub-componente Escalado (Más grande y espacioso)
    const MetricList = ({ title, data = [], icon, isIncome }) => (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-8">
                <div className={`p-3 rounded-2xl ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
            </div>
            
            {loading ? (
                <p className="text-base text-slate-500 flex-1">Cargando datos...</p>
            ) : data.length === 0 ? (
                <p className="text-base text-slate-500 flex-1 flex items-center justify-center text-center bg-slate-50 rounded-xl p-6">
                    No hay movimientos registrados en este período.
                </p>
            ) : (
                <div className="space-y-6 flex-1 flex flex-col">
                    <div className="flex-1 space-y-4">
                        {data.map((item, index) => (
                            <div key={index} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
                                <span className="text-base font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                                <span className={`font-bold text-lg ${isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                    {formatCurrency(item.total)}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Total super destacado */}
                    <div className="pt-5 mt-auto flex justify-between items-center border-t-2 border-slate-100 dark:border-slate-800">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Total:</span>
                        <span className="font-black text-2xl text-primary">
                            {formatCurrency(data.reduce((acc, cur) => acc + cur.total, 0))}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-10">
            {/* Contenedor más ancho (max-w-[100rem]) */}
            <div className="max-w-[100rem] mx-auto space-y-10">
                
                {/* Cabecera Principal + BOTÓN GIGANTE */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Panel Resumen</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Indicadores por cuenta y forma de pago</p>
                    </div>
                    
                    {/* Botón Destacado */}
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[28px]">add_circle</span>
                        <span>Registrar Nueva Transacción</span>
                    </button>
                </div>

                {/* Barra de Filtros Separada */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-base text-slate-500 font-semibold">Desde:</span>
                        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-base focus:ring-2 focus:ring-primary/50 bg-slate-50 dark:bg-slate-800 dark:text-white w-full sm:w-auto" />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-base text-slate-500 font-semibold">Hasta:</span>
                        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-base focus:ring-2 focus:ring-primary/50 bg-slate-50 dark:bg-slate-800 dark:text-white w-full sm:w-auto" />
                    </div>
                </div>

                {/* Grid de Métricas Expandido */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <MetricList title="Ingresos por Cuenta" data={metrics.ingresosCuenta} icon="account_balance" isIncome={true} />
                    <MetricList title="Ingresos por Forma de Pago" data={metrics.ingresosMetodo} icon="payments" isIncome={true} />
                    <MetricList title="Egresos por Origen" data={metrics.egresosOrigen} icon="category" isIncome={false} />
                    <MetricList title="Egresos por Forma de Pago" data={metrics.egresosMetodo} icon="credit_card" isIncome={false} />
                </div>

            </div>

            <MovimientoModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSaved={fetchMetrics}
            />
        </div>
    );
}