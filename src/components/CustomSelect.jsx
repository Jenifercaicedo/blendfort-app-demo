import React, { useEffect, useMemo, useRef, useState } from "react";


const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const CustomSelect = ({
  label,
  options = [],
  value = "",
  onChange,
  placeholder = "SELECCIONAR...",
  allowCustom = true, // si false, no se puede añadir
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [attemptInvalid, setAttemptInvalid] = useState(false); // feedback sutil
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Índice rápido para validar si algo existe en options (ignorando mayúsculas/acentos)
  const optionsIndex = useMemo(() => {
    const map = new Map();
    (options || []).forEach((opt) => {
      map.set(normalize(opt), opt);
    });
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    const q = normalize(search);
    if (!q) return options;

    return (options || []).filter((opt) => normalize(opt).startsWith(q));
  }, [options, search]);

  // Cerrar al click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
        setAttemptInvalid(false);

        // Si NO se permite custom, al cerrar validamos que el value sea uno de options
        if (!allowCustom && value) {
          const exists = optionsIndex.has(normalize(value));
          if (!exists) onChange("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustom, value, onChange, optionsIndex]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setAttemptInvalid(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const close = () => {
    setIsOpen(false);
    setSearch("");
    setAttemptInvalid(false);
  };

  const pick = (opt) => {
    onChange(opt);
    close();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      close();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const typed = String(search || "").trim();
      if (!typed) return;

      const exact = optionsIndex.get(normalize(typed)); // opción canónica si existe
      if (exact) {
        pick(exact);
        return;
      }

      if (allowCustom) {
        onChange(typed.toUpperCase());
        close();
        return;
      }

      // allowCustom=false -> feedback sutil
      setAttemptInvalid(true);
      setTimeout(() => setAttemptInvalid(false), 900);
    }
  };

  const showInvalid = !allowCustom && value && !optionsIndex.has(normalize(value));

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label className="text-[9px] font-black uppercase ml-4 opacity-40 tracking-widest">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        disabled={disabled}
        className={`w-full bg-white p-4 rounded-2xl text-[10px] font-black uppercase flex justify-between items-center cursor-pointer border transition-all h-[53px] ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blendfort-naranja"
        } ${value ? "border-black/10 shadow-sm" : "border-black/5 opacity-70"} ${
          showInvalid ? "border-red-500/40" : ""
        }`}
      >
        <span className="truncate">{value ? value : placeholder}</span>

        <svg
          className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Hint si está inválido */}
      {showInvalid && (
        <div className="mt-2 text-[8px] font-black uppercase tracking-[0.25em] text-red-500/80 ml-1">
          Selecciona una opción válida
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[200] top-full left-0 w-full mt-2 bg-white rounded-[1.5rem] shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Search */}
          <div className="p-3 border-b border-black/5 bg-blendfort-fondo/40">
            <input
              ref={inputRef}
              className={`w-full bg-white p-3 rounded-xl text-[9px] font-bold uppercase outline-none border transition-all ${
                attemptInvalid ? "border-red-500/40" : "border-black/5 focus:border-black/20"
              }`}
              placeholder={allowCustom ? "Escribe para buscar o agregar..." : "Escribe para buscar..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (attemptInvalid) setAttemptInvalid(false);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-[9px] font-black uppercase text-black/30">
                Sin resultados
                {!allowCustom && (
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/20 mt-2">
                    Selecciona un valor existente
                  </div>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, i) => (
                <div
                  key={`${opt}-${i}`}
                  onClick={() => pick(opt)}
                  className="p-4 text-[9px] font-black uppercase hover:bg-black hover:text-white cursor-pointer transition-colors"
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;