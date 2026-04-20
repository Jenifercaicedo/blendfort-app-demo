import React, { useMemo, useState, useEffect } from "react";
import logo from "../assets/blendfort-logo-largo.png";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

import TablaEgresos from "../components/TablaEgresos";
import ModalConfirmar from "../components/ModalConfirmar";
import ModalEgreso from "../components/ModalEgreso";
import ModalExito from "../components/ModalExito";
import ReporteDiarioModal from "../components/ReporteDiarioModal";
import ReporteDiarioListaModal from "../components/ReporteDiarioListaModal";
import CustomSelect from "../components/CustomSelect";
import ResidentManoObraModal from "../components/ResidentManoObraModal";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const iso10 = (d) => String(d || "").slice(0, 10);
const hoyISO = () => new Date().toISOString().slice(0, 10);

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const estadoCajaTone = (estado) => {
  const e = normalize(estado);
  if (e === "DISPONIBLE") return "text-green-700 bg-green-50 border-green-200";
  if (e === "POR AGOTARSE") return "text-amber-700 bg-amber-50 border-amber-200";
  if (e === "AGOTADA") return "text-red-700 bg-red-50 border-red-200";
  if (e === "EXCEDIDA") return "text-red-800 bg-red-100 border-red-200";
  return "text-slate-600 bg-slate-100 border-slate-200";
};

const RESUMEN_CAJA_DEFAULT = {
  existe: false,
  montoActualAsignado: 0,
  gastadoActual: 0,
  saldoActual: 0,
  estado: "SIN FONDO",
  fechaUltimoDesembolso: "",
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

const ActionButton = ({
  onClick,
  children,
  icon,
  dark = false,
  accent = false,
  disabled = false,
  className = "",
  type = "button",
}) => {
  const tone = accent
    ? "bg-[#FCB017] text-white hover:bg-slate-800"
    : dark
    ? "bg-slate-800 text-white hover:bg-[#FCB017]"
    : "bg-white text-slate-700 border border-black/10 hover:border-[#FCB017] hover:text-[#C98500]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold transition-all active:scale-95 shadow-sm ${tone} ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${className}`}
    >
      {icon ? <i className={`${icon} text-[11px]`} /> : null}
      <span>{children}</span>
    </button>
  );
};

