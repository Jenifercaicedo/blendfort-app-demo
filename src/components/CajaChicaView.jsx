import React, { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import CustomSelect from "./CustomSelect";
import ModalCajaChica from "./ModalCajaChica";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const hoyISO = () => new Date().toISOString().slice(0, 10);

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const estadoTone = (estado) => {
  const e = norm(estado);
  if (e === "DISPONIBLE") return "bg-green-50 text-green-700 border-green-100";
  if (e === "POR AGOTARSE") return "bg-amber-50 text-amber-700 border-amber-100";
  if (e === "AGOTADA") return "bg-red-50 text-red-700 border-red-100";
  if (e === "EXCEDIDA") return "bg-red-100 text-red-800 border-red-200";
  return "bg-black/5 text-black/50 border-black/10";
};

const estadoHistorialTone = (estado) => {
  const e = norm(estado);
  if (e === "DISPONIBLE") return "bg-green-50 text-green-700 border-green-100";
  if (e === "POR AGOTARSE") return "bg-amber-50 text-amber-700 border-amber-100";
  if (e === "AGOTADA") return "bg-red-50 text-red-700 border-red-100";
  if (e === "EXCEDIDA") return "bg-red-100 text-red-800 border-red-200";
  if (e === "NO VIGENTE") return "bg-black/5 text-black/45 border-black/10";
  return "bg-black/5 text-black/50 border-black/10";
};

const CajaChicaView = ({ onBack }) => {
  const {
    cajaChicaDesembolsos,
    movimientosCajaChica,
    getResumenesCajaChicaResidente,
    registrarDesembolsoCajaChicaResidente,
  } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showResumen, setShowResumen] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const [data, setData] = useState({
    residente: "",
    fechaDesembolso: hoyISO(),
    monto: "",
    observacion: "",
  });

  const [filtroResidente, setFiltroResidente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const resumenes = useMemo(() => {
    return getResumenesCajaChicaResidente();
  }, [getResumenesCajaChicaResidente, cajaChicaDesembolsos, movimientosCajaChica]);

  const opcionesResidentes = useMemo(() => {
    return [...new Set((resumenes || []).map((r) => norm(r.residente)).filter(Boolean))].sort();
  }, [resumenes]);

  const opcionesEstado = useMemo(() => {
    return [...new Set((resumenes || []).map((r) => norm(r.estado)).filter(Boolean))].sort();
  }, [resumenes]);

  const resumenesFiltrados = useMemo(() => {
    return (resumenes || []).filter((r) => {
      const okResidente =
        !filtroResidente || norm(r.residente) === norm(filtroResidente);

      const okEstado =
        !filtroEstado || norm(r.estado) === norm(filtroEstado);

      const okFecha =
        !filtroFecha ||
        String(r.fechaUltimoDesembolso || "").slice(0, 10) ===
          String(filtroFecha || "").slice(0, 10);

      return okResidente && okEstado && okFecha;
    });
  }, [resumenes, filtroResidente, filtroEstado, filtroFecha]);

  const stats = useMemo(() => {
    const activos = (resumenes || []).filter(
      (r) => Number(r.montoActualAsignado || 0) > 0
    ).length;

    const totalDesembolsado = (cajaChicaDesembolsos || []).reduce(
      (acc, d) => acc + Number(d.montoDesembolsado || d.monto_desembolsado || 0),
      0
    );

    const totalGastado = (resumenes || []).reduce(
      (acc, r) => acc + Number(r.gastadoActual || 0),
      0
    );

    const totalSaldo = (resumenes || []).reduce(
      (acc, r) => acc + Number(r.saldoActual || 0),
      0
    );

    const alertas = (resumenes || []).filter((r) => {
      const e = norm(r.estado);
      return e === "POR AGOTARSE" || e === "AGOTADA" || e === "EXCEDIDA";
    }).length;

    return {
      activos,
      totalDesembolsado,
      totalGastado,
      totalSaldo,
      alertas,
    };
  }, [resumenes, cajaChicaDesembolsos]);

  const historialFiltrado = useMemo(() => {
    return (cajaChicaDesembolsos || []).filter((d) => {
      const okResidente =
        !filtroResidente || norm(d.residente) === norm(filtroResidente);

      const okFecha =
        !filtroFecha ||
        String(d.fechaDesembolso || d.fecha_desembolso || "").slice(0, 10) ===
          String(filtroFecha || "").slice(0, 10);

      return okResidente && okFecha;
    });
  }, [cajaChicaDesembolsos, filtroResidente, filtroFecha]);

  const hayFiltros = useMemo(
    () => Boolean(filtroResidente || filtroEstado || filtroFecha),
    [filtroResidente, filtroEstado, filtroFecha]
  );

  const vistaCompactaMobileHistorial = useMemo(
    () => !filtroResidente && !filtroEstado && !filtroFecha,
    [filtroResidente, filtroEstado, filtroFecha]
  );

  const latestDesembolsoPorResidente = useMemo(() => {
    const map = new Map();

    for (const item of cajaChicaDesembolsos || []) {
      const key = norm(item?.residente);
      if (!key) continue;

      const current = map.get(key);

      if (!current) {
        map.set(key, item);
        continue;
      }

      const fechaItem = String(item?.fechaDesembolso || item?.fecha_desembolso || "");
      const fechaCurrent = String(current?.fechaDesembolso || current?.fecha_desembolso || "");

      if (fechaItem > fechaCurrent) {
        map.set(key, item);
        continue;
      }

      if (fechaItem === fechaCurrent) {
        const createdItem = String(item?.created_at || "");
        const createdCurrent = String(current?.created_at || "");

        if (createdItem > createdCurrent) {
          map.set(key, item);
        }
      }
    }

    return map;
  }, [cajaChicaDesembolsos]);

  const getEstadoHistorialVisual = (item) => {
    const residenteKey = norm(item?.residente);
    const latest = latestDesembolsoPorResidente.get(residenteKey);

    const esVigente = latest && String(latest.id) === String(item.id);

    if (!esVigente) {
      return {
        label: "NO VIGENTE",
        tone: estadoHistorialTone("NO VIGENTE"),
      };
    }

    const estadoActual = norm(item?.estadoNuevo || item?.estado_nuevo || "SIN FONDO");

    return {
      label: estadoActual,
      tone: estadoHistorialTone(estadoActual),
    };
  };

  const limpiarFiltros = () => {
    setFiltroResidente("");
    setFiltroEstado("");
    setFiltroFecha("");
  };

  const cerrarModal = () => {
    setShowModal(false);
    setMensajeExito(false);
    setData({
      residente: "",
      fechaDesembolso: hoyISO(),
      monto: "",
      observacion: "",
    });
  };

  const guardarDesembolso = async (e) => {
    e.preventDefault();

    try {
      if (!norm(data.residente)) return;
      if (!Number(data.monto || 0)) return;

      await registrarDesembolsoCajaChicaResidente(data);
      setMensajeExito(true);

      setTimeout(() => {
        cerrarModal();
      }, 900);
    } catch (error) {
      console.error("Error registrando desembolso:", error);
      alert("No se pudo registrar el desembolso.");
    }
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
      <div className="bg-white rounded-[2.2rem] md:rounded-[2.8rem] border border-black/5 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-black/5 bg-white">
          <button
            onClick={onBack}
            type="button"
            className="w-10 h-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"
            aria-label="Volver"
            title="Volver"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setShowFiltros((v) => !v)}
              className={`md:hidden group flex items-center justify-center h-11 w-11 rounded-full border shadow-sm transition-all active:scale-95 ${
                showFiltros
                  ? "bg-black text-white border-black"
                  : "bg-white border-black/5 hover:border-blendfort-naranja"
              }`}
              aria-label="Filtros"
              title="Filtros"
            >
              <div className="relative">
                <svg
                  className={`w-4 h-4 transition-colors ${
                    showFiltros ? "text-white" : "text-black/40 group-hover:text-black"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
                </svg>
                {hayFiltros && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blendfort-naranja shadow-sm" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowResumen((v) => !v)}
              className={`group flex items-center justify-center md:justify-start gap-0 md:gap-3 h-11 w-11 md:w-auto md:px-6 md:py-3 rounded-full border shadow-sm transition-all active:scale-95 ${
                showResumen
                  ? "bg-black text-white border-black"
                  : "bg-white border-black/5 hover:border-blendfort-naranja"
              }`}
              aria-label="Resumen"
              title="Resumen"
            >
              <svg
                className={`w-4 h-4 transition-colors ${
                  showResumen ? "text-white" : "text-black/40 group-hover:text-black"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4v7H4zm6-9h4v16h-4zm6 5h4v11h-4z" />
              </svg>

              <span
                className={`hidden md:inline text-[9px] font-black uppercase tracking-[0.35em] transition-colors ${
                  showResumen ? "text-white" : "text-black/50 group-hover:text-black"
                }`}
              >
                RESUMEN
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setData({
                  residente: "",
                  fechaDesembolso: hoyISO(),
                  monto: "",
                  observacion: "",
                });
                setShowModal(true);
              }}
              className="group flex items-center gap-2 md:gap-3 px-4 md:px-7 py-3 rounded-full bg-blendfort-naranja text-white shadow-sm hover:bg-black transition-all active:scale-95"
              aria-label="Nuevo desembolso"
              title="Nuevo desembolso"
            >
              <span className="text-base font-black leading-none">+</span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.28em] md:tracking-[0.35em]">
                DESEMBOLSO
              </span>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-10 relative">
          <div className="mb-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-[2px] bg-blendfort-naranja" />
                  <span className="text-[7px] md:text-[8px] font-black text-blendfort-naranja uppercase tracking-[0.4em]">
                    Cash Control
                  </span>
                </div>

                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                  Caja Chica
                </h3>

                <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-3">
                  Fondos, Reposiciones e Historial
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:block mb-8 bg-blendfort-fondo/50 p-5 md:p-6 rounded-[1.8rem] border border-black/[0.02]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CustomSelect
                label="Residente"
                options={opcionesResidentes}
                value={filtroResidente}
                onChange={setFiltroResidente}
                placeholder="TODOS..."
                allowCustom={false}
              />

              <CustomSelect
                label="Estado"
                options={opcionesEstado}
                value={filtroEstado}
                onChange={setFiltroEstado}
                placeholder="TODOS..."
                allowCustom={false}
              />

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
                  Fecha
                </label>
                <input
                  type="date"
                  className="w-full bg-white border border-black/5 p-4 rounded-2xl text-[10px] font-black outline-none h-[53px] focus:border-black transition-all shadow-sm"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
              </div>
            </div>

            {hayFiltros && (
              <div className="mt-5 flex justify-start">
                <button
                  onClick={limpiarFiltros}
                  type="button"
                  className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white border border-black/5 text-black/40 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-blendfort-naranja group-hover:rotate-180 transition-all duration-500 ease-in-out" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]">
                    Limpiar Filtros
                  </span>
                </button>
              </div>
            )}
          </div>

          {showFiltros && (
            <div className="md:hidden mb-8 bg-blendfort-fondo/50 p-5 rounded-[1.8rem] border border-black/[0.02] animate-in fade-in zoom-in duration-300">
              <div className="grid grid-cols-1 gap-4">
                <CustomSelect
                  label="Residente"
                  options={opcionesResidentes}
                  value={filtroResidente}
                  onChange={setFiltroResidente}
                  placeholder="TODOS..."
                  allowCustom={false}
                />

                <CustomSelect
                  label="Estado"
                  options={opcionesEstado}
                  value={filtroEstado}
                  onChange={setFiltroEstado}
                  placeholder="TODOS..."
                  allowCustom={false}
                />

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
                    Fecha
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white border border-black/5 p-4 rounded-2xl text-[10px] font-black outline-none h-[53px] focus:border-black transition-all shadow-sm"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                  />
                </div>
              </div>

              {hayFiltros && (
                <div className="mt-5 flex justify-start">
                  <button
                    onClick={limpiarFiltros}
                    type="button"
                    className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white border border-black/5 text-black/40 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-blendfort-naranja group-hover:rotate-180 transition-all duration-500 ease-in-out" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="text-[8px] font-black uppercase tracking-[0.25em]">
                      Limpiar Filtros
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!showResumen && (
            <div className="mb-8 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: "Fondos Activos", value: stats.activos, tone: "text-black" },
                { label: "Total Desembolsado", value: money(stats.totalDesembolsado), tone: "text-black" },
                { label: "Total Gastado", value: money(stats.totalGastado), tone: "text-black" },
                {
                  label: "Residentes en Alerta",
                  value: stats.alertas,
                  tone: stats.alertas > 0 ? "text-red-500" : "text-black",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-blendfort-fondo/50 border border-black/5 rounded-[1rem] md:rounded-[1.2rem] px-4 py-3.5 md:px-4 md:py-4 shadow-sm"
                >
                  <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                  <p className="text-[7px] font-black uppercase tracking-[0.22em] opacity-35 mb-2">
                    {item.label}
                  </p>
                  <h3 className={`text-base md:text-xl font-black tracking-tight ${item.tone}`}>
                    {item.value}
                  </h3>
                </div>
              ))}
            </div>
          )}

          {showResumen && (
            <div className="mb-8 animate-in fade-in zoom-in duration-300">
              <div className="bg-blendfort-fondo/35 border border-black/5 rounded-[1.6rem] p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-[2px] bg-blendfort-naranja" />
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-black/35">
                    Resident Summary
                  </span>
                </div>

                {resumenesFiltrados.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-black/10 bg-white p-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35">
                      No hay resultados para los filtros aplicados
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto pr-1">
                    <div className="space-y-4">
                      {resumenesFiltrados.map((item, i) => (
                        <div
                          key={`${item.residente}-${i}`}
                          className="bg-white rounded-[1.2rem] border border-black/5 p-5"
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-[0.25em] opacity-35 mb-2">
                                Residente
                              </p>
                              <h4 className="text-lg md:text-xl font-black uppercase tracking-tight leading-none break-words">
                                {item.residente || "SIN RESIDENTE"}
                              </h4>
                              <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-35 mt-2">
                                CAJA CHICA GENERAL
                              </p>
                            </div>

                            <span className={`px-3 py-2 rounded-full border text-[8px] font-black uppercase tracking-[0.22em] whitespace-nowrap ${estadoTone(item.estado)}`}>
                              {item.estado || "SIN FONDO"}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-blendfort-fondo/50 rounded-[0.95rem] p-3 border border-black/5">
                              <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">
                                Asignado
                              </p>
                              <h5 className="text-sm md:text-lg font-black tracking-tight">
                                {money(item.montoActualAsignado)}
                              </h5>
                            </div>

                            <div className="bg-blendfort-fondo/50 rounded-[0.95rem] p-3 border border-black/5">
                              <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">
                                Gastado
                              </p>
                              <h5 className="text-sm md:text-lg font-black tracking-tight">
                                {money(item.gastadoActual)}
                              </h5>
                            </div>

                            <div className="bg-blendfort-fondo/50 rounded-[0.95rem] p-3 border border-black/5">
                              <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">
                                Saldo
                              </p>
                              <h5
                                className={`text-sm md:text-lg font-black tracking-tight ${
                                  Number(item.saldoActual) < 0
                                    ? "text-red-600"
                                    : Number(item.saldoActual) === 0
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }`}
                              >
                                {money(item.saldoActual)}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 bg-blendfort-fondo/35 rounded-[0.95rem] border border-black/5 px-4 py-3">
                            <div>
                              <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                                Último Desembolso
                              </p>
                              <p className="text-[10px] font-black uppercase tracking-[0.15em]">
                                {item.fechaUltimoDesembolso || "SIN REGISTRO"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setData({
                                  residente: item.residente,
                                  fechaDesembolso: hoyISO(),
                                  monto: "",
                                  observacion: "",
                                });
                                setShowModal(true);
                              }}
                              className="bg-black text-white px-4 py-2.5 rounded-full text-[8px] font-black uppercase tracking-[0.22em] hover:bg-blendfort-naranja transition-all"
                            >
                              Reponer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!showResumen && (
            <div className="relative overflow-hidden">
              <div className="rounded-[1.8rem] overflow-hidden border border-black/5">
                <div className="hidden md:grid grid-cols-6 bg-blendfort-fondo/50 px-6 py-4 border-b border-black/5">
                  {["Fecha", "Proyecto", "Residente", "Monto", "Saldo Anterior", "Estado"].map((h) => (
                    <div key={h} className="text-[8px] font-black uppercase tracking-[0.25em] opacity-35">
                      {h}
                    </div>
                  ))}
                </div>

                <div
                  className={`divide-y divide-black/5 bg-white ${
                    vistaCompactaMobileHistorial
                      ? "max-h-[290px] overflow-y-auto md:max-h-none md:overflow-visible"
                      : ""
                  }`}
                >
                  {historialFiltrado.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35">
                        Aún no hay desembolsos registrados
                      </p>
                    </div>
                  ) : (
                    historialFiltrado.map((item) => {
                      const estadoVisual = getEstadoHistorialVisual(item);

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-0 px-5 md:px-6 py-5"
                        >
                          <div>
                            <p className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                              Fecha
                            </p>
                            <p className="text-[10px] font-black uppercase">
                              {item.fechaDesembolso}
                            </p>
                          </div>

                          <div>
                            <p className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                              Proyecto
                            </p>
                            <p className="text-[10px] font-black uppercase">
                              {item.proyecto || "GENERAL"}
                            </p>
                          </div>

                          <div>
                            <p className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                              Residente
                            </p>
                            <p className="text-[10px] font-black uppercase">
                              {item.residente || "SIN RESIDENTE"}
                            </p>
                          </div>

                          <div>
                            <p className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                              Monto
                            </p>
                            <p className="text-[10px] font-black uppercase">
                              {money(item.montoDesembolsado)}
                            </p>
                          </div>

                          <div>
                            <p className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                              Saldo Anterior
                            </p>
                            <p
                              className={`text-[10px] font-black uppercase ${
                                Number(item.saldoFinalAntesReposicion) < 0 ? "text-red-600" : ""
                              }`}
                            >
                              {money(item.saldoFinalAntesReposicion)}
                            </p>
                          </div>

                          <div>
                            <p className="md:hidden text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">
                              Estado
                            </p>
                            <span className={`inline-flex px-3 py-2 rounded-full border text-[8px] font-black uppercase tracking-[0.22em] ${estadoVisual.tone}`}>
                              {estadoVisual.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {vistaCompactaMobileHistorial && historialFiltrado.length > 2 && (
                <div className="md:hidden mt-3 text-center">
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-black/25">
                    Desliza para ver más desembolsos
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ModalCajaChica
        show={showModal}
        onClose={cerrarModal}
        onSave={guardarDesembolso}
        data={data}
        setData={setData}
        mensajeExito={mensajeExito}
      />
    </div>
  );
};

export default CajaChicaView;