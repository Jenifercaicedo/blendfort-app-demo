import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const num0 = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const calcTotal = (row) => {
  if (!row?.asistio) return 0;

  const valorDia = num0(row?.valorDia);
  const valorHoraExtra = num0(row?.valorHoraExtra);
  const horasExtras = num0(row?.horasExtras);
  const bonos = num0(row?.bonos);
  const descuentos = num0(row?.descuentos);

  const total = valorDia + horasExtras * valorHoraExtra + bonos - descuentos;
  return Math.max(0, Number(total.toFixed(2)));
};

const InputConUnidad = ({
  value,
  onChange,
  disabled = false,
  unit = "",
  type = "number",
  className = "",
}) => {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-blendfort-fondo border border-black/5 px-3 pr-10 h-10 rounded-xl text-[10px] font-black outline-none disabled:opacity-40 ${className}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
        {unit}
      </span>
    </div>
  );
};

const ReporteDiarioListaModal = ({
  show,
  onClose,
  proyectoActivo,
  registradoPor = "ADMIN",
  onSuccess,
}) => {
  const { personal, addReporteDiario } = useAppContext();

  const [fecha, setFecha] = useState(todayISO());
  const [soloConCambios, setSoloConCambios] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const noOperariosHints = useMemo(
    () => [
      "RESIDENTE",
      "ING",
      "ING.",
      "INGENIERO",
      "ARQUITECTO",
      "ARQ",
      "ARQ.",
      "ADMIN",
      "CONTADOR",
      "OFICINA",
    ],
    []
  );

  const personalActivoProyecto = useMemo(() => {
    const pAct = normalize(proyectoActivo);

    return (personal || [])
      .filter((p) => {
        const proyecto = normalize(p?.proyecto);
        const estado = normalize(p?.estado || "ACTIVO");
        const tipo = normalize(p?.tipo || "CAMPO");
        const rol = normalize(p?.rol || "");
        const cargo = normalize(p?.cargo || "");

        if (!pAct || proyecto !== pAct) return false;
        if (estado !== "ACTIVO") return false;
        if (tipo === "OFICINA") return false;
        if (noOperariosHints.some((h) => rol.includes(h))) return false;
        if (noOperariosHints.some((h) => cargo.includes(h))) return false;

        return true;
      })
      .map((p, index) => ({
        key: `${normalize(p?.nombre)}__${normalize(p?.proyecto)}__${index}`,
        empleado: normalize(p?.nombre),
        cargo: normalize(p?.cargo || p?.rol || "OPERARIO"),
        proyecto: normalize(p?.proyecto),
        estado: normalize(p?.estado || "ACTIVO"),
        valorDia: num0(p?.valorDia ?? p?.valor_dia),
        valorHoraExtra: num0(p?.valorHoraExtra ?? p?.valor_hora_extra),
      }))
      .sort((a, b) => a.empleado.localeCompare(b.empleado));
  }, [personal, proyectoActivo, noOperariosHints]);

  useEffect(() => {
    if (!show) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;

    setFecha(todayISO());
    setSoloConCambios(false);
    setBusqueda("");
    setGuardando(false);

    setFilas(
      personalActivoProyecto.map((p) => ({
        key: p.key,
        empleado: p.empleado,
        cargo: p.cargo,
        proyecto: p.proyecto,
        estadoPersonal: p.estado,
        fecha: todayISO(),
        asistio: false,
        horasExtras: "",
        bonos: "",
        descuentos: "",
        observacion: "",
        valorDia: p.valorDia,
        valorHoraExtra: p.valorHoraExtra,
        touched: false,
      }))
    );
  }, [show, proyectoActivo, personalActivoProyecto]);

  const updateFila = (key, patch) => {
    setFilas((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;

        const next = {
          ...row,
          ...patch,
          touched: true,
        };

        if (patch.asistio === false) {
          next.horasExtras = "";
          next.bonos = "";
          next.descuentos = "";
        }

        return next;
      })
    );
  };

  const marcarTodosAsistieron = () => {
    setFilas((prev) =>
      prev.map((row) => ({
        ...row,
        asistio: true,
        touched: true,
      }))
    );
  };

  const limpiarAsistencias = () => {
    setFilas((prev) =>
      prev.map((row) => ({
        ...row,
        asistio: false,
        horasExtras: "",
        bonos: "",
        descuentos: "",
        observacion: "",
        touched: true,
      }))
    );
  };

  const filasFiltradas = useMemo(() => {
    let rows = [...filas];

    if (busqueda.trim()) {
      const q = normalize(busqueda);
      rows = rows.filter(
        (row) =>
          normalize(row.empleado).includes(q) ||
          normalize(row.cargo).includes(q)
      );
    }

    if (soloConCambios) {
      rows = rows.filter(
        (row) =>
          row.asistio ||
          num0(row.horasExtras) > 0 ||
          num0(row.bonos) > 0 ||
          num0(row.descuentos) > 0 ||
          Boolean(normalize(row.observacion))
      );
    }

    return rows;
  }, [filas, busqueda, soloConCambios]);

  const resumen = useMemo(() => {
    const totalPersonal = filas.length;
    const asistieron = filas.filter((r) => r.asistio).length;
    const faltaron = totalPersonal - asistieron;
    const totalDia = filas.reduce((acc, row) => acc + calcTotal(row), 0);

    return {
      totalPersonal,
      asistieron,
      faltaron,
      totalDia,
    };
  }, [filas]);

  const guardarReportes = async (e) => {
    e.preventDefault();

    try {
      if (!proyectoActivo) {
        alert("Selecciona un proyecto.");
        return;
      }

      const filasAGuardar = filas.filter(
        (row) =>
          row.asistio ||
          num0(row.horasExtras) > 0 ||
          num0(row.bonos) > 0 ||
          num0(row.descuentos) > 0 ||
          Boolean(normalize(row.observacion))
      );

      if (!filasAGuardar.length) {
        alert("No hay reportes para guardar.");
        return;
      }

      setGuardando(true);

      for (const row of filasAGuardar) {
        const payload = {
          proyecto: normalize(proyectoActivo),
          residente: normalize(registradoPor),
          fecha,
          concepto: normalize(row.empleado),
          cargo: normalize(row.cargo || "OPERARIO"),
          asistio: Boolean(row.asistio),
          numHorasExtras: row.asistio ? num0(row.horasExtras) : 0,
          valoresPendientes: row.asistio ? num0(row.bonos) : 0,
          descuentos: row.asistio ? num0(row.descuentos) : 0,
          valor: calcTotal({ ...row, fecha }),
          estado: "PENDIENTE",
          detalles: normalize(row.observacion || ""),
        };

        await addReporteDiario(payload);
      }

      onSuccess?.(
        `REPORTES GUARDADOS · ${filasAGuardar.length} REGISTRO(S) · ${normalize(
          proyectoActivo
        )}`,
        "success"
      );

      onClose?.();
    } catch (error) {
      console.error("Error guardando reportes en lista:", error);
      alert("No se pudieron guardar los reportes.");
    } finally {
      setGuardando(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[165] overflow-y-auto bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-5 md:px-6 md:py-8">
        <div className="bg-[#F6F6F1] w-full max-w-6xl rounded-[1.8rem] md:rounded-[2.4rem] overflow-hidden shadow-2xl border border-black/5 my-2 max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-black/5 px-4 md:px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-[2px] bg-blendfort-naranja" />
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-blendfort-naranja">
                    Resident Console
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-tight text-slate-800">
                  Reporte Diario
                </h2>

                <p className="text-[8px] md:text-[9px] font-bold opacity-35 uppercase tracking-[0.16em] mt-1">
                  {normalize(proyectoActivo || "SIN PROYECTO")}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black text-white hover:bg-blendfort-naranja transition-all active:scale-95 flex items-center justify-center shrink-0"
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

            <div className="mt-4">
              <div className="inline-flex h-11 md:h-12 items-center px-5 rounded-2xl bg-black text-white font-black text-[8px] uppercase tracking-[0.18em] shadow-sm">
                Lista
              </div>
            </div>
          </div>

          <form onSubmit={guardarReportes} className="p-4 md:p-5 space-y-4 md:space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
                  Personal Activo
                </p>
                <p className="text-base md:text-lg font-black tracking-tight text-slate-800">
                  {resumen.totalPersonal}
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
                  Asistieron
                </p>
                <p className="text-base md:text-lg font-black tracking-tight text-green-700">
                  {resumen.asistieron}
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
                  Faltaron
                </p>
                <p className="text-base md:text-lg font-black tracking-tight text-amber-700">
                  {resumen.faltaron}
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
                  Total del Día
                </p>
                <p className="text-base md:text-lg font-black tracking-tight text-slate-800">
                  {money(resumen.totalDia)}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-3">
                <div className="space-y-1">
                  <label className="text-[7px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-blendfort-fondo border border-black/5 px-4 h-[46px] rounded-2xl text-[10px] font-black outline-none focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[7px] font-black uppercase ml-3 opacity-40 tracking-widest">
                    Buscar trabajador
                  </label>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="NOMBRE O CARGO..."
                    className="w-full bg-blendfort-fondo border border-black/5 px-4 h-[46px] rounded-2xl text-[10px] font-black outline-none focus:border-black transition-all uppercase"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={marcarTodosAsistieron}
                  className="h-10 md:h-11 px-4 rounded-2xl bg-black text-white font-black text-[8px] uppercase tracking-[0.16em] hover:bg-blendfort-naranja transition-all active:scale-95"
                >
                  Marcar todos asistieron
                </button>

                <button
                  type="button"
                  onClick={limpiarAsistencias}
                  className="h-10 md:h-11 px-4 rounded-2xl bg-white border border-black/5 text-black/60 font-black text-[8px] uppercase tracking-[0.16em] hover:border-black/20 transition-all active:scale-95"
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  onClick={() => setSoloConCambios((v) => !v)}
                  className={`h-10 md:h-11 px-4 rounded-2xl font-black text-[8px] uppercase tracking-[0.16em] transition-all active:scale-95 ${
                    soloConCambios
                      ? "bg-blendfort-naranja text-white"
                      : "bg-white border border-black/5 text-black/60"
                  }`}
                >
                  {soloConCambios ? "Solo cambios: activo" : "Solo cambios"}
                </button>
              </div>
            </div>

            <div className="md:hidden space-y-2.5">
              {filasFiltradas.length === 0 ? (
                <div className="bg-white rounded-[1.4rem] border border-dashed border-black/10 p-6 text-center shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
                    No hay personal activo para mostrar
                  </p>
                </div>
              ) : (
                filasFiltradas.map((row) => {
                  const total = calcTotal(row);

                  return (
                    <div
                      key={row.key}
                      className="bg-white rounded-[1.35rem] border border-black/5 p-3.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-black uppercase tracking-tight leading-tight text-slate-800">
                            {row.empleado}
                          </h3>
                          <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-black/35 mt-1">
                            {row.cargo}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateFila(row.key, { asistio: !row.asistio })
                          }
                          className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${
                            row.asistio ? "bg-blendfort-naranja" : "bg-black/10"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                              row.asistio ? "left-8" : "left-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                        <div>
                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1">
                            Valor día
                          </p>
                          <p className="font-black">{money(row.valorDia)}</p>
                        </div>

                        <div>
                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1">
                            Hora extra
                          </p>
                          <p className="font-black">{money(row.valorHoraExtra)}</p>
                        </div>

                        <div>
                          <label className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1 block">
                            H. Extras (hrs)
                          </label>
                          <InputConUnidad
                            value={row.horasExtras}
                            onChange={(e) =>
                              updateFila(row.key, { horasExtras: e.target.value })
                            }
                            disabled={!row.asistio}
                            unit="hrs"
                          />
                        </div>

                        <div>
                          <label className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1 block">
                            Bonos ($)
                          </label>
                          <InputConUnidad
                            value={row.bonos}
                            onChange={(e) =>
                              updateFila(row.key, { bonos: e.target.value })
                            }
                            disabled={!row.asistio}
                            unit="$"
                          />
                        </div>

                        <div>
                          <label className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1 block">
                            Desc. ($)
                          </label>
                          <InputConUnidad
                            value={row.descuentos}
                            onChange={(e) =>
                              updateFila(row.key, { descuentos: e.target.value })
                            }
                            disabled={!row.asistio}
                            unit="$"
                          />
                        </div>

                        <div>
                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1">
                            Total
                          </p>
                          <p className="font-black text-base tracking-tight">{money(total)}</p>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[7px] font-black uppercase tracking-[0.14em] text-black/30 mb-1 block">
                            Observación
                          </label>
                          <input
                            type="text"
                            value={row.observacion}
                            onChange={(e) =>
                              updateFila(row.key, { observacion: e.target.value })
                            }
                            className="w-full bg-blendfort-fondo border border-black/5 px-3 h-10 rounded-xl text-[10px] font-black uppercase outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block bg-white rounded-[1.5rem] border border-black/5 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px]">
                  <thead className="bg-blendfort-fondo/70 border-b border-black/5">
                    <tr>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Empleado
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Cargo
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Asistió
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Valor Día
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        H. Extras (hrs)
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Bonos ($)
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Desc. ($)
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Observación
                      </th>
                      <th className="text-left px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.18em] text-black/35">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
                            No hay personal activo para mostrar
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filasFiltradas.map((row) => {
                        const total = calcTotal(row);

                        return (
                          <tr
                            key={row.key}
                            className="border-b border-black/[0.04] last:border-b-0 hover:bg-blendfort-fondo/30 transition-colors"
                          >
                            <td className="px-4 py-3.5">
                              <p className="text-[10px] font-black uppercase leading-tight text-slate-800">
                                {row.empleado}
                              </p>
                            </td>

                            <td className="px-4 py-3.5">
                              <p className="text-[9px] font-black uppercase text-black/55">
                                {row.cargo}
                              </p>
                            </td>

                            <td className="px-4 py-3.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateFila(row.key, { asistio: !row.asistio })
                                }
                                className={`w-14 h-7 rounded-full transition-all relative ${
                                  row.asistio ? "bg-blendfort-naranja" : "bg-black/10"
                                }`}
                              >
                                <div
                                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                                    row.asistio ? "left-8" : "left-1"
                                  }`}
                                />
                              </button>
                            </td>

                            <td className="px-4 py-3.5 text-[10px] font-black">
                              {money(row.valorDia)}
                            </td>

                            <td className="px-4 py-3.5">
                              <InputConUnidad
                                value={row.horasExtras}
                                onChange={(e) =>
                                  updateFila(row.key, { horasExtras: e.target.value })
                                }
                                disabled={!row.asistio}
                                unit="hrs"
                                className="w-[96px]"
                              />
                            </td>

                            <td className="px-4 py-3.5">
                              <InputConUnidad
                                value={row.bonos}
                                onChange={(e) =>
                                  updateFila(row.key, { bonos: e.target.value })
                                }
                                disabled={!row.asistio}
                                unit="$"
                                className="w-[96px]"
                              />
                            </td>

                            <td className="px-4 py-3.5">
                              <InputConUnidad
                                value={row.descuentos}
                                onChange={(e) =>
                                  updateFila(row.key, { descuentos: e.target.value })
                                }
                                disabled={!row.asistio}
                                unit="$"
                                className="w-[96px]"
                              />
                            </td>

                            <td className="px-4 py-3.5">
                              <input
                                type="text"
                                value={row.observacion}
                                onChange={(e) =>
                                  updateFila(row.key, { observacion: e.target.value })
                                }
                                className="w-[200px] bg-blendfort-fondo border border-black/5 px-3 h-9 rounded-xl text-[10px] font-black uppercase outline-none"
                              />
                            </td>

                            <td className="px-4 py-3.5 text-[10px] font-black text-slate-800">
                              {money(total)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.16em] text-black/25 text-center md:text-left">
                Se guardará un registro por cada trabajador con asistencia o cambios en el proyecto.
              </p>

              <div className="flex justify-center md:justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 rounded-2xl bg-white border border-black/5 text-black/55 font-black text-[8px] uppercase tracking-[0.18em] hover:border-black/20 transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className={`h-11 px-6 rounded-2xl font-black text-[8px] uppercase tracking-[0.18em] transition-all active:scale-95 ${
                    guardando
                      ? "bg-black/10 text-black/30 cursor-not-allowed"
                      : "bg-black text-white hover:bg-blendfort-naranja"
                  }`}
                >
                  {guardando ? "Guardando..." : "Guardar reportes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteDiarioListaModal;