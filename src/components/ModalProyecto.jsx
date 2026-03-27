import React, { useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const ModalProyecto = ({ show, onClose, onSave, data, setData, mensajeExito }) => {
  const { personal } = useAppContext();

  const residentRoleAllowList = useMemo(
    () => new Set(["RESIDENTE", "INGENIERO", "ARQUITECTO", "ARQUITECTA", "ING.", "ING"]),
    []
  );

  const cargoAllowHints = useMemo(
    () => ["RESIDENTE", "ING", "ING.", "INGENIERO", "ARQUITECTO", "ARQ", "ARQ."],
    []
  );

  const opcionesResidentes = useMemo(() => {
    const lista = (personal || [])
      .filter((p) => {
        const rolRaw = String(p.rol || "").toUpperCase().trim();
        const cargoN = normalize(p.cargo);

        if (rolRaw) return residentRoleAllowList.has(rolRaw);

        return cargoAllowHints.some((h) => cargoN.includes(normalize(h)));
      })
      .map((p) => String(p.nombre || "").toUpperCase().trim())
      .filter(Boolean);

    return [...new Set(lista)].sort((a, b) => a.localeCompare(b));
  }, [personal, residentRoleAllowList, cargoAllowHints]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[160] overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] md:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="relative pt-8 md:pt-12 px-6 md:px-12 pb-5 md:pb-6 border-b border-black/5">
            <div className="space-y-2 pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 md:w-8 h-[2px] bg-blendfort-naranja"></div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.28em] md:tracking-[0.5em] text-black/40">
                  Project Planning
                </span>
              </div>

              <h2 className="text-[1.65rem] md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                {data.id ? "Editar Proyecto" : "Nuevo Proyecto"}
              </h2>

              {data.id && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja"></span>
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-black/50">
                    EDICIÓN ACTIVA
                  </span>
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

          {/* Body */}
          <form onSubmit={onSave} className="p-6 pt-6 md:p-12 md:pt-8 space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Nombre del Proyecto
                </label>
                <input
                  required
                  placeholder="EJ: TORRE ELITE"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={data.nombre}
                  onChange={(e) =>
                    setData({ ...data, nombre: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Dueño / Cliente
                </label>
                <input
                  required
                  placeholder="NOMBRE DEL PROPIETARIO"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={data.dueno}
                  onChange={(e) =>
                    setData({ ...data, dueno: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <CustomSelect
                label="Residente a Cargo"
                options={opcionesResidentes}
                value={data.residente}
                onChange={(val) => setData({ ...data, residente: val })}
                placeholder={opcionesResidentes.length ? "SELECCIONAR..." : "NO HAY RESIDENTES"}
                allowCustom={false}
                disabled={!opcionesResidentes.length}
              />

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Ubicación
                </label>
                <input
                  required
                  placeholder="CIUDAD O SECTOR"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={data.ubicacion}
                  onChange={(e) =>
                    setData({ ...data, ubicacion: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Presupuesto Asignado
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 font-black text-[14px] md:text-[11px]">
                    $
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    className="w-full bg-blendfort-fondo px-4 py-3.5 pl-8 md:p-4.5 md:pl-8 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                    value={data.presupuesto}
                    onChange={(e) =>
                      setData({ ...data, presupuesto: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Tiempo Estimado de Obra
                </label>
                <input
                  placeholder="EJ: 12 MESES / 45 SEMANAS"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={data.tiempo}
                  onChange={(e) =>
                    setData({ ...data, tiempo: e.target.value.toUpperCase() })
                  }
                />
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
                {mensajeExito
                  ? "Proyecto Registrado"
                  : data.id
                  ? "Guardar Cambios"
                  : "Crear Proyecto"}

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

            <button
              type="button"
              onClick={onClose}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center tracking-widest"
            >
              ← Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalProyecto;