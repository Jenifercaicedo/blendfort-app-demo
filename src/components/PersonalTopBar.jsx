// PersonalTopBar.jsx
import React from "react";

const PersonalTopBar = ({ onBack, onToggleFiltros, hayFiltros, onNuevo }) => {
  return (
    <div className="flex justify-between items-center p-5 md:p-6 border-b border-black/5 bg-blendfort-fondo/30">
      {/* Volver: mobile solo icono, desktop icono + texto */}
      <button
        onClick={onBack}
        className="flex items-center gap-3 group transition-all active:scale-95"
        type="button"
      >
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm">
          <svg
            className="w-3.5 h-3.5 rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>

        <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-black/30 group-hover:text-black">
          Volver al Panel
        </span>
      </button>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        {/* Filtros */}
        <button
          onClick={onToggleFiltros}
          type="button"
          className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border transition-all duration-300 active:scale-95 group shadow-sm hover:border-blendfort-naranja ${
            hayFiltros ? "border-blendfort-naranja/40" : "border-black/5"
          }`}
          aria-pressed={false}
        >
          <svg
            className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-blendfort-naranja transition-all"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
          </svg>

          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-black/50 group-hover:text-black">
            Filtros
          </span>

          {/* indicador mini cuando hay filtros */}
          {hayFiltros && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse" />
          )}
        </button>

        {/* Nuevo */}
        <button
          onClick={onNuevo}
          type="button"
          className="bg-blendfort-naranja text-white px-6 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-[0.25em] hover:bg-black transition-all active:scale-95 shadow-sm"
        >
          + Nuevo
        </button>
      </div>
    </div>
  );
};

export default PersonalTopBar;