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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading && !showSuccess ? handleClose : undefined}></div>

            {showSuccess && (
                <div className="absolute top-4 md:top-10 z-[60] flex items-center gap-2 md:gap-3 bg-emerald-500 text-white px-4 md:px-6 py-3 md:py-3.5 rounded-lg md:rounded-xl shadow-2xl shadow-emerald-500/30 transform transition-all animate-bounce text-xs md:text-sm">
                    <span className="material-symbols-outlined text-xl md:text-2xl">check_circle</span>
                    <span className="font-bold tracking-wide">{isEdit ? '¡Cambios guardados!' : '¡Registro exitoso!'}</span>
                </div>
            )}

            <div className={`relative z-10 w-full max-w-3xl bg-white dark:bg-[#1a2634] rounded-2xl md:rounded-2xl shadow-2xl border-2 overflow-hidden flex flex-col transition-all duration-300 ${showSuccess ? 'opacity-50 pointer-events-none' : 'opacity-100'} ${tipo === 'ingreso' ? 'border-emerald-200' : 'border-rose-200'}`}>

                <div className={`flex items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b-2 ${tipo === 'ingreso' ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
                    <div>
                        <h1 className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tight">{isEdit ? 'Editar Transacción' : 'Nueva Transacción'}</h1>
                    </div>
                    <button onClick={handleClose} disabled={loading} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-1.5 md:p-2 rounded-lg transition-all shadow-sm border border-slate-200">
                        <span className="material-symbols-outlined text-2xl md:text-2xl block">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">

                    <div className="grid grid-cols-2 gap-1.5 md:gap-2 p-1 md:p-1.5 bg-slate-100 rounded-lg md:rounded-xl">
                        <label className={`cursor-pointer ${isEdit && tipo === 'egreso' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="radio" name="tipo" value="ingreso" checked={tipo === 'ingreso'} onChange={(e) => setTipo(e.target.value)} disabled={isEdit} className="peer sr-only" />
                            <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg text-slate-500 font-bold text-xs md:text-sm peer-checked:bg-white peer-checked:text-emerald-600 peer-checked:shadow-sm transition-all">
                                <span className="material-symbols-outlined text-[16px] md:text-[20px]">arrow_downward</span> <span className="hidden sm:inline">Ingreso</span>
                            </div>
                        </label>
                        <label className={`cursor-pointer ${isEdit && tipo === 'ingreso' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="radio" name="tipo" value="egreso" checked={tipo === 'egreso'} onChange={(e) => setTipo(e.target.value)} disabled={isEdit} className="peer sr-only" />
                            <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg text-slate-500 font-bold text-xs md:text-sm peer-checked:bg-white peer-checked:text-rose-600 peer-checked:shadow-sm transition-all">
                                <span className="material-symbols-outlined text-[16px] md:text-[20px]">arrow_upward</span> <span className="hidden sm:inline">Egreso</span>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                        <div className="md:col-span-1">
                            <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Monto total</label>
                            <div className="relative">
                                <span className="absolute left-3 md:left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base md:text-lg">$</span>
                                <input type="text" inputMode="decimal" ref={importeRef} value={importe} onChange={handleImporteChange} required
                                    className="w-full pl-8 md:pl-8 pr-3 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-base md:text-lg font-bold text-slate-900 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
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
                                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm md:text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm" />
                            </div>
                            <div>
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Forma de Cobro</label>
                                <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required
                                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm md:text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                    <option value="" disabled>Seleccionar...</option>
                                    {catalogos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1 block">Cuenta Destino</label>
                                <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} required
                                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm md:text-sm font-medium focus:ring-4 focus:ring-primary/20 shadow-sm bg-white cursor-pointer">
                                    <option value="" disabled>Seleccionar...</option>
                                    {catalogos.cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-2 md:gap-3 p-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg md:rounded-xl">
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-sky-900 mb-0.5">Una forma más rápida</h3>
                                <p className="text-xs text-sky-700">Envía la captura de transferencia a nuestro bot de Telegram</p>
                            </div>
                            <a href="https://t.me/dim_comprobantes_bot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap">
                                <span className="material-symbols-outlined text-[16px]">send</span>
                                <span>Telegram</span>
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
                        <button type="button" onClick={handleClose} disabled={loading || showSuccess}
                            className="w-full sm:w-auto px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || showSuccess}
                            className={`w-full sm:w-auto px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all hover:-translate-y-0.5 active:scale-95 ${tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}>
                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">{loading ? 'sync' : 'check'}</span>
                            <span>{isEdit ? 'Guardar Cambios' : 'Confirmar Registro'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}