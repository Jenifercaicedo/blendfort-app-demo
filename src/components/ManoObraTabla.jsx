import React from "react";

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ManoObraTabla = ({ listaFinal = [], onDetalle, onPagarSemana }) => {
  return (
    <div className="space-y-4">
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[540px] scrollbar-thin scrollbar-thumb-black/5">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-black/[0.05] bg-slate-50/70">
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">Personal</th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-center">Días</th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-center">
                H. extras
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-right">Neto</th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-center">
                Estado
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {listaFinal.length ? (
              listaFinal.map((emp) => {
                const estado = String(emp.estadoSemana || "PENDIENTE").toUpperCase().trim();
                const yaPagado = estado === "PAGADO" || estado === "COMPLETADO";
                const neto = Number(emp.neto) || 0;

                return (
                  <tr
                    key={emp.nombre}
                    className={`border-b border-black/[0.04] transition-colors ${
                      yaPagado ? "hover:bg-green-50/40" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onDetalle?.(emp.nombre)}
                        className="text-left"
                        title="Ver detalle"
                      >
                        <p className="text-[13px] font-black text-slate-800 hover:text-[#C98500] transition-colors">
                          {emp.nombre}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">{emp.cargo}</p>
                      </button>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex min-w-[36px] items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                        {emp.dias}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-[12px] font-black ${
                          Number(emp.extras) > 0 ? "text-slate-800" : "text-slate-300"
                        }`}
                      >
                        {Number(emp.extras) > 0 ? emp.extras : "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span
                        className={`text-[13px] font-black tracking-tight ${
                          neto > 0 ? "text-slate-800" : "text-slate-300"
                        }`}
                      >
                        $ {money(neto)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                          yaPagado
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {estado}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onDetalle?.(emp.nombre)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-all hover:bg-slate-800 hover:text-white active:scale-90"
                          title="Ver detalle"
                          aria-label="Ver detalle"
                        >
                          <i className="pi pi-eye text-[12px]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!yaPagado) onPagarSemana?.(emp.nombre);
                          }}
                          disabled={yaPagado}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                            yaPagado
                              ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                              : "bg-green-50 text-green-700 hover:bg-green-600 hover:text-white active:scale-90"
                          }`}
                          title={yaPagado ? "La semana ya está pagada" : "Marcar pagado"}
                          aria-label="Pagar"
                        >
                          <i className="pi pi-check text-[12px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-14 text-center">
                  <p className="text-[12px] font-medium text-slate-400">
                    No hay nómina para este filtro.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {listaFinal.length ? (
          listaFinal.map((emp) => {
            const estado = String(emp.estadoSemana || "PENDIENTE").toUpperCase().trim();
            const yaPagado = estado === "PAGADO" || estado === "COMPLETADO";
            const neto = Number(emp.neto) || 0;

            return (
              <div
                key={emp.nombre}
                className="rounded-[1.35rem] border border-black/5 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onDetalle?.(emp.nombre)}
                      className="text-left"
                    >
                      <p className="text-[14px] font-black text-slate-800 leading-snug">
                        {emp.nombre}
                      </p>
                    </button>
                    <p className="mt-1 text-[12px] font-medium text-slate-500">{emp.cargo}</p>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      yaPagado
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {estado}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-slate-500">Días</p>
                    <p className="mt-1 text-[12px] font-black text-slate-800">{emp.dias}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-slate-500">H. extras</p>
                    <p className="mt-1 text-[12px] font-black text-slate-800">
                      {Number(emp.extras) > 0 ? emp.extras : "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-500">Neto</p>
                    <p className="mt-1 text-[12px] font-black text-slate-800">$ {money(neto)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onDetalle?.(emp.nombre)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-slate-700 transition hover:bg-slate-800 hover:text-white"
                  >
                    <i className="pi pi-eye text-[11px]" />
                    <span className="text-[10px] font-semibold">Detalle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!yaPagado) onPagarSemana?.(emp.nombre);
                    }}
                    disabled={yaPagado}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 transition ${
                      yaPagado
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-green-50 text-green-700 hover:bg-green-600 hover:text-white"
                    }`}
                  >
                    <i className="pi pi-check text-[11px]" />
                    <span className="text-[10px] font-semibold">Pagar</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-black/10 p-8 text-center">
            <p className="text-[12px] font-medium text-slate-400">
              No hay nómina para este filtro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManoObraTabla;