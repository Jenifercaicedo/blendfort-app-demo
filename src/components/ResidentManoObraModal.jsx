import React, { useEffect, useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";
import ModalExito from "./ModalExito";
import { exportRolPagoPdf } from "../utils/exportRolPagoPdf";

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

const parseLocalDate = (dateString) => {
  const raw = iso10(dateString);
  if (!raw) return null;

  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;

  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatShortDate = (dateStr, includeYear = false) => {
  const d = parseLocalDate(dateStr);
  if (!d) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();

  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
};

const formatWeekRange = (startDate, endDate) => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

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
    return "text-black/60 bg-black/[0.035] border-black/10";
  }

  return "text-black/60 bg-black/[0.035] border-black/10";
};

const cargoTone = (cargo) => {
  const c = normalize(cargo);

  if (c.includes("RESIDENTE")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (c.includes("MAESTRO")) return "bg-violet-50 text-violet-700 border-violet-100";
  if (c.includes("OPERARIO")) return "bg-slate-50 text-slate-700 border-slate-200";
  if (c.includes("AYUDANTE")) return "bg-orange-50 text-orange-700 border-orange-100";

  return "bg-black/[0.035] text-black/60 border-black/10";
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
    reg?.concepto,
  ];

  for (const candidate of explicitCandidates) {
    const key = normalize(candidate);
    if (key && personalMap.has(key)) return key;
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

const getISOWeekKey = (dateString) => {
  const raw = iso10(dateString);
  if (!raw) return "";

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const temp = new Date(date);
  const day = temp.getDay() || 7;
  temp.setDate(temp.getDate() + 4 - day);

  const yearStart = new Date(temp.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);

  return `${temp.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const resolveSemanaKey = (reg) => {
  const direct =
    reg?.semana ||
    reg?.semanaKey ||
    reg?.semana_key ||
    reg?.week ||
    reg?.weekKey ||
    reg?.week_key ||
    "";

  const normalizedDirect = String(direct || "").toUpperCase().trim();
  if (normalizedDirect) return normalizedDirect;

  return getISOWeekKey(reg?.fecha);
};

const buildWeekMetaMap = (rows = []) => {
  const map = new Map();

  for (const row of rows) {
    const weekKey = resolveSemanaKey(row);
    const fecha = iso10(row?.fecha);

    if (!weekKey) continue;

    if (!map.has(weekKey)) {
      map.set(weekKey, {
        key: weekKey,
        startDate: fecha || "",
        endDate: fecha || "",
        count: 0,
      });
    }

    const item = map.get(weekKey);
    item.count += 1;

    if (fecha) {
      if (!item.startDate || fecha < item.startDate) item.startDate = fecha;
      if (!item.endDate || fecha > item.endDate) item.endDate = fecha;
    }
  }

  for (const [key, item] of map.entries()) {
    map.set(key, {
      ...item,
      label:
        item.startDate && item.endDate
          ? formatWeekRange(item.startDate, item.endDate)
          : key,
    });
  }

  return map;
};

const buildNominaRows = (rows = [], personalMap = new Map()) => {
  const acumulado = new Map();

  for (const reg of rows) {
    const nombreKey = resolveWorkerKey(reg, personalMap);
    const base = personalMap.get(nombreKey);

    if (!acumulado.has(nombreKey)) {
      acumulado.set(nombreKey, {
        key: nombreKey,
        nombre: String(
          base?.nombre ||
            reg?.empleado ||
            reg?.trabajador ||
            reg?.nombreEmpleado ||
            reg?.nombreTrabajador ||
            reg?.concepto ||
            reg?.detalles ||
            "SIN IDENTIFICAR"
        ).toUpperCase(),
        cargo: String(base?.cargo || reg?.cargo || reg?.rol || "SIN CARGO").toUpperCase(),
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

    if (estado !== "ANULADO") {
      row.total += valor;
    }

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

  return Array.from(acumulado.values()).sort((a, b) => {
    if ((b.total || 0) !== (a.total || 0)) return (b.total || 0) - (a.total || 0);
    return normalize(a.nombre).localeCompare(normalize(b.nombre));
  });
};

const buildPagoRows = (rows = [], personalMap = new Map()) => {
  const acumulado = new Map();

  for (const reg of rows) {
    const nombreKey = resolveWorkerKey(reg, personalMap);
    const base = personalMap.get(nombreKey);
    const semana = resolveSemanaKey(reg) || "SIN SEMANA";
    const key = `${nombreKey}__${semana}`;

    if (!acumulado.has(key)) {
      acumulado.set(key, {
        key,
        workerKey: nombreKey,
        nombre: String(
          base?.nombre ||
            reg?.empleado ||
            reg?.trabajador ||
            reg?.nombreEmpleado ||
            reg?.nombreTrabajador ||
            reg?.concepto ||
            reg?.detalles ||
            "SIN IDENTIFICAR"
        ).toUpperCase(),
        cargo: String(base?.cargo || reg?.cargo || reg?.rol || "SIN CARGO").toUpperCase(),
        semana,
        dias: 0,
        horasExtras: 0,
        bonos: 0,
        descuentos: 0,
        neto: 0,
        estadoSemana: "PENDIENTE",
        rows: [],
      });
    }

    const item = acumulado.get(key);
    const estado = normalize(reg?.estado || "PENDIENTE");
    const valor = Number(reg?.valor) || 0;

    item.rows.push(reg);

    if (reg?.asistio !== false && estado !== "ANULADO") item.dias += 1;
    if (estado !== "ANULADO") {
      item.horasExtras += Number(reg?.numHorasExtras ?? reg?.num_horas_extras) || 0;
      item.bonos += Number(reg?.valoresPendientes ?? reg?.valores_pendientes) || 0;
      item.descuentos += Number(reg?.descuentos) || 0;
      item.neto += valor;
    }
  }

  return Array.from(acumulado.values())
    .map((item) => {
      const movimientosValidos = item.rows.filter(
        (r) => normalize(r?.estado || "PENDIENTE") !== "ANULADO"
      );

      const todosPagados =
        movimientosValidos.length > 0 &&
        movimientosValidos.every((r) => {
          const estado = normalize(r?.estado || "PENDIENTE");
          return estado === "PAGADO" || estado === "COMPLETADO";
        });

      return {
        ...item,
        estadoSemana: todosPagados ? "PAGADO" : "PENDIENTE",
      };
    })
    .sort((a, b) => {
      const ak = normalize(a.semana);
      const bk = normalize(b.semana);

      if (ak !== bk) {
        return bk.localeCompare(ak);
      }

      return normalize(a.nombre).localeCompare(normalize(b.nombre));
    });
};

const buildPdfRowsFromPagoRows = (rows = []) => {
  return rows.map((row) => ({
    nombre: row.nombre,
    cargo: row.cargo,
    dias: Number(row.dias || 0),
    horasExtras: Number(row.horasExtras || 0),
    extras: Number(row.horasExtras || 0),
    bonos: Number(row.bonos || 0),
    descuentos: Number(row.descuentos || 0),
    neto: Number(row.neto || 0),
  }));
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
  const [filtroSemana, setFiltroSemana] = useState("TODAS");
  const [vistaActiva, setVistaActiva] = useState("nomina");
  const [showFiltrosMobile, setShowFiltrosMobile] = useState(false);

  const [modalExito, setModalExito] = useState({
    show: false,
    mensaje: "",
  });

  const mostrarExito = (mensaje) => {
    setModalExito({ show: true, mensaje });
  };

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
    setFiltroSemana("TODAS");
    setVistaActiva("nomina");
    setShowFiltrosMobile(false);
  }, [show, proyectoActivo]);

  const personalMap = useMemo(() => buildPersonalMap(personalProyecto), [personalProyecto]);

  const registrosMO = useMemo(() => {
    return (registrosManoObra || []).filter(
      (r) => normalize(r?.categoria) === "MANO DE OBRA"
    );
  }, [registrosManoObra]);

  const weekMetaMap = useMemo(() => buildWeekMetaMap(registrosMO), [registrosMO]);

  const opcionesSemana = useMemo(() => {
    const semanas = Array.from(weekMetaMap.values())
      .sort((a, b) => {
        const aEnd = a?.endDate || "";
        const bEnd = b?.endDate || "";

        if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);

        return String(b?.key || "").localeCompare(String(a?.key || ""));
      })
      .map((item) => item.key);

    return ["TODAS", ...semanas];
  }, [weekMetaMap]);

  const getWeekLabel = (weekKey) => {
    if (!weekKey || weekKey === "TODAS") return "TODAS";
    return weekMetaMap.get(weekKey)?.label || weekKey;
  };

  const registrosBaseFiltrados = useMemo(() => {
    let rows = [...(registrosMO || [])];

    const semanaSeleccionada = normalize(filtroSemana || "TODAS");

    if (semanaSeleccionada !== "TODAS") {
      rows = rows.filter((r) => normalize(resolveSemanaKey(r)) === semanaSeleccionada);
    }

    if (busqueda.trim()) {
      const q = normalize(busqueda);

      rows = rows.filter((r) => {
        const workerKey = resolveWorkerKey(r, personalMap);
        const base = personalMap.get(workerKey);

        const nombre = normalize(
          base?.nombre ||
            r?.empleado ||
            r?.trabajador ||
            r?.nombreEmpleado ||
            r?.nombreTrabajador ||
            r?.concepto ||
            r?.detalles
        );

        const cargo = normalize(base?.cargo || r?.cargo || r?.rol);
        const estado = normalize(r?.estado);
        const semana = normalize(getWeekLabel(resolveSemanaKey(r)));
        const fecha = normalize(iso10(r?.fecha));

        return (
          nombre.includes(q) ||
          cargo.includes(q) ||
          estado.includes(q) ||
          semana.includes(q) ||
          fecha.includes(q)
        );
      });
    }

    return rows.sort((a, b) => String(b?.fecha || "").localeCompare(String(a?.fecha || "")));
  }, [registrosMO, filtroSemana, busqueda, personalMap, weekMetaMap]);

  const filasNominaBase = useMemo(
    () => buildNominaRows(registrosBaseFiltrados, personalMap),
    [registrosBaseFiltrados, personalMap]
  );

  const filasNomina = useMemo(() => {
    let rows = [...filasNominaBase];

    if (normalize(filtroCargo) !== "TODOS") {
      rows = rows.filter((r) => normalize(r.cargo) === normalize(filtroCargo));
    }

    if (normalize(filtroEstadoPago) !== "TODOS") {
      if (normalize(filtroEstadoPago) === "PAGADO") {
        rows = rows.filter((r) => r.pagado > 0 && r.pendiente <= 0);
      } else if (normalize(filtroEstadoPago) === "PENDIENTE") {
        rows = rows.filter((r) => r.pendiente > 0);
      } else if (normalize(filtroEstadoPago) === "SIN MOVIMIENTOS") {
        rows = rows.filter((r) => r.movimientos === 0);
      }
    }

    return rows;
  }, [filasNominaBase, filtroCargo, filtroEstadoPago]);

  const filasPagoBase = useMemo(
    () => buildPagoRows(registrosBaseFiltrados, personalMap),
    [registrosBaseFiltrados, personalMap]
  );

  const filasPago = useMemo(() => {
    let rows = [...filasPagoBase];

    if (normalize(filtroCargo) !== "TODOS") {
      rows = rows.filter((r) => normalize(r.cargo) === normalize(filtroCargo));
    }

    if (normalize(filtroEstadoPago) !== "TODOS") {
      if (normalize(filtroEstadoPago) === "PAGADO") {
        rows = rows.filter((r) => normalize(r.estadoSemana) === "PAGADO");
      } else if (normalize(filtroEstadoPago) === "PENDIENTE") {
        rows = rows.filter((r) => normalize(r.estadoSemana) === "PENDIENTE");
      } else if (normalize(filtroEstadoPago) === "SIN MOVIMIENTOS") {
        rows = [];
      }
    }

    return rows;
  }, [filasPagoBase, filtroCargo, filtroEstadoPago]);

  const opcionesCargo = useMemo(() => {
    const source = vistaActiva === "pagos" ? filasPagoBase : filasNominaBase;

    const unique = Array.from(new Set(source.map((r) => normalize(r.cargo)).filter(Boolean))).sort();

    return ["TODOS", ...unique];
  }, [filasNominaBase, filasPagoBase, vistaActiva]);

  const opcionesEstadoPago = useMemo(
    () => ["TODOS", "PAGADO", "PENDIENTE", "SIN MOVIMIENTOS"],
    []
  );

  const resumenNomina = useMemo(() => {
    const totalGeneral = filasNomina.reduce((acc, r) => acc + (Number(r?.total) || 0), 0);
    const totalPagado = filasNomina.reduce((acc, r) => acc + (Number(r?.pagado) || 0), 0);
    const totalPendiente = filasNomina.reduce((acc, r) => acc + (Number(r?.pendiente) || 0), 0);

    return {
      totalGeneral,
      totalPagado,
      totalPendiente,
      trabajadores: filasNomina.length,
    };
  }, [filasNomina]);

  const resumenPagos = useMemo(() => {
    const totalGeneral = filasPago.reduce((acc, r) => acc + (Number(r?.neto) || 0), 0);
    const totalPagado = filasPago.reduce((acc, r) => {
      return normalize(r?.estadoSemana) === "PAGADO"
        ? acc + (Number(r?.neto) || 0)
        : acc;
    }, 0);

    const totalPendiente = filasPago.reduce((acc, r) => {
      return normalize(r?.estadoSemana) === "PENDIENTE"
        ? acc + (Number(r?.neto) || 0)
        : acc;
    }, 0);

    return {
      totalGeneral,
      totalPagado,
      totalPendiente,
      trabajadores: filasPago.length,
    };
  }, [filasPago]);

  const resumen = vistaActiva === "pagos" ? resumenPagos : resumenNomina;

  const hayFiltrosActivos = useMemo(() => {
    return (
      Boolean(busqueda.trim()) ||
      normalize(filtroCargo) !== "TODOS" ||
      normalize(filtroEstadoPago) !== "TODOS" ||
      normalize(filtroSemana) !== "TODAS"
    );
  }, [busqueda, filtroCargo, filtroEstadoPago, filtroSemana]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroCargo("TODOS");
    setFiltroEstadoPago("TODOS");
    setFiltroSemana("TODAS");
  };

  const exportarRolPago = async () => {
    try {
      const proyecto = normalize(proyectoActivo || "");
      if (!proyecto) {
        mostrarExito("NO HAY PROYECTO ACTIVO PARA EXPORTAR");
        return;
      }

      if (!filasPago.length) {
        mostrarExito("NO HAY ROLES DE PAGO PARA EXPORTAR");
        return;
      }

      const rows = buildPdfRowsFromPagoRows(filasPago);
      const total = rows.reduce((acc, row) => acc + (Number(row?.neto) || 0), 0);

      const period =
        filtroSemana !== "TODAS"
          ? getWeekLabel(filtroSemana)
          : "TODAS LAS SEMANAS VISIBLES";

      await exportRolPagoPdf({
        sections: [
          {
            project: proyecto,
            period,
            rows,
            total,
          },
        ],
        generatedBy: "RESIDENTE",
        pendingOnly: normalize(filtroEstadoPago) === "PENDIENTE",
      });

      mostrarExito("PDF DE ROL DE PAGO GENERADO");
    } catch (error) {
      console.error("Error exportando rol de pago residente:", error);
      mostrarExito("NO SE PUDO GENERAR EL PDF");
    }
  };

  const filtrosPanel = (
    <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm mb-5">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
        <CustomSelect
          label="Semana"
          options={opcionesSemana.map((s) => getWeekLabel(s))}
          value={getWeekLabel(filtroSemana)}
          onChange={(val) => {
            const valor = String(val || "").trim();

            if (!valor || normalize(valor) === "TODAS") {
              setFiltroSemana("TODAS");
              return;
            }

            const match = opcionesSemana.find((s) => getWeekLabel(s) === valor);
            setFiltroSemana(match || "TODAS");
          }}
          placeholder="TODAS"
          allowCustom={false}
          disabled={opcionesSemana.length <= 1}
        />

        <div>
          <label className="text-[8px] font-black uppercase ml-3 tracking-widest text-black/45">
            Buscar trabajador
          </label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="NOMBRE, CARGO, ESTADO..."
            className="w-full mt-1 bg-blendfort-fondo border border-black/5 px-4 h-[54px] rounded-2xl text-[10px] font-black outline-none focus:border-black transition-all uppercase"
          />
        </div>

        <CustomSelect
          label="Cargo"
          options={opcionesCargo}
          value={filtroCargo}
          onChange={(val) => setFiltroCargo(String(val || "TODOS"))}
          placeholder="TODOS"
          allowCustom={false}
        />

        <CustomSelect
          label="Estado pago"
          options={opcionesEstadoPago}
          value={filtroEstadoPago}
          onChange={(val) => setFiltroEstadoPago(String(val || "TODOS"))}
          placeholder="TODOS"
          allowCustom={false}
        />
      </div>

      {hayFiltrosActivos && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border border-black/5 text-black/50 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>

            <span className="text-[8px] font-black uppercase tracking-[0.18em]">
              Limpiar filtros
            </span>
          </button>
        </div>
      )}
    </div>
  );

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-[120]">
        <div
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          onClick={onClose}
        />

        <div className="absolute inset-0 flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="relative w-full h-[92dvh] md:h-auto md:max-h-[90vh] md:max-w-6xl bg-[#F6F6F1] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden border border-black/5">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/5 px-4 md:px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-[2px] bg-blendfort-naranja" />
                    <span className="text-[8px] font-black uppercase tracking-[0.22em] text-blendfort-naranja">
                      Resident Console
                    </span>
                  </div>

                  <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-tight text-slate-800">
                    Control de Mano de Obra
                  </h2>

                  <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] mt-2 text-black/55">
                    Proyecto: {String(proyectoActivo || "SIN PROYECTO").toUpperCase()}
                  </p>

                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.16em] mt-1 text-black/40">
                    Periodo:{" "}
                    {filtroSemana !== "TODAS" ? getWeekLabel(filtroSemana) : "TODAS LAS SEMANAS"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFiltrosMobile((v) => !v)}
                    className={`md:hidden relative flex items-center gap-2 px-4 h-11 rounded-2xl bg-white border transition-all duration-300 active:scale-95 shadow-sm hover:border-blendfort-naranja ${
                      hayFiltrosActivos ? "border-blendfort-naranja/40" : "border-black/5"
                    }`}
                    title="Filtros"
                  >
                    <svg
                      className="w-3.5 h-3.5 opacity-60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
                    </svg>
                    <span className="text-[8px] font-black uppercase tracking-[0.18em] text-black/65">
                      Filtros
                    </span>
                    {hayFiltrosActivos && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse" />
                    )}
                  </button>

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
            </div>

            <div className="h-[calc(92dvh-84px)] md:h-auto md:max-h-[calc(90vh-84px)] overflow-y-auto px-4 md:px-6 py-4 md:py-5">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                  <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-black/55 mb-2">
                    {vistaActiva === "pagos" ? "Total a Pagar" : "Total Mano de Obra"}
                  </p>
                  <p className="text-base md:text-xl font-black tracking-tight text-slate-800">
                    {money(resumen.totalGeneral)}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                  <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-black/55 mb-2">
                    Total Pagado
                  </p>
                  <p className="text-base md:text-xl font-black tracking-tight text-green-700">
                    {money(resumen.totalPagado)}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                  <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-black/55 mb-2">
                    Total Pendiente
                  </p>
                  <p className="text-base md:text-xl font-black tracking-tight text-amber-700">
                    {money(resumen.totalPendiente)}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-[#FCB017]/20 bg-white p-4 shadow-sm">
                  <div className="w-5 h-[2px] bg-blendfort-naranja mb-3" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-black/55 mb-2">
                    {vistaActiva === "pagos" ? "Roles" : "Trabajadores"}
                  </p>
                  <p className="text-base md:text-xl font-black tracking-tight text-slate-800">
                    {resumen.trabajadores}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-black/5 bg-white p-3 md:p-4 shadow-sm mb-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="grid grid-cols-2 gap-2 md:w-fit">
                    <button
                      type="button"
                      onClick={() => setVistaActiva("nomina")}
                      className={`h-11 px-5 rounded-2xl font-black text-[8px] uppercase tracking-[0.18em] transition-all active:scale-95 ${
                        vistaActiva === "nomina"
                          ? "bg-black text-white shadow-sm"
                          : "bg-blendfort-fondo text-black/60 hover:bg-black hover:text-white"
                      }`}
                    >
                      Nómina
                    </button>

                    <button
                      type="button"
                      onClick={() => setVistaActiva("pagos")}
                      className={`h-11 px-5 rounded-2xl font-black text-[8px] uppercase tracking-[0.18em] transition-all active:scale-95 ${
                        vistaActiva === "pagos"
                          ? "bg-black text-white shadow-sm"
                          : "bg-blendfort-fondo text-black/60 hover:bg-black hover:text-white"
                      }`}
                    >
                      Pagos
                    </button>
                  </div>

                  {vistaActiva === "pagos" && (
                    <button
                      type="button"
                      onClick={exportarRolPago}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:border-[#FCB017] hover:text-[#C98500] active:scale-95 shadow-sm"
                      title="Exportar rol de pago en PDF"
                    >
                      <i className="pi pi-file-pdf text-[12px]" />
                      <span>PDF rol</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden md:block">{filtrosPanel}</div>
              {showFiltrosMobile && <div className="md:hidden">{filtrosPanel}</div>}

              <div className="max-h-[52vh] overflow-y-auto overscroll-contain pr-1 md:max-h-[58vh]">
                {vistaActiva === "nomina" ? (
                <>
                  <div className="md:hidden space-y-3">
                    {filasNomina.length === 0 ? (
                      <div className="bg-white rounded-[1.5rem] border border-dashed border-black/10 p-8 text-center shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          No hay registros de mano de obra para mostrar
                        </p>
                      </div>
                    ) : (
                      filasNomina.map((row) => (
                        <div
                          key={row.key}
                          className="bg-white rounded-[1.5rem] border border-black/5 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-black uppercase tracking-tight leading-tight text-slate-800">
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
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Total
                              </p>
                              <p className="font-black">{money(row.total)}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Pagado
                              </p>
                              <p className="font-black text-green-700">{money(row.pagado)}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Pendiente
                              </p>
                              <p className="font-black text-amber-700">{money(row.pendiente)}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Última fecha
                              </p>
                              <p className="font-black">{row.ultimaFecha || "—"}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Valor día
                              </p>
                              <p className="font-black">{money(row.valorDia)}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
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
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Trabajador
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Cargo
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Valor Día
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Hora Extra
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Total
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Pagado
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Pendiente
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Mov.
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Última Fecha
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Estado
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filasNomina.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="px-4 py-10 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                                  No hay registros de mano de obra para mostrar
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filasNomina.map((row) => (
                              <tr
                                key={row.key}
                                className="border-b border-black/[0.04] last:border-b-0 hover:bg-blendfort-fondo/40 transition-colors"
                              >
                                <td className="px-4 py-4">
                                  <p className="text-[10px] font-black uppercase leading-tight text-slate-800">
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
                </>
              ) : (
                <>
                  <div className="md:hidden space-y-3">
                    {filasPago.length === 0 ? (
                      <div className="bg-white rounded-[1.5rem] border border-dashed border-black/10 p-8 text-center shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          No hay pagos para mostrar con este filtro
                        </p>
                      </div>
                    ) : (
                      filasPago.map((row) => (
                        <div
                          key={row.key}
                          className="bg-white rounded-[1.5rem] border border-black/5 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-black uppercase tracking-tight leading-tight text-slate-800">
                                {row.nombre}
                              </h3>

                              <div className="flex flex-wrap gap-2 mt-2">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${cargoTone(
                                    row.cargo
                                  )}`}
                                >
                                  {row.cargo}
                                </span>

                                <span className="inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] bg-black/[0.035] text-black/60 border-black/10">
                                  {getWeekLabel(row.semana)}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${estadoTone(
                                row.estadoSemana
                              )}`}
                            >
                              {row.estadoSemana}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Días
                              </p>
                              <p className="font-black">{row.dias}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                H. extras
                              </p>
                              <p className="font-black">{row.horasExtras} hrs</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Bonos
                              </p>
                              <p className="font-black">{money(row.bonos)}</p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Descuentos
                              </p>
                              <p className="font-black text-red-600">- {money(row.descuentos)}</p>
                            </div>

                            <div className="col-span-2">
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-black/50 mb-1">
                                Neto a pagar
                              </p>
                              <p className="font-black text-lg tracking-tight text-slate-800">
                                {money(row.neto)}
                              </p>
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
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Trabajador
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Cargo
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Semana
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Días
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              H. Extras
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Bonos
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Desc.
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Neto
                            </th>
                            <th className="text-left px-4 py-4 text-[8px] font-black uppercase tracking-[0.18em] text-black/50">
                              Estado
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filasPago.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="px-4 py-10 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                                  No hay pagos para mostrar con este filtro
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filasPago.map((row) => (
                              <tr
                                key={row.key}
                                className="border-b border-black/[0.04] last:border-b-0 hover:bg-blendfort-fondo/40 transition-colors"
                              >
                                <td className="px-4 py-4">
                                  <p className="text-[10px] font-black uppercase leading-tight text-slate-800">
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
                                  {getWeekLabel(row.semana)}
                                </td>

                                <td className="px-4 py-4 text-[10px] font-black">{row.dias}</td>

                                <td className="px-4 py-4 text-[10px] font-black">
                                  {row.horasExtras} hrs
                                </td>

                                <td className="px-4 py-4 text-[10px] font-black">
                                  {money(row.bonos)}
                                </td>

                                <td className="px-4 py-4 text-[10px] font-black text-red-600">
                                  - {money(row.descuentos)}
                                </td>

                                <td className="px-4 py-4 text-[10px] font-black">
                                  {money(row.neto)}
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.12em] ${estadoTone(
                                      row.estadoSemana
                                    )}`}
                                  >
                                    {row.estadoSemana}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
                )}
              </div>

              <div className="mt-5 px-1">
                <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.16em] text-black/30">
                  {vistaActiva === "pagos"
                    ? "Puedes exportar el rol de pago del proyecto activo con los filtros visibles aplicados."
                    : "Esta vista muestra solo la mano de obra del proyecto activo del residente."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalExito
        show={modalExito.show}
        mensaje={modalExito.mensaje}
        onClose={() => setModalExito({ show: false, mensaje: "" })}
      />
    </>
  );
};

export default ResidentManoObraModal;
