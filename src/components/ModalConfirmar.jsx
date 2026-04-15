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
        description:
          "El registro no se eliminará de la auditoría. Quedará marcado como anulado.",
        infoTitle: "Confirmación requerida",
        infoText: "Se anulará el egreso seleccionado.",
        confirmText: "Anular",
        accentBar: "bg-red-500",
        infoWrap: "bg-red-50 border-red-100",
        iconWrap: "bg-red-500 text-white",
        confirmBtn:
          "bg-red-500 text-white hover:bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.18)]",
      };
    }

    return {
      eyebrow: "Acción crítica",
      title: "¿Eliminar proyecto?",
      description:
        "Esta acción eliminará el proyecto seleccionado del sistema.",
      infoTitle: "Confirmación requerida",
      infoText: "Se eliminará el proyecto seleccionado.",
      confirmText: "Eliminar",
      accentBar: "bg-red-500",
      infoWrap: "bg-red-50 border-red-100",
      iconWrap: "bg-red-500 text-white",
      confirmBtn:
        "bg-red-500 text-white hover:bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.18)]",
    };
  }, [id]);

  return (
    <div
      className="fixed inset-0 z-[190] overflow-y-auto bg-black/55 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] md:rounded-[2.4rem] border border-black/5 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] animate-in zoom-in-95 duration-300 my-2 md:my-4">
          {/* Header */}
          <div className="relative border-b border-black/5 bg-[linear-gradient(180deg,#FFF8E8_0%,#FFFFFF_100%)] px-6 pb-5 pt-6 md:px-7 md:pb-6">
            <div className="flex items-center gap-2">
              <div className={`h-[2px] w-6 ${config.accentBar}`} />
              <span className="text-[10px] font-semibold text-slate-500">
                {config.eyebrow}
              </span>
            </div>

            <h3 className="mt-3 text-[24px] md:text-[28px] font-black tracking-tight text-slate-800 leading-none">
              {config.title}
            </h3>

            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
              {config.description}
            </p>
          </div>

          {/* Body */}
          <div className="p-6 md:p-7">
            <div className={`rounded-[1.4rem] border p-4 md:p-5 ${config.infoWrap}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconWrap}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13A1.5 1.5 0 004.09 19h15.82a1.5 1.5 0 001.3-2.14l-7.5-13a1.5 1.5 0 00-2.62 0z"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-red-600">
                    {config.infoTitle}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-700">
                    {config.infoText}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[12px] font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                ref={confirmRef}
                onClick={onConfirm}
                type="button"
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-[12px] font-semibold transition-all active:scale-[0.98] ${config.confirmBtn}`}
              >
                {config.confirmText}
              </button>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="mt-4 w-full text-center text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700"
            >
              Volver sin cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmar;