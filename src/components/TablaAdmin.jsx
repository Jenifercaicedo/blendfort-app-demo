import React, { useState } from "react";
import EgresoDetailModal from "./EgresoDetailModal";

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

const TablaAdmin = ({
  egresos,
  onEdit,
  onDelete,
  onSelect,
  editandoId,
  totalFiltrado,
}) => {
  const [detalleEgreso, setDetalleEgreso] = useState(null);

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

  const abrirDetalle = (item) => {
    setDetalleEgreso(item);
    onSelect?.(item);
  };

  return (
    <div className="space-y-4">
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[540px] scrollbar-thin scrollbar-thumb-black/5">
        <table className="w-full min-w-[980px] text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-black/[0.05] bg-slate-50/70">
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Proyecto
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Concepto
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Categoría
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Estado
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Creado por
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-center">
                Fact.
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-right">
                Monto
              </th>
            </tr>
          </thead>

          <tbody>
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
                  className={`border-b border-black/[0.04] transition-colors ${
                    isAnulado
                      ? "bg-red-50/40 hover:bg-red-50/60"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => abrirDetalle(item)}
                      className="text-left"
                      title="Ver detalle"
                    >
                      <p
                        className={`text-[13px] font-black ${
                          isAnulado
                            ? "text-red-700/80 line-through decoration-red-300"
                            : "text-slate-800 hover:text-[#C98500]"
                        }`}
                      >
                        {item.proyecto}
                      </p>
                      <p
                        className={`mt-1 text-[11px] font-medium ${
                          isAnulado ? "text-red-500/70" : "text-slate-500"
                        }`}
                      >
                        {item.lugar || "Sin lugar"}
                      </p>
                    </button>
                  </td>

                  <td className="px-5 py-4">
                    <p
                      className={`text-[13px] font-black ${
                        isAnulado
                          ? "text-red-700/80 line-through decoration-red-300"
                          : "text-slate-800"
                      }`}
                    >
                      {item.concepto || "Sin concepto"}
                    </p>
                    <p
                      className={`mt-1 text-[11px] font-medium ${
                        isAnulado ? "text-red-500/70" : "text-slate-500"
                      }`}
                    >
                      {item.metodoPago || "—"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                        isAnulado
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.categoria}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        isAnulado
                          ? "text-red-700 bg-red-50 border-red-200"
                          : isPagado
                          ? "text-green-700 bg-green-50 border-green-200"
                          : "text-amber-700 bg-amber-50 border-amber-200"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isAnulado
                            ? "bg-red-500"
                            : isPagado
                            ? "bg-green-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {item.estado}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`text-[12px] font-semibold ${
                          isAnulado ? "text-red-600/80" : "text-slate-700"
                        }`}
                      >
                        {creador}
                      </span>

                      {rol ? (
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                            rol === "ADMIN"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20"
                          }`}
                        >
                          {rol}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-center">
                    {item.factura === "si" || item.tieneFactura ? (
                      <div
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                          isAnulado
                            ? "bg-red-50 text-red-400"
                            : "bg-[#FFF8E8] text-[#C98500]"
                        }`}
                      >
                        <i className="pi pi-file text-[12px]" />
                      </div>
                    ) : (
                      <span className="text-slate-300 text-[12px] font-semibold">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <p
                      className={`text-[13px] font-black ${
                        isAnulado
                          ? "text-red-700/80 line-through decoration-red-300"
                          : "text-slate-800"
                      }`}
                    >
                      $ {money(item.valor)}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {(egresos || []).map((item) => {
          const creador = getCreador(item);
          const rol = getRol(item);
          const estadoNorm = norm(item?.estado || "PENDIENTE");
          const isAnulado = estadoNorm === "ANULADO";
          const isPagado =
            estadoNorm === "COMPLETADO" || estadoNorm === "PAGADO";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => abrirDetalle(item)}
              className={`w-full rounded-[1.4rem] border p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.035)] ${
                isAnulado
                  ? "border-red-200 bg-red-50/60"
                  : "border-black/5 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-[14px] font-black leading-snug ${
                      isAnulado
                        ? "text-red-700/80 line-through decoration-red-300"
                        : "text-slate-800"
                    }`}
                  >
                    {item.concepto || "Sin concepto"}
                  </p>

                  <p
                    className={`mt-1 text-[12px] font-semibold ${
                      isAnulado ? "text-red-500/70" : "text-slate-500"
                    }`}
                  >
                    {item.proyecto}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`text-[14px] font-black ${
                      isAnulado
                        ? "text-red-700/80 line-through decoration-red-300"
                        : "text-slate-800"
                    }`}
                  >
                    $ {money(item.valor)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    isAnulado
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.categoria}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    isAnulado
                      ? "text-red-700 bg-red-50 border-red-200"
                      : isPagado
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isAnulado
                        ? "bg-red-500"
                        : isPagado
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                  />
                  {item.estado}
                </span>

                {rol ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      rol === "ADMIN"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20"
                    }`}
                  >
                    {rol}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-medium ${
                      isAnulado ? "text-red-500/70" : "text-slate-500"
                    }`}
                  >
                    {creador}
                  </p>
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      isAnulado ? "text-red-500/70" : "text-slate-500"
                    }`}
                  >
                    {item.lugar || "Sin lugar"} • {item.metodoPago || "—"}
                  </p>
                </div>

                {(item.factura === "si" || item.tieneFactura) && (
                  <div
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                      isAnulado
                        ? "bg-red-50 text-red-400"
                        : "bg-[#FFF8E8] text-[#C98500]"
                    }`}
                  >
                    <i className="pi pi-file text-[12px]" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
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