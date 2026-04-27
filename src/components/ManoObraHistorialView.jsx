import React, { useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const iso10 = (d) => String(d || "").slice(0, 10);

const money = (n) => {
  const num = Number(n) || 0;
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const estadoTone = (estado) => {
  const e = norm(estado);
  if (e === "PAGADO" || e === "COMPLETADO") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (e === "PENDIENTE") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (e === "ANULADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
};

const asistenciaTone = (asistio) => {
  return asistio === false
    ? "border-slate-200 bg-slate-100 text-slate-600"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const MiniStat = ({ label, value, accent = false }) => (
  <div className="rounded-[1.2rem] border border-black/5 bg-white px-4 py-3 shadow-sm">
    <p
      className={`text-[8px] font-black uppercase tracking-[0.18em] ${
        accent ? "text-[#C98500]" : "text-slate-500"
      }`}
    >
      {label}
    </p>
    <p className="mt-2 text-[16px] md:text-[18px] font-black tracking-tight text-slate-800">
      {value}
    </p>
  </div>
);

const EmptyState = () => (
  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white px-4 py-12 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8E8] text-[#C98500]">
      <i className="pi pi-history text-[18px]" />
    </div>
    <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      No hay reportes para mostrar
    </p>
    <p className="mt-2 text-[12px] font-medium text-slate-400">
      Ajusta los filtros o registra nuevos reportes.
    </p>
  </div>
);

const ManoObraHistorialView = ({ registros = [], onEditReporte }) => {
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");

  const opcionesEstado = useMemo(
    () => ["TODOS", "PENDIENTE", "PAGADO", "COMPLETADO", "ANULADO"],
    []
  );

  const registrosOrdenados = useMemo(() => {
    return [...(registros || [])].sort((a, b) => {
      const fa = String(a?.fecha || "");
      const fb = String(b?.fecha || "");
      if (fa !== fb) return fb.localeCompare(fa);
      return norm(a?.concepto).localeCompare(norm(b?.concepto));
    });
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const q = norm(busqueda);

    return registrosOrdenados.filter((row) => {
      const estado = norm(row?.estado || "PENDIENTE");

      const okEstado = estadoFiltro === "TODOS" || estado === norm(estadoFiltro);

      const okBusqueda =
        !q ||
        norm(row?.concepto).includes(q) ||
        norm(row?.cargo).includes(q) ||
        norm(row?.detalles).includes(q) ||
        norm(row?.residente).includes(q);

      return okEstado && okBusqueda;
    });
  }, [registrosOrdenados, busqueda, estadoFiltro]);

  

  const pendientes = useMemo(() => {
    return registrosFiltrados.filter((row) => norm(row?.estado) === "PENDIENTE").length;
  }, [registrosFiltrados]);

  const canEditRow = (row) => norm(row?.estado || "") !== "ANULADO";

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-black/5 bg-white p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-[2px] w-5 bg-[#FCB017]" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C98500]">
                Historial diario
              </span>
            </div>

            <h3 className="mt-2 text-[22px] md:text-[24px] font-black tracking-tight text-slate-800">
              Reportes de mano de obra
            </h3>

            <p className="mt-2 text-[12px] font-medium text-slate-500">
              Consulta los reportes diarios sin saturar la vista de pagos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[360px]">
  <MiniStat label="Reportes visibles" value={registrosFiltrados.length} accent />
  <MiniStat label="Pendientes" value={pendientes} />
</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-1">
            <label className="ml-3 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
              Buscar
            </label>
            <div className="relative">
              <i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="TRABAJADOR, CARGO, OBSERVACIÓN..."
                className="h-[50px] w-full rounded-2xl border border-black/5 bg-[#F9F9F6] pl-11 pr-4 text-[11px] font-black uppercase text-slate-700 outline-none transition-all focus:border-black/15"
              />
            </div>
          </div>

          <div>
            <CustomSelect
              label="Estado"
              options={opcionesEstado}
              value={estadoFiltro}
              onChange={(val) => setEstadoFiltro(String(val || "TODOS"))}
              placeholder="TODOS"
              allowCustom={false}
            />
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {registrosFiltrados.length === 0 ? (
          <EmptyState />
        ) : (
          registrosFiltrados.map((row) => (
            <div
              key={row?.id}
              className="rounded-[1.45rem] border border-black/5 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-black uppercase tracking-tight text-slate-800">
                    {row?.concepto || "SIN NOMBRE"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {row?.cargo || "SIN CARGO"}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${estadoTone(
                    row?.estado
                  )}`}
                >
                  {norm(row?.estado || "PENDIENTE")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${asistenciaTone(
                    row?.asistio
                  )}`}
                >
                  {row?.asistio === false ? "NO ASISTIÓ" : "ASISTIÓ"}
                </span>

                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
                  {iso10(row?.fecha) || "SIN FECHA"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    H. extra
                  </p>
                  <p className="mt-1 font-black text-slate-800">
                    {Number(row?.numHorasExtras ?? row?.num_horas_extras) || 0} hrs
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Bonos
                  </p>
                  <p className="mt-1 font-black text-slate-800">
                    {money(row?.valoresPendientes ?? row?.valores_pendientes)}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Descuentos
                  </p>
                  <p className="mt-1 font-black text-red-600">{money(row?.descuentos)}</p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Valor
                  </p>
                  <p className="mt-1 font-black text-slate-800">{money(row?.valor)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[1rem] bg-[#F9F9F6] px-3 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Observación
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed text-slate-600">
                  {row?.detalles || "SIN OBSERVACIÓN"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Registrado por
                  </p>
                  <p className="mt-1 truncate text-[10px] font-black uppercase text-slate-700">
                    {row?.residente || "SIN USUARIO"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEditReporte?.(row)}
                  disabled={!canEditRow(row)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    canEditRow(row)
                      ? "bg-slate-800 text-white hover:bg-[#FCB017]"
                      : "cursor-not-allowed bg-slate-100 text-slate-300"
                  }`}
                >
                  <i className="pi pi-pencil text-[10px]" />
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-hidden rounded-[1.6rem] border border-black/5 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#F9F9F6]">
              <tr className="border-b border-black/5">
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Fecha
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Trabajador
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Cargo
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Asistencia
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  H. extra
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Bonos
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Desc.
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Valor
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Observación
                </th>
                <th className="px-4 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-10">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((row) => (
                  <tr
                    key={row?.id}
                    className="border-b border-black/[0.04] last:border-b-0 hover:bg-[#FCB017]/[0.03]"
                  >
                    <td className="px-4 py-4 text-[10px] font-black text-slate-700">
                      {iso10(row?.fecha) || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-[10px] font-black uppercase leading-tight text-slate-800">
                        {row?.concepto || "SIN NOMBRE"}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {row?.residente || "SIN USUARIO"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-[10px] font-black uppercase text-slate-700">
                      {row?.cargo || "SIN CARGO"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${asistenciaTone(
                          row?.asistio
                        )}`}
                      >
                        {row?.asistio === false ? "NO ASISTIÓ" : "ASISTIÓ"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-[10px] font-black text-slate-700">
                      {Number(row?.numHorasExtras ?? row?.num_horas_extras) || 0} hrs
                    </td>

                    <td className="px-4 py-4 text-[10px] font-black text-slate-700">
                      {money(row?.valoresPendientes ?? row?.valores_pendientes)}
                    </td>

                    <td className="px-4 py-4 text-[10px] font-black text-red-600">
                      {money(row?.descuentos)}
                    </td>

                    <td className="px-4 py-4 text-[10px] font-black text-slate-800">
                      {money(row?.valor)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${estadoTone(
                          row?.estado
                        )}`}
                      >
                        {norm(row?.estado || "PENDIENTE")}
                      </span>
                    </td>

                    <td className="max-w-[260px] px-4 py-4">
                      <p className="truncate text-[10px] font-bold uppercase text-slate-600">
                        {row?.detalles || "SIN OBSERVACIÓN"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onEditReporte?.(row)}
                        disabled={!canEditRow(row)}
                        className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[9px] font-black uppercase tracking-[0.16em] transition-all ${
                          canEditRow(row)
                            ? "bg-slate-800 text-white hover:bg-[#FCB017]"
                            : "cursor-not-allowed bg-slate-100 text-slate-300"
                        }`}
                      >
                        <i className="pi pi-pencil text-[9px]" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManoObraHistorialView;