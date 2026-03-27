import React, { useEffect, useMemo, useState } from "react";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const iso10 = (d) => String(d || "").slice(0, 10);

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const estadoTone = (estado) => {
  const e = normalize(estado);

  if (e === "PAGADO" || e === "COMPLETADO") {
    return "text-green-700 bg-green-50 border-green-100";
  }

  if (e === "PENDIENTE") {
    return "text-amber-700 bg-amber-50 border-amber-100";
  }

  if (e === "ANULADO") {
    return "text-red-700 bg-red-50 border-red-100";
  }

  if (e === "SIN MOVIMIENTOS") {
    return "text-black/55 bg-black/[0.03] border-black/10";
  }

  return "text-black/60 bg-black/[0.03] border-black/10";
};

const cargoTone = (cargo) => {
  const c = normalize(cargo);

  if (c.includes("RESIDENTE")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (c.includes("MAESTRO")) return "bg-violet-50 text-violet-700 border-violet-100";
  if (c.includes("OPERARIO")) return "bg-slate-50 text-slate-700 border-slate-200";
  if (c.includes("AYUDANTE")) return "bg-orange-50 text-orange-700 border-orange-100";

  return "bg-black/[0.03] text-black/60 border-black/10";
};

const isGenericText = (value) => {
  const v = normalize(value);

  if (!v) return true;

  const genericos = [
    "MANO DE OBRA",
    "REPORTE DIARIO",
    "PAGO",
    "PAGO SEMANAL",
    "PAGO QUINCENAL",
    "PLANILLA",
    "SUELDOS",
    "JORNAL",
    "TRABAJADORES",
    "PERSONAL",
  ];

  return genericos.includes(v);
};

const buildPersonalMap = (personalProyecto = []) => {
  const map = new Map();

  for (const p of personalProyecto || []) {
    const nombreKey = normalize(p?.nombre);
    if (!nombreKey) continue;

    if (!map.has(nombreKey)) {
      map.set(nombreKey, {
        key: nombreKey,
        nombre: String(p?.nombre || "").toUpperCase(),
        cargo: String(p?.cargo || p?.rol || "SIN CARGO").toUpperCase(),
        estadoPersonal: String(p?.estado || "ACTIVO").toUpperCase(),
        valorDia: Number(p?.valorDia || p?.valor_dia || 0),
        valorHoraExtra: Number(p?.valorHoraExtra || p?.valor_hora_extra || 0),
        proyecto: String(p?.proyecto || "").toUpperCase(),
      });
    }
  }

  return map;
};

const resolveWorkerKey = (reg, personalMap) => {
  const explicitCandidates = [
    reg?.empleado,
    reg?.trabajador,
    reg?.nombreEmpleado,
    reg?.nombreTrabajador,
    reg?.personal,
    reg?.colaborador,
  ];

  for (const candidate of explicitCandidates) {
    const key = normalize(candidate);
    if (key) return key;
  }

  const conceptKey = normalize(reg?.concepto);
  if (conceptKey && personalMap.has(conceptKey)) return conceptKey;

  const detalleKey = normalize(reg?.detalles);
  if (detalleKey && personalMap.has(detalleKey)) return detalleKey;

  const personalNames = Array.from(personalMap.keys());

  if (detalleKey) {
    const byDetalle = personalNames.find((name) => detalleKey.includes(name));
    if (byDetalle) return byDetalle;
  }

  if (conceptKey) {
    const byConcept = personalNames.find((name) => conceptKey.includes(name));
    if (byConcept) return byConcept;
  }

  if (conceptKey && !isGenericText(conceptKey)) return conceptKey;
  if (detalleKey && !isGenericText(detalleKey)) return detalleKey;

  return "SIN IDENTIFICAR";
};

const ResidentManoObraModal = ({
  show = false,
  onClose,
  proyectoActivo = "",
  personalProyecto = [],
  registrosManoObra = [],
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("TODOS");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("TODOS");

  useEffect(() => {
    if (!show) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [show, onClose]);

  useEffect(() => {
    if (!show) return;
    setBusqueda("");
    setFiltroCargo("TODOS");
    setFiltroEstadoPago("TODOS");
  }, [show, proyectoActivo]);

  const personalMap = useMemo(
    () => buildPersonalMap(personalProyecto),
    [personalProyecto]
  );

  const registrosMO = useMemo(() => {
    return (registrosManoObra || []).filter(
      (r) => normalize(r?.categoria) === "MANO DE OBRA"
    );
  }, [registrosManoObra]);

  const resumen = useMemo(() => {
    const totalGeneral = registrosMO.reduce(
      (acc, r) => acc + (Number(r?.valor) || 0),
      0
    );

    const totalPagado = registrosMO.reduce((acc, r) => {
      const estado = normalize(r?.estado);
      const suma =
        estado === "PAGADO" || estado === "COMPLETADO"
          ? Number(r?.valor) || 0
          : 0;

      return acc + suma;
    }, 0);

    const totalPendiente = totalGeneral - totalPagado;

    const trabajadoresConMovimiento = new Set(
      registrosMO.map((r) => resolveWorkerKey(r, personalMap)).filter(Boolean)
    ).size;

    return {
      totalGeneral,
      totalPagado,
      totalPendiente,
      trabajadoresPlantilla: personalMap.size,
      trabajadoresConMovimiento,
      registros: registrosMO.length,
    };
  }, [registrosMO, personalMap]);

  const filasBase = useMemo(() => {
    const acumulado = new Map();

    for (const reg of registrosMO) {
      const nombreKey = resolveWorkerKey(reg, personalMap);
      const base = personalMap.get(nombreKey);

      if (!acumulado.has(nombreKey)) {
        acumulado.set(nombreKey, {
          key: nombreKey,
          nombre:
            String(
              base?.nombre ||
                reg?.empleado ||
                reg?.trabajador ||
                reg?.nombreEmpleado ||
                reg?.nombreTrabajador ||
                reg?.concepto ||
                reg?.detalles ||
                "SIN IDENTIFICAR"
            ).toUpperCase(),
          cargo: String(
            base?.cargo || reg?.cargo || reg?.rol || "SIN CARGO"
          ).toUpperCase(),
          estadoPersonal: String(base?.estadoPersonal || "ACTIVO").toUpperCase(),
          valorDia: Number(base?.valorDia || 0),
          valorHoraExtra: Number(base?.valorHoraExtra || 0),

          total: 0,
          pagado: 0,
          pendiente: 0,
          movimientos: 0,
          ultimaFecha: "",
          ultimoEstado: "PENDIENTE",
        });
      }

      const row = acumulado.get(nombreKey);
      const valor = Number(reg?.valor) || 0;
      const estado = normalize(reg?.estado || "PENDIENTE");
      const fecha = iso10(reg?.fecha);

      row.total += valor;
      row.movimientos += 1;
      row.ultimoEstado = estado;

      if (estado === "PAGADO" || estado === "COMPLETADO") {
        row.pagado += valor;
      } else if (estado !== "ANULADO") {
        row.pendiente += valor;
      }

      if (!row.ultimaFecha || fecha > row.ultimaFecha) {
        row.ultimaFecha = fecha;
      }
    }

    for (const [key, trabajador] of personalMap.entries()) {
      if (!acumulado.has(key)) {
        acumulado.set(key, {
          key,
          nombre: trabajador.nombre,
          cargo: trabajador.cargo,
          estadoPersonal: trabajador.estadoPersonal,
          valorDia: trabajador.valorDia,
          valorHoraExtra: trabajador.valorHoraExtra,
          total: 0,
          pagado: 0,
          pendiente: 0,
          movimientos: 0,
          ultimaFecha: "",
          ultimoEstado: "SIN MOVIMIENTOS",
        });
      }
    }

    const rows = Array.from(acumulado.values());

    rows.sort((a, b) => {
      if ((b.total || 0) !== (a.total || 0)) return (b.total || 0) - (a.total || 0);
      return normalize(a.nombre).localeCompare(normalize(b.nombre));
    });

    return rows;
  }, [registrosMO, personalMap]);

  const opcionesCargo = useMemo(() => {
    const unique = Array.from(
      new Set(filasBase.map((r) => normalize(r.cargo)).filter(Boolean))
    ).sort();

    return ["TODOS", ...unique];
  }, [filasBase]);

  const filasTrabajadores = useMemo(() => {
    let rows = [...filasBase];

    if (busqueda.trim()) {
      const q = normalize(busqueda);
      rows = rows.filter(
        (r) =>
          normalize(r.nombre).includes(q) ||
          normalize(r.cargo).includes(q) ||
          normalize(r.ultimoEstado).includes(q)
      );
    }

    if (normalize(filtroCargo) !== "TODOS") {
      rows = rows.filter((r) => normalize(r.cargo) === normalize(filtroCargo));
    }

    if (normalize(filtroEstadoPago) !== "TODOS") {
      if (normalize(filtroEstadoPago) === "PAGADO") {
        rows = rows.filter((r) => r.pagado > 0);
      } else if (normalize(filtroEstadoPago) === "PENDIENTE") {
        rows = rows.filter((r) => r.pendiente > 0);
      } else if (normalize(filtroEstadoPago) === "SIN MOVIMIENTOS") {
        rows = rows.filter((r) => r.movimientos === 0);
      }
    }

    return rows;
  }, [filasBase, busqueda, filtroCargo, filtroEstadoPago]);

  const hayFiltrosActivos = useMemo(() => {
    return (
      Boolean(busqueda.trim()) ||
      normalize(filtroCargo) !== "TODOS" ||
      normalize(filtroEstadoPago) !== "TODOS"
    );
  }, [busqueda, filtroCargo, filtroEstadoPago]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroCargo("TODOS");
    setFiltroEstadoPago("TODOS");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-end md:items-center justify-center p-0 md:p-6">
        <div className="relative w-full h-[92dvh] md:h-auto md:max-h-[90vh] md:max-w-6xl bg-blendfort-fondo rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden border border-black/5">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/5 px-4 md:px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-blendfort-naranja block mb-1">
                  Resident Console
                </span>

                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-tight">
                  Control de Mano de Obra
                </h2>

                <p className="text-[9px] md:text-[10px] font-bold opacity-35 uppercase tracking-[0.16em] mt-2">
                  Proyecto: {String(proyectoActivo || "SIN PROYECTO").toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-11 h-11 rounded-2xl bg-black text-white hover:bg-blendfort-naranja transition-all active:scale-95 flex items-center justify-center"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="h-[calc(92dvh-84px)] md:h-auto md:max-h-[calc(90vh-84px)] overflow-y-auto px-4 md:px-6 py-4 md:py-5">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
              <div className="bg-white rounded-[1.4rem] border border-black/5 p-4 shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#a1a1a1] mb-2">
                  Total Mano de Obra
                </p>
                <p className="text-lg md:text-xl font-black tracking-tight">
                  {money(resumen.totalGeneral)}
                </p>
              </div>

              <div className="bg-white rounded-[1.4rem] border border-black/5 p-4 shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#a1a1a1] mb-2">
                  Total Pagado
                </p>
                <p className="text-lg md:text-xl font-black tracking-tight text-green-700">
                  {money(resumen.totalPagado)}
                </p>
              </div>

              <div className="bg-white rounded-[1.4rem] border border-black/5 p-4 shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#a1a1a1] mb-2">
                  Total Pendiente
                </p>
                <p className="text-lg md:text-xl font-black tracking-tight text-amber-700">
                  {money(resumen.totalPendiente)}
                </p>
              </div>

              <div className="bg-white rounded-[1.4rem] border border-black/5 p-4 shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#a1a1a1] mb-2">
                  Trabajadores
                </p>
                <p className="text-lg md:text-xl font-black tracking-tight">
                  {resumen.trabajadoresPlantilla}
                </p>
              </div>

              <div className="bg-white rounded-[1.4rem] border border-black/5 p-4 shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#a1a1a1] mb-2">
                  Registros
                </p>
                <p className="text-lg md:text-xl font-black tracking-tight">
                  {resumen.registros}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[1.4rem] border border-black/5 p-3 md:p-4 shadow-sm mb-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-[8px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Buscar trabajador
                  </label>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="NOMBRE, CARGO O ESTADO..."
                    className="w-full mt-1 bg-blendfort-fondo border border-black/5 px-4 h-[50px] rounded-xl text-[10px] font-black outline-none focus:border-black transition-all"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Cargo
                  </label>
                  <select
                    value={filtroCargo}
                    onChange={(e) => setFiltroCargo(e.target.value)}
                    className="w-full mt-1 bg-blendfort-fondo border border-black/5 px-4 h-[50px] rounded-xl text-[10px] font-black outline-none focus:border-black transition-all"
                  >
                    {opcionesCargo.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Estado pago
                  </label>
                  <select
                    value={filtroEstadoPago}
                    onChange={(e) => setFiltroEstadoPago(e.target.value)}
                    className="w-full mt-1 bg-blendfort-fondo border border-black/5 px-4 h-[50px] rounded-xl text-[10px] font-black outline-none focus:border-black transition-all"
                  >
                    <option value="TODOS">TODOS</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="SIN MOVIMIENTOS">SIN MOVIMIENTOS</option>
                  </select>
                </div>
              </div>

              {hayFiltrosActivos && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white border border-black/5 text-black/40 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5 opacity-50 group-hover:opacity-80 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>

                    <span className="text-[8px] font-black uppercase tracking-[0.18em]">
                      Limpiar filtros
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="md:hidden space-y-3">
              {filasTrabajadores.length === 0 ? (
                <div className="bg-white rounded-[1.5rem] border border-dashed border-black/10 p-8 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
                    No hay registros de mano de obra para mostrar
                  </p>
                </div>
              ) : (
                filasTrabajadores.map((row) => (
                  <div
                    key={row.key}
                    className="bg-white rounded-[1.5rem] border border-black/5 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-tight leading-tight">
                          {row.nombre}
                        </h3>

                        <span
                          className={`inline-flex mt-2 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${cargoTone(
                            row.cargo
                          )}`}
                        >
                          {row.cargo}
                        </span>
                      </div>

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${estadoTone(
                          row.ultimoEstado
                        )}`}
                      >
                        {row.ultimoEstado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-black/30 mb-1">
                          Total
                        </p>
                        <p className="font-black">{money(row.total)}</p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-black/30 mb-1">
                          Pagado
                        </p>
                        <p className="font-black text-green-700">{money(row.pagado)}</p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-black/30 mb-1">
                          Pendiente
                        </p>
                        <p className="font-black text-amber-700">{money(row.pendiente)}</p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-black/30 mb-1">
                          Última fecha
                        </p>
                        <p className="font-black">{row.ultimaFecha || "—"}</p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-black/30 mb-1">
                          Valor día
                        </p>
                        <p className="font-black">{money(row.valorDia)}</p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-black/30 mb-1">
                          H. extra
                        </p>
                        <p className="font-black">{money(row.valorHoraExtra)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block bg-white rounded-[1.6rem] border border-black/5 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-blendfort-fondo/60 border-b border-black/5">
                    <tr>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Trabajador
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Cargo
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Valor Día
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Hora Extra
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Total
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Pagado
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Pendiente
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Mov.
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Última Fecha
                      </th>
                      <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filasTrabajadores.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-4 py-10 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
                            No hay registros de mano de obra para mostrar
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filasTrabajadores.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-black/[0.04] last:border-b-0 hover:bg-blendfort-fondo/40 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <p className="text-[10px] font-black uppercase leading-tight">
                              {row.nombre}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${cargoTone(
                                row.cargo
                              )}`}
                            >
                              {row.cargo}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black">
                            {money(row.valorDia)}
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black">
                            {money(row.valorHoraExtra)}
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black">
                            {money(row.total)}
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black text-green-700">
                            {money(row.pagado)}
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black text-amber-700">
                            {money(row.pendiente)}
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black">
                            {row.movimientos}
                          </td>

                          <td className="px-4 py-4 text-[10px] font-black">
                            {row.ultimaFecha || "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${estadoTone(
                                row.ultimoEstado
                              )}`}
                            >
                              {row.ultimoEstado}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 px-1">
              <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.16em] text-black/25">
                Esta vista muestra solo la mano de obra del proyecto activo del residente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentManoObraModal;