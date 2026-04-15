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

  const selectedNormalized = normalize(value);

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
        aria-expanded={isOpen}
        className={`w-full h-[50px] rounded-xl border bg-white px-4 flex items-center justify-between text-left transition-all shadow-sm ${
          value ? "border-black/10 text-slate-800" : "border-black/5 text-slate-400"
        } hover:border-[#FCB017]`}
      >
        <span className="truncate text-[16px] md:text-[11px] font-black uppercase">
          {value || placeholder}
        </span>

        <i
          className={`pi pi-chevron-down text-[12px] text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[220] top-full left-0 w-full mt-2 overflow-hidden rounded-[1.2rem] border border-black/5 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in duration-200">
          <div className="border-b border-black/5 bg-[#F9F9F6] p-3">
            <div className="relative">
              <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400" />
              <input
                ref={inputRef}
                autoFocus
                className="w-full h-[44px] rounded-xl border border-black/5 bg-white pl-9 pr-3 text-[15px] md:text-[10px] font-bold uppercase outline-none transition-all focus:border-black/20"
                placeholder="ESCRIBE PARA BUSCAR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className={`w-full text-left px-4 py-3 border-b border-black/5 transition-colors ${
                !value
                  ? "bg-[#FFF8E8] text-[#C98500]"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="text-[15px] md:text-[11px] font-semibold uppercase">
                Mostrar todos
              </span>
            </button>

            {filteredOptions.length === 0 ? (
              <div className="p-4">
                <p className="text-[12px] font-semibold text-slate-400">
                  Sin resultados
                </p>
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = normalize(opt) === selectedNormalized;

                return (
                  <button
                    key={`${opt}-${i}`}
                    type="button"
                    onClick={() => pick(opt)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected
                        ? "bg-[#FFF8E8] text-[#C98500]"
                        : "text-slate-700 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="text-[15px] md:text-[11px] font-semibold uppercase">
                      {opt}
                    </span>
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