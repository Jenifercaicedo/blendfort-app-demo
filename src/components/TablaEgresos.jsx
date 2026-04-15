import React, { useState } from "react";
import EgresoDetalleResidenteModal from "../components/EgresoDetalleResidenteModal";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const estadoBadge = (estado) => {
  const estadoU = norm(estado || "PENDIENTE");

  if (estadoU === "ANULADO") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (estadoU === "PAGADO" || estadoU === "COMPLETADO") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
};

const TablaEgresos = ({ registros, onEdit, onDelete, canEdit, canDelete }) => {
  const [detalleEgreso, setDetalleEgreso] = useState(null);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] md:rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b border-black/5 bg-[#F9F9F6]">
                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                  Fecha
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                  Proyecto y concepto
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                  Categoría
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                  Estado
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500">
                  Fact.
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-500">
                  Valor
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.04]">
              {(registros || []).map((reg) => {
                const estadoU = norm(reg?.estado || "PENDIENTE");
                const esAnulado = estadoU === "ANULADO";

                const puedeEditarBase = canEdit ? canEdit(reg) : true;
                const puedeEliminarBase = canDelete ? canDelete(reg) : true;

                const puedeEditar = !esAnulado && puedeEditarBase;
                const puedeEliminar = !esAnulado && puedeEliminarBase;

                const tieneFactura =
                  Boolean(reg?.tieneFactura) ||
                  String(reg?.factura || "").toLowerCase() === "si";

                return (
                  <tr
                    key={reg.id}
                    className={`transition-colors ${
                      esAnulado ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-[#FCFCFA]"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <p
                        className={`text-[12px] font-semibold ${
                          esAnulado ? "text-red-700/70" : "text-slate-600"
                        }`}
                      >
                        {reg.fecha}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setDetalleEgreso(reg)}
                        className="w-full text-left"
                        title="Ver detalle"
                      >
                        <p
                          className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            esAnulado ? "text-red-700/70" : "text-[#C98500]"
                          }`}
                        >
                          {reg.proyecto}
                        </p>

                        <p
                          className={`mt-1 text-[13px] font-black uppercase tracking-tight truncate max-w-[320px] ${
                            esAnulado
                              ? "text-red-700/80 line-through decoration-red-300"
                              : "text-slate-800 hover:text-[#C98500]"
                          }`}
                        >
                          {reg.concepto}
                        </p>
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      <p
                        className={`text-[12px] font-semibold uppercase ${
                          esAnulado ? "text-red-700/70" : "text-slate-500"
                        }`}
                      >
                        {reg.categoria}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${estadoBadge(
                          reg.estado
                        )}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            estadoU === "ANULADO"
                              ? "bg-red-600"
                              : estadoU === "PAGADO" || estadoU === "COMPLETADO"
                              ? "bg-green-600"
                              : "bg-amber-500"
                          }`}
                        />
                        {reg.estado}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {tieneFactura ? (
                        <div
                          className={`inline-flex items-center justify-center ${
                            esAnulado ? "text-red-400" : "text-[#C98500]"
                          }`}
                        >
                          <i className="pi pi-file text-[14px]" />
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <p
                        className={`text-[14px] font-black tracking-tight ${
                          esAnulado
                            ? "text-red-700/80 line-through decoration-red-300"
                            : "text-slate-800"
                        }`}
                      >
                        $ {money(reg.valor)}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (puedeEditar) onEdit(reg);
                          }}
                          disabled={!puedeEditar}
                          title={
                            esAnulado
                              ? "No se puede editar un registro anulado"
                              : !puedeEditarBase
                              ? "Solo puedes editar registros que tú creaste"
                              : "Editar"
                          }
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                            puedeEditar
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white"
                              : "bg-slate-100 text-slate-300 cursor-not-allowed"
                          }`}
                        >
                          <i className="pi pi-pencil text-[12px]" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (puedeEliminar) onDelete(reg.id);
                          }}
                          disabled={!puedeEliminar}
                          title={
                            esAnulado
                              ? "El registro ya está anulado"
                              : !puedeEliminarBase
                              ? "Solo puedes anular registros que tú creaste"
                              : "Anular"
                          }
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                            puedeEliminar
                              ? "bg-red-50 text-red-600 hover:bg-red-500 hover:text-white"
                              : "bg-slate-100 text-slate-300 cursor-not-allowed"
                          }`}
                        >
                          <i className="pi pi-trash text-[12px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!registros || registros.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-[12px] font-semibold text-slate-400">
                      No hay registros para este filtro
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden p-4 space-y-3">
          {(registros || []).length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-black/10 bg-white p-8 text-center">
              <p className="text-[12px] font-semibold text-slate-400">
                No hay registros para este filtro
              </p>
            </div>
          ) : (
            (registros || []).map((reg) => {
              const estadoU = norm(reg?.estado || "PENDIENTE");
              const esAnulado = estadoU === "ANULADO";

              const puedeEditarBase = canEdit ? canEdit(reg) : true;
              const puedeEliminarBase = canDelete ? canDelete(reg) : true;

              const puedeEditar = !esAnulado && puedeEditarBase;
              const puedeEliminar = !esAnulado && puedeEliminarBase;

              const tieneFactura =
                Boolean(reg?.tieneFactura) ||
                String(reg?.factura || "").toLowerCase() === "si";

              return (
                <div
                  key={reg.id}
                  className={`rounded-[1.3rem] border p-4 shadow-sm ${
                    esAnulado
                      ? "border-red-100 bg-red-50/30"
                      : "border-black/5 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setDetalleEgreso(reg)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            esAnulado ? "text-red-700/70" : "text-[#C98500]"
                          }`}
                        >
                          {reg.proyecto}
                        </p>

                        <h4
                          className={`mt-1 text-[15px] font-black uppercase tracking-tight leading-tight ${
                            esAnulado
                              ? "text-red-700/80 line-through decoration-red-300"
                              : "text-slate-800"
                          }`}
                        >
                          {reg.concepto}
                        </h4>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${estadoBadge(
                          reg.estado
                        )}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            estadoU === "ANULADO"
                              ? "bg-red-600"
                              : estadoU === "PAGADO" || estadoU === "COMPLETADO"
                              ? "bg-green-600"
                              : "bg-amber-500"
                          }`}
                        />
                        {reg.estado}
                      </span>
                    </div>
                  </button>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-slate-500">Fecha</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-800">
                        {reg.fecha}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-medium text-slate-500">Categoría</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-800 uppercase">
                        {reg.categoria}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-medium text-slate-500">Factura</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-800">
                        {tieneFactura ? "Sí" : "No"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-medium text-slate-500">Valor</p>
                      <p
                        className={`mt-1 text-[13px] font-black ${
                          esAnulado ? "text-red-700/80" : "text-slate-800"
                        }`}
                      >
                        $ {money(reg.valor)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (puedeEditar) onEdit(reg);
                      }}
                      disabled={!puedeEditar}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition-all ${
                        puedeEditar
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <i className="pi pi-pencil text-[11px]" />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (puedeEliminar) onDelete(reg.id);
                      }}
                      disabled={!puedeEliminar}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition-all ${
                        puedeEliminar
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <i className="pi pi-trash text-[11px]" />
                      Anular
                    </button>
                  </div>
                </div>
              );
            })
          )}
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