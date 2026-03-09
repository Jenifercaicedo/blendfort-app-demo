import React, { useEffect, useRef } from "react";

const ModalConfirmar = ({ id, onConfirm, onCancel }) => {
  if (!id) return null;

  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] border border-black/5 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 pt-10 pb-6 border-b border-black/5 bg-blendfort-fondo/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-[2px] bg-red-500/70"></div>
            <span className="text-[8px] font-black uppercase tracking-[0.45em] text-black/40">
              Acción crítica
            </span>
          </div>

          <h3 className="text-2xl font-black uppercase tracking-tight text-black leading-tight">
            ¿Eliminar registro?
          </h3>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mt-3 leading-relaxed">
            Esta operación es permanente y no se puede deshacer.
          </p>
        </div>

        {/* Body */}
        <div className="p-8">
          <div className="bg-red-50 border border-red-100 rounded-[2rem] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13A1.5 1.5 0 004.09 19h15.82a1.5 1.5 0 001.3-2.14l-7.5-13a1.5 1.5 0 00-2.62 0z"
                  />
                </svg>
              </div>

              <div className="flex-1">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-red-600/80">
                  Confirmación requerida
                </div>
                <div className="text-[10px] font-black uppercase tracking-tight text-black/70 mt-1">
                  Se eliminará el registro seleccionado
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              type="button"
              className="flex-1 bg-white border border-black/10 text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] hover:border-black hover:shadow-sm transition-all active:scale-95"
            >
              Cancelar
            </button>

            <button
              ref={confirmRef}
              onClick={onConfirm}
              type="button"
              className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] hover:brightness-110 transition-all active:scale-95 shadow-sm"
            >
              Eliminar
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full text-[9px] font-black uppercase tracking-[0.3em] text-black/30 hover:text-black transition-colors"
          >
            ← Volver sin cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmar;