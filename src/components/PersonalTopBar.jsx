import React from "react";

const PersonalTopBar = ({ onBack, onToggleFiltros, hayFiltros, onNuevo }) => {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5 border-b border-black/5 bg-white">
      {/* IZQUIERDA */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="flex items-center gap-3 group transition-all active:scale-95 shrink-0"
          type="button"
        >
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-blendfort-fondo border border-black/5 flex items-center justify-center text-black/60 group-hover:bg-black group-hover:text-white transition-all shadow-sm">
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

          <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-black/30 group-hover:text-black transition-colors">
            Volver al Panel
          </span>
        </button>
      </div>

      {/* DERECHA */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Mobile: solo filtros */}
        <button
          onClick={onToggleFiltros}
          type="button"
          className={`md:hidden relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white border transition-all duration-300 active:scale-95 shadow-sm hover:border-blendfort-naranja ${
            hayFiltros ? "border-blendfort-naranja/40" : "border-black/5"
          }`}
          aria-label="Filtros"
          title="Filtros"
        >
          <svg
            className="w-3.5 h-3.5 text-black/45"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
          </svg>

          {hayFiltros && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse" />
          )}
        </button>

        {/* Desktop: filtros */}
        <button
          onClick={onToggleFiltros}
          type="button"
          className={`hidden md:inline-flex items-center gap-3 px-5 h-11 rounded-2xl bg-white border transition-all duration-300 active:scale-95 shadow-sm hover:border-blendfort-naranja ${
            hayFiltros ? "border-blendfort-naranja/40" : "border-black/5"
          }`}
        >
          <svg
            className="w-3.5 h-3.5 text-black/45"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
          </svg>

          <span className="text-[8px] font-black uppercase tracking-[0.22em] text-black/55">
            Filtros
          </span>

          {hayFiltros && (
            <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse" />
          )}
        </button>

        {/* Nuevo */}
        <button
          onClick={onNuevo}
          type="button"
          className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 h-10 md:h-11 rounded-2xl bg-blendfort-naranja text-white font-black text-[8px] md:text-[9px] uppercase tracking-[0.18em] md:tracking-[0.22em] hover:bg-black transition-all active:scale-95 shadow-sm"
        >
          <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-sm font-light leading-none">+</span>
          </div>
          <span>Nuevo</span>
        </button>
      </div>
    </div>
  );
};

export default PersonalTopBar;