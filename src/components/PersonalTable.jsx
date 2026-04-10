import React from "react";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const PersonalTable = ({ data, onOpenDetalle, onNew }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-black/[0.04] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] scrollbar-thin scrollbar-thumb-black/5">
          <table className="w-full text-left border-collapse min-w-[1120px]">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b border-black/[0.04]">
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Empleado
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Proyectos
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Estado general
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">
                  Perfil principal
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 text-right">
                  Referencia
                </th>
                <th className="px-8 py-5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 text-right">
                  Ver
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.02]">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-14">
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
                  const tipo = norm(emp.tipoPrincipal || "CAMPO");
                  const rol = norm(emp.rolPrincipal || "OPERARIO");
                  const esOficina = tipo === "OFICINA";

                  const activas = Number(emp.asignacionesActivas || 0);
                  const inactivas = Number(emp.asignacionesInactivas || 0);
                  const totalAsignaciones = Number(emp.totalAsignaciones || 0);

                  const valorPrincipal = esOficina
                    ? Number(emp.salarioMensualPrincipal) || 0
                    : Number(emp.valorDiaPrincipal) || 0;

                  const valorHoraExtra = Number(emp.valorHoraExtraPrincipal) || 0;
                  const sufijo = esOficina ? "MES" : "DÍA";

                  return (
                    <tr
                      key={emp.key}
                      className="group hover:bg-blendfort-fondo/20 transition-colors"
                    >
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

                        <div className="text-[8px] font-bold opacity-30 uppercase tracking-wider mt-0.5">
                          {totalAsignaciones} asignación{totalAsignaciones === 1 ? "" : "es"}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-2 max-w-[320px]">
                          {(emp.proyectos || []).length ? (
                            emp.proyectos.map((proyecto) => (
                              <span
                                key={proyecto}
                                className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-black/5 text-[8px] font-black uppercase tracking-widest text-black/55"
                              >
                                {proyecto}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-black uppercase text-black/30">
                              Sin proyecto
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              {activas} activas
                            </span>
                          </span>

                          {inactivas > 0 && (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-black/5 text-black/50 border-black/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-black/30" />
                              <span className="text-[8px] font-black uppercase tracking-widest">
                                {inactivas} inactivas
                              </span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                              esOficina
                                ? "bg-black/5 text-black/50 border-black/10"
                                : "bg-blendfort-naranja/10 text-blendfort-naranja border-blendfort-naranja/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                esOficina ? "bg-black/30" : "bg-blendfort-naranja"
                              }`}
                            />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              {tipo}
                            </span>
                          </span>

                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-black/5 text-[8px] font-black uppercase tracking-widest text-black/50">
                            {rol}
                          </span>

                          {emp.cargoPrincipal ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-black/5 text-[8px] font-black uppercase tracking-widest text-black/50">
                              {emp.cargoPrincipal}
                            </span>
                          ) : null}
                        </div>
                      </td>

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

                        <div
                          className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${
                            esOficina ? "text-black/25" : "text-blendfort-naranja/70"
                          }`}
                        >
                          HEX $ {money(valorHoraExtra)}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => onOpenDetalle(emp)}
                            type="button"
                            className="inline-flex items-center gap-2 bg-blendfort-fondo rounded-2xl px-4 py-3 hover:bg-black hover:text-white transition-all active:scale-95"
                            title="Ver detalle"
                            aria-label="Ver detalle"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.8"
                            >
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              <path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" />
                            </svg>

                            <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">
                              Detalle
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
        Tip: haz click en el detalle para ver y gestionar las asignaciones del empleado
      </div>
    </div>
  );
};

export default PersonalTable;