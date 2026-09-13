import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Settings, Repeat,
  CheckCircle2, Circle, AlertTriangle, Loader2, Receipt, CheckCheck
} from 'lucide-react';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const STORAGE_KEY = 'mis-cuotas-data-v1';

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function formatCLP(n) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return '$' + v.toLocaleString('es-CL');
}

// Calcula el estado (label / monto / tipo) de un item para un mes y año dados.
// Devuelve null si el item no debe mostrarse ese mes.
function computeEstado(item, mes, anio) {
  const mesesTranscurridos = (anio - item.anioInicio) * 12 + (mes - item.mesInicio);
  if (mesesTranscurridos < 0) return null;

  if (item.cuotasTotales === null) {
    return { ...item, tipo: 'fijo', label: 'Fijo', monto: item.precioCuota };
  }

  const N = item.cuotasTotales; // N = número de F con el que parte (0 = arranca directo en "Último pago")
  if (mesesTranscurridos > N) return null;

  if (mesesTranscurridos === N) {
    return { ...item, tipo: 'ultimo', label: 'Último pago', monto: item.precioCuota };
  }

  const restantes = N - mesesTranscurridos;
  return { ...item, tipo: 'cuota', label: `F${restantes}`, restantes, monto: item.precioCuota };
}

function pagoKey(anio, mes, id) {
  return `${anio}_${mes}_${id}`;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-500 mb-1 block">{label}</span>
      {children}
      {hint && <span className="text-xs text-stone-400 mt-1 block">{hint}</span>}
    </label>
  );
}

