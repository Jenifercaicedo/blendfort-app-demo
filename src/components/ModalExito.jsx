import React, { useEffect, useMemo } from "react";

const ModalExito = ({ show, mensaje, tipo = "success", onClose }) => {
  useEffect(() => {
    if (!show) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      onClose?.();
    }, 2000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
    };
  }, [show, onClose]);

  const config = useMemo(() => {
    const t = String(tipo || "success").toLowerCase();

    if (t === "info") {
      return {
        pill: "Información",
        title: "Aviso",
        accent: "bg-[#FCB017]",
        iconWrap: "bg-[#FFF8E8] border-[#FCB017]/15",
        iconColor: "text-[#C98500]",
        button: "bg-slate-800 hover:bg-[#FCB017] text-white",
      };
    }

    if (t === "error") {
      return {
        pill: "Acción requerida",
        title: "Atención",
        accent: "bg-red-500",
        iconWrap: "bg-red-50 border-red-100",
        iconColor: "text-red-600",
        button: "bg-red-500 hover:bg-red-600 text-white",
      };
    }

    return {
      pill: "Operación exitosa",
      title: "Confirmación",
      accent: "bg-green-500",
      iconWrap: "bg-green-50 border-green-100",
      iconColor: "text-green-600",
      button: "bg-slate-800 hover:bg-[#FCB017] text-white",
    };
  }, [tipo]);

  if (!show) return null;

  const tipoNormalizado = String(tipo || "success").toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[230] overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-in fade-in duration-300" />

      <div className="relative min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] md:rounded-[2.4rem] border border-black/5 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] animate-in zoom-in-95 duration-300 my-2 md:my-4">
          {/* Header */}
          <div className="border-b border-black/5 bg-[linear-gradient(180deg,#FFF8E8_0%,#FFFFFF_100%)] px-6 pb-5 pt-5 md:px-7 md:pb-6 md:pt-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 shadow-sm">
              <span className={`h-1.5 w-1.5 rounded-full ${config.accent}`} />
              <span className="text-[10px] font-semibold text-slate-500">
                {config.pill}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-7 text-center md:px-7 md:py-8">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border shadow-sm ${config.iconWrap}`}
            >
              {tipoNormalizado === "error" ? (
                <svg
                  className={`h-9 w-9 ${config.iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86l-7.4 12.8A2 2 0 004.62 20h14.76a2 2 0 001.73-3.34l-7.4-12.8a2 2 0 00-3.46 0z"
                  />
                </svg>
              ) : tipoNormalizado === "info" ? (
                <svg
                  className={`h-9 w-9 ${config.iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16v-4m0-4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className={`h-9 w-9 ${config.iconColor} animate-in zoom-in-50 delay-100 duration-500`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-semibold text-slate-500">
                {config.title}
              </p>
              <h2 className="mt-2 text-[20px] md:text-[22px] font-black uppercase tracking-tight leading-tight text-slate-800">
                {mensaje}
              </h2>
            </div>

            <div className="mt-7 flex items-center justify-center gap-2">
              <div className="h-px w-10 bg-black/10" />
              <div className="h-1 w-1 rounded-full bg-black/20" />
              <div className="h-px w-10 bg-black/10" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`mt-7 inline-flex h-11 w-full items-center justify-center rounded-full text-[12px] font-semibold transition-all active:scale-[0.98] ${config.button}`}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalExito;