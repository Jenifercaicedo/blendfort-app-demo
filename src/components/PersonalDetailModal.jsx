import React from "react";

const normU = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const formatFecha = (iso) => {
  if (!iso) return "NO REGISTRADA";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "$ 0.00";
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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

const PersonalDetailModal = ({
  empleado,
  onClose,
  onEdit,
  onAsignarProyecto,
  onMoverProyecto,
  onToggleEstado,
  onDelete,
}) => {
  if (!empleado) return null;

  const nombre = normU(empleado.nombre || "SIN NOMBRE");
  const fechaContratacion = formatFecha(empleado.fechaContratacion);
  const asignaciones = Array.isArray(empleado.asignaciones) ? empleado.asignaciones : [];

  const activas = Number(empleado.asignacionesActivas || 0);
  const inactivas = Number(empleado.asignacionesInactivas || 0);
  const total = Number(empleado.totalAsignaciones || asignaciones.length || 0);

  const referencia =
    asignaciones.find((a) => normU(a?.estado) === "ACTIVO") ||
    asignaciones[0] ||
    null;

  const perfilPrincipal = normU(referencia?.cargo || empleado.cargoPrincipal || "SIN CARGO");
  const rolPrincipal = normU(referencia?.rol || empleado.rolPrincipal || "OPERARIO");
  const tipoPrincipal = normU(referencia?.tipo || empleado.tipoPrincipal || "CAMPO");
  const esOficina = tipoPrincipal === "OFICINA";

  const valorPrincipal = esOficina
    ? Number(referencia?.salarioMensual ?? empleado.salarioMensualPrincipal ?? 0) || 0
    : Number(referencia?.valorDia ?? empleado.valorDiaPrincipal ?? 0) || 0;

  const valorHoraExtra =
    Number(referencia?.valorHoraExtra ?? empleado.valorHoraExtraPrincipal ?? 0) || 0;

  return (
    <div
      className="fixed inset-0 z-[150] overflow-y-auto bg-black/55 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-5xl rounded-[2.2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Header más claro */}
          <div className="relative px-6 md:px-8 pt-7 md:pt-8 pb-6 border-b border-black/5 bg-[linear-gradient(180deg,rgba(245,247,251,0.98)_0%,rgba(255,255,255,0.98)_100%)]">
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white border border-black/5 text-black/60 flex items-center justify-center hover:bg-blendfort-naranja hover:text-white transition-all shadow-sm"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pr-14">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-[2px] bg-blendfort-naranja"></div>
                <span className="text-[8px] font-black uppercase tracking-[0.38em] text-black/35">
                  Employee Profile
                </span>
              </div>

              <h4 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight text-black">
                {nombre}
              </h4>

              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.22em] text-black/35 mt-1.5">
                {perfilPrincipal}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5">
                  <span className="text-[7px] font-black uppercase tracking-[0.22em] text-black/30">
                    ROL
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/70">
                    {rolPrincipal}
                  </span>
                </span>

                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5">
                  <span className="text-[7px] font-black uppercase tracking-[0.22em] text-black/30">
                    TIPO
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/70">
                    {tipoPrincipal}
                  </span>
                </span>

                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5">
                  <span className="text-[7px] font-black uppercase tracking-[0.22em] text-black/30">
                    TOTAL
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/70">
                    {total}
                  </span>
                </span>

                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                  <span className="text-[7px] font-black uppercase tracking-[0.22em] text-green-700/70">
                    ACT
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-green-700">
                    {activas}
                  </span>
                </span>

                {inactivas > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10">
                    <span className="text-[7px] font-black uppercase tracking-[0.22em] text-black/35">
                      INA
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-black/60">
                      {inactivas}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Resumen general */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-blendfort-fondo rounded-[2rem] border border-black/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[8px] font-black uppercase tracking-[0.35em] text-black/20">
                    Identidad
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                    General
                  </span>
                </div>

                <div className="space-y-3 text-[10px]">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                      Nombre
                    </span>
                    <span className="font-black uppercase tracking-tight text-black text-right max-w-[58%] truncate">
                      {nombre}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                      Fecha contratación
                    </span>
                    <span className="font-black uppercase tracking-tight text-black text-right">
                      {fechaContratacion}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                      Cargo principal
                    </span>
                    <span className="font-black uppercase tracking-tight text-black text-right max-w-[58%] truncate">
                      {perfilPrincipal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-black/5 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[8px] font-black uppercase tracking-[0.35em] text-black/20">
                    Compensación
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                    Referencia
                  </span>
                </div>

                <div className="space-y-3 text-[10px]">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                      Principal
                    </span>
                    <span className="font-black uppercase tracking-tight text-black text-right">
                      {esOficina ? `${money(valorPrincipal)} / MES` : `${money(valorPrincipal)} / DÍA`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                      Hora extra
                    </span>
                    <span className="font-black uppercase tracking-tight text-blendfort-naranja text-right">
                      {money(valorHoraExtra)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                      Tipo
                    </span>
                    <span className="font-black uppercase tracking-tight text-black text-right">
                      {tipoPrincipal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-black/5 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[8px] font-black uppercase tracking-[0.35em] text-black/20">
                    Acciones
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                    Empleado
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onAsignarProyecto}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-blendfort-fondo text-black/65 hover:bg-black hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-[8px] font-black uppercase tracking-[0.18em]">
                      Asignar Proyecto
                    </span>
                  </button>
                </div>

                <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.18em] text-black/25 leading-relaxed">
                  Gestiona cada proyecto desde la lista inferior. Aquí agregas nuevas asignaciones.
                </p>
              </div>
            </div>

            {/* Asignaciones */}
            <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
              <div className="px-5 md:px-6 py-4 border-b border-black/5 bg-blendfort-fondo/45">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-[2px] bg-blendfort-naranja"></div>
                      <span className="text-[8px] font-black uppercase tracking-[0.28em] text-blendfort-naranja">
                        Assignments
                      </span>
                    </div>
                    <h5 className="text-lg font-black uppercase tracking-tight text-black">
                      Proyectos Asignados
                    </h5>
                  </div>

                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-black/30">
                    {total} registro{total === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden p-4 space-y-3">
                {asignaciones.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-black/10 p-8 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
                      No hay asignaciones
                    </p>
                  </div>
                ) : (
                  asignaciones.map((asig) => {
                    const estado = normU(asig.estado || "ACTIVO");
                    const tipo = normU(asig.tipo || "CAMPO");
                    const rol = normU(asig.rol || "OPERARIO");
                    const cargo = normU(asig.cargo || "SIN CARGO");
                    const proyecto = normU(asig.proyecto || "SIN PROYECTO");
                    const esOficinaRow = tipo === "OFICINA";
                    const valorMain = esOficinaRow
                      ? Number(asig.salarioMensual || 0)
                      : Number(asig.valorDia || 0);

                    return (
                      <div
                        key={asig.id}
                        className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <h6 className="text-sm font-black uppercase tracking-tight leading-tight">
                              {proyecto}
                            </h6>
                            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-black/35 mt-1">
                              {cargo}
                            </p>
                          </div>

                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${toneEstado(
                              estado
                            )}`}
                          >
                            {estado}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${toneTipo(
                              tipo
                            )}`}
                          >
                            {tipo}
                          </span>

                          <span className="inline-flex px-2.5 py-1 rounded-lg border bg-white border-black/5 text-[8px] font-black uppercase tracking-[0.12em] text-black/55">
                            {rol}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] mb-4">
                          <div>
                            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1">
                              Referencia
                            </p>
                            <p className="font-black">
                              {esOficinaRow ? `${money(valorMain)} / MES` : `${money(valorMain)} / DÍA`}
                            </p>
                          </div>

                          <div>
                            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1">
                              Hora extra
                            </p>
                            <p className="font-black text-blendfort-naranja">
                              {money(asig.valorHoraExtra || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(asig)}
                            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blendfort-fondo text-black/65 hover:bg-black hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span className="text-[8px] font-black uppercase tracking-[0.14em]">
                              Editar
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onMoverProyecto(asig)}
                            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className="text-[8px] font-black uppercase tracking-[0.14em]">
                              Mover
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleEstado(asig)}
                            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                              estado === "ACTIVO"
                                ? "bg-black/5 text-black/55 hover:bg-black hover:text-white"
                                : "bg-green-50 text-green-700 hover:bg-green-600 hover:text-white"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              {estado === "ACTIVO" ? (
                                <path d="M6 18L18 6M6 6l12 12" />
                              ) : (
                                <path d="M5 13l4 4L19 7" />
                              )}
                            </svg>
                            <span className="text-[8px] font-black uppercase tracking-[0.14em]">
                              {estado === "ACTIVO" ? "Inactivar" : "Activar"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(asig.id)}
                            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-600/70 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-[8px] font-black uppercase tracking-[0.14em]">
                              Eliminar
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1080px]">
                  <thead className="bg-white border-b border-black/5">
                    <tr>
                      <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Proyecto
                      </th>
                      <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Cargo
                      </th>
                      <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Tipo & Rol
                      </th>
                      <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Estado
                      </th>
                      <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Referencia
                      </th>
                      <th className="px-5 py-4 text-right text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {asignaciones.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-10 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
                            No hay asignaciones
                          </p>
                        </td>
                      </tr>
                    ) : (
                      asignaciones.map((asig) => {
                        const estado = normU(asig.estado || "ACTIVO");
                        const tipo = normU(asig.tipo || "CAMPO");
                        const rol = normU(asig.rol || "OPERARIO");
                        const cargo = normU(asig.cargo || "SIN CARGO");
                        const proyecto = normU(asig.proyecto || "SIN PROYECTO");
                        const esOficinaRow = tipo === "OFICINA";
                        const valorMain = esOficinaRow
                          ? Number(asig.salarioMensual || 0)
                          : Number(asig.valorDia || 0);

                        return (
                          <tr
                            key={asig.id}
                            className="border-b border-black/[0.04] hover:bg-blendfort-fondo/20 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <p className="text-[10px] font-black uppercase">
                                {proyecto}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-[10px] font-black uppercase text-black/75">
                                {cargo}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${toneTipo(
                                    tipo
                                  )}`}
                                >
                                  {tipo}
                                </span>

                                <span className="inline-flex px-2.5 py-1 rounded-lg border bg-white border-black/5 text-[8px] font-black uppercase tracking-[0.12em] text-black/55">
                                  {rol}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${toneEstado(
                                  estado
                                )}`}
                              >
                                {estado}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="text-[10px] font-black text-black">
                                {esOficinaRow ? `${money(valorMain)} / MES` : `${money(valorMain)} / DÍA`}
                              </div>
                              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-blendfort-naranja mt-1">
                                HEX {money(asig.valorHoraExtra || 0)}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onEdit(asig)}
                                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blendfort-fondo text-black/65 hover:bg-black hover:text-white transition-all"
                                  title="Editar asignación"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onMoverProyecto(asig)}
                                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white transition-all"
                                  title="Mover a otro proyecto"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onToggleEstado(asig)}
                                  className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                                    estado === "ACTIVO"
                                      ? "bg-black/5 text-black/55 hover:bg-black hover:text-white"
                                      : "bg-green-50 text-green-700 hover:bg-green-600 hover:text-white"
                                  }`}
                                  title={estado === "ACTIVO" ? "Inactivar" : "Activar"}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    {estado === "ACTIVO" ? (
                                      <path d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                      <path d="M5 13l4 4L19 7" />
                                    )}
                                  </svg>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDelete(asig.id)}
                                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-600/70 hover:bg-red-500 hover:text-white transition-all"
                                  title="Eliminar asignación"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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

            <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-black/22">
              Tip: aquí gestionas proyectos del empleado. Cada fila es una asignación independiente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailModal;