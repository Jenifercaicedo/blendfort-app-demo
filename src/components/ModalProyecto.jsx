import React, { useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const normalizeUpper = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const ModalProyecto = ({ show, onClose, onSave, data, setData, mensajeExito }) => {
  const { personal, profiles, getResidentesProyecto } = useAppContext();

  const residentRoleAllowList = useMemo(
    () =>
      new Set([
        "RESIDENTE",
        "INGENIERO",
        "INGENIERA",
        "ARQUITECTO",
        "ARQUITECTA",
        "ING.",
        "ING",
        "ARQ",
        "ARQ.",
      ]),
    []
  );

  const cargoAllowHints = useMemo(
    () => ["RESIDENTE", "ING", "ING.", "INGENIERO", "ARQUITECTO", "ARQ", "ARQ."],
    []
  );

  const opcionesResidentes = useMemo(() => {
    const fromProfiles = (profiles || [])
      .filter((p) => {
        const rolRaw = String(p?.rol || "").toUpperCase().trim();
        return residentRoleAllowList.has(rolRaw);
      })
      .map((p) => normalizeUpper(p?.nombre))
      .filter(Boolean);

    const fromPersonal = (personal || [])
      .filter((p) => {
        const rolRaw = String(p?.rol || "").toUpperCase().trim();
        const cargoN = normalize(p?.cargo);

        if (rolRaw && residentRoleAllowList.has(rolRaw)) return true;

        return cargoAllowHints.some((h) => cargoN.includes(normalize(h)));
      })
      .map((p) => normalizeUpper(p?.nombre))
      .filter(Boolean);

    const selected = normalizeUpper(data?.residente);

    const lista = [...fromProfiles, ...fromPersonal];
    if (selected) lista.push(selected);

    return [...new Set(lista)].sort((a, b) => a.localeCompare(b));
  }, [profiles, personal, residentRoleAllowList, cargoAllowHints, data?.residente]);

  const residentesProyectoActual = useMemo(() => {
    if (!data?.id || typeof getResidentesProyecto !== "function") return [];

    const rows = getResidentesProyecto(data.id) || [];
    const dedupe = new Map();

    for (const row of rows) {
      const nombre = normalizeUpper(row?.residente_nombre);
      if (!nombre) continue;

      if (!dedupe.has(nombre)) {
        dedupe.set(nombre, {
          nombre,
          esPrincipal: Boolean(row?.es_principal),
          activo: row?.activo !== false,
          origen: row?.origen || "",
        });
      } else if (row?.es_principal) {
        dedupe.set(nombre, {
          ...dedupe.get(nombre),
          esPrincipal: true,
        });
      }
    }

    return Array.from(dedupe.values()).sort((a, b) => {
      if (a.esPrincipal !== b.esPrincipal) return a.esPrincipal ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [data?.id, getResidentesProyecto]);

  const residentePrincipalActual = useMemo(() => {
    const current = normalizeUpper(data?.residente);
    if (!current) return null;

    const found = residentesProyectoActual.find(
      (r) => normalizeUpper(r?.nombre) === current
    );

    return (
      found || {
        nombre: current,
        esPrincipal: true,
        activo: true,
        origen: "FORM_STATE",
      }
    );
  }, [data?.residente, residentesProyectoActual]);

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
              <div className="space-y-4">
                <CustomSelect
                  label="Residente Principal"
                  options={opcionesResidentes}
                  value={data.residente}
                  onChange={(val) =>
                    setData({
                      ...data,
                      residente: String(val || "").toUpperCase().trim(),
                    })
                  }
                  placeholder={
                    opcionesResidentes.length
                      ? "SELECCIONAR..."
                      : "NO HAY RESIDENTES DISPONIBLES"
                  }
                  allowCustom={false}
                  disabled={!opcionesResidentes.length}
                />

                <div className="rounded-[1.1rem] md:rounded-[1.3rem] border border-[#FCB017]/20 bg-[#FFF8E8] px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCB017]/15 text-[#C98500]">
                      <i className="pi pi-info-circle text-[14px]" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C98500]">
                        Lógica del proyecto
                      </p>
                      <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                        Aquí defines solo el <span className="font-black text-slate-800">residente principal</span>.
                        Los residentes adicionales de la obra se gestionan después desde
                        <span className="font-black text-slate-800"> Gestión Personal</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

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

            {(data.id || data.residente) && (
              <div className="rounded-[1.2rem] md:rounded-[1.4rem] border border-black/5 bg-[#FAFAF7] px-4 py-4 md:px-5">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Estructura de residentes
                    </p>
                    <p className="mt-2 text-[12px] font-semibold text-slate-500">
                      Proyecto con un residente principal y posibilidad de residentes adicionales.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {residentePrincipalActual ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/25 bg-[#FFF8E8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#C98500]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FCB017]" />
                        Principal · {residentePrincipalActual.nombre}
                      </span>
                    ) : null}

                    {residentesProyectoActual
                      .filter((r) => !r.esPrincipal)
                      .map((r) => (
                        <span
                          key={r.nombre}
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Adicional · {r.nombre}
                        </span>
                      ))}

                    {!residentePrincipalActual && residentesProyectoActual.length === 0 ? (
                      <span className="inline-flex items-center rounded-full border border-dashed border-black/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Sin residentes vinculados todavía
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

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