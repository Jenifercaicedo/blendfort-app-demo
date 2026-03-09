import React from "react";

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ManoObraTabla = ({ listaFinal = [], onDetalle, onPagarSemana }) => {
  return (
    <div className="rounded-[2.5rem] border border-black/[0.04] bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[520px] scrollbar-thin scrollbar-thumb-black/5">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-black/[0.04]">
              <th className="px-5 md:px-6 py-3 md:py-4 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] text-black/30">
                Personal
              </th>
              <th className="px-3 md:px-4 py-3 md:py-4 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] text-black/30 text-center">
                Días
              </th>
              <th className="px-3 md:px-4 py-3 md:py-4 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] text-black/30 text-center">
                H-Extras
              </th>
              <th className="px-3 md:px-4 py-3 md:py-4 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] text-black/30 text-right">
                Neto
              </th>
              <th className="px-3 md:px-4 py-3 md:py-4 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] text-black/30 text-center">
                Estado
              </th>
              <th className="px-4 md:px-5 py-3 md:py-4 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] text-black/30 text-right w-[110px]">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/[0.02]">
            {listaFinal.length ? (
              listaFinal.map((emp) => (
                <tr key={emp.nombre} className="hover:bg-blendfort-fondo/20 transition-colors">
                  <td className="px-5 md:px-6 py-3.5 md:py-4">
                    <button
                      type="button"
                      onClick={() => onDetalle?.(emp.nombre)}
                      className="text-[10px] font-black uppercase text-black hover:text-blendfort-naranja transition-colors text-left"
                      title="Ver detalle"
                    >
                      {emp.nombre}
                    </button>
                    <div className="text-[7px] font-bold text-black/30 uppercase tracking-widest mt-0.5">
                      {emp.cargo}
                    </div>
                  </td>

                  <td className="px-3 md:px-4 py-3.5 md:py-4 text-center">
                    <span className="text-[9px] font-black bg-blendfort-fondo px-3 py-1 rounded-full border border-black/5">
                      {emp.dias}
                    </span>
                  </td>

                  <td className="px-3 md:px-4 py-3.5 md:py-4 text-center">
                    <span className={`text-[9px] font-black ${emp.extras > 0 ? "text-black" : "text-black/15"}`}>
                      {emp.extras > 0 ? emp.extras : "—"}
                    </span>
                  </td>

                  <td className="px-3 md:px-4 py-3.5 md:py-4 text-right">
                    <span className="text-[11px] font-black text-black tracking-tight">
                      $ {money(emp.neto)}
                    </span>
                  </td>

                  <td className="px-3 md:px-4 py-3.5 md:py-4 text-center">
                    <span
                      className={`text-[7px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                        emp.estadoSemana === "PAGADO"
                          ? "bg-green-50 text-green-600 border-green-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}
                    >
                      {emp.estadoSemana}
                    </span>
                  </td>

                  <td className="px-4 md:px-5 py-3.5 md:py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onDetalle?.(emp.nombre)}
                        className="w-9 h-9 rounded-full bg-blendfort-fondo text-black/70 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm active:scale-90"
                        title="Editar (desde detalle)"
                        aria-label="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6">
                          <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          <path d="M19.5 7.125L16.875 4.5" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPagarSemana?.(emp.nombre)}
                        className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-90"
                        title="Marcar pagado (semana)"
                        aria-label="Pagar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-20 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.45em] opacity-20">
                    No hay nómina para este filtro
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManoObraTabla;