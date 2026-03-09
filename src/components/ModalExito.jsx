import React, { useEffect, useMemo } from "react";

const ModalExito = ({ show, mensaje, tipo = "success", onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const config = useMemo(() => {
    const t = String(tipo || "success").toLowerCase();
    if (t === "info") {
      return {
        pill: "Información",
        iconBg: "bg-blendfort-fondo",
        iconBorder: "border-black/10",
        iconText: "text-blendfort-naranja",
        title: "Aviso",
      };
    }
    if (t === "error") {
      return {
        pill: "Acción requerida",
        iconBg: "bg-red-50",
        iconBorder: "border-red-100",
        iconText: "text-red-600",
        title: "Atención",
      };
    }
    return {
      pill: "Operación exitosa",
      iconBg: "bg-green-50",
      iconBorder: "border-green-100",
      iconText: "text-green-600",
      title: "Confirmación",
    };
  }, [tipo]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300"></div>

      <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] border border-black/5 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-blendfort-fondo/60 border-b border-black/5 px-8 pt-7 pb-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/5 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse"></div>
            <span className="text-[8px] font-black uppercase tracking-[0.35em] text-black/50">
              {config.pill}
            </span>
          </div>
        </div>

        <div className="p-10 text-center">
          <div
            className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto border ${config.iconBorder} shadow-sm`}
          >
            {String(tipo || "success").toLowerCase() === "error" ? (
              <svg className={`w-9 h-9 ${config.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-7.4 12.8A2 2 0 004.62 20h14.76a2 2 0 001.73-3.34l-7.4-12.8a2 2 0 00-3.46 0z" />
              </svg>
            ) : String(tipo || "success").toLowerCase() === "info" ? (
              <svg className={`w-9 h-9 ${config.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className={`w-9 h-9 ${config.iconText} animate-in zoom-in-50 delay-100 duration-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <h2 className="text-[9px] font-black uppercase tracking-[0.45em] text-black/30">
              {config.title}
            </h2>
            <p className="text-xl font-black uppercase tracking-tight text-black leading-tight">
              {mensaje}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 opacity-40">
            <div className="w-10 h-[1px] bg-black/10"></div>
            <div className="w-1 h-1 rounded-full bg-black/20"></div>
            <div className="w-10 h-[1px] bg-black/10"></div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-8 w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-blendfort-naranja transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalExito;