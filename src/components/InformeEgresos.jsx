import React, { useMemo, useState } from "react";
import FilterSelect from "./FilterSelect";
import TablaAdmin from "./TablaAdmin";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const FilterFunnelIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.25 4.5C3.25 3.81 3.81 3.25 4.5 3.25h15c.69 0 1.25.56 1.25 1.25 0 .31-.11.6-.31.83L14.5 12.2v6.05c0 .45-.24.86-.64 1.08l-2.5 1.43c-.83.47-1.86-.12-1.86-1.08V12.2L3.56 5.33c-.2-.23-.31-.52-.31-.83Z" />
    </svg>
  );
};

const FilterClearIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.75 5.25c0-.83.67-1.5 1.5-1.5h13.5c.83 0 1.5.67 1.5 1.5 0 .36-.13.71-.36.98L14 12.9v4.85c0 .53-.28 1.03-.74 1.29l-2 1.14c-.67.38-1.51-.1-1.51-.87V12.9L4.11 6.23c-.23-.27-.36-.62-.36-.98Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 8.5l4 4m0-4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

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
    const unique = [...new Set((egresos || []).map((e) => normalize(e?.categoria)).filter(Boolean))];

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
            className="group flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[#fffaf0] border border-blendfort-naranja/25 text-[#a16207] transition-all duration-300 active:scale-95 hover:bg-[#fff4db] hover:border-blendfort-naranja/40 shadow-sm"
          >
            <FilterClearIcon className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-all duration-300" />
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
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFiltros((v) => !v)}
              className={`md:hidden group relative flex items-center gap-3 px-6 py-3 rounded-full shadow-sm transition-all active:scale-95 ${
                showFiltros || hayFiltros
                  ? "bg-[#fffaf0] border border-blendfort-naranja/40 text-[#a16207]"
                  : "bg-white border border-blendfort-naranja/25 text-black/60 hover:bg-[#fffaf0] hover:border-blendfort-naranja/40 hover:text-[#a16207]"
              }`}
              aria-label="Filtros"
              title="Filtros"
            >
              <div className="relative">
                <FilterFunnelIcon className="w-4 h-4 transition-colors" />
                {hayFiltros && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blendfort-naranja shadow-sm" />
                )}
              </div>

              <span className="text-[9px] font-black uppercase tracking-[0.35em] transition-colors">
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
              <span className="text-[9px] font-black uppercase tracking-[0.35em]">NUEVO</span>
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
          <div className="hidden md:block mb-10">
            {filtrosUI}
          </div>

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