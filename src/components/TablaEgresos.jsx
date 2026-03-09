import React, { useState } from "react";
import EgresoDetalleResidenteModal from "../components/EgresoDetalleResidenteModal";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const TablaEgresos = ({ registros, onEdit, onDelete, canEdit, canDelete }) => {
  const [detalleEgreso, setDetalleEgreso] = useState(null);

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-black/[0.04] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] scrollbar-thin scrollbar-thumb-black/5">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead className="sticky top-0 z-20 bg-black">
              <tr className="border-b border-white/10">
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70">
                  Fecha
                </th>
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70">
                  Proyecto & Concepto
                </th>
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70">
                  Categoría
                </th>
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70">
                  Estado
                </th>
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70 text-center">
                  Fact.
                </th>
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70 text-right">
                  Valor
                </th>
                <th className="px-4 md:px-8 py-4 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-white/70 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.02]">
              {(registros || []).map((reg) => {
                const puedeEditar = canEdit ? canEdit(reg) : true;
                const puedeEliminar = canDelete ? canDelete(reg) : true;

                const estadoU = String(reg?.estado || "PENDIENTE").toUpperCase().trim();
                const esPagado = estadoU === "PAGADO" || estadoU === "COMPLETADO";

                const tieneFactura =
                  Boolean(reg?.tieneFactura) || String(reg?.factura || "").toLowerCase() === "si";

                return (
                  <tr
                    key={reg.id}
                    className="group hover:bg-blendfort-fondo/20 transition-colors"
                  >
                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <div className="text-[9px] md:text-[10px] font-black uppercase text-black/40">
                        {reg.fecha}
                      </div>
                    </td>

                    {/* ✅ CLICK PARA ABRIR DETALLE */}
                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <button
                        type="button"
                        onClick={() => setDetalleEgreso(reg)}
                        className="text-left w-full group/item"
                        title="Ver detalle"
                      >
                        <div className="text-[9px] md:text-[10px] font-black uppercase text-blendfort-naranja">
                          <span className="border-b border-transparent group-hover/item:border-blendfort-naranja transition-all">
                            {reg.proyecto}
                          </span>
                        </div>
                        <div className="text-[10px] md:text-[11px] font-black uppercase text-black/70 mt-1 truncate max-w-[260px]">
                          {reg.concepto}
                        </div>
                      </button>
                    </td>

                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <div className="text-[8px] md:text-[9px] font-black uppercase text-black/40 italic">
                        {reg.categoria}
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <div
                        className={`text-[6px] md:text-[7px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          esPagado ? "text-green-600" : "text-amber-500"
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            esPagado ? "bg-green-600" : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {reg.estado}
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-3.5 md:py-5 text-center">
                      {tieneFactura ? (
                        <div className="flex justify-center">
                          <div className="text-blendfort-naranja/70 hover:text-blendfort-naranja transition-colors">
                            <svg
                              className="w-3.5 h-3.5 md:w-4 md:h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12h6m-6 4h6M7 3h7l3 3v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
                              />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v3a1 1 0 001 1h3" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] opacity-10 font-black">—</span>
                      )}
                    </td>

                    <td className="px-4 md:px-8 py-3.5 md:py-5 text-right">
                      <div className="text-[10px] md:text-[11px] font-black text-black tracking-tight">
                        $ {money(reg.valor)}
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (puedeEditar) onEdit(reg);
                          }}
                          disabled={!puedeEditar}
                          title={!puedeEditar ? "Solo puedes editar registros que tú creaste" : "Editar"}
                          className={`w-9 h-9 rounded-full transition-all shadow-sm active:scale-90 flex items-center justify-center ${
                            puedeEditar
                              ? "bg-blendfort-fondo text-black/70 hover:bg-black hover:text-white"
                              : "bg-black/5 text-black/20 cursor-not-allowed"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6">
                            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            <path d="M19.5 7.125L16.875 4.5" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (puedeEliminar) onDelete(reg.id);
                          }}
                          disabled={!puedeEliminar}
                          title={!puedeEliminar ? "Solo puedes eliminar registros que tú creaste" : "Eliminar"}
                          className={`w-9 h-9 rounded-full transition-all shadow-sm active:scale-90 flex items-center justify-center ${
                            puedeEliminar
                              ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                              : "bg-black/5 text-black/20 cursor-not-allowed"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!registros || registros.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.45em] opacity-20">
                      No hay registros para este filtro
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EgresoDetalleResidenteModal
        egreso={detalleEgreso}
        onClose={() => setDetalleEgreso(null)}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => {
          if (!detalleEgreso) return;
          onEdit(detalleEgreso);
          setDetalleEgreso(null);
        }}
        onDelete={() => {
          if (!detalleEgreso) return;
          onDelete(detalleEgreso.id);
          setDetalleEgreso(null);
        }}
      />
    </div>
  );
};

export default TablaEgresos;