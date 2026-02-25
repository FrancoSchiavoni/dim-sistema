import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast'; // <-- IMPORTAMOS

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
    const [catalogos, setCatalogos] = useState({ cuentas: [], origenes: [], metodosPago: [] });

    const [cliente, setCliente] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [detalle, setDetalle] = useState('');
    const [origenId, setOrigenId] = useState('');
    const [metodoPagoId, setMetodoPagoId] = useState('');

    useEffect(() => {
        api.get('/transacciones/catalogos')
            .then(data => setCatalogos(data))
            .catch(err => toast.error('Error cargando catálogos'));
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
        const digitsOnly = raw.replace(/[^0-9,]/g, '');
        const hasDecimal = digitsOnly.includes(',');
        const parts = digitsOnly.split(',');
        let integerPart = parts[0] || '';
        let decimalPart = parts[1] ? parts[1].slice(0, 2) : ''; 

        const formattedInt = integerPart === '' ? '' : integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const formatted = hasDecimal ? `${formattedInt},${decimalPart}` : formattedInt;
        setImporte(formatted);

        setTimeout(() => {
            try {
                if (importeRef.current) {
                    const len = importeRef.current.value.length;
                    importeRef.current.setSelectionRange(len, len);
                }
            } catch (err) { }
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
            toast.success('¡Registro exitoso!'); // <-- USAMOS TOAST AQUÍ
            resetForm();
        } catch (error) {
            toast.error('Error al guardar: ' + error.message); // <-- Y AQUÍ
        } finally { setLoading(false); }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background-light dark:bg-background-dark relative">
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 md:gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Nuevo Movimiento</h2>
                </div>

                <div className={`bg-white rounded-2xl md:rounded-2xl shadow-sm border p-4 md:p-8 transition-all duration-300 ${tipo === 'ingreso' ? 'border-emerald-200' : 'border-rose-200'}`}>
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        <div className={`grid grid-cols-2 gap-1.5 md:gap-2 p-1 md:p-1.5 rounded-lg md:rounded-xl transition-all duration-300 ${tipo === 'ingreso' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <label>
                                <input type="radio" name="tipo" value="ingreso" checked={tipo === 'ingreso'} onChange={(e) => setTipo(e.target.value)} className="peer sr-only" />
                                <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg md:rounded-lg text-slate-500 font-bold text-xs md:text-sm peer-checked:bg-white peer-checked:text-emerald-600 peer-checked:shadow-sm transition-all cursor-pointer">
                                    <span className="material-symbols-outlined text-[16px] md:text-[20px]">arrow_downward</span> <span className="hidden sm:inline">Ingreso</span>
                                </div>
                            </label>
                            <label>
                                <input type="radio" name="tipo" value="egreso" checked={tipo === 'egreso'} onChange={(e) => setTipo(e.target.value)} className="peer sr-only" />
                                <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg md:rounded-lg text-slate-500 font-bold text-xs md:text-sm peer-checked:bg-white peer-checked:text-rose-600 peer-checked:shadow-sm transition-all cursor-pointer">
                                    <span className="material-symbols-outlined text-[16px] md:text-[20px]">arrow_upward</span> <span className="hidden sm:inline">Egreso</span>
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                            <div className="md:col-span-1">
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Monto total</label>
                                <div className="relative">
                                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base md:text-lg">$</span>
                                    <input type="text" inputMode="decimal" ref={importeRef} value={importe} onChange={handleImporteChange} required 
                                        className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-base md:text-lg font-bold text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Fecha del movimiento</label>
                                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required 
                                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm font-medium text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                            </div>
                        </div>

                        {tipo === 'ingreso' && (
                            <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 animate-fade-in">
                                <div>
                                    <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Cliente o Empresa</label>
                                    <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Forma de Cobro</label>
                                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Cuenta Destino</label>
                                    <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} required
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-3 p-3 md:p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg md:rounded-xl">
                                <div className="flex-1">
                                    <h3 className="text-sm md:text-base font-bold text-sky-900 mb-0.5">Una forma más rápida</h3>
                                    <p className="text-xs md:text-sm text-sky-700">Envía la captura de transferencia a nuestro bot de Telegram</p>
                                </div>
                                <a href="https://t.me/dim_comprobantes_bot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95">
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    <span>Abrir Telegram</span>
                                </a>
                            </div>
                            </>
                        )}

                        {tipo === 'egreso' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 animate-fade-in">
                                <div>
                                    <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Detalle del Gasto</label>
                                    <input type="text" value={detalle} onChange={(e) => setDetalle(e.target.value)} required
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Forma de Pago</label>
                                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Categoría (Origen)</label>
                                    <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.origenes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 md:pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 md:gap-4">
                            <button type="button" onClick={resetForm} disabled={loading}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-lg md:rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all active:scale-95">
                                Limpiar
                            </button>
                            <button type="submit" disabled={loading}
                                className={`w-full sm:w-auto px-8 py-2.5 rounded-lg md:rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all hover:-translate-y-0.5 active:scale-95 ${tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}>
                                <span className="material-symbols-outlined text-[20px]">{loading ? 'sync' : 'check'}</span>
                                <span>{loading ? 'Guardando...' : 'Confirmar Registro'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}