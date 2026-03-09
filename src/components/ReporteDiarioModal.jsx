// ReporteDiarioModal.jsx
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
  mode = "create", // "create" | "edit"
  reporteInicial = null,
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

  // Operarios filtrados por proyectoActivo
  const operarios = useMemo(() => {
    const pAct = normU(proyectoActivo);

    const lista = (personal || [])
      .filter((p) => {
        const tipo = normU(p?.tipo || "CAMPO");
        if (tipo === "OFICINA") return false;

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
    return (personal || []).find((p) => normU(p?.nombre) === pick) || null;
  }, [form.empleado, personal]);

  //  Precarga / Reset al abrir (fix)
  useEffect(() => {
    if (!show) return;

    if (mode === "edit" && reporteInicial) {
      setForm({
        fecha: reporteInicial.fecha || todayISO(),
        empleado: normU(reporteInicial.concepto || ""),
        asistio: reporteInicial.asistio === false ? false : true,
        horasExtras: String(reporteInicial.numHorasExtras ?? ""),
        bonos: String(reporteInicial.valoresPendientes ?? ""),
        descuentos: String(reporteInicial.descuentos ?? ""),
        observacion: normU(reporteInicial.detalles || ""),
      });
    } else {
      //  CREATE: reset total (evita valores “pegados”)
      setForm({
        ...initialForm,
        fecha: todayISO(),
      });
    }

    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [show, mode, reporteInicial, initialForm]);

  const guardar = async (e) => {
  e.preventDefault();

  try {
    if (!proyectoActivo) {
      alert("Selecciona un proyecto.");
      return;
    }

    if (!form.empleado) {
      alert("Selecciona un empleado.");
      return;
    }

    const valorDia = num0(empleadoObj?.valorDia);
    const valorHoraExtra = num0(empleadoObj?.valorHoraExtra);

    const asistio = Boolean(form.asistio);

    const horas = asistio ? num0(form.horasExtras) : 0;
    const bonos = asistio ? num0(form.bonos) : 0;
    const desc = asistio ? num0(form.descuentos) : 0;

    const totalCalc = asistio ? valorDia + horas * valorHoraExtra + bonos - desc : 0;
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

    if (mode === "edit" && reporteInicial?.id) {
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
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col my-auto animate-in fade-in zoom-in duration-300">
        {/* HEADER */}
        <div className="relative pt-12 px-12 pb-6 flex justify-between items-end border-b border-black/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-[2px] bg-blendfort-naranja" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">
                Payroll Tracking
              </span>
            </div>

            <h2 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
              {mode === "edit" ? "Editar Reporte" : "Reporte Diario"}
            </h2>

            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/30 mt-2">
              {normU(proyectoActivo || "SIN PROYECTO")}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="absolute top-8 right-8 bg-black text-white p-3 rounded-full hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={guardar} className="p-12 pt-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Fecha</label>
              <input
                required
                type="date"
                className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </div>

            <CustomSelect
              label="Empleado"
              options={operarios}
              value={form.empleado}
              onChange={(val) => setForm({ ...form, empleado: val })}
              placeholder={operarios.length ? "BUSCAR..." : "NO HAY OPERARIOS EN ESTE PROYECTO"}
              allowCustom={false}
              disabled={!operarios.length}
            />
          </div>

          <div className="bg-blendfort-fondo p-6 rounded-[2.5rem] space-y-5 border border-black/5">
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-full border border-black/5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${form.asistio ? "bg-blendfort-naranja animate-pulse" : "bg-black/20"}`} />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">¿Asistió hoy?</span>
              </div>

              <button
                type="button"
                onClick={() => setForm({ ...form, asistio: !form.asistio })}
                className={`w-14 h-7 rounded-full transition-all relative ${form.asistio ? "bg-blendfort-naranja" : "bg-black/10"}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${form.asistio ? "left-8" : "left-1"}`} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 text-center">
                <label className="text-[7px] font-black uppercase opacity-40">H. Extras</label>
                <input
                  ref={inputRef}
                  type="number"
                  placeholder="0"
                  className="w-full bg-white p-4 rounded-xl text-[10px] font-black outline-none text-center disabled:opacity-50"
                  value={form.horasExtras}
                  onChange={(e) => setForm({ ...form, horasExtras: e.target.value })}
                  disabled={!form.asistio}
                />
              </div>

              <div className="space-y-1 text-center">
                <label className="text-[7px] font-black uppercase opacity-40">Bonos (+)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-white p-4 rounded-xl text-[10px] font-black outline-none text-center disabled:opacity-50"
                  value={form.bonos}
                  onChange={(e) => setForm({ ...form, bonos: e.target.value })}
                  disabled={!form.asistio}
                />
              </div>

              <div className="space-y-1 text-center">
                <label className="text-[7px] font-black uppercase opacity-40">Desc (-)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-white p-4 rounded-xl text-[10px] font-black outline-none text-center disabled:opacity-50"
                  value={form.descuentos}
                  onChange={(e) => setForm({ ...form, descuentos: e.target.value })}
                  disabled={!form.asistio}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Observación</label>
            <textarea
              placeholder="NOTAS..."
              className="w-full bg-blendfort-fondo p-5 rounded-[2rem] text-[11px] font-black uppercase outline-none h-20 resize-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-7 rounded-full font-black text-[11px] uppercase tracking-[0.5em] hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
          >
            {mode === "edit" ? "Guardar Cambios" : "Guardar Reporte"}
            <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReporteDiarioModal;