import React from "react";
import FilterSelect from "./FilterSelect";

const PersonalFilters = ({
  show,
  queryNombre,
  setQueryNombre,
  filtroProyecto,
  setFiltroProyecto,
  opcionesProyectos,
  filtroEstado,
  setFiltroEstado,
  opcionesEstado,
  hayFiltros,
  limpiarFiltros,
}) => {
  if (!show) return null;

  return (
    <div className="rounded-[1.6rem] border border-black/5 bg-white p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] animate-in fade-in zoom-in duration-300">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-5 space-y-1">
          <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
            Buscar
          </label>
          <div className="relative">
            <i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-black/25" />
            <input
              value={queryNombre}
              onChange={(e) => setQueryNombre(e.target.value)}
              placeholder="NOMBRE, CARGO O PROYECTO..."
              className="w-full bg-white border border-black/5 pl-10 pr-4 py-3.5 md:p-4 md:pl-10 rounded-xl text-[16px] md:text-[10px] font-black outline-none h-[50px] focus:border-black transition-all shadow-sm uppercase"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <FilterSelect
            label="Proyecto"
            options={opcionesProyectos}
            value={filtroProyecto}
            onChange={setFiltroProyecto}
            placeholder="TODOS..."
          />
        </div>

        <div className="md:col-span-3">
          <FilterSelect
            label="Estado"
            options={opcionesEstado}
            value={filtroEstado}
            onChange={setFiltroEstado}
            placeholder="TODOS..."
          />
        </div>

        {hayFiltros && (
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={limpiarFiltros}
              type="button"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-slate-600 transition-all active:scale-95 hover:border-[#FCB017] hover:text-[#C98500] shadow-sm h-[50px]"
            >
              <i className="pi pi-filter-slash text-[12px]" />
              <span className="hidden lg:inline text-[12px] font-semibold">
                Limpiar
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalFilters;