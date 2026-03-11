// ManoObraDetalleModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad2 = (n) => String(n || "").padStart(2, "0");

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$ 0.00";
  return `$ ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const ManoObraDetalleModal = ({
  show,
  detalle, // { nombre, rows }
  proyectoActivo,
  semanaActiva,
  onClose,
  onPagarSemana,
  onEditReporte,
}) => {
  // Hooks SIEMPRE corren (valores seguros aunque no haya detalle)
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
      (r) => String(r?.estado || "PENDIENTE").toUpperCase().trim() === "PENDIENTE"
    )
      ? "PENDIENTE"
      : "PAGADO";

    return { dias, horas, bonos, desc, neto, estadoSemana };
  }, [rows]);

  const rango = useMemo(() => formatRangoES(rows), [rows]);
  const puedePagar = Boolean(semanaActiva);

  const opcionesDias = useMemo(() => {
    return rows
      .slice(-10)
      .map((r) => ({
        id: r?.id,
        label: `${formatDiaES(r?.fecha)} · ${r?.asistio === false ? "NO ASISTIÓ" : "ASISTIÓ"}`,
      }))
      .filter((x) => x.id != null)
      .reverse();
  }, [rows]);

  const [diaSeleccionado, setDiaSeleccionado] = useState("");

  useEffect(() => {
    if (!show) return;
    const last = rows[rows.length - 1];
    setDiaSeleccionado(last?.id ? String(last.id) : "");
  }, [show, nombreEmpleado, rows.length]); //  más seguro

  const rowSeleccionado = useMemo(() => {
    const idN = Number(diaSeleccionado);
    if (!Number.isFinite(idN)) return null;
    return rows.find((r) => Number(r?.id) === idN) || null;
  }, [diaSeleccionado, rows]);

  const labelSeleccionado =
    opcionesDias.find((x) => String(x.id) === String(diaSeleccionado))?.label || "";

  // El return condicional va DESPUÉS de hooks
  if (!show || !detalle) return null;

  return (
    <div
      className="fixed inset-0 z-[170] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-[100vh] w-full flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300 max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-32px)] flex flex-col">
          {/* Header */}
          <div className="bg-black text-white relative px-7 sm:px-8 pt-9 sm:pt-10 pb-7 sm:pb-8">
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-blendfort-naranja transition-all"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[8px] font-black uppercase tracking-[0.45em] text-white/60">
                Payroll Profile
              </span>
            </div>

            <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">
              {detalle.nombre}
            </h4>

            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50 mt-1">
              {String(proyectoActivo || "SIN PROYECTO").toUpperCase()}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">RANGO</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{rango}</span>
              </span>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">DÍAS</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{resumen.dias}</span>
              </span>

              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                  resumen.estadoSemana === "PAGADO"
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-amber-500/10 border-amber-500/20"
                }`}
              >
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">EST</span>
                <span
                  className={`text-[8px] font-black uppercase tracking-widest ${
                    resumen.estadoSemana === "PAGADO" ? "text-green-300" : "text-amber-300"
                  }`}
                >
                  {resumen.estadoSemana}
                </span>
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-7 sm:p-8 space-y-6">
            {/* Identidad */}
            <div className="bg-blendfort-fondo rounded-[2.5rem] border border-black/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                  Identidad
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                  Nómina
                </span>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Proyecto</span>
                  <span className="font-black uppercase tracking-tight text-black">
                    {String(proyectoActivo || "SIN PROYECTO").toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Periodo</span>
                  <span className="font-black uppercase tracking-tight text-black">{rango}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Semana</span>
                  <span className="font-black uppercase tracking-tight text-black">
                    {semanaActiva ? String(semanaActiva) : "NO FILTRADA"}
                  </span>
                </div>
              </div>
            </div>

            {/* Compensación */}
            <div className="bg-white rounded-[2.5rem] border border-black/5 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                  Compensación
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                  Resumen
                </span>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Horas extras</span>
                  <span className="font-black uppercase tracking-tight text-black">{resumen.horas}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Bonos</span>
                  <span className="font-black uppercase tracking-tight text-black">{money(resumen.bonos)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Descuentos</span>
                  <span className="font-black uppercase tracking-tight text-red-500">- {money(resumen.desc)}</span>
                </div>

                <div className="pt-4 mt-2 border-t border-black/5 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-[0.25em]">
                    Total Neto
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-tight text-black">
                    {money(resumen.neto)}
                  </span>
                </div>
              </div>
            </div>

            {/* Editar día */}
            <div className="bg-blendfort-fondo rounded-[2.5rem] border border-black/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                  Corrección
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                  Editar día
                </span>
              </div>

              <div className="space-y-4">
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

                <button
                  type="button"
                  onClick={() => rowSeleccionado && onEditReporte?.(rowSeleccionado)}
                  disabled={!rowSeleccionado}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 ${
                    rowSeleccionado
                      ? "bg-black text-white hover:bg-blendfort-naranja"
                      : "bg-black/10 text-black/30 cursor-not-allowed"
                  }`}
                >
                  Editar Reporte
                </button>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-[7px] font-black uppercase opacity-20 tracking-[0.3em]">
                ACCIONES
              </div>

              <button
                type="button"
                onClick={() => onPagarSemana?.(detalle.nombre)}
                disabled={!puedePagar}
                className={`h-11 px-6 rounded-full font-black uppercase tracking-[0.35em] transition-all shadow-lg active:scale-95 ${
                  puedePagar
                    ? "bg-black text-white hover:bg-blendfort-naranja"
                    : "bg-black/10 text-black/30 cursor-not-allowed"
                }`}
                title={puedePagar ? "Marcar semana como pagada" : "Filtra por semana para pagar"}
              >
                Pagar Semana
              </button>
            </div>

            <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20">
              Tip: filtra por semana para pagar correctamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManoObraDetalleModal;