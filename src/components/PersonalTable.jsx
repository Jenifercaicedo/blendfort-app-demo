import React from "react";

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PersonalTable = ({ data, onOpenDetalle, onEdit, onDelete, onNew }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-black/[0.04] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] scrollbar-thin scrollbar-thumb-black/5">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b border-black/[0.04]">
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Empleado
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Proyecto
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Tipo
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 text-right">
                  Valores
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.02]">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-14">
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30">
                        No hay resultados
                      </div>
                      <div className="text-[11px] font-black uppercase tracking-tight text-black/70 mt-2">
                        Crea un empleado o ajusta los filtros
                      </div>
                      <div className="mt-5">
                        <button
                          onClick={onNew}
                          type="button"
                          className="bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] hover:bg-blendfort-naranja transition-all active:scale-95"
                        >
                          Nuevo Empleado
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((emp) => {
                  const tipo = emp.tipo || "CAMPO";
                  const esOficina = tipo === "OFICINA";
                  const valorPrincipal = esOficina ? emp.salarioMensual : emp.valorDia;
                  const sufijo = esOficina ? "MES" : "DÍA";

                  return (
                    <tr
                      key={emp.id}
                      className="group hover:bg-blendfort-fondo/20 transition-colors"
                    >
                      {/* Empleado (nombre + cargo) */}
                      <td className="px-8 py-5">
                        <button
                          type="button"
                          onClick={() => onOpenDetalle(emp)}
                          className="text-[10px] font-black uppercase text-black hover:text-blendfort-naranja transition-colors text-left group/item"
                          title="Ver detalle"
                        >
                          <span className="border-b border-transparent group-hover/item:border-blendfort-naranja transition-all">
                            {emp.nombre}
                          </span>
                        </button>
                        <div className="text-[8px] font-bold opacity-30 uppercase tracking-wider">
                          {emp.cargo}
                        </div>
                      </td>

                      {/* Proyecto */}
                      <td className="px-8 py-5">
                        <div className="text-[10px] font-black uppercase text-black/70">
                          {emp.proyecto ? emp.proyecto : "SIN ASIGNAR"}
                        </div>
                        <div className="text-[8px] font-bold opacity-20 uppercase tracking-wider">
                          asignación actual
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-8 py-5">
                        <div className="inline-flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              esOficina ? "bg-black/30" : "bg-blendfort-naranja/80"
                            }`}
                          />
                          <span className="text-[9px] font-black uppercase tracking-widest text-black/50">
                            {tipo}
                          </span>
                        </div>
                      </td>

                      {/* Valores (dinámico por tipo) */}
                      <td className="px-8 py-5 text-right">
                        <div className="text-[11px] font-black text-black tracking-tight">
                          <span className="text-[8px] font-black uppercase text-blendfort-naranja mr-1">
                            USD
                          </span>
                          $ {money(valorPrincipal)}{" "}
                          <span className="text-[7px] font-black uppercase tracking-widest text-black/20">
                            / {sufijo}
                          </span>
                        </div>

                        <div className="text-[8px] font-black uppercase tracking-widest text-blendfort-naranja/70 mt-0.5">
                          HEX $ {money(emp.valorHoraExtra)}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {/* Editar */}
                          <button
                            onClick={() => onEdit(emp)}
                            type="button"
                            className="inline-flex items-center gap-2 bg-blendfort-fondo rounded-2xl px-3 py-3 hover:bg-black hover:text-white transition-all active:scale-95"
                            title="Editar"
                            aria-label="Editar"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.8"
                            >
                              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              <path d="M19.5 7.125L16.875 4.5" />
                            </svg>

                            <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">
                              Editar
                            </span>
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => onDelete(emp.id)}
                            type="button"
                            className="inline-flex items-center gap-2 bg-red-50 text-red-600/70 rounded-2xl px-3 py-3 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.8"
                            >
                              <path d="M6 7h12" />
                              <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M7 7l1 14h8l1-14" />
                            </svg>

                            <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">
                              Eliminar
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 px-2">
        Tip: haz click en el nombre para ver el detalle
      </div>
    </div>
  );
};

export default PersonalTable;