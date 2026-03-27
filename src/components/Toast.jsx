import React, { useEffect, useMemo } from "react";

const Toast = ({ mensaje, tipo = "exito", onClose }) => {
  useEffect(() => {
    if (!mensaje) return;
    const timer = setTimeout(() => {
      onClose?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensaje, onClose]);

  const config = useMemo(() => {
    const t = String(tipo || "exito").toLowerCase();

    if (t === "error") {
      return {
        wrapper: "bg-red-500 text-white border-white/10",
        dot: "bg-white",
      };
    }

    if (t === "info") {
      return {
        wrapper: "bg-blendfort-naranja text-white border-white/10",
        dot: "bg-white",
      };
    }

    return {
      wrapper: "bg-black text-white border-white/10",
      dot: "bg-white",
    };
  }, [tipo]);

  if (!mensaje) return null;

  return (
    <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[220] px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className={`${config.wrapper} min-w-[260px] max-w-[92vw] md:max-w-[560px] px-6 md:px-8 py-3 rounded-full shadow-2xl flex items-center justify-center gap-3 border`}
        role="status"
        aria-live="polite"
      >
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-center">
          {mensaje}
        </span>
      </div>
    </div>
  );
};

export default Toast;