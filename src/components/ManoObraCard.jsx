import React, { useMemo, useState, useCallback, useEffect } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";
import ReporteDiarioModal from "./ReporteDiarioModal";
import ManoObraTabla from "./ManoObraTabla";
import ManoObraDetalleModal from "./ManoObraDetalleModal";
import ModalExito from "./ModalExito";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getISOWeekKey = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

  const y = date.getUTCFullYear();
  const w = String(weekNo).padStart(2, "0");
  return `${y}-W${w}`;
};

const weekLabel = (weekKey) => {
  if (!weekKey) return "TODAS";
  const [y, w] = String(weekKey).split("-W");
  return `SEMANA ${w} · ${y}`;
};

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ManoObraCard = ({ onBack }) => {
  const {
    egresos,
    setEgresos,
    proyectos,
    usuario,
    nombreUsuario,
    actor,
    updateEgreso,
  } = useAppContext();

  const registradoPor =
    actor?.display || (usuario === "admin" ? "ADMINISTRACIÓN" : nombreUsuario || "RESIDENTE");

  const opcionesProyectosBase = useMemo(() => {
    const unique = [];
    const seen = new Set();

    (proyectos || []).forEach((p) => {
      const nombre = String(p?.nombre || "").trim();
      const key = norm(nombre);

      if (!nombre || !key || seen.has(key)) return;

      seen.add(key);
      unique.push(nombre);
    });

    return unique;
  }, [proyectos]);

  const opcionesProyectos = useMemo(
    () => ["TODOS", ...opcionesProyectosBase],
    [opcionesProyectosBase]
  );

  const [proyectoActivo, setProyectoActivo] = useState("TODOS");

  useEffect(() => {
    setProyectoActivo((prev) => {
      const actual = String(prev || "").trim();
      if (!actual) return "TODOS";
      if (opcionesProyectos.includes(actual)) return actual;
      return "TODOS";
    });
  }, [opcionesProyectos]);

  const [showReporte, setShowReporte] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [semanaActiva, setSemanaActiva] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [showEditReporte, setShowEditReporte] = useState(false);
  const [editReporte, setEditReporte] = useState(null);

  const [modalExito, setModalExito] = useState({
    show: false,
    mensaje: "",
    tipo: "success",
  });

  const mostrarExito = (mensaje, tipo = "success") =>
    setModalExito({ show: true, mensaje, tipo });

  const proyectoParaReporte = useMemo(() => {
    if (norm(proyectoActivo) === "TODOS") {
      return opcionesProyectosBase[0] || "";
    }
    return proyectoActivo;
  }, [proyectoActivo, opcionesProyectosBase]);

  /* ===========================
     Helpers de actualización
  =========================== */
  const updateManyEgresos = useCallback(
    (updater) => {
      if (typeof setEgresos === "function") {
        setEgresos((prev) => updater(prev || []));
        return;
      }

      if (typeof updateEgreso === "function") {
        const prev = egresos || [];
        const next = updater(prev);

        prev.forEach((oldRow) => {
          const newRow = next.find((x) => x.id === oldRow.id);
          if (!newRow) return;

          if (norm(newRow.estado) !== norm(oldRow.estado)) {
            updateEgreso(oldRow.id, { estado: newRow.estado });
          }
        });
      }
    },
    [setEgresos, updateEgreso, egresos]
  );

  /* ===========================
     Filtrado MO
  =========================== */
  const egresosMOProyecto = useMemo(() => {
    const pA = norm(proyectoActivo);
    const todos = pA === "TODOS";

    return (egresos || []).filter((e) => {
      const pE = norm(e?.proyecto);
      const cat = norm(e?.categoria);
      const est = norm(e?.estado || "PENDIENTE");

      if (!todos && pE !== pA) return false;
      if (cat !== "MANO DE OBRA") return false;

      if (est === "ANULADO") return false;

      if (soloPendientes) {
        if (est === "PAGADO" || est === "COMPLETADO") return false;
      }

      return true;
    });
  }, [egresos, proyectoActivo, soloPendientes]);

  const opcionesSemanas = useMemo(() => {
    const weeks = egresosMOProyecto.map((e) => getISOWeekKey(e.fecha)).filter(Boolean);
    return [...new Set(weeks)].sort().reverse();
  }, [egresosMOProyecto]);

  useEffect(() => {
    if (semanaActiva && !opcionesSemanas.includes(semanaActiva)) {
      setSemanaActiva("");
    }
  }, [semanaActiva, opcionesSemanas]);

  const egresosMO = useMemo(() => {
    if (!semanaActiva) return egresosMOProyecto;
    return egresosMOProyecto.filter((e) => getISOWeekKey(e.fecha) === semanaActiva);
  }, [egresosMOProyecto, semanaActiva]);

  const resumenNomina = useMemo(() => {
    return egresosMO.reduce((acc, curr) => {
      const nombre = curr.concepto ? norm(curr.concepto) : "SIN NOMBRE";
      const asistio = curr.asistio === false ? false : true;
      const estado = norm(curr.estado || "PENDIENTE");
      const proyecto = norm(curr.proyecto || "SIN PROYECTO");

      const key = norm(proyectoActivo) === "TODOS" ? `${proyecto}__${nombre}` : nombre;

      if (!acc[key]) {
        acc[key] = {
          key,
          nombre,
          proyecto,
          cargo: norm(curr.cargo || "OPERARIO"),
          dias: 0,
          extras: 0,
          subtotal: 0,
          descuentos: 0,
          neto: 0,
          estadoSemana: "PAGADO",
        };
      }

      if (estado === "PENDIENTE") {
        acc[key].estadoSemana = "PENDIENTE";
      }

      if (asistio) {
        acc[key].dias += 1;
        acc[key].extras += Number(curr.numHorasExtras) || 0;
        acc[key].subtotal += Number(curr.valor) || 0;
        acc[key].descuentos += Number(curr.descuentos) || 0;
        acc[key].neto = acc[key].subtotal - acc[key].descuentos;
      }

      return acc;
    }, {});
  }, [egresosMO, proyectoActivo]);

  const listaFinal = useMemo(() => Object.values(resumenNomina), [resumenNomina]);

  const granTotal = useMemo(
    () => listaFinal.reduce((t, e) => t + (Number(e.neto) || 0), 0),
    [listaFinal]
  );

  const hayFiltros = useMemo(() => {
    return norm(proyectoActivo) !== "TODOS" || Boolean(semanaActiva || soloPendientes);
  }, [proyectoActivo, semanaActiva, soloPendientes]);

  const abrirDetalle = (empNombre) => {
    const nombre = norm(empNombre);
    const rows = egresosMO.filter((e) => norm(e?.concepto) === nombre).slice();
    setDetalle({ nombre, rows });
  };

  const marcarPagadoSemanaEmpleado = (nombreEmpleado) => {
    if (!proyectoActivo) return;

    if (norm(proyectoActivo) === "TODOS") {
      mostrarExito("SELECCIONA UN PROYECTO ESPECÍFICO PARA PAGAR", "info");
      return;
    }

    if (!semanaActiva) {
      mostrarExito("FILTRA PRIMERO POR SEMANA PARA PAGAR", "info");
      return;
    }

    const nombreN = norm(nombreEmpleado);
    const pA = norm(proyectoActivo);

    updateManyEgresos((prev) =>
      (prev || []).map((e) => {
        const esMO = norm(e?.categoria) === "MANO DE OBRA";
        const mismoProyecto = norm(e?.proyecto) === pA;
        const mismaSemana = getISOWeekKey(e?.fecha) === semanaActiva;
        const mismoEmpleado = norm(e?.concepto) === nombreN;
        const noAnulado = norm(e?.estado || "PENDIENTE") !== "ANULADO";

        if (esMO && mismoProyecto && mismaSemana && mismoEmpleado && noAnulado) {
          return { ...e, estado: "PAGADO" };
        }
        return e;
      })
    );

    mostrarExito(`PAGO REGISTRADO · ${nombreN} · ${weekLabel(semanaActiva)}`, "success");
  };

  const pagarProyectoCompleto = () => {
    const proyectoN = norm(proyectoActivo);

    if (!proyectoN || proyectoN === "TODOS") {
      mostrarExito("SELECCIONA UN PROYECTO ESPECÍFICO PARA PAGO MASIVO", "info");
      return;
    }

    const registrosAPagar = (egresos || []).filter((e) => {
      const esMO = norm(e?.categoria) === "MANO DE OBRA";
      const mismoProyecto = norm(e?.proyecto) === proyectoN;
      const noAnulado = norm(e?.estado || "PENDIENTE") !== "ANULADO";
      const noPagado =
        norm(e?.estado || "PENDIENTE") !== "PAGADO" &&
        norm(e?.estado || "PENDIENTE") !== "COMPLETADO";
      const mismaSemana = semanaActiva ? getISOWeekKey(e?.fecha) === semanaActiva : true;

      return esMO && mismoProyecto && noAnulado && noPagado && mismaSemana;
    });

    if (!registrosAPagar.length) {
      mostrarExito(
        semanaActiva
          ? `NO HAY REGISTROS PENDIENTES PARA ${proyectoN} EN ${weekLabel(semanaActiva)}`
          : `NO HAY REGISTROS PENDIENTES PARA ${proyectoN}`,
        "info"
      );
      return;
    }

    const idsAPagar = new Set(registrosAPagar.map((r) => r.id));

    updateManyEgresos((prev) =>
      (prev || []).map((e) => {
        if (idsAPagar.has(e.id)) {
          return { ...e, estado: "PAGADO" };
        }
        return e;
      })
    );

    mostrarExito(
      semanaActiva
        ? `PAGO MASIVO REGISTRADO · ${proyectoN} · ${weekLabel(semanaActiva)} · ${registrosAPagar.length} REGISTROS`
        : `PAGO MASIVO REGISTRADO · ${proyectoN} · ${registrosAPagar.length} REGISTROS`,
      "success"
    );
  };

  const limpiarFiltros = () => {
    setProyectoActivo("TODOS");
    setSemanaActiva("");
    setSoloPendientes(false);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
      <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
        {/* TOP BAR */}
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-black/5 bg-blendfort-fondo/30">
          <button
            onClick={onBack}
            className="flex items-center gap-3 group transition-all active:scale-95"
            type="button"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm">
              <svg
                className="w-3.5 h-3.5 rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-black/30 group-hover:text-black">
              Volver al Panel
            </span>
          </button>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              onClick={() => setShowFiltros((v) => !v)}
              type="button"
              className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border transition-all duration-300 active:scale-95 group shadow-sm hover:border-blendfort-naranja ${
                hayFiltros ? "border-blendfort-naranja/40" : "border-black/5"
              }`}
              title="Filtros"
            >
              <svg
                className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-blendfort-naranja transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.25em] text-black/50 group-hover:text-black">
                Filtros
              </span>
              {hayFiltros && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse" />
              )}
            </button>

            <button
              onClick={pagarProyectoCompleto}
              type="button"
              className="bg-black text-white px-6 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-[0.25em] hover:bg-blendfort-naranja transition-all active:scale-95 shadow-sm"
              title={
                norm(proyectoActivo) === "TODOS"
                  ? "Selecciona un proyecto específico"
                  : semanaActiva
                  ? `Pagar ${weekLabel(semanaActiva)}`
                  : "Pagar todo el proyecto"
              }
            >
              Pagar Proyecto
            </button>

            <button
              onClick={() => setShowReporte(true)}
              type="button"
              className="bg-blendfort-naranja text-white px-6 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-[0.25em] hover:bg-black transition-all active:scale-95 shadow-sm"
            >
              + Reporte
            </button>
          </div>
        </div>

        <div className="p-8 md:p-14 relative">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="min-w-[240px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-[2px] bg-blendfort-naranja"></div>
                  <span className="text-[7px] md:text-[8px] font-black text-blendfort-naranja uppercase tracking-[0.4em]">
                    Payroll Control
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                  Mano de Obra
                </h3>
                <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-3">
                  {semanaActiva ? weekLabel(semanaActiva) : "Todas las semanas"}
                </p>
                <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-1">
                  {norm(proyectoActivo) === "TODOS"
                    ? "Todos los proyectos"
                    : `Proyecto: ${proyectoActivo}`}
                </p>
              </div>

              <div className="ml-auto w-full sm:w-auto">
                <div className="bg-blendfort-fondo/50 border border-black/5 rounded-[2rem] px-5 py-4 shadow-sm text-right">
                  <div className="text-[7px] font-black uppercase tracking-[0.35em] text-black/30">
                    Total {semanaActiva ? "Semana" : "Acumulado"}
                  </div>
                  <div className="mt-1 text-2xl md:text-3xl font-black tracking-tighter text-black">
                    <span className="text-[10px] font-black text-blendfort-naranja uppercase mr-2">
                      USD
                    </span>
                    $ {money(granTotal)}
                  </div>
                  <div className="mt-1 text-[7px] font-bold uppercase tracking-widest text-black/30">
                    {listaFinal.length} PERSONAL
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          {showFiltros && (
            <div className="mb-10 bg-blendfort-fondo/50 p-6 rounded-[2.5rem] border border-black/[0.02] animate-in fade-in zoom-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomSelect
                  label="Proyecto"
                  options={opcionesProyectos}
                  value={proyectoActivo}
                  onChange={(val) => {
                    const next = String(val || "").trim();
                    setProyectoActivo(!next ? "TODOS" : next);
                    setSemanaActiva("");
                  }}
                  placeholder="TODOS"
                  allowCustom={false}
                />

                <CustomSelect
                  label="Semana"
                  options={opcionesSemanas.map((w) => weekLabel(w))}
                  value={semanaActiva ? weekLabel(semanaActiva) : ""}
                  onChange={(val) => {
                    const match = opcionesSemanas.find((k) => weekLabel(k) === val);
                    setSemanaActiva(match || "");
                  }}
                  placeholder={opcionesSemanas.length ? "TODAS..." : "SIN SEMANAS"}
                  allowCustom={false}
                  disabled={!opcionesSemanas.length}
                />

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
                    Pendientes
                  </label>
                  <button
                    type="button"
                    onClick={() => setSoloPendientes((v) => !v)}
                    className="w-full h-[53px] bg-white border border-black/5 rounded-2xl px-4 flex items-center justify-between shadow-sm transition-all hover:border-black/20"
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50">
                      {soloPendientes ? "ACTIVO" : "DESACT."}
                    </span>
                    <div
                      className={`w-14 h-7 rounded-full transition-all relative ${
                        soloPendientes ? "bg-blendfort-naranja" : "bg-black/10"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                          soloPendientes ? "left-8" : "left-1"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {hayFiltros && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white border border-black/5 text-black/40 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
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

                    <span className="text-[8px] font-black uppercase tracking-[0.25em]">
                      Limpiar
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          <ManoObraTabla
            listaFinal={listaFinal}
            onDetalle={abrirDetalle}
            onPagarSemana={marcarPagadoSemanaEmpleado}
          />
        </div>
      </div>

      <ReporteDiarioModal
        show={showReporte}
        onClose={() => setShowReporte(false)}
        proyectoActivo={proyectoParaReporte}
        registradoPor={registradoPor}
        onSuccess={(msg) => {
          mostrarExito(msg, "success");
          setShowReporte(false);
        }}
        mode="create"
      />

      <ReporteDiarioModal
        show={showEditReporte}
        onClose={() => {
          setShowEditReporte(false);
          setEditReporte(null);
        }}
        proyectoActivo={editReporte?.proyecto || proyectoParaReporte}
        registradoPor={registradoPor}
        onSuccess={(msg) => {
          mostrarExito(msg, "success");
          setShowEditReporte(false);
          setEditReporte(null);
        }}
        mode="edit"
        reporteInicial={editReporte}
      />

      <ManoObraDetalleModal
        show={Boolean(detalle)}
        detalle={detalle}
        proyectoActivo={proyectoActivo}
        semanaActiva={semanaActiva}
        onClose={() => setDetalle(null)}
        onPagarSemana={marcarPagadoSemanaEmpleado}
        onEditReporte={(row) => {
          setDetalle(null);
          setEditReporte(row);
          setShowEditReporte(true);
        }}
      />

      <ModalExito
        show={modalExito.show}
        mensaje={modalExito.mensaje}
        tipo={modalExito.tipo}
        onClose={() => setModalExito({ show: false, mensaje: "", tipo: "success" })}
      />
    </div>
  );
};

export default ManoObraCard;