import React, { useState } from "react";
import EgresoDetailModal from "./EgresoDetailModal";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const TablaAdmin = ({ egresos, onEdit, onDelete, onSelect, editandoId, totalFiltrado }) => {
  const [detalleEgreso, setDetalleEgreso] = useState(null);

  const money = (n) => {
    const num = Number(n);
    if (Number.isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getCreador = (item) => {
    const a =
      item?.creadoPorNombre ||
      item?.creado_por_nombre ||
      item?.creadoPor ||
      item?.creado_por ||
      item?.residente ||
      "";

    return String(a || "").toUpperCase().trim() || "—";
  };

  const getRol = (item) => {
    const r =
      item?.creadoPorRol ||
      item?.creado_por_rol ||
      item?.actualizadoPorRol ||
      item?.actualizado_por_rol ||
      "";

    return String(r || "").toUpperCase().trim();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-black/[0.04] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[480px] scrollbar-thin scrollbar-thumb-black/5">
          <table className="w-full text-left border-collapse min-w-[760px] md:min-w-[900px]">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b border-black/[0.04]">
                <th className="px-4 md:px-8 py-3 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-black/30">
                  Proyecto & Creado Por
                </th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-black/30">
                  Concepto & Lugar
                </th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-black/30">
                  Categoría & Estado
                </th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-black/30 text-center">
                  Fact.
                </th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-black/30 text-right">
                  Monto & Pago
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.02]">
              {(egresos || []).map((item) => {
                const creador = getCreador(item);
                const rol = getRol(item);
                const estadoNorm = norm(item?.estado || "PENDIENTE");
                const isAnulado = estadoNorm === "ANULADO";
                const isPagado =
                  estadoNorm === "COMPLETADO" || estadoNorm === "PAGADO";

                return (
                  <tr
                    key={item.id}
                    className={`group transition-colors ${
                      isAnulado
                        ? "bg-red-50/40 hover:bg-red-50/70"
                        : "hover:bg-blendfort-fondo/20"
                    }`}
                  >
                    {/* Proyecto & creado por */}
                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <button
                        type="button"
                        onClick={() => setDetalleEgreso(item)}
                        className={`text-left transition-colors group/item ${
                          isAnulado
                            ? "text-red-700"
                            : "text-black hover:text-blendfort-naranja"
                        }`}
                        title="Ver detalle"
                      >
                        <span
                          className={`text-[9px] md:text-[10px] font-black uppercase border-b border-transparent transition-all ${
                            isAnulado
                              ? "line-through decoration-2 decoration-red-300"
                              : "group-hover/item:border-blendfort-naranja"
                          }`}
                        >
                          {item.proyecto}
                        </span>
                      </button>

                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[7px] md:text-[8px] font-bold uppercase tracking-wider ${
                            isAnulado ? "text-red-700/70" : "opacity-30"
                          }`}
                        >
                          {creador}
                        </span>

                        {rol ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest border ${
                              rol === "ADMIN"
                                ? "bg-black/5 text-black/50 border-black/10"
                                : "bg-blendfort-naranja/10 text-blendfort-naranja border-blendfort-naranja/20"
                            }`}
                          >
                            {rol}
                          </span>
                        ) : null}

                        {isAnulado && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest border bg-red-50 text-red-700 border-red-200">
                            ANULADO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Concepto & lugar */}
                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <div
                        className={`text-[9px] md:text-[10px] font-black uppercase mb-0.5 truncate max-w-[140px] md:max-w-[180px] ${
                          isAnulado
                            ? "text-red-700/80 line-through decoration-red-300"
                            : "text-black/70"
                        }`}
                      >
                        {item.concepto}
                      </div>
                      <div
                        className={`text-[7px] md:text-[8px] font-bold uppercase ${
                          isAnulado ? "text-red-700/50" : "opacity-20"
                        }`}
                      >
                        {item.lugar}
                      </div>
                    </td>

                    {/* Categoría & estado */}
                    <td className="px-4 md:px-8 py-3.5 md:py-5">
                      <div
                        className={`text-[8px] md:text-[9px] font-black uppercase mb-1 italic ${
                          isAnulado ? "text-red-700/70" : "text-black/40"
                        }`}
                      >
                        {item.categoria}
                      </div>

                      <div
                        className={`text-[6px] md:text-[7px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                          isAnulado
                            ? "text-red-700 bg-red-50 border-red-200"
                            : isPagado
                            ? "text-green-600 bg-green-50 border-green-100"
                            : "text-amber-500 bg-amber-50 border-amber-100"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAnulado
                              ? "bg-red-600"
                              : isPagado
                              ? "bg-green-600"
                              : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {item.estado}
                      </div>
                    </td>

                    {/* Factura */}
                    <td className="px-4 md:px-8 py-3.5 md:py-5 text-center">
                      {item.factura === "si" || item.tieneFactura ? (
                        <div
                          className={`flex justify-center ${
                            isAnulado ? "text-red-400" : "text-blendfort-naranja/60"
                          }`}
                        >
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
                              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-[9px] opacity-10 font-black">—</span>
                      )}
                    </td>

                    {/* Monto & pago */}
                    <td className="px-4 md:px-8 py-3.5 md:py-5 text-right">
                      <div
                        className={`text-[10px] md:text-[11px] font-black tracking-tight ${
                          isAnulado
                            ? "text-red-700/80 line-through decoration-red-300"
                            : "text-black"
                        }`}
                      >
                        $ {money(item.valor)}
                      </div>
                      <div
                        className={`text-[6px] md:text-[7px] font-black uppercase ${
                          isAnulado ? "text-red-500/70" : "text-blendfort-naranja opacity-60"
                        }`}
                      >
                        {isAnulado ? "ANULADO" : item.metodoPago}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EgresoDetailModal
        egreso={detalleEgreso}
        onClose={() => setDetalleEgreso(null)}
        onEdit={() => {
          onEdit(detalleEgreso);
          setDetalleEgreso(null);
        }}
        onDelete={() => {
          onDelete(detalleEgreso.id);
          setDetalleEgreso(null);
        }}
      />
    </div>
  );
};

export default TablaAdmin;