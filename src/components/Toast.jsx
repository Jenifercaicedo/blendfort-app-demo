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
        wrapper:
          "bg-white text-red-700 border-red-100 shadow-[0_18px_40px_rgba(239,68,68,0.14)]",
        dot: "bg-red-500",
        label: "Error",
      };
    }

    if (t === "info") {
      return {
        wrapper:
          "bg-white text-[#C98500] border-[#FCB017]/20 shadow-[0_18px_40px_rgba(252,176,23,0.14)]",
        dot: "bg-[#FCB017]",
        label: "Aviso",
      };
    }

    return {
      wrapper:
        "bg-white text-slate-800 border-black/5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]",
      dot: "bg-green-500",
      label: "Correcto",
    };
  }, [tipo]);

  if (!mensaje) return null;

  return (
    <div className="fixed bottom-5 md:bottom-8 left-1/2 z-[220] w-full max-w-full -translate-x-1/2 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className={`mx-auto flex min-h-[52px] w-fit max-w-[94vw] items-center justify-center gap-3 rounded-full border px-4 py-3 md:px-5 ${config.wrapper}`}
        role="status"
        aria-live="polite"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot} animate-pulse`} />

        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden sm:inline text-[11px] font-semibold text-slate-400">
            {config.label}
          </span>

          <span className="text-center text-[11px] md:text-[12px] font-semibold leading-tight">
            {mensaje}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Toast;