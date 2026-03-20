import React, { useEffect, useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const hoyISO = () => new Date().toISOString().slice(0, 10);

const ModalCajaChica = ({
  show,
  onClose,
  onSave,
  data,
  setData,
  mensajeExito = false,
}) => {
  const { proyectos } = useAppContext();

  const opcionesProyectos = useMemo(() => {
    return [...new Set((proyectos || []).map((p) => norm(p?.nombre)).filter(Boolean))].sort();
  }, [proyectos]);

  useEffect(() => {
    if (!show) return;

    if (!data?.fechaDesembolso) {
      setData((prev) => ({
        ...prev,
        fechaDesembolso: hoyISO(),
      }));
    }
  }, [show, data?.fechaDesembolso, setData]);

  useEffect(() => {
    const proyectoN = norm(data?.proyecto);
    if (!proyectoN) return;

    const proy = (proyectos || []).find((p) => norm(p?.nombre) === proyectoN);
    const residenteAuto = norm(proy?.residente || "");

    setData((prev) => {
      if (norm(prev?.residente) === residenteAuto) return prev;
      return {
        ...prev,
        residente: residenteAuto,
      };
    });
  }, [data?.proyecto, proyectos, setData]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] md:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col my-auto animate-in fade-in zoom-in duration-300">
        <div className="relative pt-7 px-5 pb-4 md:pt-12 md:px-12 md:pb-6 flex justify-between items-end border-b border-black/5">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 md:w-8 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.28em] md:tracking-[0.5em] text-black/40">
                Cash Flow Control
              </span>
            </div>

            <h2 className="text-[1.65rem] md:text-4xl font-black uppercase tracking-tight text-black leading-none pr-10">
              Nuevo Desembolso
            </h2>
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

        <form onSubmit={onSave} className="p-5 pt-5 md:p-12 md:pt-8 space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <CustomSelect
              label="Proyecto"
              options={opcionesProyectos}
              value={norm(data?.proyecto)}
              onChange={(val) =>
                setData((prev) => ({
                  ...prev,
                  proyecto: norm(val),
                }))
              }
              placeholder={opcionesProyectos.length ? "SELECCIONAR..." : "SIN PROYECTOS"}
              allowCustom={false}
              disabled={!opcionesProyectos.length}
            />

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                Residente Asignado
              </label>
              <div className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase border border-transparent">
                {norm(data?.residente) || "SIN RESIDENTE"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                Fecha de Desembolso
              </label>
              <input
                required
                type="date"
                className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={data?.fechaDesembolso || ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    fechaDesembolso: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                Monto Desembolsado
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 font-black text-[14px] md:text-[11px]">
                  $
                </span>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 pl-8 md:p-4.5 md:pl-8 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={data?.monto || ""}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      monto: e.target.value,
                    }))
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
              placeholder="NOTAS DEL DESEMBOLSO..."
              className="w-full bg-blendfort-fondo px-4 py-4 md:p-5 rounded-[1.3rem] md:rounded-[2rem] text-[16px] md:text-[11px] font-black uppercase outline-none h-24 resize-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
              value={String(data?.observacion || "")}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  observacion: e.target.value.toUpperCase(),
                }))
              }
            />
          </div>

          <div className="bg-blendfort-fondo px-5 py-4 md:px-8 md:py-5 rounded-[1.2rem] md:rounded-full border border-black/5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-[8px] font-black uppercase tracking-[0.25em] opacity-30 mb-1">
                Comportamiento del Fondo
              </span>
              <p className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-45 leading-relaxed">
                Cada nuevo desembolso reemplazará el fondo activo del proyecto y quedará registrado en el historial.
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-black/55"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 8c-2.21 0-4 .895-4 2s1.79 2 4 2 4 .895 4 2-1.79 2-4 2m0-8V6m0 12v-2" />
              </svg>
            </div>
          </div>

          <div className="pt-2 md:pt-4">
            <button
              type="submit"
              disabled={mensajeExito}
              className={`w-full py-4.5 md:py-7 rounded-full font-black text-[15px] md:text-[11px] uppercase tracking-[0.18em] md:tracking-[0.5em] transition-all flex items-center justify-center gap-3 md:gap-4 ${
                mensajeExito
                  ? "bg-green-500 text-white"
                  : "bg-black text-white hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              }`}
            >
              {mensajeExito ? "Desembolso Registrado" : "Guardar Desembolso"}
              {!mensajeExito && (
                <svg
                  className="w-4 h-4 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCajaChica;