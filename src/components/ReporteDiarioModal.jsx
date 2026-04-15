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
      className="fixed inset-0 z-[160] overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[2.7rem] overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          <div className="relative pt-7 px-6 pb-5 md:pt-8 md:px-8 md:pb-6 border-b border-black/5 bg-white">
            <div className="space-y-2 pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 h-[2px] bg-[#FCB017]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C98500]">
                  {esEdicion ? "Editar reporte" : "Reporte diario"}
                </span>
              </div>

              <h2 className="text-[28px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none">
                {esEdicion ? "Editar reporte" : "Nuevo reporte"}
              </h2>

              <p className="text-[13px] font-medium text-slate-500">
                {normU(proyectoActivo || "SIN PROYECTO")}
              </p>

              {!esEdicion && (
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-2 sm:w-fit">
                    <button
                      type="button"
                      onClick={onOpenLista}
                      className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white font-semibold text-[12px] transition-all"
                    >
                      Lista
                    </button>

                    <button
                      type="button"
                      className="h-10 px-4 rounded-xl bg-slate-800 text-white font-semibold text-[12px] shadow-sm"
                    >
                      Individual
                    </button>
                  </div>
                </div>
              )}

              {esEdicion && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
                    <i className="pi pi-pencil text-[11px]" />
                    <span>Edición activa</span>
                  </span>

                  {esAnulado && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700">
                      <i className="pi pi-ban text-[11px]" />
                      <span>Reporte anulado</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 md:top-6 md:right-6 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-600 hover:border-[#FCB017] hover:text-[#C98500] transition-all"
              aria-label="Cerrar"
            >
              <i className="pi pi-times text-[13px]" />
            </button>
          </div>

          <form
            onSubmit={guardar}
            className="p-6 md:p-8 space-y-6"
          >
            {esAnulado && (
              <div className="px-4 py-3 rounded-[1rem] bg-red-50 border border-red-200">
                <p className="text-[11px] font-semibold text-red-700">
                  Este reporte está anulado. Solo puedes revisarlo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                  Fecha
                </label>
                <input
                  required
                  type="date"
                  disabled={esAnulado}
                  className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm disabled:opacity-60"
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

            <div className="rounded-[1.5rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between px-4 py-4 bg-white rounded-[1rem] border border-black/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      form.asistio
                        ? "bg-[#FCB017] animate-pulse"
                        : "bg-black/20"
                    }`}
                  />
                  <span className="text-[12px] font-semibold text-slate-600 leading-tight">
                    ¿Asistió hoy?
                  </span>
                </div>

                <button
                  type="button"
                  disabled={esAnulado}
                  onClick={() => setForm({ ...form, asistio: !form.asistio })}
                  className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${
                    form.asistio ? "bg-[#FCB017]" : "bg-black/10"
                  } ${esAnulado ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                      form.asistio ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    H. extras
                  </label>
                  <input
                    ref={inputRef}
                    type="number"
                    placeholder="0"
                    disabled={!form.asistio || esAnulado}
                    className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none disabled:opacity-50 shadow-sm"
                    value={form.horasExtras}
                    onChange={(e) =>
                      setForm({ ...form, horasExtras: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Bonos (+)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    disabled={!form.asistio || esAnulado}
                    className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none disabled:opacity-50 shadow-sm"
                    value={form.bonos}
                    onChange={(e) =>
                      setForm({ ...form, bonos: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Desc. (-)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    disabled={!form.asistio || esAnulado}
                    className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none disabled:opacity-50 shadow-sm"
                    value={form.descuentos}
                    onChange={(e) =>
                      setForm({ ...form, descuentos: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                Observación
              </label>
              <textarea
                placeholder="NOTAS..."
                disabled={esAnulado}
                className="w-full bg-white border border-black/5 px-4 py-4 rounded-[1rem] text-[16px] md:text-[11px] font-black uppercase outline-none h-24 resize-none focus:border-black transition-all shadow-sm disabled:opacity-60"
                value={form.observacion}
                onChange={(e) =>
                  setForm({ ...form, observacion: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={esAnulado}
              className={`w-full py-4.5 rounded-full font-semibold text-[14px] uppercase tracking-[0.16em] transition-all flex items-center justify-center gap-3 ${
                esAnulado
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-slate-800 text-white hover:bg-[#FCB017] active:scale-[0.98] shadow-sm"
              }`}
            >
              <i className="pi pi-check text-[12px]" />
              {esEdicion ? "Guardar cambios" : "Guardar reporte"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteDiarioModal;