import React, { useEffect, useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad2 = (n) => String(n || "").padStart(2, "0");
const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$ 0.00";
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatRangoES = (rows = []) => {
  const fechas = rows
    .map((r) => String(r?.fecha || ""))
    .filter(Boolean)
    .slice()
    .sort();

  if (!fechas.length) return "NO REGISTRADA";

  const a = fechas[0];
  const b = fechas[fechas.length - 1];

  const [y1, m1, d1] = a.split("-");
  const [y2, m2, d2] = b.split("-");

  const mes1 = MESES[(Number(m1) || 1) - 1] || "";
  const mes2 = MESES[(Number(m2) || 1) - 1] || "";

  if (a === b) return `${pad2(d1)} de ${mes1}`;
  if (y1 === y2 && m1 === m2) return `${pad2(d1)}–${pad2(d2)} de ${mes1}`;

  return `${pad2(d1)} de ${mes1} – ${pad2(d2)} de ${mes2}`;
};

const formatDiaES = (iso) => {
  if (!iso) return "—";
  const [, m, d] = String(iso).split("-");
  const mes = MESES[(Number(m) || 1) - 1] || "";
  return `${pad2(d)} de ${mes}`;
};

const Chip = ({ children, tone = "default", icon = "" }) => {
  const toneClass =
    tone === "success"
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

const DataRow = ({ label, value, accent = false, danger = false }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <span className="text-[11px] font-medium text-slate-500">{label}</span>
    <span
      className={`text-[12px] font-black tracking-tight text-right ${
        danger ? "text-red-600" : accent ? "text-[#C98500]" : "text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

const ManoObraDetalleModal = ({
  show,
  detalle,
  proyectoActivo,
  semanaActiva,
  semanaLabel = "",
  onClose,
  onPagarSemana,
  onEditReporte,
}) => {
  const nombreEmpleado = String(detalle?.nombre || "").toUpperCase();
  const baseRows = Array.isArray(detalle?.rows) ? detalle.rows : [];

  const rows = useMemo(() => {
    return baseRows
      .slice()
      .sort((a, b) => String(a?.fecha || "").localeCompare(String(b?.fecha || "")));
  }, [baseRows]);

  const resumen = useMemo(() => {
    const dias = rows.reduce((t, r) => t + (r?.asistio === false ? 0 : 1), 0);
    const horas = rows.reduce((t, r) => t + (Number(r?.numHorasExtras) || 0), 0);
    const bonos = rows.reduce((t, r) => t + (Number(r?.valoresPendientes) || 0), 0);
    const desc = rows.reduce((t, r) => t + (Number(r?.descuentos) || 0), 0);
    const neto = rows.reduce((t, r) => t + (Number(r?.valor) || 0), 0);

    const estadoSemana = rows.some(
      (r) => norm(r?.estado || "PENDIENTE") === "PENDIENTE"
    )
      ? "PENDIENTE"
      : "PAGADO";

    return { dias, horas, bonos, desc, neto, estadoSemana };
  }, [rows]);

  const rango = useMemo(() => formatRangoES(rows), [rows]);

  const opcionesDias = useMemo(() => {
    return rows
      .slice(-10)
      .map((r) => {
        const estado = norm(r?.estado || "PENDIENTE");
        const anulado = estado === "ANULADO";

        return {
          id: r?.id,
          label: `${formatDiaES(r?.fecha)} · ${
            r?.asistio === false ? "NO ASISTIÓ" : "ASISTIÓ"
          }${anulado ? " · ANULADO" : ""}`,
        };
      })
      .filter((x) => x.id != null)
      .reverse();
  }, [rows]);

  const [diaSeleccionado, setDiaSeleccionado] = useState("");

  useEffect(() => {
    if (!show) return;
    const last = rows[rows.length - 1];
    setDiaSeleccionado(last?.id ? String(last.id) : "");
  }, [show, nombreEmpleado, rows]);

  const rowSeleccionado = useMemo(() => {
    const idN = Number(diaSeleccionado);
    if (!Number.isFinite(idN)) return null;
    return rows.find((r) => Number(r?.id) === idN) || null;
  }, [diaSeleccionado, rows]);

  const labelSeleccionado =
    opcionesDias.find((x) => String(x.id) === String(diaSeleccionado))?.label || "";

  const estadoRowSeleccionado = norm(rowSeleccionado?.estado || "");
  const rowSeleccionadoAnulado = estadoRowSeleccionado === "ANULADO";

  const puedePagar = Boolean(semanaActiva) && resumen.estadoSemana !== "PAGADO";

  if (!show || !detalle) return null;

  return (
    <div
      className="fixed inset-0 z-[170] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-lg rounded-[2rem] md:rounded-[2.7rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300 max-h-[calc(100vh-4rem)] overflow-y-auto">
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
                  Detalle de nómina
                </span>
              </div>

              <h4 className="mt-3 text-[28px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none">
                {detalle.nombre}
              </h4>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon="pi pi-calendar" tone="accent">
                  {rango}
                </Chip>

                <Chip
                  icon="pi pi-check-circle"
                  tone={resumen.estadoSemana === "PAGADO" ? "success" : "warning"}
                >
                  {resumen.estadoSemana}
                </Chip>

                <Chip icon="pi pi-briefcase">
                  {String(proyectoActivo || "SIN PROYECTO").toUpperCase()}
                </Chip>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            <div className="rounded-[1.5rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                Resumen
              </p>

              <div className="mt-4 divide-y divide-black/5">
                <DataRow
                  label="Proyecto"
                  value={String(proyectoActivo || "SIN PROYECTO").toUpperCase()}
                />
                <DataRow label="Periodo" value={rango} />
                <DataRow
                  label="Semana"
                  value={semanaActiva ? semanaLabel || rango : "NO FILTRADA"}
                />
                <DataRow label="Días trabajados" value={resumen.dias} />
                <DataRow label="Horas extra" value={resumen.horas} />
                <DataRow label="Bonos" value={money(resumen.bonos)} />
                <DataRow label="Descuentos" value={`- ${money(resumen.desc)}`} danger />
                <DataRow label="Total neto" value={money(resumen.neto)} accent />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 md:p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                Editar día
              </p>

              <div className="mt-4 space-y-4">
                <CustomSelect
                  label="Día"
                  options={opcionesDias.map((x) => x.label)}
                  value={labelSeleccionado}
                  onChange={(val) => {
                    const pick = opcionesDias.find((x) => x.label === val);
                    setDiaSeleccionado(pick ? String(pick.id) : "");
                  }}
                  placeholder={opcionesDias.length ? "SELECCIONAR..." : "SIN REGISTROS"}
                  allowCustom={false}
                  disabled={!opcionesDias.length}
                />

                {rowSeleccionadoAnulado && (
                  <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-red-700">
                      Este reporte está anulado y no puede editarse.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => rowSeleccionado && onEditReporte?.(rowSeleccionado)}
                  disabled={!rowSeleccionado || rowSeleccionadoAnulado}
                  className={`w-full rounded-full py-4 text-[13px] font-semibold transition-all active:scale-95 ${
                    rowSeleccionado && !rowSeleccionadoAnulado
                      ? "bg-slate-800 text-white hover:bg-[#FCB017]"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  Editar reporte
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-[11px] font-medium text-slate-400">
                {!semanaActiva
                  ? "Filtra por semana para pagar correctamente."
                  : resumen.estadoSemana === "PAGADO"
                  ? "La semana ya figura como pagada."
                  : "Puedes editar un día o pagar la semana completa."}
              </p>

              <button
                type="button"
                onClick={() => onPagarSemana?.(detalle.nombre)}
                disabled={!puedePagar}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold transition-all ${
                  puedePagar
                    ? "bg-slate-800 text-white hover:bg-[#FCB017]"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
                title={
                  !semanaActiva
                    ? "Filtra por semana para pagar"
                    : resumen.estadoSemana === "PAGADO"
                    ? "La semana ya está pagada"
                    : "Marcar semana como pagada"
                }
              >
                <i className="pi pi-check text-[11px]" />
                <span>Pagar semana</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManoObraDetalleModal;