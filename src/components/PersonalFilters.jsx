// PersonalFilters.jsx
import React from "react";
import FilterSelect from "../components/FilterSelect";

const PersonalFilters = ({
  show,
  queryNombre,
  setQueryNombre,
  filtroProyecto,
  setFiltroProyecto,
  opcionesProyectos,
  hayFiltros,
  limpiarFiltros,
}) => {
  if (!show) return null;

  return (
    <div className="mb-10 bg-blendfort-fondo/50 p-6 rounded-[2.5rem] border border-black/[0.02] animate-in fade-in zoom-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buscar */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">Buscar</label>
          <input
            value={queryNombre}
            onChange={(e) => setQueryNombre(e.target.value)}
            placeholder="NOMBRE..."
            className="w-full bg-white border border-black/5 p-4 rounded-2xl text-[10px] font-black outline-none h-[53px] focus:border-black transition-all shadow-sm uppercase"
          />
        </div>

        {/* Proyecto */}
        <FilterSelect
          label="Proyecto"
          options={opcionesProyectos}
          value={filtroProyecto}
          onChange={setFiltroProyecto}
          placeholder="TODOS..."
        />
      </div>

      {/* Limpiar filtros (debajo, estilo informe) */}
      {hayFiltros && (
        <div className="flex justify-end mt-4">
          <button
            onClick={limpiarFiltros}
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

            <span className="text-[8px] font-black uppercase tracking-[0.25em]">Limpiar Filtros</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalFilters;