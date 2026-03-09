import React from "react";

const formatFecha = (iso) => {
  if (!iso) return "NO REGISTRADA";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "$ 0.00";
  return `$ ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ✅ helpers auditoría (compatibles con registros viejos)
const normUp = (s) => String(s || "").toUpperCase().trim();

const getCreadoPor = (egreso) => {
  return (
    normUp(egreso?.creadoPorNombre) ||
    normUp(egreso?.creadoPor) ||
    normUp(egreso?.residente) ||
    "ADMIN"
  );
};

const getCreadoRol = (egreso) => {
  return normUp(egreso?.creadoPorRol) || "";
};

const getActualizadoPor = (egreso) => {
  return normUp(egreso?.actualizadoPor) || "";
};

const getActualizadoRol = (egreso) => {
  return normUp(egreso?.actualizadoPorRol) || "";
};

const EgresoDetailModal = ({ egreso, onClose, onEdit, onDelete }) => {
  if (!egreso) return null;

  const estado = String(egreso.estado || "PENDIENTE").toUpperCase();
  const esPagado = estado === "PAGADO" || estado === "COMPLETADO";

  const proyecto = (egreso.proyecto || "SIN PROYECTO").toUpperCase();
  const categoria = (egreso.categoria || "SIN CATEGORÍA").toUpperCase();
  const metodoPago = (egreso.metodoPago || "—").toUpperCase();
  const factura = egreso.factura === "si" || egreso.tieneFactura ? "SÍ" : "NO";

  // ✅ Auditoría real (sin romper legacy)
  const creadoPor = getCreadoPor(egreso);
  const creadoRol = getCreadoRol(egreso);
  const actualizadoPor = getActualizadoPor(egreso);
  const actualizadoRol = getActualizadoRol(egreso);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-black/5">
        {/* Header */}
        <div className="bg-black text-white relative px-8 pt-10 pb-8">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-blendfort-naranja transition-all"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-[2px] bg-blendfort-naranja"></div>
            <span className="text-[8px] font-black uppercase tracking-[0.45em] text-white/60">
              Expense Detail
            </span>
          </div>

          <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">
            {proyecto}
          </h4>

          {/* ✅ antes: residente; ahora: creado por */}
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50 mt-1">
            {creadoPor}
            {creadoRol ? <span className="ml-2 text-white/30">· {creadoRol}</span> : null}
          </p>

          {/* Chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">CAT</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{categoria}</span>
            </span>

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">EST</span>
              <span className="text-[8px] font-black uppercase tracking-widest">
                {estado}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${esPagado ? "bg-green-400/80" : "bg-amber-400/80 animate-pulse"}`}
                aria-hidden="true"
              />
            </span>

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">PAGO</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{metodoPago}</span>
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Resumen */}
          <div className="bg-blendfort-fondo rounded-[2.5rem] border border-black/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                Resumen
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                Auditoría
              </span>
            </div>

            <div className="space-y-3 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Fecha</span>
                <span className="font-black uppercase tracking-tight text-black">
                  {formatFecha(egreso.fecha)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Factura</span>
                <span className="font-black uppercase tracking-tight text-black">{factura}</span>
              </div>

              {/* ✅ Auditoría real */}
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Creado por</span>
                <span className="font-black uppercase tracking-tight text-black text-right max-w-[60%] truncate">
                  {creadoPor}
                </span>
              </div>

              {creadoRol ? (
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Rol</span>
                  <span className="font-black uppercase tracking-tight text-black">
                    {creadoRol}
                  </span>
                </div>
              ) : null}

              {actualizadoPor ? (
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Actualizado</span>
                  <span className="font-black uppercase tracking-tight text-black text-right max-w-[60%] truncate">
                    {actualizadoPor}{actualizadoRol ? ` · ${actualizadoRol}` : ""}
                  </span>
                </div>
              ) : null}

              <div className="pt-4 mt-2 border-t border-black/5 flex items-center justify-between">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-[0.25em]">
                  Total
                </span>
                <span className="text-[11px] font-black uppercase tracking-tight text-black">
                  {money(egreso.valor || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Detalle */}
          <div className="bg-white rounded-[2.5rem] border border-black/5 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                Detalle
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                Registro
              </span>
            </div>

            <div className="space-y-3 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Concepto</span>
                <span className="font-black uppercase tracking-tight text-black text-right max-w-[56%] truncate">
                  {(egreso.concepto || "—").toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Ubicación</span>
                <span className="font-black uppercase tracking-tight text-black text-right max-w-[56%] truncate">
                  {(egreso.lugar || "—").toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Método</span>
                <span className="font-black uppercase tracking-tight text-blendfort-naranja">
                  {metodoPago}
                </span>
              </div>

              {egreso.detalles ? (
                <div className="pt-4 mt-2 border-t border-black/5">
                  <div className="text-[8px] font-black uppercase opacity-20 tracking-widest mb-2">
                    Observación
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-tight text-black/70 leading-relaxed">
                    {String(egreso.detalles).toUpperCase()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-[7px] font-black uppercase opacity-20 tracking-[0.3em]">
              LOG #{egreso.id}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onEdit}
                type="button"
                className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
                aria-label="Editar"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              <button
                onClick={onDelete}
                type="button"
                className="w-11 h-11 rounded-full bg-red-50 text-red-500/40 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                aria-label="Eliminar"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20">
            Tip: edita el registro para corregir datos
          </div>
        </div>
      </div>
    </div>
  );
};

export default EgresoDetailModal;