function Badge({ tipo, label }) {
  const styles = {
    ultimo: 'bg-amber-100 text-amber-700',
    fijo: 'bg-slate-100 text-slate-600',
    cuota: 'bg-emerald-50 text-emerald-700'
  };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[tipo]}`}>
      {tipo === 'fijo' && <Repeat size={10} className="mr-1" />}
      {label}
    </span>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-stone-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-700 bg-white';

const EMPTY_FORM = { nombre: '', cuotas: '', precio: '', mes: '', anio: '', esFijo: false, esUltimoPago: false };

export default function App() {
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [items, setItems] = useState([]);
  const [pagos, setPagos] = useState({});
  const [ocultos, setOcultos] = useState({});

  const [viewMes, setViewMes] = useState(now.getMonth() + 1);
  const [viewAnio, setViewAnio] = useState(now.getFullYear());

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Carga inicial desde localStorage del navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(Array.isArray(parsed.items) ? parsed.items : []);
        setPagos(parsed.pagos && typeof parsed.pagos === 'object' ? parsed.pagos : {});
        setOcultos(parsed.ocultos && typeof parsed.ocultos === 'object' ? parsed.ocultos : {});
      }
    } catch (e) {
      // No hay datos guardados todavía, o el JSON es inválido: se parte con listas vacías.
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  // Guarda cada vez que cambian los datos (una vez que ya cargamos el estado inicial)
  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, pagos, ocultos }));
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }, [items, pagos, ocultos, hasLoaded]);

  const monthItems = useMemo(() => {
    return items
      .map(it => computeEstado(it, viewMes, viewAnio))
      .filter(Boolean)
      .filter(it => !ocultos[pagoKey(viewAnio, viewMes, it.id)]);
  }, [items, viewMes, viewAnio, ocultos]);

  function isPaid(item) {
    return !!pagos[pagoKey(viewAnio, viewMes, item.id)];
  }

  const totalMes = monthItems.reduce((s, it) => s + it.monto, 0);
  const totalPagado = monthItems.reduce((s, it) => s + (isPaid(it) ? it.monto : 0), 0);
  const totalPendiente = totalMes - totalPagado;
  const allPaid = monthItems.length > 0 && monthItems.every(it => isPaid(it));
  const isCurrentMonth = viewMes === now.getMonth() + 1 && viewAnio === now.getFullYear();

  function goToMonth(delta) {
    const total = viewAnio * 12 + (viewMes - 1) + delta;
    const newAnio = Math.floor(total / 12);
    const newMes = (total % 12) + 1;
    setViewAnio(newAnio);
    setViewMes(newMes);
  }

  function goToday() {
    setViewAnio(now.getFullYear());
    setViewMes(now.getMonth() + 1);
  }

  function togglePago(item) {
    const key = pagoKey(viewAnio, viewMes, item.id);
    setPagos(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleMarkMonth() {
    const nextValue = !allPaid;
    setPagos(prev => {
      const next = { ...prev };
      monthItems.forEach(it => {
        next[pagoKey(viewAnio, viewMes, it.id)] = nextValue;
      });
      return next;
    });
  }

  function openAdd() {
    setEditingItem(null);
    setForm({ nombre: '', cuotas: '', precio: '', mes: String(viewMes), anio: String(viewAnio), esFijo: false, esUltimoPago: false });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    const esFijo = item.cuotasTotales === null;
    const esUltimoPago = !esFijo && item.cuotasTotales === 0;
    setForm({
      nombre: item.nombre,
      cuotas: (esFijo || esUltimoPago) ? '' : String(item.cuotasTotales),
      precio: String(item.precioCuota),
      mes: String(item.mesInicio),
      anio: String(item.anioInicio),
      esFijo,
      esUltimoPago
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function handleSave() {
    const nombre = form.nombre.trim();
    const precio = parseInt(form.precio, 10);
    const mes = parseInt(form.mes, 10);
    const anio = parseInt(form.anio, 10);

    if (!nombre) { setFormError('Ingresa un nombre para el gasto.'); return; }
    if (!precio || precio <= 0 || Number.isNaN(precio)) { setFormError('Ingresa un valor de cuota mensual válido.'); return; }
    if (Number.isNaN(anio) || anio < 2000 || anio > 2100) { setFormError('Ingresa un año de inicio válido.'); return; }
    if (Number.isNaN(mes) || mes < 1 || mes > 12) { setFormError('Selecciona un mes de inicio.'); return; }

    let cuotasTotales;
    if (form.esFijo) {
      cuotasTotales = null;
    } else if (form.esUltimoPago) {
      cuotasTotales = 0;
    } else {
      const cuotasNum = parseInt(form.cuotas, 10);
      if (Number.isNaN(cuotasNum) || cuotasNum < 1) {
        setFormError('Ingresa con cuántas cuotas (F) parte este gasto, ej: 3 para que empiece en F3.');
        return;
      }
      cuotasTotales = cuotasNum;
    }

    if (editingItem) {
      setItems(prev => prev.map(it =>
        it.id === editingItem.id
          ? { ...it, nombre, precioCuota: precio, cuotasTotales, mesInicio: mes, anioInicio: anio }
          : it
      ));
    } else {
      setItems(prev => [...prev, {
        id: genId(), nombre, precioCuota: precio, cuotasTotales, mesInicio: mes, anioInicio: anio
      }]);
    }
    closeForm();
  }

  function confirmDelete(id) {
    setDeleteTargetId(id);
  }

  function doDeleteSoloEsteMes() {
    const id = deleteTargetId;
    const key = pagoKey(viewAnio, viewMes, id);
    setOcultos(prev => ({ ...prev, [key]: true }));
    setDeleteTargetId(null);
  }

  function doDeleteTodo() {
    const id = deleteTargetId;
    setItems(prev => prev.filter(it => it.id !== id));
    setPagos(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.endsWith('_' + id)) delete next[k]; });
      return next;
    });
    setOcultos(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.endsWith('_' + id)) delete next[k]; });
      return next;
    });
    setDeleteTargetId(null);
  }

  function resetAll() {
    setItems([]);
    setPagos({});
    setOcultos({});
    setConfirmingReset(false);
    setShowSettings(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-900" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-200 flex justify-center">
      <div className="w-full max-w-md bg-stone-50 min-h-screen relative pb-28">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <h1 className="text-xl font-semibold text-stone-900">Mis Cuotas</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-stone-200 active:bg-stone-300"
            aria-label="Ajustes"
          >
            <Settings size={20} className="text-stone-500" />
          </button>
        </div>

        <div className="px-5">
          {/* Tarjeta resumen tipo "boleta" */}
          <div className="rounded-3xl bg-emerald-900 text-white shadow-lg px-6 pt-5 pb-1">
            <div className="flex items-center justify-between">
              <button
                onClick={() => goToMonth(-1)}
                className="p-1.5 rounded-full hover:bg-emerald-800 active:bg-emerald-700"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-emerald-100">
                  {MESES[viewMes - 1]} {viewAnio}
                </span>
                {!isCurrentMonth && (
                  <button onClick={goToday} className="text-xs text-amber-300 mt-0.5">
                    Volver a hoy
                  </button>
                )}
              </div>
              <button
                onClick={() => goToMonth(1)}
                className="p-1.5 rounded-full hover:bg-emerald-800 active:bg-emerald-700"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-emerald-200">Total a pagar</p>
                <Receipt size={16} className="text-emerald-300" />
              </div>
              <p className="text-4xl font-semibold tracking-tight tabular-nums mt-0.5">
                {formatCLP(totalMes)}
              </p>
            </div>

            <div className="mt-4">
              <div className="border-t-2 border-dashed border-emerald-700" />
            </div>

            <div className="flex justify-between py-4 text-sm">
              <div>
                <p className="text-emerald-300">Pagado</p>
                <p className="font-medium tabular-nums">{formatCLP(totalPagado)}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-300">Pendiente</p>
                <p className="font-medium tabular-nums">{formatCLP(totalPendiente)}</p>
              </div>
            </div>
          </div>

          {/* Botón marcar mes pagado */}
          {monthItems.length > 0 && (
            <button
              onClick={toggleMarkMonth}
              className={
                allPaid
                  ? 'w-full mt-4 py-3 rounded-2xl bg-emerald-900 text-white font-medium flex items-center justify-center gap-2'
                  : 'w-full mt-4 py-3 rounded-2xl bg-white border border-stone-200 text-emerald-900 font-medium flex items-center justify-center gap-2 shadow-sm'
              }
            >
              <CheckCheck size={18} />
              {allPaid ? 'Mes marcado como pagado' : 'Marcar mes como pagado'}
            </button>
          )}

          {/* Lista de items */}
          <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
            {monthItems.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                Aún no tienes gastos para {MESES[viewMes - 1]} {viewAnio}.<br />
                Toca el botón + para agregar el primero.
              </div>
            ) : (
              monthItems.map((it, idx) => (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx !== monthItems.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  <button onClick={() => togglePago(it)} className="shrink-0" aria-label="Marcar pagado">
                    {isPaid(it)
                      ? <CheckCircle2 className="text-emerald-700" size={24} />
                      : <Circle className="text-stone-300" size={24} />}
                  </button>
                  <button className="flex-1 min-w-0 text-left" onClick={() => openEdit(it)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium truncate ${isPaid(it) ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                        {it.nombre}
                      </span>
                      <Badge tipo={it.tipo} label={it.label} />
                    </div>
                    <span className="text-sm text-stone-500 tabular-nums">{formatCLP(it.monto)}</span>
                  </button>
                  <button
                    onClick={() => confirmDelete(it.id)}
                    className="shrink-0 p-2 text-stone-300 hover:text-red-500"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {saveError && (
            <p className="text-xs text-red-500 mt-3 text-center">
              No se pudieron guardar los últimos cambios. Revisa el espacio disponible en tu navegador.
            </p>
          )}
        </div>

        {/* Botón flotante agregar */}
        <button
          onClick={openAdd}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-900 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Agregar gasto"
        >
          <Plus size={26} />
        </button>

        {/* Modal agregar/editar */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  {editingItem ? 'Editar gasto' : 'Nuevo gasto'}
                </h2>
                <button onClick={closeForm} className="p-1 text-stone-400 hover:text-stone-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Field label="Nombre del gasto">
                  <input
                    className={inputClass}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: AirPods Pro 3"
                  />
                </Field>

                <div className="flex flex-col gap-2 -mb-1">
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={form.esFijo}
                      onChange={e => setForm(f => ({ ...f, esFijo: e.target.checked, esUltimoPago: e.target.checked ? false : f.esUltimoPago }))}
                      className="rounded border-stone-300 text-emerald-900 focus:ring-emerald-700"
                    />
                    Es un gasto fijo (sin fecha de término)
                  </label>
                  {!form.esFijo && (
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={form.esUltimoPago}
                        onChange={e => setForm(f => ({ ...f, esUltimoPago: e.target.checked }))}
                        className="rounded border-stone-300 text-emerald-900 focus:ring-emerald-700"
                      />
                      El pago de este mes ya es el último
                    </label>
                  )}
                </div>

                {!form.esFijo && !form.esUltimoPago && (
                  <Field
                    label="Cantidad de cuotas con la que parte"
                    hint="Ej: si ingresas 3, este mes se verá como F3, el siguiente F2, luego F1, luego Último pago y después desaparece."
                  >
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      value={form.cuotas}
                      onChange={e => setForm(f => ({ ...f, cuotas: e.target.value }))}
                      placeholder="Ej: 3"
                    />
                  </Field>
                )}

                <Field label="Valor de la cuota mensual">
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={form.precio}
                    onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                    placeholder="Ej: 24990"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mes de inicio">
                    <select
                      className={inputClass}
                      value={form.mes}
                      onChange={e => setForm(f => ({ ...f, mes: e.target.value }))}
                    >
                      <option value="">Selecciona</option>
                      {MESES.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Año de inicio">
                    <input
                      className={inputClass}
                      type="number"
                      value={form.anio}
                      onChange={e => setForm(f => ({ ...f, anio: e.target.value }))}
                      placeholder="Ej: 2026"
                    />
                  </Field>
                </div>
              </div>

              {formError && <p className="text-sm text-red-500 mt-3">{formError}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={closeForm} className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-900 font-medium">
                  Cancelar
                </button>
                <button onClick={handleSave} className="flex-1 py-3 rounded-2xl bg-emerald-900 text-white font-medium">
                  {editingItem ? 'Guardar' : 'Agregar'}
                </button>
              </div>

              {editingItem && (
                <button
                  onClick={() => { closeForm(); confirmDelete(editingItem.id); }}
                  className="w-full mt-3 py-2 text-sm text-red-500"
                >
                  Eliminar este gasto
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal confirmar eliminación */}
        {deleteTargetId && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-xs p-6 text-center">
              <AlertTriangle className="mx-auto text-red-500 mb-3" size={28} />
              <p className="text-stone-900 font-medium mb-1">¿Qué quieres eliminar?</p>
              <p className="text-sm text-stone-500 mb-5">
                Puedes quitarlo solo de {MESES[viewMes - 1]} {viewAnio} (los meses siguientes siguen normalmente hasta que termine), o borrarlo por completo.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={doDeleteSoloEsteMes} className="w-full py-2.5 rounded-xl bg-stone-100 text-stone-900 font-medium">
                  Solo {MESES[viewMes - 1]} {viewAnio}
                </button>
                <button onClick={doDeleteTodo} className="w-full py-2.5 rounded-xl bg-red-500 text-white font-medium">
                  Eliminar de todos los meses
                </button>
                <button onClick={() => setDeleteTargetId(null)} className="w-full py-2.5 rounded-xl text-stone-500 font-medium">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ajustes */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">Ajustes</h2>
                <button
                  onClick={() => { setShowSettings(false); setConfirmingReset(false); }}
                  className="p-1 text-stone-400 hover:text-stone-600"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-stone-500 mb-5">
                Tus gastos y pagos se guardan automáticamente en este navegador y quedan disponibles la próxima vez que abras la app en este mismo dispositivo.
              </p>

              {!confirmingReset ? (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="w-full py-3 rounded-2xl bg-red-50 text-red-600 font-medium"
                >
                  Borrar todos los datos
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-stone-700">
                    ¿Seguro que quieres borrar todos tus gastos y registros de pago? No se puede deshacer.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmingReset(false)} className="flex-1 py-2.5 rounded-xl bg-stone-100 font-medium">
                      Cancelar
                    </button>
                    <button onClick={resetAll} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium">
                      Sí, borrar todo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
