import React, { useEffect, useMemo, useRef, useState } from "react";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const FilterSelect = ({ label, options = [], value, onChange, placeholder = "TODOS..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const q = normalize(search);
    if (!q) return options;
    return (options || []).filter((opt) => normalize(opt).includes(q));
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const open = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  const pick = (opt) => {
    onChange(opt);
    close();
  };

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className={`w-full bg-white px-4 py-3.5 md:p-4 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[10px] font-black uppercase flex justify-between items-center border transition-all h-[54px] ${
          value ? "border-black/10 shadow-sm text-black" : "border-black/5 text-black/50"
        } hover:border-blendfort-naranja`}
      >
        <span className="truncate">{value || placeholder}</span>

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

      {isOpen && (
        <div className="absolute z-[200] top-full left-0 w-full mt-2 bg-white rounded-[1.5rem] shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-3 border-b border-black/5 bg-blendfort-fondo/40">
            <input
              ref={inputRef}
              autoFocus
              className="w-full bg-white px-3 py-3 rounded-xl text-[16px] md:text-[10px] font-bold uppercase outline-none border border-black/5 focus:border-black/20 transition-all"
              placeholder="Escribe para buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="w-full text-left p-4 text-[16px] md:text-[10px] font-black uppercase text-black/40 hover:bg-black/5 border-b border-black/5 transition-colors"
            >
              • Mostrar Todos
            </button>

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-[16px] md:text-[10px] font-black uppercase text-black/30">
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  type="button"
                  onClick={() => pick(opt)}
                  className="w-full text-left p-4 text-[16px] md:text-[10px] font-black uppercase hover:bg-black hover:text-white cursor-pointer transition-colors"
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;