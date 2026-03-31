import React, { useMemo, useState } from "react";
import FilterSelect from "./FilterSelect";
import TablaAdmin from "./TablaAdmin";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Regla única:
// - ANULADO no suma
// - MANO DE OBRA solo suma si está PAGADO o COMPLETADO
const shouldCountInTotals = (e) => {
  const cat = normalize(e?.categoria);
  const est = normalize(e?.estado || "PENDIENTE");

  if (est === "ANULADO") return false;

  if (cat === "MANO DE OBRA") {
    return est === "PAGADO" || est === "COMPLETADO";
  }

  return true;
};

const InformeEgresos = ({
  egresos,
  filtroProyecto,
  setFiltroProyecto,
  filtroResidente,
  setFiltroResidente,
  filtroFecha,
  setFiltroFecha,
  opcionesProyectos,
  opcionesResidentes,
  limpiarFiltros,
  prepararEdicion,
  setIdAEliminar,
  setEgresoSeleccionado,
  editandoId,
  totalFiltrado, // compatibilidad
  onBack,
  onNuevoEgreso,
}) => {
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const opcionesCategorias = useMemo(() => {
    const unique = [...new Set(
      (egresos || []).map((e) => normalize(e?.categoria)).filter(Boolean)
    )];

    const sinMO = unique.filter((c) => c !== "MANO DE OBRA").sort();

    return unique.includes("MANO DE OBRA")
      ? ["MANO DE OBRA", ...sinMO]
      : sinMO;
  }, [egresos]);

  const egresosFiltrados = useMemo(() => {
    return (egresos || []).filter((e) => {
      if (!filtroCategoria) return true;

      const categoriaActual = normalize(e?.categoria);
      const categoriaFiltro = normalize(filtroCategoria);

      if (categoriaActual !== categoriaFiltro) return false;

      // Si se filtra por MANO DE OBRA, solo mostrar lo contable:
      // PAGADO o COMPLETADO
      if (categoriaFiltro === "MANO DE OBRA") {
        const estadoActual = normalize(e?.estado || "PENDIENTE");
        return estadoActual === "PAGADO" || estadoActual === "COMPLETADO";
      }

      return true;
    });
  }, [egresos, filtroCategoria]);

  const hayFiltros = useMemo(
    () => Boolean(filtroProyecto || filtroResidente || filtroFecha || filtroCategoria),
    [filtroProyecto, filtroResidente, filtroFecha, filtroCategoria]
  );

  const totalContable = useMemo(() => {
    return (egresosFiltrados || []).reduce((acc, curr) => {
      if (!shouldCountInTotals(curr)) return acc;
      return acc + (Number(curr?.valor) || 0);
    }, 0);
  }, [egresosFiltrados]);

  const hayManoObraPendiente = useMemo(() => {
    return (egresosFiltrados || []).some((e) => {
      const cat = normalize(e?.categoria);
      if (cat !== "MANO DE OBRA") return false;
      return !shouldCountInTotals(e);
    });
  }, [egresosFiltrados]);

  const limpiarTodo = () => {
    setFiltroCategoria("");
    limpiarFiltros?.();
  };

  const filtrosUI = (
    <div className="bg-blendfort-fondo/50 p-6 rounded-[2.5rem] border border-black/[0.02]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FilterSelect
          label="Proyecto"
          options={opcionesProyectos}
          value={filtroProyecto}
          onChange={setFiltroProyecto}
          placeholder="TODOS..."
        />

        <FilterSelect
          label="Residente"
          options={opcionesResidentes}
          value={filtroResidente}
          onChange={setFiltroResidente}
          placeholder="TODOS..."
        />

        <FilterSelect
          label="Categoría"
          options={opcionesCategorias}
          value={filtroCategoria}
          onChange={setFiltroCategoria}
          placeholder="TODAS..."
        />

        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
            Fecha
          </label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full bg-white border border-black/5 p-4 rounded-2xl text-[10px] font-black outline-none h-[53px] focus:border-black transition-all shadow-sm"
          />
        </div>
      </div>

      {hayFiltros && (
        <div className="mt-5 flex justify-start">
          <button
            onClick={limpiarTodo}
            type="button"
            className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white border border-black/5 text-black/40 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-blendfort-naranja group-hover:rotate-180 transition-all duration-500 ease-in-out"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="text-[8px] font-black uppercase tracking-[0.25em]">
              Limpiar Filtros
            </span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
      <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-black/5 bg-white">
          <button
            onClick={onBack}
            type="button"
            className="w-10 h-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"
            aria-label="Volver"
            title="Volver"
          >
            <svg
              className="w-4 h-4 rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFiltros((v) => !v)}
              className={`md:hidden group relative flex items-center gap-3 px-5 py-3 rounded-full border shadow-sm transition-all duration-300 active:scale-95 ${
                showFiltros
                  ? "bg-[#fff4db] border-blendfort-naranja/45 text-[#a16207] shadow-[0_8px_20px_rgba(245,158,11,0.12)]"
                  : hayFiltros
                  ? "bg-[#fffaf0] border-blendfort-naranja/35 text-[#a16207] shadow-[0_6px_16px_rgba(245,158,11,0.08)]"
                  : "bg-white border-blendfort-naranja/20 text-black/55 hover:bg-[#fffaf0] hover:border-blendfort-naranja/35 hover:text-[#a16207]"
              }`}
              aria-label="Filtros"
              title="Filtros"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full blur-md transition-opacity duration-300 ${
                    showFiltros || hayFiltros ? "opacity-100 bg-blendfort-naranja/10" : "opacity-0"
                  }`}
                />
                <svg
                  className={`relative w-4 h-4 transition-colors duration-300 ${
                    showFiltros || hayFiltros
                      ? "text-blendfort-naranja"
                      : "text-black/40 group-hover:text-blendfort-naranja"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
                </svg>

                {hayFiltros && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blendfort-naranja shadow-sm border border-white" />
                )}
              </div>

              <span
                className={`text-[9px] font-black uppercase tracking-[0.32em] transition-colors duration-300 ${
                  showFiltros || hayFiltros
                    ? "text-[#a16207]"
                    : "text-black/55 group-hover:text-[#a16207]"
                }`}
              >
                FILTROS
              </span>
            </button>

            <button
              type="button"
              onClick={onNuevoEgreso}
              className="group flex items-center gap-3 px-7 py-3 rounded-full bg-blendfort-naranja text-white shadow-sm hover:bg-black transition-all active:scale-95"
              aria-label="Nuevo egreso"
              title="Nuevo egreso"
            >
              <span className="text-base font-black leading-none">+</span>
              <span className="text-[9px] font-black uppercase tracking-[0.35em]">
                NUEVO
              </span>
            </button>
          </div>
        </div>

        <div className="p-8 md:p-14 relative">
          <div className="mb-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-[2px] bg-blendfort-naranja"></div>
                  <span className="text-[7px] md:text-[8px] font-black text-blendfort-naranja uppercase tracking-[0.4em]">
                    Financial Audit
                  </span>
                </div>

                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                  Auditoría Global
                </h3>

                <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-3">
                  Balance y Control de Egresos
                </p>

                {filtroCategoria && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.03] border border-black/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja" />
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-black/60">
                      Categoría: {filtroCategoria}
                    </span>
                  </div>
                )}

                {hayManoObraPendiente && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-700">
                      Mano de obra pendiente no suma
                    </span>
                  </div>
                )}
              </div>

              <div className="ml-auto">
                <div className="bg-blendfort-fondo/50 border border-black/5 rounded-[2rem] px-6 py-4 shadow-sm text-right">
                  <div className="text-[7px] font-black uppercase tracking-[0.35em] text-black/30">
                    Total Filtrado
                  </div>
                  <div className="mt-1 text-2xl md:text-3xl font-black tracking-tighter text-black">
                    <span className="text-[10px] font-black text-blendfort-naranja uppercase mr-2">
                      USD
                    </span>
                    $ {Number(totalContable || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FILTROS DESKTOP: SIEMPRE VISIBLES */}
          <div className="hidden md:block mb-10">{filtrosUI}</div>

          {/* FILTROS MOBILE: DESPLEGABLES */}
          {showFiltros && (
            <div className="md:hidden mb-10 animate-in fade-in zoom-in duration-300">
              {filtrosUI}
            </div>
          )}

          <div className="relative overflow-hidden">
            <TablaAdmin
              egresos={egresosFiltrados}
              onEdit={prepararEdicion}
              onDelete={setIdAEliminar}
              onSelect={setEgresoSeleccionado}
              editandoId={editandoId}
              totalFiltrado={totalContable}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformeEgresos;