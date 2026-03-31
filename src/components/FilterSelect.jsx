import React, { useEffect, useMemo, useRef, useState } from "react";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const FilterSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "TODOS...",
}) => {
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

  const hasValue = Boolean(value);
  const isActive = isOpen || hasValue;

  return (
    <div className="relative space-y-1" ref={containerRef}>
      {label && (
        <label className="ml-3 md:ml-4 font-display text-[8px] font-black uppercase tracking-[0.22em] text-black/40">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className={`w-full h-[54px] rounded-[1.1rem] md:rounded-2xl px-4 py-3.5 md:p-4 flex items-center justify-between gap-3 text-left font-ui text-[16px] md:text-[10px] font-extrabold uppercase transition-all duration-200 shadow-sm ${
          isActive
            ? "bg-[#fffaf0] text-black border border-blendfort-naranja/35"
            : "bg-white text-black/55 border border-blendfort-naranja/18"
        } hover:bg-[#fffaf0] hover:border-blendfort-naranja/40`}
      >
        <span className="truncate">{value || placeholder}</span>

        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-blendfort-naranja" : "text-black/45"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3.2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[200] mt-2 w-full overflow-hidden rounded-[1.5rem] border border-blendfort-naranja/20 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="border-b border-blendfort-naranja/10 bg-[#fffaf0] p-3">
            <input
              ref={inputRef}
              autoFocus
              className="w-full rounded-xl border border-blendfort-naranja/18 bg-white px-3 py-3 font-ui text-[16px] md:text-[10px] font-bold uppercase outline-none transition-all focus:border-blendfort-naranja/35"
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
              className="w-full border-b border-black/5 px-4 py-4 text-left font-ui text-[16px] md:text-[10px] font-extrabold uppercase text-black/45 transition-colors hover:bg-[#fffaf0] hover:text-[#a16207]"
            >
              • Mostrar Todos
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 font-ui text-[16px] md:text-[10px] font-extrabold uppercase text-black/30">
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const selected = value === opt;

                return (
                  <button
                    key={`${opt}-${i}`}
                    type="button"
                    onClick={() => pick(opt)}
                    className={`w-full px-4 py-4 text-left font-ui text-[16px] md:text-[10px] font-extrabold uppercase transition-all ${
                      selected
                        ? "bg-[#fff4db] text-[#92400e]"
                        : "text-black/75 hover:bg-[#fffaf0] hover:text-[#a16207]"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;