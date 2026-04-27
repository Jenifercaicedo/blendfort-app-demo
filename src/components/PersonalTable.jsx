import React, { useMemo } from "react";
import { useAppContext } from "../context/AppContext";

const normU = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const toneEstado = (estado) => {
  const e = normU(estado);
  if (e === "ACTIVO") return "bg-green-50 text-green-700 border-green-200";
  return "bg-black/5 text-black/50 border-black/10";
};

const toneTipo = (tipo) => {
  const t = normU(tipo);
  if (t === "OFICINA") return "bg-black/5 text-black/55 border-black/10";
  return "bg-blendfort-naranja/10 text-blendfort-naranja border-blendfort-naranja/20";
};

const toneAccess = (accessType) => {
  if (accessType === "PRINCIPAL") {
    return "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/25";
  }
  if (accessType === "ADICIONAL") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  if (accessType === "MIXTO") {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }
  return "bg-black/5 text-black/50 border-black/10";
};

const getAccessLabel = (accessType) => {
  if (accessType === "PRINCIPAL") return "PRINCIPAL";
  if (accessType === "ADICIONAL") return "ADICIONAL";
  if (accessType === "MIXTO") return "PRINCIPAL + ADICIONAL";
  return "SOLO OPERATIVO";
};

const getEstadoGeneral = (empleado) => {
  const activas = Number(empleado?.asignacionesActivas || 0);
  return activas > 0 ? "ACTIVO" : "INACTIVO";
};

const getAccessSummary = (empleado, getResidentesProyecto) => {
  const nombre = normU(empleado?.nombre);
  const asignaciones = Array.isArray(empleado?.asignaciones) ? empleado.asignaciones : [];

  let principalCount = 0;
  let adicionalCount = 0;

  asignaciones.forEach((asig) => {
    const estado = normU(asig?.estado || "ACTIVO");
    const rol = normU(asig?.rol || "OPERARIO");
    const proyecto = normU(asig?.proyecto || "");

    if (estado !== "ACTIVO") return;
    if (rol !== "RESIDENTE") return;
    if (!proyecto) return;

    const residentesProyecto =
      typeof getResidentesProyecto === "function"
        ? getResidentesProyecto(proyecto) || []
        : [];

    const match = residentesProyecto.find(
      (r) => normU(r?.residente_nombre) === nombre
    );

    if (match?.es_principal) {
      principalCount += 1;
    } else {
      adicionalCount += 1;
    }
  });

  if (principalCount > 0 && adicionalCount > 0) {
    return {
      type: "MIXTO",
      label: getAccessLabel("MIXTO"),
      detail: `${principalCount} principal · ${adicionalCount} adicional`,
    };
  }

  if (principalCount > 0) {
    return {
      type: "PRINCIPAL",
      label: getAccessLabel("PRINCIPAL"),
      detail: `${principalCount} proyecto(s)`,
    };
  }

  if (adicionalCount > 0) {
    return {
      type: "ADICIONAL",
      label: getAccessLabel("ADICIONAL"),
      detail: `${adicionalCount} proyecto(s)`,
    };
  }

  return {
    type: "OPERATIVO",
    label: getAccessLabel("OPERATIVO"),
    detail: "Sin acceso resident",
  };
};

const EmptyState = ({ onNew }) => (
  <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-white px-4 py-12 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8E8] text-[#C98500]">
      <i className="pi pi-users text-[18px]" />
    </div>

    <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      No hay personal para mostrar
    </p>

    <p className="mt-2 text-[12px] font-medium text-slate-400">
      Crea tu primer registro o ajusta los filtros.
    </p>

    {typeof onNew === "function" && (
      <button
        type="button"
        onClick={onNew}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017]"
      >
        <i className="pi pi-plus text-[11px]" />
        <span>Nuevo personal</span>
      </button>
    )}
  </div>
);

const PersonalTable = ({ data = [], onOpenDetalle, onNew }) => {
  const { getResidentesProyecto } = useAppContext();

  const rows = useMemo(() => {
    return (data || []).map((empleado) => {
      const access = getAccessSummary(empleado, getResidentesProyecto);
      const estadoGeneral = getEstadoGeneral(empleado);

      const asignaciones = Array.isArray(empleado?.asignaciones) ? empleado.asignaciones : [];
      const referencia =
        asignaciones.find((a) => normU(a?.estado || "ACTIVO") === "ACTIVO") ||
        asignaciones[0] ||
        null;

      return {
        ...empleado,
        _access: access,
        _estadoGeneral: estadoGeneral,
        _cargoPrincipal: normU(
          referencia?.cargo || empleado?.cargoPrincipal || "SIN CARGO"
        ),
        _rolPrincipal: normU(
          referencia?.rol || empleado?.rolPrincipal || "OPERARIO"
        ),
        _tipoPrincipal: normU(
          referencia?.tipo || empleado?.tipoPrincipal || "CAMPO"
        ),
      };
    });
  }, [data, getResidentesProyecto]);

  if (!rows.length) {
    return <EmptyState onNew={onNew} />;
  }

  return (
    <div className="space-y-4">
      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <button
            key={row?.nombre}
            type="button"
            onClick={() => onOpenDetalle?.(row)}
            className="w-full rounded-[1.5rem] border border-black/5 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-black uppercase tracking-tight text-slate-800">
                  {row?.nombre || "SIN NOMBRE"}
                </p>

                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {row?._cargoPrincipal}
                </p>
              </div>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${toneEstado(
                  row?._estadoGeneral
                )}`}
              >
                {row?._estadoGeneral}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${toneTipo(
                  row?._tipoPrincipal
                )}`}
              >
                {row?._tipoPrincipal}
              </span>

              <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                {row?._rolPrincipal}
              </span>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${toneAccess(
                  row?._access?.type
                )}`}
              >
                {row?._access?.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Proyectos
                </p>
                <p className="mt-1 font-black text-slate-800">
                  {Number(row?.totalAsignaciones || row?.asignaciones?.length || 0)}
                </p>
              </div>

              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Activos
                </p>
                <p className="mt-1 font-black text-slate-800">
                  {Number(row?.asignacionesActivas || 0)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[1rem] bg-[#F9F9F6] px-3 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                Acceso
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed text-slate-600">
                {row?._access?.detail}
              </p>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white">
              <i className="pi pi-eye text-[9px]" />
              Ver detalle
            </div>
          </button>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-hidden rounded-[1.6rem] border border-black/5 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#F9F9F6]">
              <tr className="border-b border-black/5">
                <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Personal
                </th>
                <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Perfil
                </th>
                <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Proyectos
                </th>
                <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Acceso
                </th>
                <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Estado
                </th>
                <th className="px-5 py-4 text-right text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row?.nombre}
                  className="border-b border-black/[0.04] last:border-b-0 hover:bg-[#FCB017]/[0.03]"
                >
                  <td className="px-5 py-4">
                    <p className="text-[10px] font-black uppercase leading-tight text-slate-800">
                      {row?.nombre || "SIN NOMBRE"}
                    </p>

                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {row?.fechaContratacion ? `INGRESO ${row.fechaContratacion}` : "SIN FECHA"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-700">
                        {row?._cargoPrincipal}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${toneTipo(
                          row?._tipoPrincipal
                        )}`}
                      >
                        {row?._tipoPrincipal}
                      </span>

                      <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                        {row?._rolPrincipal}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-[10px] font-black text-slate-800">
                      {Number(row?.totalAsignaciones || row?.asignaciones?.length || 0)}
                    </p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {Number(row?.asignacionesActivas || 0)} activa(s)
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${toneAccess(
                        row?._access?.type
                      )}`}
                    >
                      {row?._access?.label}
                    </span>

                    <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {row?._access?.detail}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${toneEstado(
                        row?._estadoGeneral
                      )}`}
                    >
                      {row?._estadoGeneral}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDetalle?.(row)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#FCB017]"
                    >
                      <i className="pi pi-eye text-[10px]" />
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PersonalTable;