import React, { useMemo, useRef, useState, useEffect } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const normU = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const num0 = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const ReporteDiarioModal = ({
  show,
  onClose,
  proyectoActivo,
  registradoPor = "ADMIN",
  onSuccess,
  mode = "create",
  reporteInicial = null,
  onOpenLista,
}) => {
  const { personal, addReporteDiario, updateReporteDiario } = useAppContext();

  const initialForm = useMemo(
    () => ({
      fecha: todayISO(),
      empleado: "",
      asistio: true,
      horasExtras: "",
      bonos: "",
      descuentos: "",
      observacion: "",
    }),
    []
  );

  const [form, setForm] = useState(initialForm);
  const inputRef = useRef(null);

  const esEdicion = mode === "edit";
  const estadoReporte = normU(reporteInicial?.estado || "PENDIENTE");
  const esAnulado = esEdicion && estadoReporte === "ANULADO";

  const noOperariosHints = useMemo(
    () => [
      "RESIDENTE",
      "ING",
      "ING.",
      "INGENIERO",
      "ARQUITECTO",
      "ARQ",
      "ARQ.",
      "ADMIN",
      "CONTADOR",
      "OFICINA",
    ],
    []
  );

  const operarios = useMemo(() => {
    const pAct = normU(proyectoActivo);

    const lista = (personal || [])
      .filter((p) => {
        const tipo = normU(p?.tipo || "CAMPO");
        if (tipo === "OFICINA") return false;

        const estado = normU(p?.estado || "ACTIVO");
        if (estado !== "ACTIVO") return false;

        const pEmp = normU(p?.proyecto);
        if (pAct && pEmp !== pAct) return false;

        const rol = normU(p?.rol || "");
        const cargoN = normalize(p?.cargo);

        if (rol && noOperariosHints.some((h) => rol.includes(h))) return false;
        if (noOperariosHints.some((h) => cargoN.includes(normalize(h)))) return false;

        return true;
      })
      .map((p) => normU(p?.nombre))
      .filter(Boolean);

    return [...new Set(lista)].sort((a, b) => a.localeCompare(b));
  }, [personal, noOperariosHints, proyectoActivo]);

  const empleadoObj = useMemo(() => {
    const pick = normU(form.empleado);
    if (!pick) return null;
    return (personal || []).find(
      (p) =>
        normU(p?.nombre) === pick &&
        normU(p?.proyecto) === normU(proyectoActivo)
    ) || null;
  }, [form.empleado, personal, proyectoActivo]);

  useEffect(() => {
    if (!show) return;

    if (esEdicion && reporteInicial) {
      setForm({
        fecha: reporteInicial.fecha || todayISO(),
        empleado: normU(reporteInicial.concepto || ""),
        asistio: reporteInicial.asistio === false ? false : true,
        horasExtras: String(
          reporteInicial.numHorasExtras ?? reporteInicial.num_horas_extras ?? ""
        ),
        bonos: String(
          reporteInicial.valoresPendientes ??
            reporteInicial.valores_pendientes ??
            ""
        ),
        descuentos: String(reporteInicial.descuentos ?? ""),
        observacion: normU(reporteInicial.detalles || ""),
      });
    } else {
      setForm({
        ...initialForm,
        fecha: todayISO(),
      });
    }

    const t = setTimeout(() => {
      if (!esAnulado) inputRef.current?.focus();
    }, 0);

    return () => clearTimeout(t);
  }, [show, esEdicion, reporteInicial, initialForm, esAnulado]);

  const guardar = async (e) => {
    e.preventDefault();

    try {
      if (esAnulado) {
        alert("Este reporte está anulado y no puede editarse.");
        return;
      }

      if (!proyectoActivo) {
        alert("Selecciona un proyecto.");
        return;
      }

      if (!form.empleado) {
        alert("Selecciona un empleado.");
        return;
      }

      const valorDia = num0(empleadoObj?.valorDia ?? empleadoObj?.valor_dia);
      const valorHoraExtra = num0(
        empleadoObj?.valorHoraExtra ?? empleadoObj?.valor_hora_extra
      );

      const asistio = Boolean(form.asistio);

      const horas = asistio ? num0(form.horasExtras) : 0;
      const bonos = asistio ? num0(form.bonos) : 0;
      const desc = asistio ? num0(form.descuentos) : 0;

      const totalCalc =
        asistio ? valorDia + horas * valorHoraExtra + bonos - desc : 0;
      const total = Math.max(0, totalCalc);

      const payloadBase = {
        proyecto: normU(proyectoActivo),
        residente: normU(registradoPor),
        fecha: form.fecha,

        concepto: normU(form.empleado),
        cargo: normU(empleadoObj?.cargo || "OPERARIO"),

        asistio,
        numHorasExtras: horas,
        valoresPendientes: bonos,
        descuentos: desc,

        valor: Number(total.toFixed(2)),

        estado: normU(reporteInicial?.estado || "PENDIENTE"),
        detalles: normU(form.observacion || ""),
      };

      if (esEdicion && reporteInicial?.id) {
        await updateReporteDiario(reporteInicial.id, payloadBase);
        onSuccess?.(
          `REPORTE ACTUALIZADO · ${payloadBase.concepto} · ${payloadBase.fecha}`,
          "success"
        );
        onClose?.();
        return;
      }

      await addReporteDiario(payloadBase);
      onSuccess?.(
        `REPORTE GUARDADO · ${payloadBase.concepto} · ${payloadBase.fecha}`,
        "success"
      );
      onClose?.();
    } catch (error) {
      console.error("Error guardando reporte diario:", error);
      alert("No se pudo guardar el reporte diario.");
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[160] overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] md:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          {/* HEADER */}
          <div className="relative pt-7 px-5 pb-4 md:pt-12 md:px-12 md:pb-6 border-b border-black/5">
            <div className="space-y-1.5 md:space-y-2 pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 md:w-8 h-[2px] bg-blendfort-naranja" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.28em] md:tracking-[0.5em] text-black/40">
                  Payroll Tracking
                </span>
              </div>

              <h2 className="text-[1.65rem] md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                {esEdicion ? "Editar Reporte" : "Reporte Diario"}
              </h2>

              <p className="text-[9px] font-bold uppercase tracking-[0.2em] md:tracking-[0.25em] text-black/30 mt-1 md:mt-2">
                {normU(proyectoActivo || "SIN PROYECTO")}
              </p>

              {!esEdicion && (
                <div className="pt-3">
                  <div className="grid grid-cols-2 gap-2 md:w-fit">
                    <button
                      type="button"
                      onClick={onOpenLista}
                      className="h-10 px-4 rounded-2xl bg-blendfort-fondo text-black/60 hover:bg-black hover:text-white font-black text-[8px] uppercase tracking-[0.18em] transition-all"
                    >
                      Lista
                    </button>

                    <button
                      type="button"
                      className="h-10 px-4 rounded-2xl bg-black text-white font-black text-[8px] uppercase tracking-[0.18em] shadow-sm"
                    >
                      Individual
                    </button>
                  </div>
                </div>
              )}

              {esEdicion && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja"></span>
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-black/50">
                      EDICIÓN ACTIVA
                    </span>
                  </span>

                  {esAnulado && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-red-700">
                        REPORTE ANULADO
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 md:top-8 md:right-8 bg-black text-white p-2.5 md:p-3 rounded-full hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
              aria-label="Cerrar"
            >
              <svg
                className="w-4 h-4 md:w-5 md:h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* BODY */}
          <form
            onSubmit={guardar}
            className="p-5 pt-5 md:p-12 md:pt-8 space-y-5 md:space-y-8"
          >
            {esAnulado && (
              <div className="px-5 py-4 rounded-[1.4rem] bg-red-50 border border-red-100">
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] text-red-700">
                  Este reporte está anulado. Solo puedes revisarlo, no modificarlo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Fecha
                </label>
                <input
                  required
                  type="date"
                  disabled={esAnulado}
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all disabled:opacity-60"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>

              <CustomSelect
                label="Empleado"
                options={operarios}
                value={form.empleado}
                onChange={(val) => setForm({ ...form, empleado: val })}
                placeholder={
                  operarios.length
                    ? "BUSCAR..."
                    : "NO HAY OPERARIOS ACTIVOS EN ESTE PROYECTO"
                }
                allowCustom={false}
                disabled={!operarios.length || esAnulado}
              />
            </div>

            <div className="bg-blendfort-fondo px-4 py-4 md:p-6 rounded-[1.6rem] md:rounded-[2.5rem] space-y-4 md:space-y-5 border border-black/5">
              <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-5 bg-white rounded-[1.2rem] md:rounded-full border border-black/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      form.asistio
                        ? "bg-blendfort-naranja animate-pulse"
                        : "bg-black/20"
                    }`}
                  />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] md:tracking-widest opacity-40 leading-tight">
                    ¿Asistió hoy?
                  </span>
                </div>

                <button
                  type="button"
                  disabled={esAnulado}
                  onClick={() => setForm({ ...form, asistio: !form.asistio })}
                  className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${
                    form.asistio ? "bg-blendfort-naranja" : "bg-black/10"
                  } ${esAnulado ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                      form.asistio ? "left-8" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 text-center">
                  <label className="text-[8px] md:text-[7px] font-black uppercase opacity-40">
                    H. Extras
                  </label>
                  <input
                    ref={inputRef}
                    type="number"
                    placeholder="0"
                    disabled={!form.asistio || esAnulado}
                    className="w-full bg-white px-3 py-3.5 md:p-4 rounded-[0.95rem] md:rounded-xl text-[16px] md:text-[10px] font-black outline-none text-center disabled:opacity-50"
                    value={form.horasExtras}
                    onChange={(e) =>
                      setForm({ ...form, horasExtras: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1 text-center">
                  <label className="text-[8px] md:text-[7px] font-black uppercase opacity-40">
                    Bonos (+)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    disabled={!form.asistio || esAnulado}
                    className="w-full bg-white px-3 py-3.5 md:p-4 rounded-[0.95rem] md:rounded-xl text-[16px] md:text-[10px] font-black outline-none text-center disabled:opacity-50"
                    value={form.bonos}
                    onChange={(e) =>
                      setForm({ ...form, bonos: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1 text-center">
                  <label className="text-[8px] md:text-[7px] font-black uppercase opacity-40">
                    Desc (-)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    disabled={!form.asistio || esAnulado}
                    className="w-full bg-white px-3 py-3.5 md:p-4 rounded-[0.95rem] md:rounded-xl text-[16px] md:text-[10px] font-black outline-none text-center disabled:opacity-50"
                    value={form.descuentos}
                    onChange={(e) =>
                      setForm({ ...form, descuentos: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                Observación
              </label>
              <textarea
                placeholder="NOTAS..."
                disabled={esAnulado}
                className="w-full bg-blendfort-fondo px-4 py-4 md:p-5 rounded-[1.3rem] md:rounded-[2rem] text-[16px] md:text-[11px] font-black uppercase outline-none h-24 md:h-20 resize-none border border-transparent focus:bg-white focus:border-black/5 transition-all disabled:opacity-60"
                value={form.observacion}
                onChange={(e) =>
                  setForm({ ...form, observacion: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={esAnulado}
              className={`w-full py-4.5 md:py-7 rounded-full font-black text-[15px] md:text-[11px] uppercase tracking-[0.18em] md:tracking-[0.5em] transition-all flex items-center justify-center gap-3 md:gap-4 ${
                esAnulado
                  ? "bg-black/10 text-black/30 cursor-not-allowed"
                  : "bg-black text-white hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              }`}
            >
              {esEdicion ? "Guardar Cambios" : "Guardar Reporte"}
              <svg
                className="w-4 h-4 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteDiarioModal;