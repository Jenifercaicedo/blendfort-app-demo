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

const Chip = ({ children, tone = "default", icon = "" }) => {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "accent"
      ? "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20"
      : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${toneClass}`}
    >
      {icon ? <i className={`${icon} text-[11px]`} /> : null}
      <span>{children}</span>
    </div>
  );
};

const DataRow = ({ label, value, danger = false, strike = false }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <span className="text-[11px] font-semibold text-slate-500">{label}</span>
    <span
      className={`text-[12px] font-black tracking-tight text-right ${
        danger ? "text-red-700" : "text-slate-800"
      } ${strike ? "line-through decoration-red-300" : ""}`}
    >
      {value}
    </span>
  </div>
);

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

  const anuladoAt = egreso?.anulado_at
    ? formatFecha(String(egreso.anulado_at).slice(0, 10))
    : "";

  const estadoTone = esAnulado
    ? "danger"
    : esPagado
    ? "success"
    : "warning";

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
        <div className="bg-white w-full max-w-lg rounded-[2rem] md:rounded-[2.7rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] overflow-hidden border border-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          <div className="relative px-6 md:px-8 pt-7 md:pt-8 pb-5 border-b border-black/5 bg-white">
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-600 hover:border-[#FCB017] hover:text-[#C98500] transition-all"
              aria-label="Cerrar"
            >
              <i className="pi pi-times text-[13px]" />
            </button>

            <div className="pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 h-[2px] bg-[#FCB017]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C98500]">
                  Detalle de egreso
                </span>
              </div>

              <h4
                className={`mt-3 text-[28px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none ${
                  esAnulado ? "line-through decoration-red-300" : ""
                }`}
              >
                {proyecto}
              </h4>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon="pi pi-tag" tone="accent">
                  {categoria}
                </Chip>

                <Chip
                  icon={
                    esAnulado
                      ? "pi pi-times-circle"
                      : esPagado
                      ? "pi pi-check-circle"
                      : "pi pi-clock"
                  }
                  tone={estadoTone}
                >
                  {estado}
                </Chip>

                <Chip icon="pi pi-credit-card">{metodoPago}</Chip>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            <div className="rounded-[1.5rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                    Resumen
                  </p>
                  <p className="mt-1 text-[20px] font-black tracking-tight text-slate-800">
                    {money(egreso.valor || 0)}
                  </p>
                </div>

                <Chip icon="pi pi-receipt" tone={factura === "SÍ" ? "accent" : "default"}>
                  Factura: {factura}
                </Chip>
              </div>

              <div className="mt-4 divide-y divide-black/5">
                <DataRow
                  label="Fecha"
                  value={formatFecha(egreso.fecha)}
                />
                <DataRow
                  label="Creado por"
                  value={`${creadoPor}${creadoRol ? ` · ${creadoRol}` : ""}`}
                />
                {actualizadoPor ? (
                  <DataRow
                    label="Actualizado por"
                    value={`${actualizadoPor}${actualizadoRol ? ` · ${actualizadoRol}` : ""}`}
                  />
                ) : null}
                <DataRow
                  label="Método de pago"
                  value={esAnulado ? "ANULADO" : metodoPago}
                  danger={esAnulado}
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 md:p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                Detalle
              </p>

              <div className="mt-4 divide-y divide-black/5">
                <DataRow
                  label="Concepto"
                  value={(egreso.concepto || "—").toUpperCase()}
                  danger={esAnulado}
                  strike={esAnulado}
                />
                <DataRow
                  label="Ubicación"
                  value={(egreso.lugar || "—").toUpperCase()}
                  danger={esAnulado}
                  strike={esAnulado}
                />
              </div>

              {egreso.detalles ? (
                <div className="mt-4 rounded-[1.1rem] border border-black/5 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Observación
                  </p>
                  <p
                    className={`mt-2 text-[12px] font-semibold leading-relaxed ${
                      esAnulado ? "text-red-700/80" : "text-slate-700"
                    }`}
                  >
                    {String(egreso.detalles).toUpperCase()}
                  </p>
                </div>
              ) : null}
            </div>

            {esAnulado && (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 md:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">
                  Auditoría de anulación
                </p>

                <div className="mt-3 divide-y divide-red-200/70">
                  {anuladoAt ? (
                    <DataRow label="Anulado el" value={anuladoAt} danger />
                  ) : null}

                  {anuladoPor ? (
                    <DataRow
                      label="Anulado por"
                      value={`${anuladoPor}${anuladoRol ? ` · ${anuladoRol}` : ""}`}
                      danger
                    />
                  ) : null}
                </div>

                {egreso?.motivo_anulacion ? (
                  <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-white/70 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">
                      Motivo
                    </p>
                    <p className="mt-2 text-[12px] font-semibold leading-relaxed text-red-700/90">
                      {String(egreso.motivo_anulacion).toUpperCase()}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="text-[10px] font-semibold text-slate-400">
                LOG #{egreso.id}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  type="button"
                  disabled={esAnulado}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                    esAnulado
                      ? "bg-black/10 text-black/20 cursor-not-allowed"
                      : "bg-slate-800 text-white hover:bg-[#FCB017] active:scale-90"
                  }`}
                  aria-label="Editar"
                  title={esAnulado ? "No se puede editar un registro anulado" : "Editar"}
                >
                  <i className="pi pi-pencil text-[13px]" />
                </button>

                <button
                  onClick={onDelete}
                  type="button"
                  disabled={esAnulado}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                    esAnulado
                      ? "bg-red-50 text-red-200 cursor-not-allowed"
                      : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white active:scale-90"
                  }`}
                  aria-label="Anular"
                  title={esAnulado ? "El registro ya está anulado" : "Anular"}
                >
                  <i className="pi pi-trash text-[13px]" />
                </button>
              </div>
            </div>

            <p className="text-[11px] font-medium text-slate-400">
              {esAnulado
                ? "Registro anulado conservado para auditoría."
                : "Puedes editar el registro o anularlo desde aquí."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EgresoDetailModal;