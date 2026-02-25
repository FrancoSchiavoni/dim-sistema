import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

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
        // Eliminamos setTipo('ingreso') para que recuerde la última pestaña seleccionada
        setImporte(''); 
        setFecha(getTodayDate());
        setCliente(''); 
        setCuentaId(''); 
        setDetalle(''); 
        setOrigenId(''); 
        setMetodoPagoId('');
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
            toast.success('¡Registro exitoso!');
            resetForm(); // Limpiará los campos, pero se quedará en el mismo tipo
        } catch (error) {
            toast.error('Error al guardar: ' + error.message);
        } finally { setLoading(false); }
    };

    // Clases CSS compartidas para los inputs para mantener consistencia
    const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm bg-white";
    const labelClass = "text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block";

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-5 bg-slate-100 dark:bg-background-dark relative">
            
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                
                <div className="flex items-center justify-between">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Nuevo Movimiento</h2>
                </div>

                <div className={`bg-white rounded-2xl shadow-sm border p-4 md:p-6 lg:p-8 transition-all duration-300 ${tipo === 'ingreso' ? 'border-emerald-200' : 'border-rose-200'}`}>
                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                        
                        {/* Selector de Pestañas Estilo Dashboard */}
                        <div className="flex w-full bg-slate-100 p-1 rounded-xl border border-slate-200 mb-2">
                            <label className="flex-1">
                                <input type="radio" name="tipo" value="ingreso" checked={tipo === 'ingreso'} onChange={(e) => {setTipo(e.target.value); resetForm();}} className="peer sr-only" />
                                <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-bold text-slate-500 peer-checked:bg-white peer-checked:text-emerald-700 peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-emerald-200 transition-all cursor-pointer hover:text-slate-700">
                                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span> Ingreso
                                </div>
                            </label>
                            <label className="flex-1">
                                <input type="radio" name="tipo" value="egreso" checked={tipo === 'egreso'} onChange={(e) => {setTipo(e.target.value); resetForm();}} className="peer sr-only" />
                                <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-bold text-slate-500 peer-checked:bg-white peer-checked:text-rose-700 peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-rose-200 transition-all cursor-pointer hover:text-slate-700">
                                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span> Egreso
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="md:col-span-1">
                                <label className={labelClass}>Monto total</label>
                                <div className="relative">
                                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg md:text-xl">$</span>
                                    <input type="text" inputMode="decimal" ref={importeRef} value={importe} onChange={handleImporteChange} required 
                                        className="w-full pl-8 md:pl-10 pr-3 py-2.5 md:py-3 border border-slate-300 rounded-xl text-lg md:text-2xl font-black text-slate-900 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm bg-white" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Fecha del movimiento</label>
                                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required 
                                    className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm bg-white" />
                            </div>
                        </div>

                        {tipo === 'ingreso' && (
                            <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 animate-fade-in">
                                <div>
                                    <label className={labelClass}>Cliente o Empresa</label>
                                    <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required className={inputClass} placeholder="Ej: Juan Pérez" />
                                </div>
                                <div>
                                    <label className={labelClass}>Forma de Cobro</label>
                                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required className={`${inputClass} cursor-pointer`}>
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Cuenta Destino</label>
                                    <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} required className={`${inputClass} cursor-pointer`}>
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Banner Telegram rediseñado */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">Sube el comprobante</h3>
                                    <p className="text-xs font-medium text-slate-500">Envía la captura de transferencia a nuestro bot</p>
                                </div>
                                <a href="https://t.me/dim_comprobantes_bot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold text-xs rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95">
                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                    <span>Abrir Telegram</span>
                                </a>
                            </div>
                            </>
                        )}

                        {tipo === 'egreso' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 animate-fade-in">
                                <div>
                                    <label className={labelClass}>Detalle del Gasto</label>
                                    <input type="text" value={detalle} onChange={(e) => setDetalle(e.target.value)} required className={inputClass} placeholder="Ej: Compra de insumos" />
                                </div>
                                <div>
                                    <label className={labelClass}>Forma de Pago</label>
                                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required className={`${inputClass} cursor-pointer`}>
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Categoría (Origen)</label>
                                    <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required className={`${inputClass} cursor-pointer`}>
                                        <option value="" disabled>Seleccionar...</option>
                                        {catalogos.origenes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-5 mt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
                            <button type="button" onClick={resetForm} disabled={loading}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs md:text-sm hover:bg-slate-50 transition-all active:scale-95">
                                Limpiar Campos
                            </button>
                            <button type="submit" disabled={loading}
                                className={`w-full sm:w-auto px-8 py-2.5 rounded-lg text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all hover:-translate-y-0.5 active:scale-95 ${tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                                <span className="material-symbols-outlined text-[18px]">{loading ? 'sync' : 'check'}</span>
                                <span>{loading ? 'Guardando...' : 'Confirmar Registro'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}