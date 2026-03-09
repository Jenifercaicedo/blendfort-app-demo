import React, { useState, useEffect, useRef } from 'react';

const FilterSelect = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-[9px] font-black uppercase ml-4 opacity-40 tracking-widest">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white p-4 rounded-2xl text-[10px] font-black uppercase flex justify-between items-center cursor-pointer border transition-all ${
          value ? 'border-black/20 shadow-sm' : 'border-black/5 opacity-60'
        } hover:border-blendfort-naranja h-53px`}
      >
        <span>{value || placeholder}</span>
        <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-110 top-full left-0 w-full mt-2 bg-white rounded-1.5rem shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-3 border-b border-black/5 bg-gray-50 hover:border-blendfort-naranja">
            <input 
              autoFocus
              className="w-full bg-white p-2.5 rounded-xl text-[9px] font-bold uppercase outline-none border border-black/5"
              placeholder="Escribe para buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <div onClick={() => { onChange(""); setIsOpen(false); }} className="p-3 text-[9px] font-black uppercase text-black/40 hover:bg-black/5 cursor-pointer border-b border-black/5">• Mostrar Todos</div>
            {filteredOptions.map((opt, i) => (
              <div key={i} onClick={() => { onChange(opt); setIsOpen(false); setSearch(""); }} className="p-4 text-[9px] font-black uppercase hover:bg-black hover:text-white cursor-pointer transition-colors">{opt}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;