import React, { useEffect, useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const ModalEgreso = ({
  show,
  onClose,
  onSave,
  editandoId,
  nuevoEgreso,
  setNuevoEgreso,
  opcionesProyectos,
  opcionesCategorias,
}) => {
  const { usuario, nombreUsuario, getProyectosAsignados } = useAppContext();

  const esResidente = String(usuario || "").toLowerCase() === "residente";
  const esAdmin = String(usuario || "").toLowerCase() === "admin";

  const categoriasNormalizadas = useMemo(() => {
    const base = (opcionesCategorias || []).map((c) => norm(c)).filter(Boolean);

    if (esAdmin && !base.includes("OFICINA")) {
      base.push("OFICINA");
    }

    return [...new Set(base)];
  }, [opcionesCategorias, esAdmin]);

  const categoriasDisponibles = useMemo(() => {
  if (esResidente) {
    return categoriasNormalizadas.filter((c) => c !== "MANO DE OBRA");
  }

  if (esAdmin) {
    return categoriasNormalizadas.filter((c) => c !== "MANO DE OBRA");
  }

  return categoriasNormalizadas;
}, [categoriasNormalizadas, esResidente, esAdmin]);

  const proyectosAsignados = useMemo(() => {
    if (!esResidente) return [];
    return (getProyectosAsignados?.(nombreUsuario) || []).map(norm).filter(Boolean);
  }, [esResidente, getProyectosAsignados, nombreUsuario]);

  const multiProyectoResidente = esResidente && proyectosAsignados.length > 1;
  const proyectoFijoResidente =
    esResidente && proyectosAsignados.length === 1 ? proyectosAsignados[0] : "";

  const opcionesProyectoFinal = useMemo(() => {
    if (esResidente) return proyectosAsignados;
    return (opcionesProyectos || []).map(norm).filter(Boolean);
  }, [esResidente, proyectosAsignados, opcionesProyectos]);

  const opcionesEstado = useMemo(() => {
    const base = ["PENDIENTE", "PAGADO"];
    const actual = norm(nuevoEgreso?.estado || "PENDIENTE");
    return base.includes(actual) ? base : [...base, actual].filter(Boolean);
  }, [nuevoEgreso?.estado]);

  useEffect(() => {
    if (!show) return;

    if (!nuevoEgreso.estado) {
      setNuevoEgreso((prev) => ({ ...prev, estado: "PENDIENTE" }));
    }

    if (esResidente) {
      setNuevoEgreso((prev) => {
        const pActual = norm(prev?.proyecto);

        if (proyectoFijoResidente) {
          return { ...prev, proyecto: proyectoFijoResidente };
        }

        if (multiProyectoResidente) {
          const first = proyectosAsignados[0] || "";
          if (!pActual || !proyectosAsignados.includes(pActual)) {
            return { ...prev, proyecto: first };
          }
        }

        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, esResidente, proyectoFijoResidente, multiProyectoResidente, proyectosAsignados]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[160] overflow-y-auto bg-black/55 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-black/5 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] animate-in zoom-in-95 duration-300 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="relative border-b border-black/5 bg-[linear-gradient(180deg,#FFF8E8_0%,#FFFFFF_100%)] px-5 pb-5 pt-5 md:px-7 md:pb-6 md:pt-6">
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
                  Registro financiero
                </span>
              </div>

              <h2 className="mt-3 text-[26px] md:text-[32px] font-black uppercase tracking-tight leading-none text-slate-800">
                {editandoId ? "Editar egreso" : "Nuevo egreso"}
              </h2>

              <p className="mt-2 text-[12px] font-medium text-slate-500">
                Completa los datos del movimiento antes de guardar.
              </p>

              {editandoId && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1 text-[11px] font-semibold text-[#C98500]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FCB017]" />
                  Edición activa
                </div>
              )}
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-6 p-5 md:p-7">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {!esResidente || multiProyectoResidente ? (
                <CustomSelect
                  label="Proyecto"
                  options={opcionesProyectoFinal}
                  value={norm(nuevoEgreso.proyecto)}
                  onChange={(val) =>
                    setNuevoEgreso({ ...nuevoEgreso, proyecto: norm(val) })
                  }
                  placeholder={opcionesProyectoFinal.length ? "SELECCIONAR..." : "SIN PROYECTOS"}
                  allowCustom={false}
                  disabled={!opcionesProyectoFinal.length}
                />
              ) : (
                <div className="space-y-1">
                  <label className="ml-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Proyecto
                  </label>
                  <div className="flex h-[54px] items-center rounded-[1.1rem] border border-black/5 bg-[#F9F9F6] px-4 text-[13px] font-black uppercase text-slate-800">
                    {proyectoFijoResidente || "SIN PROYECTO"}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <CustomSelect
                  label="Categoría"
                  options={categoriasDisponibles}
                  value={norm(nuevoEgreso.categoria)}
                  onChange={(val) =>
                    setNuevoEgreso({ ...nuevoEgreso, categoria: norm(val) })
                  }
                  placeholder={categoriasDisponibles.length ? "CATEGORÍA..." : "SIN CATEGORÍAS"}
                  allowCustom={false}
                  disabled={!categoriasDisponibles.length}
                />

                {esAdmin ? (
                  <p className="ml-3 text-[11px] font-medium text-slate-500">
                    Mano de obra se registra desde su módulo, no desde egresos operativos.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CustomSelect
                label="Método de pago"
                options={["EFECTIVO", "TRANSFERENCIA", "TARJETA"]}
                value={norm(nuevoEgreso.metodoPago)}
                onChange={(val) =>
                  setNuevoEgreso({ ...nuevoEgreso, metodoPago: norm(val) })
                }
                placeholder="MÉTODO..."
                allowCustom={false}
              />

              <CustomSelect
                label="Estado"
                options={opcionesEstado}
                value={norm(nuevoEgreso.estado || "PENDIENTE")}
                onChange={(val) =>
                  setNuevoEgreso({ ...nuevoEgreso, estado: norm(val) })
                }
                placeholder="ESTADO..."
                allowCustom={false}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="ml-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Fecha
                </label>
                <input
                  required
                  type="date"
                  className="h-[54px] w-full rounded-[1.1rem] border border-black/5 bg-[#F9F9F6] px-4 text-[13px] font-black outline-none transition-all focus:border-slate-300 focus:bg-white"
                  value={String(nuevoEgreso.fecha || "")}
                  onChange={(e) =>
                    setNuevoEgreso({ ...nuevoEgreso, fecha: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="ml-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Concepto
                </label>
                <input
                  required
                  placeholder="¿QUÉ SE COMPRÓ?"
                  className="h-[54px] w-full rounded-[1.1rem] border border-black/5 bg-[#F9F9F6] px-4 text-[13px] font-black uppercase outline-none transition-all focus:border-slate-300 focus:bg-white"
                  value={String(nuevoEgreso.concepto || "")}
                  onChange={(e) =>
                    setNuevoEgreso({
                      ...nuevoEgreso,
                      concepto: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[#FCB017]/15 bg-[#FFF8E8]/60 px-5 py-5 md:px-6 md:py-6">
              <div className="text-center">
                <p className="text-[10px] font-semibold text-[#C98500]">
                  Monto del egreso
                </p>

                <div className="mt-4 flex items-end justify-center gap-2">
                  <span className="pb-1 text-[26px] font-black text-[#FCB017]">$</span>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    className="w-[180px] bg-transparent text-center text-[42px] md:text-[52px] font-black tracking-tight text-slate-800 outline-none"
                    value={nuevoEgreso.valor}
                    onChange={(e) =>
                      setNuevoEgreso({ ...nuevoEgreso, valor: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="ml-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Detalles adicionales
                </label>
                <textarea
                  placeholder="NOTAS RELEVANTES."
                  className="h-24 w-full resize-none rounded-[1.4rem] border border-black/5 bg-[#F9F9F6] px-4 py-4 text-[13px] font-black uppercase outline-none transition-all focus:border-slate-300 focus:bg-white"
                  value={String(nuevoEgreso.detalles || "")}
                  onChange={(e) =>
                    setNuevoEgreso({
                      ...nuevoEgreso,
                      detalles: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-black/5 bg-[#F9F9F6] px-4 py-4 md:px-5">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-700">
                    ¿Posee factura SRI?
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Marca esta opción si el egreso tiene factura registrada.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNuevoEgreso({
                      ...nuevoEgreso,
                      tieneFactura: !nuevoEgreso.tieneFactura,
                    })
                  }
                  className={`relative h-7 w-14 shrink-0 rounded-full transition-all ${
                    nuevoEgreso.tieneFactura ? "bg-[#FCB017]" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                      nuevoEgreso.tieneFactura ? "left-8" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[12px] font-semibold text-slate-600 transition-all hover:border-slate-300 hover:text-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-800 px-6 text-[12px] font-semibold text-white transition-all hover:bg-[#FCB017]"
              >
                <span>{editandoId ? "Guardar cambios" : "Guardar egreso"}</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalEgreso;