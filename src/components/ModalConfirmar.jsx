import React, { useEffect, useMemo, useRef } from "react";

const isUuidLike = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );

const ModalConfirmar = ({ id, onConfirm, onCancel }) => {
  if (!id) return null;

  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const config = useMemo(() => {
    const esEgreso = isUuidLike(id);

    if (esEgreso) {
      return {
        eyebrow: "Acción crítica",
        title: "¿Anular registro?",
        description: "El registro no se borrará. Quedará anulado y guardado para auditoría.",
        infoTitle: "Confirmación requerida",
        infoText: "Se anulará el egreso seleccionado",
        confirmText: "Anular",
        accentBar: "bg-red-500/70",
        infoBox: "bg-red-50 border-red-100",
        iconBox: "bg-red-500 text-white",
        confirmBtn: "bg-red-500 hover:brightness-110 text-white",
      };
    }

    return {
      eyebrow: "Acción crítica",
      title: "¿Eliminar proyecto?",
      description: "Esta acción eliminará el proyecto seleccionado.",
      infoTitle: "Confirmación requerida",
      infoText: "Se eliminará el proyecto seleccionado",
      confirmText: "Eliminar",
      accentBar: "bg-red-500/70",
      infoBox: "bg-red-50 border-red-100",
      iconBox: "bg-red-500 text-white",
      confirmBtn: "bg-red-500 hover:brightness-110 text-white",
    };
  }, [id]);

  return (
    <div
      className="fixed inset-0 z-[190] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] md:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] border border-black/5 overflow-hidden animate-in zoom-in-95 duration-300 my-2 md:my-4">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 border-b border-black/5 bg-blendfort-fondo/40">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-[2px] ${config.accentBar}`}></div>
              <span className="text-[8px] font-black uppercase tracking-[0.45em] text-black/40">
                {config.eyebrow}
              </span>
            </div>

            <h3 className="text-2xl font-black uppercase tracking-tight text-black leading-tight">
              {config.title}
            </h3>

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mt-3 leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className={`${config.infoBox} border rounded-[2rem] p-5`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${config.iconBox} flex items-center justify-center shadow-sm`}>
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
                    {config.infoTitle}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-tight text-black/70 mt-1">
                    {config.infoText}
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
                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95 shadow-sm ${config.confirmBtn}`}
              >
                {config.confirmText}
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
    </div>
  );
};

export default ModalConfirmar;