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
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normUp = (s) => String(s || "").toUpperCase().trim();

const getCreadoPor = (egreso) => {
  return (
    normUp(egreso?.creadoPorNombre) ||
    normUp(egreso?.creado_por_nombre) ||
    normUp(egreso?.creadoPor) ||
    normUp(egreso?.creado_por) ||
    normUp(egreso?.residente) ||
    "ADMIN"
  );
};

const getCreadoRol = (egreso) => {
  return normUp(egreso?.creadoPorRol) || normUp(egreso?.creado_por_rol) || "";
};

const getActualizadoPor = (egreso) => {
  return normUp(egreso?.actualizadoPor) || normUp(egreso?.actualizado_por) || "";
};

const getActualizadoRol = (egreso) => {
  return normUp(egreso?.actualizadoPorRol) || normUp(egreso?.actualizado_por_rol) || "";
};

const getAnuladoPor = (egreso) => {
  return normUp(egreso?.anulado_por) || "";
};

const getAnuladoRol = (egreso) => {
  return normUp(egreso?.anulado_por_rol) || "";
};

const EgresoDetailModal = ({ egreso, onClose, onEdit, onDelete }) => {
  if (!egreso) return null;

  const estado = String(egreso.estado || "PENDIENTE").toUpperCase();
  const esPagado = estado === "PAGADO" || estado === "COMPLETADO";
  const esAnulado = estado === "ANULADO";

  const proyecto = (egreso.proyecto || "SIN PROYECTO").toUpperCase();
  const categoria = (egreso.categoria || "SIN CATEGORÍA").toUpperCase();
  const metodoPago = (egreso.metodoPago || egreso.metodo_pago || "—").toUpperCase();
  const factura = egreso.factura === "si" || egreso.tieneFactura ? "SÍ" : "NO";

  const creadoPor = getCreadoPor(egreso);
  const creadoRol = getCreadoRol(egreso);
  const actualizadoPor = getActualizadoPor(egreso);
  const actualizadoRol = getActualizadoRol(egreso);
  const anuladoPor = getAnuladoPor(egreso);
  const anuladoRol = getAnuladoRol(egreso);

  const anuladoAt = egreso?.anulado_at ? formatFecha(String(egreso.anulado_at).slice(0, 10)) : "";

  return (
    <div
      className="fixed inset-0 z-[150] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-md rounded-[2.4rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Header */}
          <div
            className={`relative px-8 pt-10 pb-8 ${
              esAnulado ? "bg-red-600 text-white" : "bg-black text-white"
            }`}
          >
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

            <h4
              className={`text-2xl font-black uppercase tracking-tight leading-tight ${
                esAnulado ? "line-through decoration-red-200 decoration-2" : ""
              }`}
            >
              {proyecto}
            </h4>

            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50 mt-1">
              {creadoPor}
              {creadoRol ? <span className="ml-2 text-white/30">· {creadoRol}</span> : null}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">CAT</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{categoria}</span>
              </span>

              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                  esAnulado
                    ? "bg-white text-red-700 border-red-100"
                    : "bg-white/10 border-white/10"
                }`}
              >
                <span className={`text-[7px] font-black uppercase tracking-[0.25em] ${esAnulado ? "text-red-500/70" : "text-white/50"}`}>
                  EST
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest">{estado}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    esAnulado
                      ? "bg-red-600"
                      : esPagado
                      ? "bg-green-400/80"
                      : "bg-amber-400/80 animate-pulse"
                  }`}
                  aria-hidden="true"
                />
              </span>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">PAGO</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{metodoPago}</span>
              </span>

              {esAnulado && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-red-700 border border-red-100">
                  <span className="text-[7px] font-black uppercase tracking-[0.25em] text-red-500/70">
                    LOG
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest">REGISTRO ANULADO</span>
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            {/* Resumen */}
            <div
              className={`rounded-[2.2rem] border p-6 ${
                esAnulado
                  ? "bg-red-50/50 border-red-100"
                  : "bg-blendfort-fondo border-black/5"
              }`}
            >
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

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Creado por</span>
                  <span className="font-black uppercase tracking-tight text-black text-right max-w-[60%] truncate">
                    {creadoPor}
                  </span>
                </div>

                {creadoRol ? (
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Rol</span>
                    <span className="font-black uppercase tracking-tight text-black">{creadoRol}</span>
                  </div>
                ) : null}

                {actualizadoPor ? (
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Actualizado</span>
                    <span className="font-black uppercase tracking-tight text-black text-right max-w-[60%] truncate">
                      {actualizadoPor}
                      {actualizadoRol ? ` · ${actualizadoRol}` : ""}
                    </span>
                  </div>
                ) : null}

                {esAnulado && (
                  <>
                    {anuladoAt ? (
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Anulado el</span>
                        <span className="font-black uppercase tracking-tight text-red-700">
                          {anuladoAt}
                        </span>
                      </div>
                    ) : null}

                    {anuladoPor ? (
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Anulado por</span>
                        <span className="font-black uppercase tracking-tight text-red-700 text-right max-w-[60%] truncate">
                          {anuladoPor}
                          {anuladoRol ? ` · ${anuladoRol}` : ""}
                        </span>
                      </div>
                    ) : null}

                    {egreso?.motivo_anulacion ? (
                      <div className="pt-3 mt-2 border-t border-red-100">
                        <div className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-2 text-red-700">
                          Motivo de anulación
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-tight text-red-700/90 leading-relaxed">
                          {String(egreso.motivo_anulacion).toUpperCase()}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="pt-4 mt-2 border-t border-black/5 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-[0.25em]">
                    Total
                  </span>
                  <span
                    className={`text-[11px] font-black uppercase tracking-tight ${
                      esAnulado ? "text-red-700 line-through decoration-red-300" : "text-black"
                    }`}
                  >
                    {money(egreso.valor || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Detalle */}
            <div className="bg-white rounded-[2.2rem] border border-black/5 p-6 shadow-sm">
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
                  <span
                    className={`font-black uppercase tracking-tight text-right max-w-[56%] truncate ${
                      esAnulado
                        ? "text-red-700/80 line-through decoration-red-300"
                        : "text-black"
                    }`}
                  >
                    {(egreso.concepto || "—").toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Ubicación</span>
                  <span
                    className={`font-black uppercase tracking-tight text-right max-w-[56%] truncate ${
                      esAnulado
                        ? "text-red-700/80 line-through decoration-red-300"
                        : "text-black"
                    }`}
                  >
                    {(egreso.lugar || "—").toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Método</span>
                  <span className={`font-black uppercase tracking-tight ${esAnulado ? "text-red-500" : "text-blendfort-naranja"}`}>
                    {esAnulado ? "ANULADO" : metodoPago}
                  </span>
                </div>

                {egreso.detalles ? (
                  <div className="pt-4 mt-2 border-t border-black/5">
                    <div className="text-[8px] font-black uppercase opacity-20 tracking-widest mb-2">
                      Observación
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-tight leading-relaxed ${
                      esAnulado ? "text-red-700/80" : "text-black/70"
                    }`}>
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
                  disabled={esAnulado}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    esAnulado
                      ? "bg-black/10 text-black/20 cursor-not-allowed"
                      : "bg-black text-white hover:bg-blendfort-naranja active:scale-90"
                  }`}
                  aria-label="Editar"
                  title={esAnulado ? "No se puede editar un registro anulado" : "Editar"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>

                <button
                  onClick={onDelete}
                  type="button"
                  disabled={esAnulado}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    esAnulado
                      ? "bg-red-50 text-red-200 cursor-not-allowed"
                      : "bg-red-50 text-red-500/40 hover:bg-red-500 hover:text-white active:scale-90"
                  }`}
                  aria-label="Anular"
                  title={esAnulado ? "El registro ya está anulado" : "Anular"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20">
              {esAnulado
                ? "Registro anulado conservado para auditoría"
                : "Tip: edita el registro para corregir datos"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EgresoDetailModal;