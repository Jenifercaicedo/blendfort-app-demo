import React, { useEffect } from 'react';

const Toast = ({ mensaje, tipo = 'exito', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const estilos = {
    exito: 'bg-black text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blendfort-naranja text-white'
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`${estilos[tipo]} px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10`}>
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{mensaje}</span>
      </div>
    </div>
  );
};

export default Toast;