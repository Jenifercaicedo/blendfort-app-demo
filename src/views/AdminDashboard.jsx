import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "primereact/sidebar";
import logo from "../assets/blendfort-logo-largo.png";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

// Componentes
import ModalProyecto from "../components/ModalProyecto";
import ModalEgreso from "../components/ModalEgreso";
import ModalConfirmar from "../components/ModalConfirmar";
import GestionProyectos from "../components/GestionProyectos";
import ModalExito from "../components/ModalExito";
import InformeEgresos from "../components/InformeEgresos";
import ManoObraCard from "../components/ManoObraCard";
import GestionPersonal from "../components/GestionPersonal";
import CajaChicaView from "../components/CajaChicaView";

/* ===========================
   Helpers
=========================== */
const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const iso10 = (d) => String(d || "").slice(0, 10);

const money = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const money2 = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const shouldCountInTotals = (e) => {
  const cat = normalize(e?.categoria);
  const est = normalize(e?.estado || "PENDIENTE");

  if (est === "ANULADO") return false;

  if (cat === "MANO DE OBRA") {
    return est === "PAGADO" || est === "COMPLETADO";
  }

  return true;
};

const isPayrollRecord = (e) => {
  const cat = normalize(e?.categoria);
  const tipo = normalize(e?.tipoRegistro || e?.tipo_registro);
  return cat === "MANO DE OBRA" || tipo === "REPORTE_DIARIO";
};

const isOperationalExpense = (e) => !isPayrollRecord(e);

const shouldCountOperationalTotals = (e) => {
  const est = normalize(e?.estado || "PENDIENTE");
  if (est === "ANULADO") return false;
  if (!isOperationalExpense(e)) return false;
  return true;
};

const shouldCountPayrollPaidTotals = (e) => {
  if (!isPayrollRecord(e)) return false;
  const est = normalize(e?.estado || "PENDIENTE");
  return est === "PAGADO" || est === "COMPLETADO";
};

const statusTone = (estado) => {
  const e = normalize(estado);
  if (e === "PAGADO") return "bg-green-100 text-green-700";
  if (e === "COMPLETADO") return "bg-blue-100 text-blue-700";
  if (e === "PENDIENTE") return "bg-amber-100 text-amber-700";
  if (e === "ANULADO") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
};

const workerTone = (estado) => {
  const e = normalize(estado);
  if (e === "ACTIVO") return "bg-green-100 text-green-700";
  if (e === "INACTIVO") return "bg-slate-100 text-slate-600";
  if (e === "TRABAJANDO") return "bg-green-100 text-green-700";
  if (e === "DESCANSO") return "bg-amber-100 text-amber-700";
  if (e === "AUSENTE") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
};

const percent = (value, total) => {
  const v = Number(value) || 0;
  const t = Number(total) || 0;
  if (!t || t <= 0) return 0;
  return Math.min((v / t) * 100, 100);
};

// Toast interno
const Toast = ({ mensaje, tipo = "exito", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const estilos = {
    exito: "bg-[#171717] text-white",
    error: "bg-red-500 text-white",
    info: "bg-[#FCB017] text-white",
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className={`${estilos[tipo]} flex items-center gap-3 rounded-full border border-white/10 px-6 py-3 shadow-xl`}
      >
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">
          {mensaje}
        </span>
      </div>
    </div>
  );
};

/* ===========================
   UI Helpers
=========================== */
const SidebarItem = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
      active
        ? "bg-white/16 text-white shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
        : "text-white/90 hover:bg-white/8 hover:text-white"
    }`}
  >
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
        active ? "bg-black/10" : "bg-white/10 group-hover:bg-white/14"
      }`}
    >
      <i className={`${icon} text-[16px]`} />
    </div>
    <span className="text-[14px] font-extrabold tracking-[0.02em]">{label}</span>
  </button>
);

const MetricCard = ({ icon, iconWrap, label, value, hint, onClick, clickable = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-[26px] border border-black/6 bg-white px-4 py-4 text-left shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-all ${
      clickable
        ? "hover:-translate-y-0.5 hover:shadow-[0_22px_45px_rgba(15,23,42,0.08)] active:scale-[0.99]"
        : ""
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconWrap}`}
      >
        <i className={`${icon} text-[17px]`} />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[21px] font-black tracking-tight text-slate-800">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  </button>
);

const ProjectOverviewCard = ({ proyecto, totalGastado, totalOperativo = 0, totalManoObra = 0, index, onOpen }) => {
  const presupuesto = Number(proyecto?.presupuesto) || 0;
  const progress =
    presupuesto > 0 ? Math.min((totalGastado / presupuesto) * 100, 100) : 0;

  const status =
    progress >= 100 ? "FINALIZADO" : totalGastado > 0 ? "EN PROGRESO" : "PLANIFICADO";

  const progressBarClass = [
    "bg-sky-500",
    "bg-rose-500",
    "bg-emerald-500",
    "bg-amber-500",
  ][index % 4];

  const statusClass =
    status === "FINALIZADO"
      ? "bg-amber-100 text-amber-700"
      : status === "EN PROGRESO"
      ? "bg-[#FFF2D6] text-[#C98500]"
      : "bg-slate-100 text-slate-600";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] border border-black/6 bg-white p-4 text-left shadow-[0_18px_40px_rgba(15,23,42,0.045)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.07)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[14px] font-black text-slate-800">
            {proyecto?.nombre || "SIN NOMBRE"}
          </h4>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-slate-500">
            <i className="pi pi-map-marker text-[12px]" />
            <span className="truncate">
              {proyecto?.ubicacion || "Ubicación no registrada"}
            </span>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2 text-[12px] text-slate-600">
        <div className="flex items-center gap-2">
          <i className="pi pi-chart-line text-[12px]" />
          <span className="font-semibold">{progress.toFixed(2)}%</span>
        </div>
        <span className="font-bold text-slate-700">${money(totalGastado)}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${progressBarClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-black/5 bg-[#F9F9F6] px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Desglose
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
          <span>Operativo: ${money(totalOperativo)}</span>
          <span>M.O. pagada: ${money(totalManoObra)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold text-slate-500">Abrir proyecto</span>
        <i className="pi pi-angle-right text-[13px] text-slate-500" />
      </div>
    </button>
  );
};

const ExpenseMobileItem = ({ egreso, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full rounded-[22px] border border-black/6 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-500">{iso10(egreso?.fecha)}</p>
        <p className="mt-1 text-[14px] font-black text-slate-800">
          {egreso?.concepto || egreso?.categoria || "Sin descripción"}
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-500">
          {normalize(egreso?.proyecto || "SIN PROYECTO")}
        </p>
      </div>

      <div className="text-right">
        <p className="text-[15px] font-black text-slate-800">${money(egreso?.valor)}</p>
        <span
          className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${statusTone(
            egreso?.estado
          )}`}
        >
          {normalize(egreso?.estado || "PENDIENTE")}
        </span>
      </div>
    </div>
  </button>
);

const SectionCard = ({
  title,
  onTitleClick,
  action,
  children,
  compact = false,
  bodyClassName = "",
}) => (
  <div className="rounded-[28px] border border-black/6 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.045)]">
    <div className="flex items-center justify-between gap-4 border-b border-black/6 px-4 py-4 md:px-5">
      <button
        type="button"
        onClick={onTitleClick}
        className="flex items-center gap-2 text-left transition hover:text-[#C98500]"
      >
        <h3 className="text-[16px] font-black tracking-tight text-slate-800">{title}</h3>
        <i className="pi pi-angle-right text-[12px] text-slate-400" />
      </button>
      {action || null}
    </div>
    <div className={`${compact ? "p-4 md:p-4" : "p-4 md:p-5"} ${bodyClassName}`}>
      {children}
    </div>
  </div>
);

const PremiumCajaChicaMini = ({
  saldoCajaChicaTotal,
  ingresosCajaChicaTotal,
  gastosCajaChicaTotal,
  onOpen,
}) => {
  const base = Math.max(Number(ingresosCajaChicaTotal) || 0, 1);
  const gastoPct = percent(gastosCajaChicaTotal, base);
  const saldoPct = percent(saldoCajaChicaTotal, base);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-[26px] border border-black/6 bg-white text-left shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="border-b border-black/6 bg-[linear-gradient(135deg,#FFF7E8_0%,#FFFFFF_55%,#FFF1CC_100%)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C98500]">
              Caja Chica
            </p>
            <h3 className="mt-2 text-[24px] font-black tracking-tight text-slate-900">
              ${money(saldoCajaChicaTotal)}
            </h3>
            <p className="mt-1 text-[12px] font-semibold text-slate-500">
              Saldo actual disponible
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCB017]/15 text-[#C98500]">
            <i className="pi pi-credit-card text-[18px]" />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Disponible</span>
            <span>{saldoPct.toFixed(0)}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/80 shadow-inner">
            <div
              className="h-full rounded-full bg-[#FCB017]"
              style={{ width: `${saldoPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">
          <div className="flex items-center gap-2 text-green-700">
            <i className="pi pi-arrow-down-left text-[13px]" />
            <span className="text-[11px] font-black uppercase tracking-[0.12em]">
              Ingresos
            </span>
          </div>
          <p className="mt-2 text-[18px] font-black tracking-tight text-slate-800">
            ${money(ingresosCajaChicaTotal)}
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <i className="pi pi-arrow-up-right text-[13px]" />
            <span className="text-[11px] font-black uppercase tracking-[0.12em]">
              Gastos
            </span>
          </div>
          <p className="mt-2 text-[18px] font-black tracking-tight text-slate-800">
            ${money(gastosCajaChicaTotal)}
          </p>
        </div>

        <div className="col-span-2">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Nivel de gasto</span>
            <span>{gastoPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-red-400"
              style={{ width: `${gastoPct}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
};

const AdminDashboard = () => {
  const {
    logout,
    egresos,
    proyectos,
    personal,

    // egresos
    addEgreso,
    updateEgreso,
    deleteEgreso,

    // proyectos
    addProyecto,
    updateProyecto,
    deleteProyecto,
  } = useAppContext();

  const [seccionActiva, setSeccionActiva] = useState(null);

  // Modales egreso
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [idAEliminar, setIdAEliminar] = useState(null);

  // Modales proyecto
  const [showModalProyecto, setShowModalProyecto] = useState(false);
  const [editandoProyectoId, setEditandoProyectoId] = useState(null);
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);

  // UI
  const [toast, setToast] = useState({ show: false, mensaje: "", tipo: "exito" });
  const [modalExitoShow, setModalExitoShow] = useState({ show: false, mensaje: "" });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [resumenCajaChica, setResumenCajaChica] = useState({
    total_desembolsado: 0,
    total_gastado: 0,
    fondos_activos: 0,
    residentes_en_alerta: 0,
  });

  // filtros internos para otros módulos
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroResidente, setFiltroResidente] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCategoriaDashboard, setFiltroCategoriaDashboard] = useState("");

  const limpiarFiltros = () => {
    setFiltroProyecto("");
    setFiltroResidente("");
    setFiltroFecha("");
    setFiltroCategoriaDashboard("");
  };

  const mostrarExitoCentral = (mensaje) => {
    setModalExitoShow({ show: true, mensaje });
  };

  const irAlInicio = () => {
    limpiarFiltros();
    setSeccionActiva(null);
    setMobileSidebarOpen(false);
    setProfileMenuOpen(false);
  };

  const irASeccion = (seccion) => {
    if (seccion === "dashboard") {
      irAlInicio();
      return;
    }

    setSeccionActiva(seccion);
    setMobileSidebarOpen(false);
    setProfileMenuOpen(false);
  };

  const abrirProyectoDesdeDashboard = (proyectoNombre) => {
    setFiltroProyecto(normalize(proyectoNombre));
    setSeccionActiva("presupuesto");
    setMobileSidebarOpen(false);
  };

  const cargarResumenCajaChica = async () => {
    try {
      const { data, error } = await supabase
        .from("v_caja_chica_resumen")
        .select("*")
        .single();

      if (error) throw error;

      setResumenCajaChica({
        total_desembolsado: Number(data?.total_desembolsado || 0),
        total_gastado: Number(data?.total_gastado || 0),
        fondos_activos: Number(data?.fondos_activos || 0),
        residentes_en_alerta: Number(data?.residentes_en_alerta || 0),
      });
    } catch (error) {
      console.error("Error cargando resumen de caja chica:", error);
    }
  };

  useEffect(() => {
    cargarResumenCajaChica();
  }, [egresos, seccionActiva]);

  /* ===========================
     Egreso form
  =========================== */
  const initialEgreso = {
    proyecto: "",
    residente: "",
    fecha: iso10(new Date()),
    categoria: "",
    lugar: "",
    concepto: "",
    valor: "",
    metodoPago: "",
    pagadoPor: "ADMINISTRACIÓN",
    detalles: "",
    tieneFactura: false,
    archivoFactura: null,
    estado: "PENDIENTE",
    tipoRegistro: "EGRESO",
  };

  const [nuevoEgreso, setNuevoEgreso] = useState(initialEgreso);

  /* ===========================
     Proyecto form
  =========================== */
  const [nuevoProyectoData, setNuevoProyectoData] = useState({
    nombre: "",
    residente: "",
    presupuesto: "",
    dueno: "",
    ubicacion: "",
    tiempo: "",
  });

  /* ===========================
     Opciones
  =========================== */
  const opcionesProyectos = useMemo(() => {
    const fromProy = (proyectos || []).map((p) => p?.nombre).filter(Boolean);
    const fromEgr = (egresos || []).map((e) => e?.proyecto).filter(Boolean);
    return [...new Set([...fromProy, ...fromEgr])].map(normalize).filter(Boolean).sort();
  }, [proyectos, egresos]);

  const opcionesResidentes = useMemo(() => {
    const fromProy = (proyectos || [])
      .flatMap((p) => {
        const r1 = p?.residente ? [p.residente] : [];
        const r2 = Array.isArray(p?.residentes) ? p.residentes : [];
        return [...r1, ...r2];
      })
      .filter(Boolean);

    const fromEgr = (egresos || []).map((e) => e?.residente).filter(Boolean);

    return [...new Set([...fromProy, ...fromEgr])].map(normalize).filter(Boolean).sort();
  }, [proyectos, egresos]);

  /* ===========================
     Abrir/Cerrar modales
  =========================== */
  const prepararEdicion = (item) => {
    setEditandoId(item.id);
    setNuevoEgreso({
      ...initialEgreso,
      ...item,
      tieneFactura: item.factura === "si" || Boolean(item.tieneFactura),
      proyecto: normalize(item.proyecto),
      residente: normalize(item.residente),
      categoria: normalize(item.categoria),
      estado: normalize(item.estado || "PENDIENTE"),
      metodoPago: normalize(item.metodoPago),
      fecha: iso10(item.fecha),
    });
    setShowModalNuevo(true);
  };

  const cerrarModal = () => {
    setShowModalNuevo(false);
    setShowModalProyecto(false);
    setEditandoId(null);
    setEditandoProyectoId(null);
    setNuevoEgreso(initialEgreso);
    setNuevoProyectoData({
      nombre: "",
      residente: "",
      presupuesto: "",
      dueno: "",
      ubicacion: "",
      tiempo: "",
    });
  };

  /* ===========================
     Guardar egreso
  =========================== */
  const handleGuardarEgreso = async (e) => {
    e.preventDefault();

    try {
      const proyectoN = normalize(nuevoEgreso.proyecto);
      if (!proyectoN) {
        setToast({ show: true, mensaje: "SELECCIONA UN PROYECTO", tipo: "error" });
        return;
      }

      const proy = (proyectos || []).find((p) => normalize(p?.nombre) === proyectoN) || null;

      const responsable =
        (Array.isArray(proy?.residentes) && proy.residentes.length
          ? normalize(proy.residentes[0])
          : normalize(proy?.residente)) || "";

      const payload = {
        ...nuevoEgreso,
        proyecto: proyectoN,
        residente: responsable || normalize(nuevoEgreso.residente) || "ADMIN",
        fecha: iso10(nuevoEgreso.fecha),
        categoria: normalize(nuevoEgreso.categoria),
        lugar: String(nuevoEgreso.lugar || "").toUpperCase(),
        concepto: String(nuevoEgreso.concepto || "").toUpperCase(),
        detalles: String(nuevoEgreso.detalles || "").toUpperCase(),
        metodoPago: normalize(nuevoEgreso.metodoPago),
        pagadoPor: String(nuevoEgreso.pagadoPor || "ADMINISTRACIÓN").toUpperCase(),
        valor: Number(nuevoEgreso.valor) || 0,
        estado: normalize(nuevoEgreso.estado || "PENDIENTE"),
        factura: nuevoEgreso.tieneFactura ? "si" : "",
        tieneFactura: Boolean(nuevoEgreso.tieneFactura),
        tipoRegistro: "EGRESO",

        cargo: "",
        asistencia: {},
        numHorasExtras: 0,
        valoresPendientes: 0,
        descuentos: 0,
        asistio: undefined,
      };

      if (editandoId) {
        await updateEgreso(editandoId, payload);
        mostrarExitoCentral("REGISTRO ACTUALIZADO");
      } else {
        await addEgreso(payload);
        mostrarExitoCentral("EGRESO REGISTRADO");
      }

      await cargarResumenCajaChica();
      cerrarModal();
    } catch (error) {
      console.error("Error guardando egreso:", error);
      setToast({ show: true, mensaje: "NO SE PUDO GUARDAR EL EGRESO", tipo: "error" });
    }
  };

  const eliminarRegistro = async () => {
    try {
      await deleteEgreso(idAEliminar);
      setIdAEliminar(null);
      mostrarExitoCentral("REGISTRO ANULADO");
      await cargarResumenCajaChica();
    } catch (error) {
      console.error("Error anulando egreso:", error);
      setToast({ show: true, mensaje: "NO SE PUDO ANULAR EL EGRESO", tipo: "error" });
    }
  };

  /* ===========================
     Guardar proyecto
  =========================== */
  const handleGuardarProyecto = async (e) => {
    e.preventDefault();

    try {
      const nombre = normalize(nuevoProyectoData.nombre);
      if (!nombre) return;

      const dueno = normalize(nuevoProyectoData.dueno);
      const ubicacion = normalize(nuevoProyectoData.ubicacion);
      const tiempo = normalize(nuevoProyectoData.tiempo);
      const residente = normalize(nuevoProyectoData.residente);

      const nombreYaExiste = (proyectos || []).some((p) => {
        const same = normalize(p?.nombre) === nombre;
        if (!same) return false;
        if (editandoProyectoId && p?.id === editandoProyectoId) return false;
        return true;
      });

      if (nombreYaExiste) {
        setToast({ show: true, mensaje: "YA EXISTE UN PROYECTO CON ESE NOMBRE", tipo: "error" });
        return;
      }

      const residentRoleAllow = new Set([
        "RESIDENTE",
        "INGENIERO",
        "INGENIERA",
        "ARQUITECTO",
        "ARQUITECTA",
        "ING.",
        "ING",
        "ARQ",
        "ARQ.",
      ]);

      const cargoHints = ["RESIDENTE", "ING", "ING.", "INGENIERO", "ARQUITECTO", "ARQ", "ARQ."];

      const residentesPermitidos = (personal || [])
        .filter((p) => {
          const rol = String(p.rol || "").toUpperCase().trim();
          const cargo = String(p.cargo || "").toUpperCase();

          if (rol) return residentRoleAllow.has(rol);
          return cargoHints.some((h) => cargo.includes(h));
        })
        .map((p) => normalize(p.nombre))
        .filter(Boolean);

      const residentesSet = new Set(residentesPermitidos);

      if (residente && !residentesSet.has(residente)) {
        setToast({
          show: true,
          mensaje: "RESIDENTE NO VÁLIDO. SELECCIONA UNO DE LA LISTA",
          tipo: "error",
        });
        return;
      }

      const proyectoFinal = {
        nombre,
        residente,
        dueno,
        ubicacion,
        tiempo,
        presupuesto: Number(nuevoProyectoData.presupuesto) || 0,
      };

      if (editandoProyectoId) {
        await updateProyecto(editandoProyectoId, proyectoFinal);
        mostrarExitoCentral("PROYECTO ACTUALIZADO");
      } else {
        await addProyecto(proyectoFinal);
        mostrarExitoCentral("PROYECTO CREADO");
      }

      cerrarModal();
    } catch (error) {
      console.error("Error guardando proyecto:", error);

      if (error?.code === "23505") {
        setToast({
          show: true,
          mensaje: "YA EXISTE UN PROYECTO CON ESE NOMBRE",
          tipo: "error",
        });
        return;
      }

      setToast({ show: true, mensaje: "NO SE PUDO GUARDAR EL PROYECTO", tipo: "error" });
    }
  };

  const prepararEdicionProyecto = (proy) => {
    setEditandoProyectoId(proy?.id);
    setNuevoProyectoData({ ...proy });
    setShowModalProyecto(true);
  };

  const solicitarEliminarProyecto = (proyecto) => setProyectoAEliminar(proyecto);

  const ejecutarEliminacionProyecto = async () => {
    try {
      await deleteProyecto(proyectoAEliminar?.id);
      setProyectoAEliminar(null);
      mostrarExitoCentral("PROYECTO ELIMINADO");
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      setToast({ show: true, mensaje: "NO SE PUDO ELIMINAR EL PROYECTO", tipo: "error" });
    }
  };

  /* ===========================
     Dashboard data
  =========================== */
  const egresosDelMes = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    return (egresos || []).reduce((acc, e) => {
      const f = e?.fecha ? new Date(e.fecha) : null;
      if (!f || Number.isNaN(f.getTime())) return acc;
      if (f.getFullYear() !== y || f.getMonth() !== m) return acc;
      if (!shouldCountOperationalTotals(e)) return acc;
      return acc + (Number(e?.valor) || 0);
    }, 0);
  }, [egresos]);

  const manoObraPagadaMes = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    return (egresos || []).reduce((acc, e) => {
      const f = e?.fecha ? new Date(e.fecha) : null;
      if (!f || Number.isNaN(f.getTime())) return acc;
      if (f.getFullYear() !== y || f.getMonth() !== m) return acc;
      if (!shouldCountPayrollPaidTotals(e)) return acc;
      return acc + (Number(e?.valor) || 0);
    }, 0);
  }, [egresos]);

  const totalCajaChicaDashboard = Number(resumenCajaChica.total_desembolsado || 0);
  const gastosCajaChicaDashboard = Number(resumenCajaChica.total_gastado || 0);

  const personalEnObra = useMemo(() => {
    return (personal || []).filter((p) => normalize(p?.estado || "ACTIVO") === "ACTIVO").length;
  }, [personal]);

  const proyectosConMeta = useMemo(() => {
    return (proyectos || []).map((p) => {
      const totalOperativo = (egresos || []).reduce((acc, e) => {
        if (normalize(e?.proyecto) !== normalize(p?.nombre)) return acc;
        if (!shouldCountOperationalTotals(e)) return acc;
        return acc + (Number(e?.valor) || 0);
      }, 0);

      const totalManoObraPagada = (egresos || []).reduce((acc, e) => {
        if (normalize(e?.proyecto) !== normalize(p?.nombre)) return acc;
        if (!shouldCountPayrollPaidTotals(e)) return acc;
        return acc + (Number(e?.valor) || 0);
      }, 0);

      return {
        ...p,
        totalOperativo,
        totalManoObraPagada,
        totalGastado: totalOperativo + totalManoObraPagada,
      };
    });
  }, [proyectos, egresos]);

  const dashboardEgresos = useMemo(() => {
  return (egresos || [])
    .filter((item) => isOperationalExpense(item))
    .filter((item) => {
      const okProyecto =
        filtroProyecto === "" || normalize(item?.proyecto) === normalize(filtroProyecto);

      const okResidente =
        filtroResidente === "" ||
        normalize(item?.residente) === normalize(filtroResidente);

      const okFecha = filtroFecha === "" || iso10(item?.fecha) === iso10(filtroFecha);

      const okCategoria =
        filtroCategoriaDashboard === "" ||
        normalize(item?.categoria) === normalize(filtroCategoriaDashboard);

      return okProyecto && okResidente && okFecha && okCategoria;
    })
    .sort((a, b) => String(b?.fecha || "").localeCompare(String(a?.fecha || "")));
}, [egresos, filtroProyecto, filtroResidente, filtroFecha, filtroCategoriaDashboard]);

  const proyectosDashboard = useMemo(() => {
    return (proyectosConMeta || []).slice(0, 3);
  }, [proyectosConMeta]);

  const totalFiltrado = useMemo(() => {
  return (dashboardEgresos || []).reduce((acc, e) => {
    if (!shouldCountOperationalTotals(e)) return acc;
    return acc + (Number(e?.valor) || 0);
  }, 0);
}, [dashboardEgresos]);

  /* ===========================
     Render content by section
  =========================== */
  const currentSection = seccionActiva || "dashboard";

  const renderDashboardHome = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="pi pi-building"
          iconWrap="bg-[#FFF2D6] text-[#C98500]"
          label="Proyectos Activos"
          value={`${proyectos.length}`}
          hint="Resumen general"
          onClick={() => irASeccion("presupuesto")}
          clickable
        />

        <MetricCard
          icon="pi pi-wallet"
          iconWrap="bg-[#FFF2D6] text-[#C98500]"
          label="Egresos Operativos"
          value={`$${money(egresosDelMes)}`}
          hint="Sin mano de obra"
          onClick={() => irASeccion("informes")}
          clickable
        />

        <MetricCard
          icon="pi pi-credit-card"
          iconWrap="bg-green-100 text-green-700"
          label="Caja Chica"
          value={`$${money2(totalCajaChicaDashboard)}`}
          hint={`Gastado: $${money2(gastosCajaChicaDashboard)}`}
          onClick={() => irASeccion("cajaChica")}
          clickable
        />

        <MetricCard
          icon="pi pi-users"
          iconWrap="bg-amber-100 text-amber-700"
          label="Mano de Obra Pagada"
          value={`$${money(manoObraPagadaMes)}`}
          hint={`${personalEnObra} colaboradores activos`}
          onClick={() => irASeccion("manoDeObra")}
          clickable
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-4">
          <SectionCard
            title="Proyectos en Curso"
            onTitleClick={() => irASeccion("presupuesto")}
            compact
            action={
              <>
                <button
                  type="button"
                  onClick={() => setShowModalProyecto(true)}
                  className="hidden rounded-2xl bg-[#FCB017] px-5 py-2.5 text-[13px] font-black text-white transition hover:bg-[#E29A08] md:block"
                >
                  + Nuevo Proyecto
                </button>

                <button
                  type="button"
                  onClick={() => setShowModalProyecto(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCB017] text-white transition hover:bg-[#E29A08] md:hidden"
                  aria-label="Nuevo proyecto"
                  title="Nuevo proyecto"
                >
                  <i className="pi pi-plus text-[14px]" />
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {proyectosDashboard.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-black/10 px-4 py-10 text-center">
                  <p className="text-[13px] font-bold text-slate-500">
                    No hay proyectos para mostrar.
                  </p>
                </div>
              ) : (
                proyectosDashboard.map((p, index) => (
                  <ProjectOverviewCard
                    key={p?.id || p?.nombre}
                    proyecto={p}
                    totalGastado={p?.totalGastado || 0}
                    totalOperativo={p?.totalOperativo || 0}
                    totalManoObra={p?.totalManoObraPagada || 0}
                    index={index}
                    onOpen={() => abrirProyectoDesdeDashboard(p?.nombre)}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <div className="overflow-hidden rounded-[28px] border border-black/6 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.045)]">
            <div className="flex items-center justify-between gap-4 border-b border-black/6 px-4 py-4 md:px-5">
              <button
                type="button"
                onClick={() => irASeccion("informes")}
                className="flex items-center gap-2 text-left transition hover:text-[#C98500]"
              >
                <div>
                  <h3 className="text-[16px] font-black tracking-tight text-slate-800">
                    Egresos Operativos Recientes
                  </h3>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">
                    Total: <span className="text-slate-800">${money(totalFiltrado)}</span>
                  </p>
                </div>
                <i className="pi pi-angle-right text-[12px] text-slate-400" />
              </button>

              <>
                <button
                  type="button"
                  onClick={() => setShowModalNuevo(true)}
                  className="hidden rounded-2xl bg-[#FCB017] px-5 py-2.5 text-[13px] font-black text-white transition hover:bg-[#E29A08] md:block"
                >
                  + Nuevo Egreso
                </button>

                <button
                  type="button"
                  onClick={() => setShowModalNuevo(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCB017] text-white transition hover:bg-[#E29A08] md:hidden"
                  aria-label="Nuevo egreso"
                  title="Nuevo egreso"
                >
                  <i className="pi pi-plus text-[14px]" />
                </button>
              </>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-black/6 bg-slate-50/70">
                        <th className="px-5 py-3 text-left text-[12px] font-black text-slate-500">
                          Fecha
                        </th>
                        <th className="px-5 py-3 text-left text-[12px] font-black text-slate-500">
                          Descripción
                        </th>
                        <th className="px-5 py-3 text-left text-[12px] font-black text-slate-500">
                          Monto
                        </th>
                        <th className="px-5 py-3 text-left text-[12px] font-black text-slate-500">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboardEgresos.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-5 py-8 text-center text-[13px] font-bold text-slate-500"
                          >
                            No hay egresos operativos recientes.
                          </td>
                        </tr>
                      ) : (
                        dashboardEgresos.map((e) => (
                          <tr
                            key={e.id}
                            className="cursor-pointer border-b border-black/6 last:border-b-0 hover:bg-slate-50/50"
                            onClick={() => irASeccion("informes")}
                          >
                            <td className="px-5 py-3 text-[13px] font-semibold text-slate-700">
                              {iso10(e?.fecha)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                  <i className="pi pi-file text-[12px]" />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700">
                                  {e?.concepto || e?.categoria || "Sin descripción"}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[13px] font-extrabold text-slate-800">
                              ${money(e?.valor)}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold ${statusTone(
                                  e?.estado
                                )}`}
                              >
                                {normalize(e?.estado || "PENDIENTE")}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {dashboardEgresos.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-black/10 bg-white px-4 py-10 text-center">
                    <p className="text-[13px] font-bold text-slate-500">
                      No hay egresos operativos recientes.
                    </p>
                  </div>
                ) : (
                  dashboardEgresos.map((e) => (
                    <ExpenseMobileItem
                      key={e.id}
                      egreso={e}
                      onOpen={() => irASeccion("informes")}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div />
      </div>
    </div>
  );

  const renderSectionContent = () => {
    if (currentSection === "dashboard") return renderDashboardHome();

    if (currentSection === "informes") {
      return (
        <InformeEgresos
          egresos={dashboardEgresos}
          filtroProyecto={filtroProyecto}
          setFiltroProyecto={setFiltroProyecto}
          filtroResidente={filtroResidente}
          setFiltroResidente={setFiltroResidente}
          filtroFecha={filtroFecha}
          setFiltroFecha={setFiltroFecha}
          opcionesProyectos={opcionesProyectos}
          opcionesResidentes={opcionesResidentes}
          limpiarFiltros={limpiarFiltros}
          prepararEdicion={prepararEdicion}
          setIdAEliminar={setIdAEliminar}
          setEgresoSeleccionado={() => {}}
          editandoId={editandoId}
          totalFiltrado={totalFiltrado}
          onBack={() => setSeccionActiva(null)}
          onNuevoEgreso={() => setShowModalNuevo(true)}
        />
      );
    }

    if (currentSection === "manoDeObra") {
      return <ManoObraCard onBack={() => setSeccionActiva(null)} />;
    }

    if (currentSection === "presupuesto") {
      return (
        <GestionProyectos
          proyectos={proyectos}
          egresos={egresos}
          onEdit={prepararEdicionProyecto}
          onDelete={solicitarEliminarProyecto}
          onBack={() => setSeccionActiva(null)}
          onNew={() => setShowModalProyecto(true)}
        />
      );
    }

    if (currentSection === "gestionPersonal") {
      return <GestionPersonal onBack={() => setSeccionActiva(null)} />;
    }

    if (currentSection === "cajaChica") {
      return <CajaChicaView onBack={() => setSeccionActiva(null)} />;
    }

    return renderDashboardHome();
  };

  const navItems = [
    { id: "dashboard", label: "Inicio", icon: "pi pi-home" },
    { id: "presupuesto", label: "Proyectos", icon: "pi pi-briefcase" },
    { id: "informes", label: "Egresos", icon: "pi pi-wallet" },
    { id: "gestionPersonal", label: "Personal", icon: "pi pi-users" },
    { id: "cajaChica", label: "Caja Chica", icon: "pi pi-credit-card" },
    { id: "manoDeObra", label: "Mano de Obra", icon: "pi pi-chart-line" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F1] p-0 md:p-4">
      <div className="mx-auto max-w-[1600px] overflow-hidden border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.07)] md:rounded-[28px] lg:min-h-[calc(100vh-2rem)] lg:grid lg:grid-cols-[265px_minmax(0,1fr)]">
        {/* Sidebar Desktop */}
        <aside className="hidden bg-[#FCB017] text-white lg:flex lg:min-h-full lg:flex-col">
          <div className="border-b border-white/15 px-4 py-4">
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={irAlInicio}
                className="rounded-2xl p-2 transition hover:bg-white/10"
                aria-label="Ir al inicio"
                title="Ir al inicio"
              >
                <img
                  src={logo}
                  alt="Blendfort"
                  className="h-14 w-auto object-contain"
                />
              </button>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="space-y-2">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  active={
                    (item.id === "dashboard" && currentSection === "dashboard") ||
                    currentSection === item.id
                  }
                  icon={item.icon}
                  label={item.label}
                  onClick={() => irASeccion(item.id)}
                />
              ))}

              <SidebarItem
                active={false}
                icon="pi pi-cog"
                label="Configuración"
                onClick={() =>
                  setToast({
                    show: true,
                    mensaje: "CONFIGURACIÓN PRÓXIMAMENTE",
                    tipo: "info",
                  })
                }
              />
            </div>
          </div>

          <div className="border-t border-white/15 px-4 py-4">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-between rounded-2xl bg-black/10 px-4 py-3 text-white transition hover:bg-black/15"
            >
              <div className="flex items-center gap-3">
                <i className="pi pi-sign-out text-[17px]" />
                <span className="text-[14px] font-bold">Salir</span>
              </div>
              <i className="pi pi-angle-left text-[13px]" />
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="min-w-0 bg-[#F6F6F1] lg:flex lg:min-h-full lg:flex-col">
          {/* Mobile topbar */}
          <div className="sticky top-0 z-40 border-b border-black/5 bg-white px-4 py-3 lg:hidden">
            <div className="grid grid-cols-[40px_1fr_40px] items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/8 bg-white text-slate-700"
              >
                <i className="pi pi-bars text-[16px]" />
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={irAlInicio}
                  className="rounded-2xl p-1 transition hover:bg-slate-50"
                  aria-label="Ir al inicio"
                  title="Ir al inicio"
                >
                  <img src={logo} alt="Blendfort" className="h-14 w-auto object-contain" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="justify-self-end flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600"
              >
                <i className="pi pi-user text-[15px]" />
              </button>
            </div>

            {profileMenuOpen && (
              <div className="absolute right-4 top-[62px] z-50 min-w-[190px] rounded-[22px] border border-black/6 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setToast({
                      show: true,
                      mensaje: "PERFIL PRÓXIMAMENTE",
                      tipo: "info",
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <i className="pi pi-user" />
                  Perfil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setToast({
                      show: true,
                      mensaje: "CONFIGURACIÓN PRÓXIMAMENTE",
                      tipo: "info",
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <i className="pi pi-cog" />
                  Configuración
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold text-red-600 hover:bg-red-50"
                >
                  <i className="pi pi-sign-out" />
                  Salir
                </button>
              </div>
            )}
          </div>

          {/* Desktop topbar */}
          <div className="hidden border-b border-black/5 bg-white px-4 py-4 md:px-6 lg:block">
            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-3 text-slate-500">
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      show: true,
                      mensaje: "NOTIFICACIONES PRÓXIMAMENTE",
                      tipo: "info",
                    })
                  }
                  className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
                >
                  <i className="pi pi-bell text-[16px]" />
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#FCB017]" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      show: true,
                      mensaje: "MENSAJES PRÓXIMAMENTE",
                      tipo: "info",
                    })
                  }
                  className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
                >
                  <i className="pi pi-comments text-[16px]" />
                  <span className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    3
                  </span>
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-2xl border border-black/6 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                    <i className="pi pi-user text-[16px]" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[14px] font-black text-slate-800">Administrador</p>
                  </div>
                  <i className="pi pi-angle-down text-[12px] text-slate-500" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-[56px] z-50 min-w-[220px] rounded-[22px] border border-black/6 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setToast({
                          show: true,
                          mensaje: "PERFIL PRÓXIMAMENTE",
                          tipo: "info",
                        });
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <i className="pi pi-user" />
                      Perfil
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setToast({
                          show: true,
                          mensaje: "CONFIGURACIÓN PRÓXIMAMENTE",
                          tipo: "info",
                        });
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <i className="pi pi-cog" />
                      Configuración
                    </button>

                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold text-red-600 hover:bg-red-50"
                    >
                      <i className="pi pi-sign-out" />
                      Salir
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="p-4 md:p-6">{renderSectionContent()}</main>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        visible={mobileSidebarOpen}
        onHide={() => setMobileSidebarOpen(false)}
        position="left"
        showCloseIcon={false}
        className="!w-[86vw] !max-w-[340px] !border-none !bg-[#FCB017] !p-0"
        content={({ closeIconRef, hide }) => (
          <div className="flex h-full flex-col bg-[#FCB017] text-white">
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-4">
              <button
                type="button"
                onClick={irAlInicio}
                className="rounded-2xl p-1 transition hover:bg-white/10"
                aria-label="Ir al inicio"
                title="Ir al inicio"
              >
                <img
                  src={logo}
                  alt="Blendfort"
                  className="h-14 w-auto object-contain brightness-[10]"
                />
              </button>

              <button
                ref={closeIconRef}
                type="button"
                onClick={hide}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10 text-white"
              >
                <i className="pi pi-times text-[16px]" />
              </button>
            </div>

            <div className="flex-1 px-4 py-4">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    active={
                      (item.id === "dashboard" && currentSection === "dashboard") ||
                      currentSection === item.id
                    }
                    icon={item.icon}
                    label={item.label}
                    onClick={() => irASeccion(item.id)}
                  />
                ))}

                <SidebarItem
                  active={false}
                  icon="pi pi-cog"
                  label="Configuración"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    setToast({
                      show: true,
                      mensaje: "CONFIGURACIÓN PRÓXIMAMENTE",
                      tipo: "info",
                    });
                  }}
                />
              </div>
            </div>

            <div className="border-t border-white/15 px-4 py-4">
              <div className="mb-4 flex items-center gap-3 rounded-2xl bg-black/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                  <i className="pi pi-user text-[15px]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-white">Administrador</p>
                  <p className="truncate text-[12px] text-white/80">Blendfort</p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-between rounded-2xl bg-black/10 px-4 py-3 text-white transition hover:bg-black/15"
              >
                <div className="flex items-center gap-3">
                  <i className="pi pi-sign-out text-[17px]" />
                  <span className="text-[14px] font-bold">Salir</span>
                </div>
                <i className="pi pi-angle-left text-[13px]" />
              </button>
            </div>
          </div>
        )}
      />

      <ModalProyecto
        show={showModalProyecto}
        onClose={cerrarModal}
        onSave={handleGuardarProyecto}
        data={nuevoProyectoData}
        setData={setNuevoProyectoData}
        mensajeExito={false}
      />

      <ModalEgreso
        show={showModalNuevo}
        onClose={cerrarModal}
        onSave={handleGuardarEgreso}
        editandoId={editandoId}
        nuevoEgreso={nuevoEgreso}
        setNuevoEgreso={setNuevoEgreso}
        opcionesProyectos={opcionesProyectos}
        opcionesCategorias={[
          "FERRETERIA",
          "MAQUINARIA",
          "PAPELERIA",
          "TRAMITES",
          "TRANSPORTE",
          "ASERRADERO",
          "OFICINA",
          "MANO DE OBRA",
        ]}
      />

      <ModalConfirmar
        id={idAEliminar}
        onConfirm={eliminarRegistro}
        onCancel={() => setIdAEliminar(null)}
      />

      {proyectoAEliminar && (
        <ModalConfirmar
          id={proyectoAEliminar?.nombre}
          onConfirm={ejecutarEliminacionProyecto}
          onCancel={() => setProyectoAEliminar(null)}
        />
      )}

      <ModalExito
        show={modalExitoShow.show}
        mensaje={modalExitoShow.mensaje}
        onClose={() => setModalExitoShow({ show: false, mensaje: "" })}
      />

      {toast.show && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast((t) => ({ ...t, show: false }))}
        />
      )}
    </div>
  );
};

export default AdminDashboard;