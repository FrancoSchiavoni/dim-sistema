import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function MovimientoModal({ isOpen, onClose, onSaved, movimientoAEditar }) {
    const isEdit = !!movimientoAEditar;

    const [tipo, setTipo] = useState('ingreso');
    const [importe, setImporte] = useState('');
    const [fecha, setFecha] = useState(getTodayDate());
    const importeRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [catalogos, setCatalogos] = useState({ cuentas: [], origenes: [], metodosPago: [] });

    const [cliente, setCliente] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [detalle, setDetalle] = useState('');
    const [origenId, setOrigenId] = useState('');
    const [metodoPagoId, setMetodoPagoId] = useState('');

    useEffect(() => {
        if (isOpen) {
            api.get('/transacciones/catalogos')
                .then(data => setCatalogos(data))
                .catch(err => console.error("Error cargando catálogos:", err));

            // Si estamos editando, rellenamos los campos
            if (movimientoAEditar) {
                setTipo(movimientoAEditar.tipo);
                setImporte(formatCurrencyInput(movimientoAEditar.monto));
                setFecha(movimientoAEditar.fecha);
                setMetodoPagoId(movimientoAEditar.metodoPago_id || '');

                if (movimientoAEditar.tipo === 'ingreso') {
                    setCliente(movimientoAEditar.detalle || '');
                    setCuentaId(movimientoAEditar.cuenta_id || '');
                } else {
                    setDetalle(movimientoAEditar.detalle || '');
                    setOrigenId(movimientoAEditar.origen_id || '');
                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, movimientoAEditar]);

    if (!isOpen) return null;

    const resetForm = () => {
        setTipo('ingreso'); setImporte(''); setFecha(getTodayDate());
        setCliente(''); setCuentaId(''); setDetalle(''); setOrigenId(''); setMetodoPagoId('');
    };

    const formatCurrencyInput = (value) => {
        if (value === null || value === undefined || value === '') return '';
        // Accept numbers or strings; normalize then format for es-AR
        const num = typeof value === 'number' ? value : Number(String(value).replace(/\./g, '').replace(/,/g, '.'));
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    const parseCurrencyToNumber = (str) => {
        if (str === null || str === undefined || str === '') return NaN;
        if (typeof str === 'number') return str;
        const normalized = String(str).replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(normalized);
    };

    const unformatCurrency = (str) => {
        if (!str && str !== 0) return '';
        // Remove thousand separators and normalize decimal to dot for editing
        return String(str).replace(/\./g, '').replace(/,/g, '.');
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

    const handleClose = () => {
        resetForm();
        onClose();
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
            if (isEdit) {
                await api.put(`/transacciones/${tipo}/${movimientoAEditar.id}`, payload);
            } else {
                await api.post('/transacciones', payload);
            }
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                handleClose();
                onSaved();
            }, 1500);
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading && !showSuccess ? handleClose : undefined}></div>

            {showSuccess && (
                <div className="absolute top-10 z-[60] flex items-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 transform transition-all animate-bounce">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                    <span className="text-xl font-bold tracking-wide">{isEdit ? '¡Cambios guardados!' : '¡Registro exitoso!'}</span>
                </div>
            )}

            <div className={`relative z-10 w-full max-w-5xl bg-white dark:bg-[#1a2634] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-opacity duration-300 ${showSuccess ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

                <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{isEdit ? 'Editar Transacción' : 'Nueva Transacción'}</h1>
                    </div>
                    <button onClick={handleClose} disabled={loading} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-xl transition-all shadow-sm border border-slate-200">
                        <span className="material-symbols-outlined text-3xl block">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-12 space-y-8">

                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                        <label className={`cursor-pointer ${isEdit && tipo === 'egreso' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="radio" name="tipo" value="ingreso" checked={tipo === 'ingreso'} onChange={(e) => setTipo(e.target.value)} disabled={isEdit} className="peer sr-only" />
                            <div className="flex items-center justify-center gap-3 py-4 rounded-xl text-slate-500 font-bold text-lg peer-checked:bg-white peer-checked:text-emerald-600 peer-checked:shadow-md transition-all">
                                <span className="material-symbols-outlined text-[28px]">arrow_downward</span> Ingreso
                            </div>
                        </label>
                        <label className={`cursor-pointer ${isEdit && tipo === 'ingreso' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="radio" name="tipo" value="egreso" checked={tipo === 'egreso'} onChange={(e) => setTipo(e.target.value)} disabled={isEdit} className="peer sr-only" />
                            <div className="flex items-center justify-center gap-3 py-4 rounded-xl text-slate-500 font-bold text-lg peer-checked:bg-white peer-checked:text-rose-600 peer-checked:shadow-md transition-all">
                                <span className="material-symbols-outlined text-[28px]">arrow_upward</span> Egreso
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <label className="text-base font-bold text-slate-700 mb-2 block">Monto total</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
                                <input type="text" inputMode="decimal" value={importe} onChange={handleImporteChange} required
                                    className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-2xl text-xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="text-base font-bold text-slate-700 mb-2 block">Fecha del movimiento</label>
                            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
                                className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                        </div>
                    </div>

                    {tipo === 'ingreso' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                            <div>
                                <label className="text-base font-bold text-slate-700 mb-2 block">Cliente o Empresa</label>
                                <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required
                                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                            </div>
                            <div>
                                <label className="text-base font-bold text-slate-700 mb-2 block">Forma de Cobro</label>
                                <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                    <option value="" disabled>Seleccionar...</option>
                                    {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-base font-bold text-slate-700 mb-2 block">Cuenta Destino</label>
                                <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} required
                                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                    <option value="" disabled>Seleccionar...</option>
                                    {catalogos.cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {tipo === 'egreso' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                            <div>
                                <label className="text-base font-bold text-slate-700 mb-2 block">Detalle del Gasto</label>
                                <input type="text" value={detalle} onChange={(e) => setDetalle(e.target.value)} required
                                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                            </div>

                            <div>
                                <label className="text-base font-bold text-slate-700 mb-2 block">Forma de Pago</label>
                                <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                    <option value="" disabled>Seleccionar...</option>
                                    {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>
                            <div>

                                <label className="text-base font-bold text-slate-700 mb-2 block">Categoría (Origen)</label>
                                <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required
                                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                    <option value="" disabled>Seleccionar...</option>
                                    {catalogos.origenes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="pt-10 border-t-2 border-slate-100 flex items-center justify-between gap-6">
                        <button type="button" onClick={handleClose} disabled={loading || showSuccess}
                            className="px-10 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || showSuccess}
                            className="px-12 py-4 rounded-2xl bg-primary hover:bg-blue-600 text-white font-bold text-lg flex items-center gap-3 shadow-xl shadow-primary/30 disabled:opacity-50 transition-all hover:-translate-y-1 active:scale-95">
                            <span className="material-symbols-outlined text-[28px]">{loading ? 'sync' : 'check'}</span>
                            {isEdit ? 'Guardar Cambios' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}