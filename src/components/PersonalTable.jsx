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
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[540px] scrollbar-thin scrollbar-thumb-black/5">
        <table className="w-full text-left border-collapse min-w-[1060px]">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-black/[0.05] bg-slate-50/70">
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Empleado
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Proyectos
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Estado general
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500">
                Perfil principal
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-right">
                Referencia
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-slate-500 text-right">
                Ver
              </th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-12 text-center">
                  <div className="mx-auto max-w-md">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]">
                      <i className="pi pi-users text-[18px]" />
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      No hay resultados
                    </p>

                    <p className="mt-3 text-[14px] font-medium text-slate-500">
                      Crea un empleado o ajusta los filtros.
                    </p>

                    <button
                      onClick={onNew}
                      type="button"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#FCB017]"
                    >
                      <i className="pi pi-plus text-[12px]" />
                      <span>Nuevo empleado</span>
                    </button>
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
                    className="border-b border-black/[0.04] transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onOpenDetalle(emp)}
                        className="text-left"
                        title="Ver detalle"
                      >
                        <p className="text-[13px] font-black text-slate-800 hover:text-[#C98500] transition-colors">
                          {emp.nombre}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {totalAsignaciones} asignación{totalAsignaciones === 1 ? "" : "es"}
                        </p>
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2 max-w-[300px]">
                        {(emp.proyectos || []).length ? (
                          emp.proyectos.map((proyecto) => (
                            <span
                              key={proyecto}
                              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600"
                            >
                              {proyecto}
                            </span>
                          ))
                        ) : (
                          <span className="text-[12px] font-medium text-slate-400">
                            Sin proyecto
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {activas} activas
                        </span>

                        {inactivas > 0 && (
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            {inactivas} inactivas
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                            esOficina
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20"
                          }`}
                        >
                          {tipo}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                          {rol}
                        </span>

                        {emp.cargoPrincipal ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {emp.cargoPrincipal}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="text-[13px] font-black text-slate-800">
                        $ {money(valorPrincipal)}
                        <span className="ml-1 text-[10px] font-semibold text-slate-400">
                          / {sufijo}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#C98500]">
                        HEX {money(valorHoraExtra)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onOpenDetalle(emp)}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-slate-700 transition-all hover:bg-slate-800 hover:text-white active:scale-95"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                      >
                        <i className="pi pi-eye text-[13px]" />
                        <span className="text-[11px] font-semibold">Detalle</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {data.length === 0 ? (
          <div className="rounded-[1.5rem] border border-black/5 bg-white p-8 text-center shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]">
              <i className="pi pi-users text-[18px]" />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              No hay resultados
            </p>

            <p className="mt-3 text-[14px] font-medium text-slate-500">
              Crea un empleado o ajusta los filtros.
            </p>

            <button
              onClick={onNew}
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#FCB017]"
            >
              <i className="pi pi-plus text-[12px]" />
              <span>Nuevo empleado</span>
            </button>
          </div>
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
              <button
                key={emp.key}
                type="button"
                onClick={() => onOpenDetalle(emp)}
                className="w-full rounded-[1.45rem] border border-black/5 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-slate-800 leading-snug">
                      {emp.nombre}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-slate-500">
                      {totalAsignaciones} asignación{totalAsignaciones === 1 ? "" : "es"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-black text-slate-800">
                      $ {money(valorPrincipal)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                      / {sufijo}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      esOficina
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20"
                    }`}
                  >
                    {tipo}
                  </span>

                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    {rol}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {activas} activas
                  </span>

                  {inactivas > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {inactivas} inactivas
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {(emp.proyectos || []).length ? (
                      emp.proyectos.map((proyecto) => (
                        <span
                          key={proyecto}
                          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                        >
                          {proyecto}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        Sin proyecto
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#C98500]">
                    HEX {money(valorHoraExtra)}
                  </p>

                  <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-700">
                    <i className="pi pi-eye text-[11px]" />
                    Ver detalle
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PersonalTable;