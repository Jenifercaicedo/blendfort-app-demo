import React from "react";

const formatFecha = (iso) => {
  if (!iso) return "NO REGISTRADA";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
};

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$ 0.00";
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normU = (s) => String(s || "").toUpperCase().trim();

const getCreador = (e) => {
  const v =
    e?.creadoPorNombre ||
    e?.creado_por_nombre ||
    e?.creadoPor ||
    e?.creado_por ||
    e?.residente ||
    "";
  return normU(v) || "—";
};

const getRol = (e) =>
  normU(
    e?.creadoPorRol ||
      e?.creado_por_rol ||
      e?.actualizadoPorRol ||
      e?.actualizado_por_rol ||
      ""
  );

const hasFactura = (e) =>
  Boolean(e?.tieneFactura) || String(e?.factura || "").toLowerCase() === "si";

const getAnuladoPor = (e) => normU(e?.anulado_por || "");
const getAnuladoRol = (e) => normU(e?.anulado_por_rol || "");
const getMotivoAnulacion = (e) => normU(e?.motivo_anulacion || "");

const estadoTone = (estado) => {
  const e = normU(estado || "PENDIENTE");
  if (e === "ANULADO") return "bg-red-50 text-red-700 border-red-200";
  if (e === "PAGADO" || e === "COMPLETADO")
    return "bg-green-50 text-green-700 border-green-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const rolTone = (rol) => {
  const r = normU(rol);
  if (r === "ADMIN") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  return "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20";
};

const DetailRow = ({ label, value, valueClassName = "" }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-[10px] font-medium text-slate-500">{label}</span>
    <span
      className={`max-w-[58%] text-right text-[12px] font-semibold text-slate-800 break-words ${valueClassName}`}
    >
      {value}
    </span>
  </div>
);

const SectionCard = ({ title, subtitle, children, tone = "default" }) => {
  const toneClass =
    tone === "danger"
      ? "bg-red-50/60 border-red-100"
      : "bg-[#F9F9F6] border-black/5";

  return (
    <div className={`rounded-[1.6rem] border p-5 md:p-6 ${toneClass}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-500">{title}</p>
        </div>
        {subtitle ? (
          <span className="text-[10px] font-medium text-slate-400">{subtitle}</span>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

const EgresoDetalleResidenteModal = ({ egreso, onClose, onEdit, onDelete }) => {
  if (!egreso) return null;

  const estado = normU(egreso.estado || "PENDIENTE");
  const esPagado = estado === "PAGADO" || estado === "COMPLETADO";
  const esAnulado = estado === "ANULADO";

  const proyecto = normU(egreso.proyecto || "SIN PROYECTO");
  const concepto = normU(egreso.concepto || "—");
  const categoria = normU(egreso.categoria || "—");
  const lugar = normU(egreso.lugar || "—");
  const metodoPago = normU(egreso.metodoPago || egreso.metodo_pago || "—");
  const pagadoPor = normU(egreso.pagadoPor || egreso.pagado_por || "—");
  const facturaTxt = hasFactura(egreso) ? "SÍ" : "NO";

  const creador = getCreador(egreso);
  const rol = getRol(egreso);

  const anuladoPor = getAnuladoPor(egreso);
  const anuladoRol = getAnuladoRol(egreso);
  const motivoAnulacion = getMotivoAnulacion(egreso);
  const fechaAnulacion = egreso?.anulado_at
    ? formatFecha(String(egreso.anulado_at).slice(0, 10))
    : "";

  return (
    <div
      className="fixed inset-0 z-[180] overflow-y-auto bg-black/55 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full max-w-[560px] overflow-hidden rounded-[2rem] md:rounded-[2.4rem] border border-black/5 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] animate-in zoom-in-95 duration-300 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Header */}
          <div
            className={`relative border-b px-5 pb-5 pt-5 md:px-6 md:pb-6 md:pt-6 ${
              esAnulado
                ? "bg-red-50/80 border-red-100"
                : "bg-[linear-gradient(180deg,#FFF8E8_0%,#FFFFFF_100%)] border-black/5"
            }`}
          >
            <button
              onClick={onClose}
              type="button"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-800 hover:text-white"
              aria-label="Cerrar"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.8"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pr-12">
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-6 bg-[#FCB017]" />
                <span className="text-[10px] font-semibold text-[#C98500]">
                  Detalle de egreso
                </span>
              </div>

              <h3
                className={`mt-3 text-[24px] md:text-[28px] font-black uppercase tracking-tight leading-none ${
                  esAnulado ? "text-red-700" : "text-slate-800"
                }`}
              >
                {proyecto}
              </h3>

              <p
                className={`mt-2 text-[13px] font-semibold uppercase tracking-tight ${
                  esAnulado ? "text-red-700/80" : "text-slate-700"
                }`}
              >
                {concepto}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${estadoTone(
                    estado
                  )}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      esAnulado
                        ? "bg-red-600"
                        : esPagado
                        ? "bg-green-600"
                        : "bg-amber-500"
                    }`}
                  />
                  {estado}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1 text-[11px] font-semibold text-[#C98500]">
                  {categoria}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {esAnulado ? "ANULADO" : metodoPago}
                </span>

                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${rolTone(rol)}`}>
                  {creador}
                  {rol ? <span className="opacity-70">· {rol}</span> : null}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 p-5 md:p-6">
            <SectionCard
              title="Resumen"
              subtitle="Auditoría"
              tone={esAnulado ? "danger" : "default"}
            >
              <DetailRow label="Fecha" value={formatFecha(egreso.fecha)} />
              <DetailRow label="Factura" value={facturaTxt} />
              <DetailRow label="Pagado por" value={pagadoPor} />

              {esAnulado && fechaAnulacion ? (
                <DetailRow
                  label="Anulado el"
                  value={fechaAnulacion}
                  valueClassName="text-red-700"
                />
              ) : null}

              {esAnulado && anuladoPor ? (
                <DetailRow
                  label="Anulado por"
                  value={`${anuladoPor}${anuladoRol ? ` · ${anuladoRol}` : ""}`}
                  valueClassName="text-red-700"
                />
              ) : null}

              <div className="border-t border-black/5 pt-3 mt-3">
                <DetailRow
                  label="Total"
                  value={money(egreso.valor || 0)}
                  valueClassName={`text-[14px] font-black ${
                    esAnulado ? "text-red-700 line-through decoration-red-300" : ""
                  }`}
                />
              </div>
            </SectionCard>

            <SectionCard title="Detalle" subtitle="Registro">
              <DetailRow
                label="Concepto"
                value={concepto}
                valueClassName={
                  esAnulado
                    ? "text-red-700/80 line-through decoration-red-300"
                    : ""
                }
              />
              <DetailRow
                label="Ubicación"
                value={lugar}
                valueClassName={
                  esAnulado
                    ? "text-red-700/80 line-through decoration-red-300"
                    : ""
                }
              />
              <DetailRow
                label="Método"
                value={esAnulado ? "ANULADO" : metodoPago}
                valueClassName={esAnulado ? "text-red-600" : "text-[#C98500]"}
              />

              {egreso.detalles ? (
                <div className="border-t border-black/5 pt-3 mt-3">
                  <p className="text-[10px] font-medium text-slate-500">Observación</p>
                  <p
                    className={`mt-2 text-[12px] font-semibold leading-relaxed ${
                      esAnulado ? "text-red-700/80" : "text-slate-700"
                    }`}
                  >
                    {normU(egreso.detalles)}
                  </p>
                </div>
              ) : null}

              {esAnulado && motivoAnulacion ? (
                <div className="border-t border-red-100 pt-3 mt-3">
                  <p className="text-[10px] font-medium text-red-500">
                    Motivo de anulación
                  </p>
                  <p className="mt-2 text-[12px] font-semibold leading-relaxed text-red-700">
                    {motivoAnulacion}
                  </p>
                </div>
              ) : null}
            </SectionCard>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="text-[10px] font-medium text-slate-400">
                LOG #{egreso.id}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  type="button"
                  disabled={esAnulado}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold transition-all ${
                    esAnulado
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                      : "bg-slate-800 text-white hover:bg-[#FCB017]"
                  }`}
                  aria-label="Editar"
                  title={esAnulado ? "No se puede editar un registro anulado" : "Editar"}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    <path d="M19.5 7.125L16.875 4.5" />
                  </svg>
                  <span className="hidden sm:inline">Editar</span>
                </button>

                <button
                  onClick={onDelete}
                  type="button"
                  disabled={esAnulado}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold transition-all ${
                    esAnulado
                      ? "bg-red-50 text-red-200 cursor-not-allowed"
                      : "bg-red-50 text-red-600 hover:bg-red-500 hover:text-white"
                  }`}
                  aria-label="Anular"
                  title={esAnulado ? "El registro ya está anulado" : "Anular"}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Anular</span>
                </button>
              </div>
            </div>

            <div className="text-[10px] font-medium text-slate-400">
              {esAnulado
                ? "Registro anulado conservado para auditoría."
                : "Usa editar para corregir datos del registro."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EgresoDetalleResidenteModal;