const ResidentDashboard = () => {
  const {
    nombreUsuario,
    logout,
    egresos,
    personal,
    getProyectosAsignados,
    addEgreso,
    updateEgreso,
    deleteEgreso,
    canEditEgreso,
    canDeleteEgreso,
  } = useAppContext();

  const proyectosAsignados = useMemo(() => {
    return (getProyectosAsignados?.(nombreUsuario) || [])
      .map(normalize)
      .filter(Boolean);
  }, [getProyectosAsignados, nombreUsuario]);

  const [proyectoActivo, setProyectoActivo] = useState("");

  useEffect(() => {
    if (!proyectosAsignados.length) {
      setProyectoActivo("");
      return;
    }

    setProyectoActivo((prev) =>
      prev && proyectosAsignados.includes(prev) ? prev : proyectosAsignados[0]
    );
  }, [proyectosAsignados]);

  const multiProyecto = proyectosAsignados.length > 1;
  const proyectoActivoFinal = proyectoActivo || proyectosAsignados[0] || "";
  const tieneProyectosAsignados = proyectosAsignados.length > 0;

  const canEditLocal = useMemo(() => {
    return (reg) => {
      const me = normalize(nombreUsuario);

      const creadoPorRol = normalize(reg?.creadoPorRol || reg?.creado_por_rol);
      if (creadoPorRol === "ADMIN") return false;

      const creadoPor = normalize(reg?.creadoPor || reg?.creado_por);
      if (creadoPor) return creadoPor === me;

      const residente = normalize(reg?.residente);
      return residente === me;
    };
  }, [nombreUsuario]);

  const canEdit = (reg) =>
    typeof canEditEgreso === "function" ? canEditEgreso(reg) : canEditLocal(reg);

  const canDelete = (reg) =>
    typeof canDeleteEgreso === "function" ? canDeleteEgreso(reg) : canEditLocal(reg);

  const [showFiltros, setShowFiltros] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const hayFiltros = useMemo(
    () => Boolean(filtroCategoria || filtroFecha),
    [filtroCategoria, filtroFecha]
  );

  const limpiarFiltros = () => {
    setFiltroCategoria("");
    setFiltroFecha("");
  };

  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [idAEliminar, setIdAEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [showReporteDiario, setShowReporteDiario] = useState(false);
  const [showReporteDiarioLista, setShowReporteDiarioLista] = useState(false);
  const [showManoObraModal, setShowManoObraModal] = useState(false);

  const [modalExito, setModalExito] = useState({ show: false, mensaje: "" });
  const mostrarExito = (mensaje) => setModalExito({ show: true, mensaje });

  const [resumenCajaChica, setResumenCajaChica] = useState(RESUMEN_CAJA_DEFAULT);

  useEffect(() => {
    let active = true;

    const cargarResumenCajaChica = async () => {
      if (!nombreUsuario) {
        if (active) setResumenCajaChica(RESUMEN_CAJA_DEFAULT);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("v_caja_chica_residente_resumen")
          .select(
            "monto_actual_asignado, gastado_actual, saldo_actual, estado, fecha_ultimo_desembolso"
          )
          .eq("residente_key", normalize(nombreUsuario))
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        if (!data) {
          setResumenCajaChica(RESUMEN_CAJA_DEFAULT);
          return;
        }

        setResumenCajaChica({
          existe: true,
          montoActualAsignado: Number(data?.monto_actual_asignado || 0),
          gastadoActual: Number(data?.gastado_actual || 0),
          saldoActual: Number(data?.saldo_actual || 0),
          estado: normalize(data?.estado || "SIN FONDO"),
          fechaUltimoDesembolso: data?.fecha_ultimo_desembolso || "",
        });
      } catch (error) {
        console.error("Error cargando resumen de caja chica residente:", error);
        if (active) setResumenCajaChica(RESUMEN_CAJA_DEFAULT);
      }
    };

    cargarResumenCajaChica();

    return () => {
      active = false;
    };
  }, [nombreUsuario, egresos]);

  const initialForm = {
    proyecto: "",
    lugar: "",
    residente: "",
    fecha: "",
    valor: "",
    metodoPago: "",
    pagadoPor: "ADMINISTRACIÓN",
    categoria: "",
    concepto: "",
    detalles: "",
    tieneFactura: false,
    estado: "Pendiente",
    tipoRegistro: "EGRESO",
  };

  const [nuevoEgreso, setNuevoEgreso] = useState(initialForm);

  const opcionesCategorias = useMemo(
    () => [
      "FERRETERIA",
      "MAQUINARIA",
      "PAPELERIA",
      "TRAMITES",
      "TRANSPORTE",
      "ASERRADERO",
      "MANO DE OBRA",
    ],
    []
  );

  const registrosProyecto = useMemo(() => {
    const allowed = new Set(proyectosAsignados.map(normalize));
    return (egresos || []).filter((e) => allowed.has(normalize(e?.proyecto)));
  }, [egresos, proyectosAsignados]);

  const registrosScope = useMemo(() => {
    if (!proyectoActivoFinal) return registrosProyecto;
    return registrosProyecto.filter(
      (e) => normalize(e?.proyecto) === normalize(proyectoActivoFinal)
    );
  }, [registrosProyecto, proyectoActivoFinal]);

  const registrosFiltrados = useMemo(() => {
    return registrosScope.filter((reg) => {
      const coincideCat =
        filtroCategoria === "" ||
        normalize(reg?.categoria) === normalize(filtroCategoria);

      const coincideFecha =
        filtroFecha === "" || iso10(reg?.fecha) === iso10(filtroFecha);

      return coincideCat && coincideFecha;
    });
  }, [registrosScope, filtroCategoria, filtroFecha]);

  const totalMes = useMemo(() => {
    return (registrosScope || []).reduce((acc, curr) => {
      const cat = normalize(curr?.categoria);
      const est = normalize(curr?.estado || "PENDIENTE");

      const esMO = cat === "MANO DE OBRA";
      const moPagada = est === "PAGADO" || est === "COMPLETADO";

      if (esMO && !moPagada) return acc;

      return acc + (Number(curr?.valor) || 0);
    }, 0);
  }, [registrosScope]);

  const personalProyectoActivo = useMemo(() => {
    if (!proyectoActivoFinal) return [];

    return (personal || []).filter(
      (p) => normalize(p?.proyecto) === normalize(proyectoActivoFinal)
    );
  }, [personal, proyectoActivoFinal]);

  const registrosManoObraProyecto = useMemo(() => {
    return (registrosScope || []).filter(
      (reg) => normalize(reg?.categoria) === "MANO DE OBRA"
    );
  }, [registrosScope]);

  const saldoCajaNegativo = Number(resumenCajaChica?.saldoActual || 0) < 0;
  const cajaExcedida =
    normalize(resumenCajaChica?.estado) === "EXCEDIDA" || saldoCajaNegativo;

  const abrirModalNuevo = () => {
    setEditandoId(null);
    setNuevoEgreso({
      ...initialForm,
      residente: nombreUsuario,
      proyecto: proyectoActivoFinal,
      fecha: hoyISO(),
      estado: "PENDIENTE",
      tipoRegistro: "EGRESO",
    });
    setShowModalNuevo(true);
  };

  const abrirReporteLista = () => {
    if (!tieneProyectosAsignados || !proyectoActivoFinal) {
      mostrarExito("NO TIENES UN PROYECTO ACTIVO ASIGNADO");
      return;
    }

    setShowReporteDiario(false);
    setShowReporteDiarioLista(true);
  };

  const abrirReporteIndividual = () => {
    if (!tieneProyectosAsignados || !proyectoActivoFinal) {
      mostrarExito("NO TIENES UN PROYECTO ACTIVO ASIGNADO");
      return;
    }

    setShowReporteDiarioLista(false);
    setShowReporteDiario(true);
  };

  const abrirManoObra = () => {
    if (!tieneProyectosAsignados || !proyectoActivoFinal) {
      mostrarExito("NO TIENES UN PROYECTO ACTIVO ASIGNADO");
      return;
    }

    setShowManoObraModal(true);
  };

  const onEditSafe = (reg) => {
    if (!canEdit(reg)) {
      mostrarExito("NO PUEDES EDITAR REGISTROS QUE NO CREASTE");
      return;
    }

    setEditandoId(reg.id);
    setNuevoEgreso({
      ...initialForm,
      ...reg,
      proyecto: normalize(reg.proyecto),
      residente: normalize(reg.residente || nombreUsuario),
      fecha: iso10(reg.fecha),
      categoria: normalize(reg.categoria),
      metodoPago: normalize(reg.metodoPago),
      estado: normalize(reg.estado || "PENDIENTE"),
      tipoRegistro: "EGRESO",
    });
    setShowModalNuevo(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    try {
      const proyectoFinal = normalize(
        multiProyecto
          ? nuevoEgreso.proyecto || proyectoActivoFinal || proyectosAsignados[0] || ""
          : proyectoActivoFinal || proyectosAsignados[0] || ""
      );

      const categoriaFinal = normalize(nuevoEgreso.categoria);

      const fuenteFondosFinal =
        categoriaFinal === "MANO DE OBRA" ? "GENERAL" : "CAJA_CHICA";

      const payload = {
        ...nuevoEgreso,
        proyecto: proyectoFinal,
        residente: normalize(nombreUsuario),
        fecha: iso10(nuevoEgreso.fecha),
        categoria: categoriaFinal,
        lugar: String(nuevoEgreso.lugar || "").toUpperCase(),
        concepto: String(nuevoEgreso.concepto || "").toUpperCase(),
        detalles: String(nuevoEgreso.detalles || "").toUpperCase(),
        metodoPago: normalize(nuevoEgreso.metodoPago),
        pagadoPor: String(nuevoEgreso.pagadoPor || "ADMINISTRACIÓN").toUpperCase(),
        estado: normalize(nuevoEgreso.estado || "PENDIENTE"),
        valor: Number(nuevoEgreso.valor) || 0,
        tieneFactura: Boolean(nuevoEgreso.tieneFactura),
        tipoRegistro: "EGRESO",
        fuenteFondos: fuenteFondosFinal,
      };

      if (editandoId) {
        await updateEgreso(editandoId, payload);
        mostrarExito("EGRESO ACTUALIZADO");
      } else {
        await addEgreso(payload);
        mostrarExito("EGRESO REGISTRADO");
      }

      setShowModalNuevo(false);
    } catch (error) {
      console.error("Error guardando egreso residente:", error);
      mostrarExito("NO SE PUDO GUARDAR EL EGRESO");
    }
  };

  const onDeleteSafe = (id) => {
    const reg = (registrosFiltrados || []).find((x) => String(x.id) === String(id));

    if (reg && !canDelete(reg)) {
      mostrarExito("NO PUEDES ELIMINAR REGISTROS QUE NO CREASTE");
      return;
    }

    setIdAEliminar(id);
  };

  const eliminarRegistro = async () => {
    try {
      const egresoTarget = (egresos || []).find((x) => String(x.id) === String(idAEliminar));

      if (!canDelete(egresoTarget)) {
        setIdAEliminar(null);
        mostrarExito("NO PUEDES ELIMINAR REGISTROS QUE NO CREASTE");
        return;
      }

      await deleteEgreso(idAEliminar);
      setIdAEliminar(null);
      mostrarExito("EGRESO ELIMINADO");
    } catch (error) {
      console.error("Error eliminando egreso residente:", error);
      mostrarExito("NO SE PUDO ELIMINAR EL EGRESO");
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F1] px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 text-black overflow-x-hidden">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="shrink-0 transition-transform active:scale-95"
            aria-label="Ir al inicio"
            title="Ir al inicio"
          >
            <img
              src={logo}
              alt="Blendfort"
              className="h-16 sm:h-20 md:h-20 lg:h-24 xl:h-28 w-auto object-contain"
            />
          </button>

          <ActionButton
            onClick={logout}
            icon="pi pi-sign-out"
            dark
            className="shrink-0"
          >
            Salir
          </ActionButton>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
              <i className="pi pi-user text-[11px]" />
              <span>Portal residente</span>
            </div>

            <h1 className="mt-3 text-[30px] md:text-[42px] xl:text-[48px] font-black tracking-tight text-slate-800 leading-none">
              Hola, <span className="text-slate-400">{nombreUsuario}</span>
            </h1>

            <p className="mt-3 text-[13px] font-medium text-slate-500">
              Gestiona tus egresos y reportes del proyecto asignado.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill icon="pi pi-briefcase" accent={normalize(proyectoActivoFinal) !== ""}>
                {proyectoActivoFinal || "SIN PROYECTO"}
              </InfoPill>

              <InfoPill icon="pi pi-wallet">
                Total: {money(totalMes)}
              </InfoPill>

              {hayFiltros ? (
                <InfoPill icon="pi pi-filter" accent>
                  Filtros activos
                </InfoPill>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end md:max-w-2xl">
              {multiProyecto ? (
                <CustomSelect
                  label="Proyecto activo"
                  options={proyectosAsignados}
                  value={proyectoActivo}
                  onChange={(val) => setProyectoActivo(normalize(val))}
                  placeholder="SELECCIONAR..."
                  allowCustom={false}
                  disabled={!proyectosAsignados.length}
                />
              ) : (
                <div className="rounded-[1.4rem] border border-black/5 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Proyecto activo
                  </p>
                  <p className="mt-2 text-[14px] font-black text-slate-800 uppercase">
                    {proyectoActivoFinal || "SIN PROYECTO"}
                  </p>
                </div>
              )}

              <ActionButton
                onClick={abrirManoObra}
                icon="pi pi-users"
                dark
                disabled={!tieneProyectosAsignados}
                className="h-[50px] sm:w-auto"
              >
                Mano de obra
              </ActionButton>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-black/5 bg-white p-4 md:p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C98500]">
                  Caja chica general
                </p>
                <h2
                  className={`mt-2 text-[28px] md:text-[32px] font-black tracking-tight leading-none ${
                    cajaExcedida ? "text-red-700" : "text-slate-800"
                  }`}
                >
                  {money(resumenCajaChica?.gastadoActual || 0)}
                </h2>
                <p className="mt-2 text-[12px] font-medium text-slate-500">
                  Gastado del fondo asignado
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]">
                <i className="pi pi-credit-card text-[15px]" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-black/5 bg-[#F9F9F6] p-3">
                <p className="text-[10px] font-medium text-slate-500">Total asignado</p>
                <p className="mt-2 text-[12px] font-black text-slate-800">
                  {money(resumenCajaChica?.montoActualAsignado || 0)}
                </p>
              </div>

              <div className="rounded-[1rem] border border-black/5 bg-[#F9F9F6] p-3">
                <p className="text-[10px] font-medium text-slate-500">Saldo</p>
                <p
                  className={`mt-2 text-[12px] font-black ${
                    saldoCajaNegativo ? "text-red-700" : "text-slate-800"
                  }`}
                >
                  {money(resumenCajaChica?.saldoActual || 0)}
                </p>
              </div>

              <div className="rounded-[1rem] border border-black/5 bg-[#F9F9F6] p-3">
                <p className="text-[10px] font-medium text-slate-500">Desembolso</p>
                <p className="mt-2 text-[12px] font-black text-slate-800">
                  {resumenCajaChica?.fechaUltimoDesembolso || "SIN REGISTRO"}
                </p>
              </div>

              <div className="rounded-[1rem] border border-black/5 bg-[#F9F9F6] p-3">
                <p className="text-[10px] font-medium text-slate-500">Estado</p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${estadoCajaTone(
                    resumenCajaChica?.estado
                  )}`}
                >
                  {normalize(resumenCajaChica?.estado || "SIN FONDO")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="border-b border-black/5 bg-[#F9F9F6] px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-[2px] bg-[#FCB017]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                    Reportes de egresos
                  </span>
                </div>

                <h3 className="mt-2 text-[24px] font-black tracking-tight text-slate-800">
                  Egresos
                </h3>

                <p className="mt-2 text-[12px] font-medium text-slate-500">
                  {multiProyecto
                    ? `Proyecto activo: ${proyectoActivoFinal || "—"}`
                    : `Proyecto: ${proyectoActivoFinal || "—"}`}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:justify-end">
                <ActionButton
                  onClick={() => setShowFiltros((v) => !v)}
                  icon="pi pi-filter"
                  className="px-3 md:px-4"
                >
                  <span className="hidden sm:inline">Filtros</span>
                </ActionButton>

                <ActionButton
                  onClick={abrirReporteLista}
                  icon="pi pi-plus"
                  accent
                  className="px-3 md:px-4"
                >
                  <span className="hidden sm:inline">Reporte</span>
                </ActionButton>

                <ActionButton
                  onClick={abrirModalNuevo}
                  icon="pi pi-plus"
                  dark
                  className="px-3 md:px-4"
                >
                  <span className="hidden sm:inline">Egreso</span>
                </ActionButton>
              </div>
            </div>
          </div>

          {showFiltros && (
            <div className="border-b border-black/5 p-4 md:p-5 animate-in fade-in zoom-in duration-300">
              <div className="rounded-[1.5rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <CustomSelect
                      label="Categoría"
                      options={["TODAS...", ...(opcionesCategorias || [])]}
                      value={filtroCategoria ? filtroCategoria : "TODAS..."}
                      onChange={(val) => {
                        const v = String(val || "");
                        setFiltroCategoria(v === "TODAS..." ? "" : v);
                      }}
                      placeholder="TODAS..."
                      allowCustom={false}
                    />
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      className="w-full h-[50px] bg-white border border-black/5 px-4 rounded-xl text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                    />
                  </div>

                  {hayFiltros && (
                    <div className="md:col-span-2 flex items-end">
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
            </div>
          )}

          <div className="p-3 md:p-5">
            <TablaEgresos
              registros={registrosFiltrados}
              onEdit={onEditSafe}
              onDelete={onDeleteSafe}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </div>
        </div>

        <footer className="pt-1 text-center text-[10px] font-medium text-slate-400">
          Blendfort Control Interno v1.0
        </footer>
      </div>

      <ModalConfirmar
        id={idAEliminar}
        onConfirm={eliminarRegistro}
        onCancel={() => setIdAEliminar(null)}
      />

      <ModalEgreso
        show={showModalNuevo}
        onClose={() => setShowModalNuevo(false)}
        onSave={handleGuardar}
        editandoId={editandoId}
        nuevoEgreso={nuevoEgreso}
        setNuevoEgreso={setNuevoEgreso}
        opcionesProyectos={proyectosAsignados}
        opcionesCategorias={opcionesCategorias}
      />

      <ReporteDiarioListaModal
        show={showReporteDiarioLista}
        onClose={() => setShowReporteDiarioLista(false)}
        proyectoActivo={proyectoActivoFinal}
        registradoPor={nombreUsuario}
        onOpenIndividual={abrirReporteIndividual}
        onSuccess={(msg) => {
          mostrarExito(msg || "REPORTES GUARDADOS");
          setShowReporteDiarioLista(false);
        }}
      />

      <ReporteDiarioModal
        show={showReporteDiario}
        onClose={() => setShowReporteDiario(false)}
        proyectoActivo={proyectoActivoFinal}
        registradoPor={nombreUsuario}
        onOpenLista={abrirReporteLista}
        onSuccess={(msg) => {
          mostrarExito(msg || "REPORTE GUARDADO");
          setShowReporteDiario(false);
        }}
      />

      <ResidentManoObraModal
        show={showManoObraModal}
        onClose={() => setShowManoObraModal(false)}
        proyectoActivo={proyectoActivoFinal}
        personalProyecto={personalProyectoActivo}
        registrosManoObra={registrosManoObraProyecto}
      />

      <ModalExito
        show={modalExito.show}
        mensaje={modalExito.mensaje}
        onClose={() => setModalExito({ show: false, mensaje: "" })}
      />
    </div>
  );
};

export default ResidentDashboard;