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
  // Hooks SIEMPRE arriba
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

        // 1) Si hay rol, manda rol
        if (rolRaw) return residentRoleAllowList.has(rolRaw);

        // 2) Fallback por cargo
        return cargoAllowHints.some((h) => cargoN.includes(normalize(h)));
      })
      .map((p) => String(p.nombre || "").toUpperCase().trim())
      .filter(Boolean);

    return [...new Set(lista)].sort((a, b) => a.localeCompare(b));
  }, [personal, residentRoleAllowList, cargoAllowHints]);

  // El return condicional SIEMPRE después de hooks
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col my-auto animate-in fade-in zoom-in duration-300">
        {/* HEADER IDENTICO AL DE EGRESO */}
        <div className="relative pt-12 px-12 pb-6 flex justify-between items-end border-b border-black/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">
                Project Planning
              </span>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
              {data.id ? "Editar Proyecto" : "Nuevo Proyecto"}
            </h2>
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

        {/* CUERPO DEL FORMULARIO */}
        <form onSubmit={onSave} className="p-12 pt-8 space-y-6">
          {/* Fila 1: Nombre y Dueño */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                Nombre del Proyecto
              </label>
              <input
                required
                placeholder="EJ: TORRE ELITE"
                className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={data.nombre}
                onChange={(e) => setData({ ...data, nombre: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                Dueño / Cliente
              </label>
              <input
                required
                placeholder="NOMBRE DEL PROPIETARIO"
                className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={data.dueno}
                onChange={(e) => setData({ ...data, dueno: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Fila 2: Residente y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CustomSelect
              label="Residente a Cargo"
              options={opcionesResidentes}
              value={data.residente}
              onChange={(val) => setData({ ...data, residente: val })}
              placeholder={opcionesResidentes.length ? "SELECCIONAR..." : "NO HAY RESIDENTES"}
              // IMPORTANTE: esto evita “agregar” manualmente desde aquí (si tu CustomSelect lo soporta)
              allowCustom={false}
            />

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                Ubicación
              </label>
              <input
                required
                placeholder="CIUDAD O SECTOR"
                className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={data.ubicacion}
                onChange={(e) => setData({ ...data, ubicacion: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Fila 3: Presupuesto (se eliminó techo semanal) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                Presupuesto Asignado
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 font-black text-[11px]">
                  $
                </span>
                <input
                  required
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-blendfort-fondo p-4.5 pl-8 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={data.presupuesto}
                  onChange={(e) => setData({ ...data, presupuesto: e.target.value })}
                />
              </div>
            </div>

            
            
          </div>

          {/* Fila 4: Tiempo Estimado */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
              Tiempo Estimado de Obra
            </label>
            <input
              placeholder="EJ: 12 MESES / 45 SEMANAS"
              className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
              value={data.tiempo}
              onChange={(e) => setData({ ...data, tiempo: e.target.value.toUpperCase() })}
            />
          </div>

          {/* BOTÓN DE GUARDAR */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={mensajeExito}
              className={`w-full py-7 rounded-full font-black text-[11px] uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 ${
                mensajeExito
                  ? "bg-green-500 text-white"
                  : "bg-black text-white hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              }`}
            >
              {mensajeExito ? "Proyecto Registrado" : data.id ? "Guardar Cambios" : "Crear Proyecto"}
              {!mensajeExito && (
                <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
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

export default ModalProyecto;