import React, { useMemo, useState, useCallback, useEffect } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";
import ReporteDiarioListaModal from "./ReporteDiarioListaModal";
import ReporteDiarioModal from "./ReporteDiarioModal";
import ManoObraTabla from "./ManoObraTabla";
import ManoObraDetalleModal from "./ManoObraDetalleModal";
import ManoObraHistorialView from "./ManoObraHistorialView";
import ModalExito from "./ModalExito";
import { exportRolPagoPdf } from "../utils/exportRolPagoPdf";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const MONTHS_SHORT = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

const iso10 = (d) => String(d || "").slice(0, 10);

const parseISODate = (dateStr) => {
  const iso = iso10(dateStr);
  if (!iso) return null;

  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;

  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getISOWeekKey = (dateStr) => {
  const d = parseISODate(dateStr);
  if (!d) return "";

  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

  const y = date.getUTCFullYear();
  const w = String(weekNo).padStart(2, "0");
  return `${y}-W${w}`;
};

const formatShortDate = (dateStr, includeYear = false) => {
  const d = parseISODate(dateStr);
  if (!d) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();

  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
};

const formatWeekRange = (startDate, endDate) => {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);

  if (!start && !end) return "SIN FECHAS";
  if (start && !end) return formatShortDate(startDate, true);
  if (!start && end) return formatShortDate(endDate, true);

  const sameDay = iso10(startDate) === iso10(endDate);
  if (sameDay) return formatShortDate(startDate, true);

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  const startDay = String(start.getDate()).padStart(2, "0");
  const endDay = String(end.getDate()).padStart(2, "0");
  const startMonth = MONTHS_SHORT[start.getMonth()];
  const endMonth = MONTHS_SHORT[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (sameMonth && sameYear) {
    return `${startDay}–${endDay} ${startMonth}`;
  }

  if (sameYear) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  }

  return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
};

const buildWeekMetaMap = (rows = []) => {
  const map = new Map();

  for (const row of rows) {
    const weekKey = getISOWeekKey(row?.fecha);
    const fecha = iso10(row?.fecha);

    if (!weekKey || !fecha) continue;

    if (!map.has(weekKey)) {
      map.set(weekKey, {
        key: weekKey,
        startDate: fecha,
        endDate: fecha,
        count: 1,
      });
      continue;
    }

    const current = map.get(weekKey);

    if (fecha < current.startDate) current.startDate = fecha;
    if (fecha > current.endDate) current.endDate = fecha;
    current.count += 1;
  }

  for (const [key, meta] of map.entries()) {
    map.set(key, {
      ...meta,
      label: formatWeekRange(meta.startDate, meta.endDate),
    });
  }

  return map;
};

const buildPayrollRowsFromReports = (rows = []) => {
  const map = new Map();

  for (const curr of rows) {
    const estado = norm(curr?.estado || "PENDIENTE");
    if (estado === "ANULADO") continue;

    const nombre = norm(curr?.concepto || "SIN NOMBRE");
    const key = nombre;

    if (!map.has(key)) {
      map.set(key, {
        nombre,
        cargo: norm(curr?.cargo || "OPERARIO"),
        dias: 0,
        extras: 0,
        bonos: 0,
        descuentos: 0,
        neto: 0,
      });
    }

    const item = map.get(key);
    const asistio = curr?.asistio === false ? false : true;

    if (asistio) {
      item.dias += 1;
    }

    item.extras += Number(curr?.numHorasExtras ?? curr?.num_horas_extras) || 0;
    item.bonos += Number(curr?.valoresPendientes ?? curr?.valores_pendientes) || 0;
    item.descuentos += Number(curr?.descuentos) || 0;
    item.neto += Number(curr?.valor) || 0;

    if (!item.cargo || item.cargo === "OPERARIO") {
      item.cargo = norm(curr?.cargo || "OPERARIO");
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    norm(a.nombre).localeCompare(norm(b.nombre))
  );
};

const sumPayrollRows = (rows = []) =>
  rows.reduce((acc, row) => acc + (Number(row?.neto) || 0), 0);

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const InfoPill = ({ icon, children, accent = false }) => (
  <div
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
      accent
        ? "border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]"
        : "border-transparent bg-slate-100 text-slate-600"
    }`}
  >
    <i className={`${icon} text-[11px]`} />
    <span className="truncate">{children}</span>
  </div>
);

const ViewTab = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] transition-all ${
      active
        ? "bg-slate-800 text-white shadow-sm"
        : "border border-black/8 bg-white text-slate-600 hover:border-[#FCB017] hover:text-[#C98500]"
    }`}
  >
    <i className={`${icon} text-[11px]`} />
    <span>{label}</span>
  </button>
);

const filtersBoxClass =
  "rounded-[1.6rem] border border-black/5 bg-white p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]";

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

  const [vistaActiva, setVistaActiva] = useState("rol");

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

  const [showFiltros, setShowFiltros] = useState(false);
  const [showReporte, setShowReporte] = useState(false);
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
    if (norm(proyectoActivo) === "TODOS") return "";
    return proyectoActivo;
  }, [proyectoActivo]);

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

  const reportesMOProyecto = useMemo(() => {
    const pA = norm(proyectoActivo);
    const todos = pA === "TODOS";

    return (egresos || []).filter((e) => {
      const pE = norm(e?.proyecto);
      const cat = norm(e?.categoria);
      const est = norm(e?.estado || "PENDIENTE");

      if (!todos && pE !== pA) return false;
      if (cat !== "MANO DE OBRA") return false;

      if (soloPendientes) {
        return est === "PENDIENTE";
      }

      return true;
    });
  }, [egresos, proyectoActivo, soloPendientes]);

  const weekMetaMap = useMemo(() => {
    return buildWeekMetaMap(reportesMOProyecto);
  }, [reportesMOProyecto]);

  const opcionesSemanas = useMemo(() => {
    return Array.from(weekMetaMap.keys()).sort().reverse();
  }, [weekMetaMap]);

  const getWeekLabel = useCallback(
    (weekKey) => {
      if (!weekKey) return "TODAS";
      return weekMetaMap.get(weekKey)?.label || weekKey;
    },
    [weekMetaMap]
  );

  useEffect(() => {
    if (semanaActiva && !opcionesSemanas.includes(semanaActiva)) {
      setSemanaActiva("");
    }
  }, [semanaActiva, opcionesSemanas]);

  const reportesMO = useMemo(() => {
    if (!semanaActiva) return reportesMOProyecto;
    return reportesMOProyecto.filter((e) => getISOWeekKey(e.fecha) === semanaActiva);
  }, [reportesMOProyecto, semanaActiva]);

  const egresosMO = useMemo(() => {
    return reportesMO.filter((e) => norm(e?.estado || "PENDIENTE") !== "ANULADO");
  }, [reportesMO]);

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
          bonos: 0,
          neto: 0,
          estadoSemana: "PAGADO",
        };
      }

      if (estado === "PENDIENTE") {
        acc[key].estadoSemana = "PENDIENTE";
      }

      if (asistio) {
        acc[key].dias += 1;
      }

      acc[key].extras += Number(curr.numHorasExtras ?? curr.num_horas_extras) || 0;
      acc[key].bonos += Number(curr.valoresPendientes ?? curr.valores_pendientes) || 0;
      acc[key].descuentos += Number(curr.descuentos) || 0;
      acc[key].neto += Number(curr.valor) || 0;

      return acc;
    }, {});
  }, [egresosMO, proyectoActivo]);

  const listaFinal = useMemo(() => Object.values(resumenNomina), [resumenNomina]);

  const granTotal = useMemo(
    () => listaFinal.reduce((t, e) => t + (Number(e.neto) || 0), 0),
    [listaFinal]
  );

  const historialValor = useMemo(() => {
    return reportesMO.reduce((acc, row) => {
      if (norm(row?.estado) === "ANULADO") return acc;
      return acc + (Number(row?.valor) || 0);
    }, 0);
  }, [reportesMO]);

  const hayFiltros = useMemo(() => {
    return norm(proyectoActivo) !== "TODOS" || Boolean(semanaActiva || soloPendientes);
  }, [proyectoActivo, semanaActiva, soloPendientes]);

  const abrirDetalle = (empNombre) => {
    const nombre = norm(empNombre);
    const rows = egresosMO.filter((e) => norm(e?.concepto) === nombre).slice();
    setDetalle({ nombre, rows });
  };

  const abrirReporteLista = () => {
    if (!proyectoParaReporte) {
      mostrarExito("SELECCIONA UN PROYECTO ESPECÍFICO PARA REPORTAR", "info");
      return;
    }

    setShowReporte(true);
  };

  const exportarPdf = async () => {
    try {
      const esTodos = norm(proyectoActivo) === "TODOS";

      if (esTodos) {
        const sourceRows = (semanaActiva ? reportesMO : reportesMOProyecto).filter((row) => {
          const estado = norm(row?.estado || "PENDIENTE");
          return estado === "PENDIENTE";
        });

        if (!sourceRows.length) {
          mostrarExito("NO HAY ROLES PENDIENTES PARA EXPORTAR", "info");
          return;
        }

        const groups = new Map();

        sourceRows.forEach((row) => {
          const proyecto = norm(row?.proyecto || "SIN PROYECTO");
          const weekKey = getISOWeekKey(row?.fecha) || "SIN_SEMANA";
          const key = `${proyecto}__${weekKey}`;

          if (!groups.has(key)) {
            groups.set(key, {
              project: proyecto,
              weekKey,
              rawRows: [],
            });
          }

          groups.get(key).rawRows.push(row);
        });

        const sections = Array.from(groups.values())
          .sort((a, b) => {
            if (a.project !== b.project) return a.project.localeCompare(b.project);
            return String(b.weekKey).localeCompare(String(a.weekKey));
          })
          .map((group) => {
            const rows = buildPayrollRowsFromReports(group.rawRows);
            return {
              project: group.project,
              period:
                group.weekKey === "SIN_SEMANA"
                  ? "SIN SEMANA"
                  : getWeekLabel(group.weekKey),
              rows,
              total: sumPayrollRows(rows),
            };
          })
          .filter((section) => section.rows.length);

        if (!sections.length) {
          mostrarExito("NO HAY ROLES PENDIENTES PARA EXPORTAR", "info");
          return;
        }

        await exportRolPagoPdf({
          sections,
          generatedBy: registradoPor,
          pendingOnly: true,
        });

        mostrarExito("PDF DE ROLES PENDIENTES GENERADO", "success");
        return;
      }

      const sourceRows = egresosMO;

      if (!sourceRows.length) {
        mostrarExito("NO HAY DATOS DE NÓMINA PARA EXPORTAR", "info");
        return;
      }

      const rows = buildPayrollRowsFromReports(sourceRows);
      const total = sumPayrollRows(rows);

      await exportRolPagoPdf({
        sections: [
          {
            project: norm(proyectoActivo),
            period: semanaActiva ? getWeekLabel(semanaActiva) : "TODAS LAS SEMANAS",
            rows,
            total,
          },
        ],
        generatedBy: registradoPor,
        pendingOnly: soloPendientes,
      });

      mostrarExito("PDF GENERADO CORRECTAMENTE", "success");
    } catch (error) {
      console.error("Error exportando rol de pago PDF:", error);
      mostrarExito("NO SE PUDO GENERAR EL PDF", "info");
    }
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

    mostrarExito(`PAGO REGISTRADO · ${nombreN} · ${getWeekLabel(semanaActiva)}`, "success");
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
          ? `NO HAY REGISTROS PENDIENTES PARA ${proyectoN} EN ${getWeekLabel(semanaActiva)}`
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
        ? `PAGO MASIVO REGISTRADO · ${proyectoN} · ${getWeekLabel(semanaActiva)} · ${registrosAPagar.length} REGISTROS`
        : `PAGO MASIVO REGISTRADO · ${proyectoN} · ${registrosAPagar.length} REGISTROS`,
      "success"
    );
  };

  const limpiarFiltros = () => {
    setProyectoActivo("TODOS");
    setSemanaActiva("");
    setSoloPendientes(false);
  };

  const filtrosPanel = (
    <div className={filtersBoxClass}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-4">
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
        </div>

        <div className="md:col-span-4">
          <CustomSelect
            label="Semana"
            options={opcionesSemanas.map((w) => getWeekLabel(w))}
            value={semanaActiva ? getWeekLabel(semanaActiva) : ""}
            onChange={(val) => {
              const match = opcionesSemanas.find((k) => getWeekLabel(k) === val);
              setSemanaActiva(match || "");
            }}
            placeholder={opcionesSemanas.length ? "TODAS..." : "SIN SEMANAS"}
            allowCustom={false}
            disabled={!opcionesSemanas.length}
          />
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
            Pendientes
          </label>
          <button
            type="button"
            onClick={() => setSoloPendientes((v) => !v)}
            className="w-full h-[50px] bg-white border border-black/5 rounded-xl px-4 flex items-center justify-between shadow-sm transition-all hover:border-black/20"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {soloPendientes ? "ACTIVO" : "DESACTIVADO"}
            </span>

            <div
              className={`w-12 h-6 rounded-full transition-all relative ${
                soloPendientes ? "bg-[#FCB017]" : "bg-black/10"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                  soloPendientes ? "left-7" : "left-1"
                }`}
              />
            </div>
          </button>
        </div>

        {hayFiltros && (
          <div className="md:col-span-1 flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-slate-600 transition-all active:scale-95 hover:border-[#FCB017] hover:text-[#C98500] shadow-sm h-[50px]"
            >
              <i className="pi pi-filter-slash text-[12px]" />
              <span className="hidden lg:inline text-[12px] font-semibold">
                Limpiar
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
            <i className="pi pi-chart-line text-[11px]" />
            <span>Control de nómina</span>
          </div>

          <h2 className="mt-3 text-[28px] md:text-[34px] xl:text-[38px] font-black tracking-tight text-slate-800 leading-none">
            Mano de obra
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <InfoPill icon="pi pi-calendar">
              {semanaActiva ? getWeekLabel(semanaActiva) : "Todas las semanas"}
            </InfoPill>

            <InfoPill icon="pi pi-briefcase" accent={norm(proyectoActivo) !== "TODOS"}>
              {norm(proyectoActivo) === "TODOS" ? "Todos los proyectos" : proyectoActivo}
            </InfoPill>

            {soloPendientes ? (
              <InfoPill icon="pi pi-clock" accent>
                Solo pendientes
              </InfoPill>
            ) : null}
          </div>
        </div>

        <div className="w-full xl:w-auto flex flex-col gap-3 xl:items-end">
          <div className="rounded-[1.5rem] border border-[#FCB017]/20 bg-[#FFF8E8] px-4 py-3 md:px-5 md:py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] xl:min-w-[300px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C98500]">
              {vistaActiva === "historial" ? "Valor visible" : `Total ${semanaActiva ? "semana" : "acumulado"}`}
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-[11px] font-black text-[#C98500] uppercase tracking-[0.12em]">
                USD
              </span>
              <span className="text-[24px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none">
                $ {money(vistaActiva === "historial" ? historialValor : granTotal)}
              </span>
            </div>

            <p className="mt-2 text-[11px] font-medium text-slate-500">
              {vistaActiva === "historial"
                ? `${reportesMO.length} reporte(s)`
                : `${listaFinal.length} personal`}
            </p>
          </div>

          <div className="flex justify-end items-center gap-2 flex-wrap">
  <button
    onClick={() => setShowFiltros((v) => !v)}
    type="button"
    className={`md:hidden relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-95 ${
      hayFiltros || showFiltros
        ? "border-[#FCB017]/30 bg-[#FFF8E8] text-[#C98500]"
        : "border-black/10 bg-white text-slate-600"
    }`}
    title="Filtros"
  >
    <i className="pi pi-filter text-[13px]" />
    {hayFiltros && (
      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#FCB017]" />
    )}
  </button>

  {vistaActiva === "rol" && (
    <>
      <button
        onClick={exportarPdf}
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:border-[#FCB017] hover:text-[#C98500] active:scale-95 shadow-sm"
        title="Exportar rol de pago PDF"
      >
        <i className="pi pi-file-pdf text-[12px]" />
        <span>PDF</span>
      </button>

      <button
        onClick={pagarProyectoCompleto}
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017] active:scale-95 shadow-sm"
        title={
          norm(proyectoActivo) === "TODOS"
            ? "Selecciona un proyecto específico"
            : semanaActiva
            ? `Pagar ${getWeekLabel(semanaActiva)}`
            : "Pagar todo el proyecto"
        }
      >
        <i className="pi pi-check text-[12px]" />
        <span>Pagar proyecto</span>
      </button>
    </>
  )}

  <button
    onClick={abrirReporteLista}
    type="button"
    className="inline-flex items-center gap-2 rounded-full bg-[#FCB017] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-slate-800 active:scale-95 shadow-sm"
  >
    <i className="pi pi-plus text-[12px]" />
    <span>{vistaActiva === "historial" ? "Nuevo reporte" : "Reporte"}</span>
  </button>
</div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-black/5 bg-white p-3 md:p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-2">
          <ViewTab
            active={vistaActiva === "rol"}
            icon="pi pi-wallet"
            label="Rol de pago"
            onClick={() => setVistaActiva("rol")}
          />
          <ViewTab
            active={vistaActiva === "historial"}
            icon="pi pi-history"
            label="Historial"
            onClick={() => setVistaActiva("historial")}
          />
        </div>
      </div>

      <div className="hidden md:block">{filtrosPanel}</div>
      {showFiltros && (
        <div className="md:hidden animate-in fade-in zoom-in duration-300">
          {filtrosPanel}
        </div>
      )}

      {vistaActiva === "rol" ? (
        <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
          <ManoObraTabla
            listaFinal={listaFinal}
            onDetalle={abrirDetalle}
            onPagarSemana={marcarPagadoSemanaEmpleado}
          />
        </div>
      ) : (
        <ManoObraHistorialView
          registros={reportesMO}
          onEditReporte={(row) => {
            setEditReporte(row);
            setShowEditReporte(true);
          }}
        />
      )}

      <ReporteDiarioListaModal
        show={showReporte}
        onClose={() => setShowReporte(false)}
        proyectoActivo={proyectoParaReporte}
        registradoPor={registradoPor}
        onSuccess={(msg) => {
          mostrarExito(msg, "success");
          setShowReporte(false);
        }}
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
        semanaLabel={semanaActiva ? getWeekLabel(semanaActiva) : ""}
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