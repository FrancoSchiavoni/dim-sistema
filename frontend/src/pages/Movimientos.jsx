import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Movimientos() {
    const [tipo, setTipo] = useState('ingreso');
    const [importe, setImporte] = useState('');
    const [fecha, setFecha] = useState(getTodayDate());
    const [loading, setLoading] = useState(false);
    const importeRef = useRef(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [catalogos, setCatalogos] = useState({ cuentas: [], origenes: [], metodosPago: [] });

    const [cliente, setCliente] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [detalle, setDetalle] = useState('');
    const [origenId, setOrigenId] = useState('');
    const [metodoPagoId, setMetodoPagoId] = useState('');

    useEffect(() => {
        api.get('/transacciones/catalogos')
            .then(data => setCatalogos(data))
            .catch(err => console.error('Error cargando catálogos:', err));
    }, []);

    const resetForm = () => {
        setTipo('ingreso'); setImporte(''); setFecha(getTodayDate());
        setCliente(''); setCuentaId(''); setDetalle(''); setOrigenId(''); setMetodoPagoId('');
    };

    const parseCurrencyToNumber = (str) => {
        if (str === null || str === undefined || str === '') return NaN;
        if (typeof str === 'number') return str;
        const normalized = String(str).replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(normalized);
    };

    const handleImporteChange = (e) => {
        const raw = e.target.value;
        // Extract pure input: keep only digits and comma (comma is decimal separator)
        const digitsOnly = raw.replace(/[^0-9,]/g, '');
        const hasDecimal = digitsOnly.includes(',');
        // Allow only one comma (decimal separator)
        const parts = digitsOnly.split(',');
        let integerPart = parts[0] || '';
        let decimalPart = parts[1] ? parts[1].slice(0, 2) : ''; // max 2 decimals

        // Format integer with dots every 3 digits (thousand separators)
        const formattedInt = integerPart === '' ? '' : integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        // Build final formatted value: keep comma even if no decimals typed yet
        const formatted = hasDecimal ? `${formattedInt},${decimalPart}` : formattedInt;
        setImporte(formatted);

        // move cursor to end for predictable behaviour
        setTimeout(() => {
            try {
                if (importeRef.current) {
                    const len = importeRef.current.value.length;
                    importeRef.current.setSelectionRange(len, len);
                }
            } catch (err) { /* ignore */ }
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            tipo, fecha, importe: parseCurrencyToNumber(importe),
            ...(tipo === 'ingreso' && { cliente, cuenta_id: parseInt(cuentaId), metodoPago_id: parseInt(metodoPagoId) }),
            ...(tipo === 'egreso' && { detalle, origen_id: parseInt(origenId), metodoPago_id: parseInt(metodoPagoId) })
        };

        try {
            await api.post('/transacciones', payload);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                resetForm();
            }, 1500);
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background-light dark:bg-background-dark relative">
            {showSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 md:gap-3 bg-emerald-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl shadow-emerald-500/30 transform transition-all animate-bounce text-sm md:text-base">
                    <span className="material-symbols-outlined text-2xl md:text-3xl">check_circle</span>
                    <span className="font-bold tracking-wide">Registro exitoso</span>
                </div>
            )}

            <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 md:gap-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Nuevo Movimiento</h2>
                </div>

                <div className={`bg-white rounded-2xl md:rounded-3xl shadow-sm border-2 p-4 md:p-10 transition-all duration-300 ${tipo === 'ingreso' ? 'border-emerald-200' : 'border-rose-200'}`}>
<form onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
                        <div className={`grid grid-cols-2 gap-1.5 md:gap-2 p-1 md:p-1.5 rounded-lg md:rounded-2xl transition-all duration-300 ${tipo === 'ingreso' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <label>
                                <input type="radio" name="tipo" value="ingreso" checked={tipo === 'ingreso'} onChange={(e) => setTipo(e.target.value)} className="peer sr-only" />
                                <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-4 rounded-lg md:rounded-xl text-slate-500 font-bold text-xs md:text-lg peer-checked:bg-white peer-checked:text-emerald-600 peer-checked:shadow-md transition-all">
                                    <span className="material-symbols-outlined text-[16px] md:text-[28px]">arrow_downward</span> <span className="hidden sm:inline">Ingreso</span>
                                </div>
                            </label>
                            <label>
                                <input type="radio" name="tipo" value="egreso" checked={tipo === 'egreso'} onChange={(e) => setTipo(e.target.value)} className="peer sr-only" />
                                <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-4 rounded-lg md:rounded-xl text-slate-500 font-bold text-xs md:text-lg peer-checked:bg-white peer-checked:text-rose-600 peer-checked:shadow-md transition-all">
                                    <span className="material-symbols-outlined text-[16px] md:text-[28px]">arrow_upward</span> <span className="hidden sm:inline">Egreso</span>
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                            <div className="md:col-span-1">
                                <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Monto total</label>
                                <div className="relative">
                                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base md:text-lg">$</span>
                                    <input type="text" inputMode="decimal" ref={importeRef} value={importe} onChange={handleImporteChange} required 
                                        className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-base md:text-xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Fecha del movimiento</label>
                                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required 
                                    className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-xs md:text-lg font-medium text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                            </div>
                        </div>

                        {tipo === 'ingreso' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-8 animate-fade-in">
                                <div>
                                    <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Cliente o Empresa</label>
                                    <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required
                                        className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Forma de Cobro</label>
                                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                        className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Cuenta Destino</label>
                                    <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} required
                                        className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>

                            </div>
                        )}

                        {tipo === 'egreso' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-8 animate-fade-in">
                                <div>
                                    <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Detalle del Gasto</label>
                                    <input type="text" value={detalle} onChange={(e) => setDetalle(e.target.value)} required
                                        className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Forma de Pago</label>
                                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                        className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs md:text-base font-bold text-slate-700 mb-1 md:mb-2 block">Categoría (Origen)</label>
                                    <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required
                                        className="w-full px-3 md:px-5 py-2 md:py-4 border border-slate-200 rounded-lg md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.origenes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 md:pt-10 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-6">
                            <button type="button" onClick={resetForm} disabled={loading || showSuccess}
                                className="w-full sm:w-auto px-6 md:px-10 py-3 md:py-4 rounded-lg md:rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm md:text-lg hover:bg-slate-50 transition-all active:scale-95">
                                Limpiar
                            </button>
                            <button type="submit" disabled={loading || showSuccess}
                                className={`w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 rounded-lg md:rounded-2xl text-white font-bold text-sm md:text-lg flex items-center justify-center gap-2 md:gap-3 shadow-xl disabled:opacity-50 transition-all hover:-translate-y-1 active:scale-95 ${tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'}`}>
                                <span className="material-symbols-outlined text-[20px] md:text-[28px]">{loading ? 'sync' : 'check'}</span>
                                <span>{loading ? 'Guardando...' : 'Confirmar Registro'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
