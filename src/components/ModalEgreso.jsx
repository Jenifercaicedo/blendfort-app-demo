// ModalEgreso.jsx
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

  // return después de hooks (para no romper Rules of Hooks)
  // (pero aquí podemos hacer la lógica antes y retornar luego)
  const esResidente = String(usuario || "").toLowerCase() === "residente";

  // Categorías permitidas (excluye MANO DE OBRA)
  const categoriasSinManoObra = useMemo(() => {
    return (opcionesCategorias || [])
      .map((c) => norm(c))
      .filter(Boolean)
      .filter((c) => c !== "MANO DE OBRA");
  }, [opcionesCategorias]);

  //  proyectos permitidos para residente (PASO 2)
  const proyectosAsignados = useMemo(() => {
    if (!esResidente) return [];
    return (getProyectosAsignados?.(nombreUsuario) || []).map(norm).filter(Boolean);
  }, [esResidente, getProyectosAsignados, nombreUsuario]);

  const multiProyectoResidente = esResidente && proyectosAsignados.length > 1;
  const proyectoFijoResidente = esResidente && proyectosAsignados.length === 1 ? proyectosAsignados[0] : "";

  // opciones finales de proyecto que se muestran en el select
  const opcionesProyectoFinal = useMemo(() => {
    if (esResidente) return proyectosAsignados;
    // admin: usa lo que viene por props
    return (opcionesProyectos || []).map(norm).filter(Boolean);
  }, [esResidente, proyectosAsignados, opcionesProyectos]);

  // Estado por defecto + forzar proyecto en residente
  useEffect(() => {
    if (!show) return;

    // Estado por defecto
    if (!nuevoEgreso.estado) {
      setNuevoEgreso((prev) => ({ ...prev, estado: "PENDIENTE" }));
    }

    //  Residente: fijar/proteger proyecto
    if (esResidente) {
      setNuevoEgreso((prev) => {
        const pActual = norm(prev?.proyecto);
        // Si tiene 1 proyecto: lo fijamos siempre
        if (proyectoFijoResidente) {
          return { ...prev, proyecto: proyectoFijoResidente };
        }

        // Si tiene varios: si el actual no está permitido, ponemos el primero
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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col my-auto animate-in fade-in zoom-in duration-300">
        {/* HEADER */}
        <div className="relative pt-12 px-12 pb-6 flex justify-between items-end border-b border-black/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">
                Financial Record
              </span>
            </div>

            <h2 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
              {editandoId ? "Editar Egreso" : "Nuevo Egreso"}
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

        {/* FORM */}
        <form onSubmit={onSave} className="p-12 pt-8 space-y-8">
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/*  PROYECTO: Admin siempre; Residente solo si multi */}
            {(!esResidente || multiProyectoResidente) ? (
              <CustomSelect
                label="Proyecto"
                options={opcionesProyectoFinal}
                value={norm(nuevoEgreso.proyecto)}
                onChange={(val) => setNuevoEgreso({ ...nuevoEgreso, proyecto: norm(val) })}
                placeholder={opcionesProyectoFinal.length ? "SELECCIONAR..." : "SIN PROYECTOS"}
                allowCustom={false}
                disabled={!opcionesProyectoFinal.length}
              />
            ) : (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                  Proyecto
                </label>
                <div className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase border border-transparent">
                  {proyectoFijoResidente || "SIN PROYECTO"}
                </div>
              </div>
            )}

            <CustomSelect
              label="Categoría"
              options={categoriasSinManoObra}
              value={norm(nuevoEgreso.categoria)}
              onChange={(val) => setNuevoEgreso({ ...nuevoEgreso, categoria: norm(val) })}
              placeholder={categoriasSinManoObra.length ? "CATEGORÍA..." : "SIN CATEGORÍAS"}
              allowCustom={false}
              disabled={!categoriasSinManoObra.length}
            />
          </div>

          {/* SECCIÓN 2: PAGO + ESTADO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CustomSelect
              label="Pago"
              options={["EFECTIVO", "TRANSFERENCIA", "TARJETA"]}
              value={norm(nuevoEgreso.metodoPago)}
              onChange={(val) => setNuevoEgreso({ ...nuevoEgreso, metodoPago: norm(val) })}
              placeholder="MÉTODO..."
              allowCustom={false}
            />

            <CustomSelect
              label="Estado"
              options={["PENDIENTE", "PAGADO"]}
              value={norm(nuevoEgreso.estado || "PENDIENTE")}
              onChange={(val) => setNuevoEgreso({ ...nuevoEgreso, estado: norm(val) })}
              placeholder="ESTADO..."
              allowCustom={false}
            />
          </div>

          {/* SECCIÓN 3: DETALLE DEL EGRESO */}
          <div className="space-y-8 animate-in slide-in-from-top-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Fecha</label>
                <input
                  required
                  type="date"
                  className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-black/5 border border-transparent transition-all"
                  value={String(nuevoEgreso.fecha || "")}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, fecha: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Concepto</label>
                <input
                  required
                  placeholder="¿QUÉ SE COMPRÓ?"
                  className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none focus:bg-white focus:border-black/5 border border-transparent transition-all"
                  value={String(nuevoEgreso.concepto || "")}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, concepto: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 bg-blendfort-fondo rounded-[2.5rem] border border-black/5">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 mb-2">
                Monto Total del Egreso
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blendfort-naranja">$</span>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="text-5xl font-black tracking-tighter text-black w-48 text-center outline-none bg-transparent"
                  value={nuevoEgreso.valor}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                  Detalles Adicionales
                </label>
                <textarea
                  placeholder="NOTAS RELEVANTES..."
                  className="w-full bg-blendfort-fondo p-5 rounded-[2rem] text-[11px] font-black uppercase outline-none h-24 resize-none focus:bg-white focus:border-black/5 border border-transparent transition-all"
                  value={String(nuevoEgreso.detalles || "")}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, detalles: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="flex items-center justify-between px-8 py-5 bg-blendfort-fondo rounded-full border border-black/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${nuevoEgreso.tieneFactura ? "bg-blendfort-naranja animate-pulse" : "bg-black/20"}`}></div>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    ¿Posee Factura SRI?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNuevoEgreso({ ...nuevoEgreso, tieneFactura: !nuevoEgreso.tieneFactura })}
                  className={`w-14 h-7 rounded-full transition-all relative ${nuevoEgreso.tieneFactura ? "bg-blendfort-naranja" : "bg-black/10"}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${nuevoEgreso.tieneFactura ? "left-8" : "left-1"}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="w-full bg-black text-white py-7 rounded-full font-black text-[11px] uppercase tracking-[0.5em] hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
          >
            {editandoId ? "Actualizar Datos" : "Guardar Reporte"}
            <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalEgreso;