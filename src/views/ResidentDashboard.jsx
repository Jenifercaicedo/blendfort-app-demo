// ResidentDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import logo from "../assets/blendfort-logo-largo.png";
import { useAppContext } from "../context/AppContext";

import TablaEgresos from "../components/TablaEgresos";
import ModalConfirmar from "../components/ModalConfirmar";
import ModalEgreso from "../components/ModalEgreso";
import ModalExito from "../components/ModalExito";
import ReporteDiarioModal from "../components/ReporteDiarioModal";
import CustomSelect from "../components/CustomSelect";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const iso10 = (d) => String(d || "").slice(0, 10);

const ResidentDashboard = () => {
  const {
    nombreUsuario,
    logout,
    egresos,
    proyectos,
    getProyectosAsignados,
    addEgreso,
    updateEgreso,
    deleteEgreso,

    //  si existen en context los usamos, si no, usamos fallback local
    canEditEgreso,
    canDeleteEgreso,
  } = useAppContext();

  /* ===========================
     Proyectos asignados
  =========================== */
  const proyectosAsignados = useMemo(() => {
    return (getProyectosAsignados?.(nombreUsuario) || [])
      .map(normalize)
      .filter(Boolean);
  }, [getProyectosAsignados, nombreUsuario, proyectos]);

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

  /* ===========================
     Fallback de permisos (NO rompe)
     - residente solo edita/elimina lo que él creó
  =========================== */
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

  /* ===========================
     Filtros
  =========================== */
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

  /* ===========================
     Modales
  =========================== */
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [idAEliminar, setIdAEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  const [showReporteDiario, setShowReporteDiario] = useState(false);

  const [modalExito, setModalExito] = useState({ show: false, mensaje: "" });
  const mostrarExito = (mensaje) => setModalExito({ show: true, mensaje });

  /* ===========================
     Form
  =========================== */
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
    () => ["MANTENIMIENTO", "LIMPIEZA", "SEGURIDAD", "SUMINISTROS", "OTROS", "MANO DE OBRA"],
    []
  );

  /* ===========================
     Egresos visibles
  =========================== */
  const registrosProyecto = useMemo(() => {
    const allowed = new Set(proyectosAsignados.map(normalize));
    return (egresos || []).filter((e) => allowed.has(normalize(e?.proyecto)));
  }, [egresos, proyectosAsignados]);

  const registrosScope = useMemo(() => {
    if (!proyectoActivo) return registrosProyecto;
    return registrosProyecto.filter(
      (e) => normalize(e?.proyecto) === normalize(proyectoActivo)
    );
  }, [registrosProyecto, proyectoActivo]);

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

  // TOTAL (solo suma MANO DE OBRA si está PAGADO/COMPLETADO)
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

  /* ===========================
     Acciones
  =========================== */
  const abrirModalNuevo = () => {
    setEditandoId(null);
    setNuevoEgreso({
      ...initialForm,
      residente: nombreUsuario,
      proyecto: proyectoActivo || proyectosAsignados[0] || "",
      fecha: iso10(new Date()),
      estado: "PENDIENTE",
      tipoRegistro: "EGRESO",
    });
    setShowModalNuevo(true);
  };

  // wrapper seguro (no deja editar si no puede)
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
        ? (nuevoEgreso.proyecto || proyectoActivo || proyectosAsignados[0] || "")
        : (proyectoActivo || proyectosAsignados[0] || "")
    );

    const payload = {
      ...nuevoEgreso,
      proyecto: proyectoFinal,
      residente: normalize(nombreUsuario),
      fecha: iso10(nuevoEgreso.fecha),
      categoria: normalize(nuevoEgreso.categoria),
      lugar: String(nuevoEgreso.lugar || "").toUpperCase(),
      concepto: String(nuevoEgreso.concepto || "").toUpperCase(),
      detalles: String(nuevoEgreso.detalles || "").toUpperCase(),
      metodoPago: normalize(nuevoEgreso.metodoPago),
      pagadoPor: String(nuevoEgreso.pagadoPor || "ADMINISTRACIÓN").toUpperCase(),
      estado: normalize(nuevoEgreso.estado || "PENDIENTE"),
      valor: Number(nuevoEgreso.valor) || 0,
      tieneFactura: Boolean(nuevoEgreso.tieneFactura),
      tipoRegistro: "EGRESO",
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

  //  eliminar seguro: valida permisos antes de abrir confirmación
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
    <div className="min-h-screen bg-blendfort-fondo flex flex-col p-4 md:p-8 font-sans text-black overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-8">
        <img src={logo} alt="Blendfort" className="h-8 md:h-12 w-auto object-contain" />

        <button
          onClick={logout}
          className="group relative flex items-center gap-3 bg-white border border-black/10 pl-5 pr-2 py-2 rounded-full transition-all duration-300 hover:border-black hover:shadow-2xl active:scale-95"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 group-hover:text-black transition-colors">
            Cerrar Sesión
          </span>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center transition-all duration-300 group-hover:bg-blendfort-naranja">
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </button>
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1">
        {/* Bienvenida + Card inversión */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-8">
          <div className="flex flex-col items-center lg:items-start space-y-4">
            <div className="text-center lg:text-left">
              <span className="text-blendfort-naranja font-black text-[10px] uppercase tracking-[0.3em] block mb-1">
                BIENVENIDO DE NUEVO
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter leading-tight">
                HOLA, <span className="text-[#a1a1a1]">{nombreUsuario}</span>!
              </h1>
            </div>

            {/* ✅ Proyecto activo como CustomSelect */}
            {multiProyecto && (
              <div className="w-full max-w-sm">
                <CustomSelect
                  label="Proyecto activo"
                  options={proyectosAsignados}
                  value={proyectoActivo}
                  onChange={(val) => setProyectoActivo(normalize(val))}
                  placeholder="SELECCIONAR..."
                  allowCustom={false}
                  disabled={!proyectosAsignados.length}
                />
              </div>
            )}
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="bg-white border border-black/[0.05] p-6 rounded-[2rem] shadow-sm w-full max-w-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a1a1a1] mb-3">
                Inversión del Mes
              </p>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-8 bg-blendfort-naranja rounded-full"></div>
                <h2 className="text-3xl font-black tracking-tighter">
                  $ {Number(totalMes || 0).toLocaleString()}
                </h2>
              </div>

              <div className="flex justify-between border-t border-gray-100 pt-4">
                <div>
                  <p className="text-[7px] font-bold text-[#a1a1a1] uppercase tracking-widest">
                    Registros
                  </p>
                  <p className="text-[10px] font-black">{registrosScope.length} UNIDADES</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-bold text-[#a1a1a1] uppercase tracking-widest">
                    Estado
                  </p>
                  <p className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase">
                    Balance OK
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card maestra */}
        <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl overflow-hidden">
          {/* Top bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 md:p-6 border-b border-black/5 bg-blendfort-fondo/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-[2px] bg-blendfort-naranja"></div>
                <span className="text-[8px] font-black text-blendfort-naranja uppercase tracking-[0.4em]">
                  Resident Console
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                Reportes de Egresos
              </h3>
              <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-2">
                {multiProyecto
                  ? `PROYECTO ACTIVO: ${proyectoActivo}`
                  : `PROYECTO: ${proyectoActivo || proyectosAsignados[0] || "—"}`}
              </p>
            </div>

            <div className="w-full md:w-auto">
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-3 md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowFiltros((v) => !v)}
                  className={`h-11 md:h-auto w-full md:w-auto px-0 md:px-5 py-2.5 rounded-2xl bg-white border transition-all duration-300 active:scale-95 shadow-sm hover:border-blendfort-naranja
                    flex items-center justify-center md:justify-start gap-2 md:gap-3
                    ${hayFiltros ? "border-blendfort-naranja/40" : "border-black/5"}
                  `}
                >
                  <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-black/60">
                    Filtros
                  </span>
                  {hayFiltros && <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja animate-pulse" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowReporteDiario(true)}
                  className="h-11 md:h-auto w-full md:w-auto px-0 md:px-6 py-2.5 rounded-2xl bg-blendfort-naranja text-white
                    font-black text-[9px] uppercase tracking-[0.22em]
                    hover:bg-black transition-all active:scale-95 shadow-sm
                    flex items-center justify-center gap-2 md:gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-light">+</span>
                  </div>
                  <span className="text-[8px] md:text-[9px]">Reporte</span>
                </button>

                <button
                  type="button"
                  onClick={abrirModalNuevo}
                  className="h-11 md:h-auto w-full md:w-auto px-0 md:px-6 py-2.5 rounded-2xl bg-black text-white
                    font-black text-[9px] uppercase tracking-[0.22em]
                    hover:bg-blendfort-naranja transition-all active:scale-95 shadow-sm
                    flex items-center justify-center gap-2 md:gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-light">+</span>
                  </div>
                  <span className="text-[8px] md:text-[9px]">Egreso</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          {showFiltros && (
            <div className="p-5 md:p-6 border-b border-black/5 animate-in fade-in zoom-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ✅ CATEGORÍA como CustomSelect */}
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

                {/* ✅ FECHA se queda como input (tal como pediste) */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full bg-white border border-black/5 p-4 rounded-2xl text-[10px] font-black outline-none h-[53px] focus:border-black transition-all shadow-sm"
                  />
                </div>
              </div>

              {hayFiltros && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white border border-black/5 text-black/40 transition-all duration-300 active:scale-95 group hover:border-blendfort-naranja hover:text-black shadow-sm"
                  >
                    <span className="text-[8px] font-black uppercase tracking-[0.25em]">
                      Limpiar
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabla */}
          <div className="p-4 md:p-6">
            <TablaEgresos
              registros={registrosFiltrados}
              onEdit={onEditSafe}
              onDelete={onDeleteSafe}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </div>
        </div>
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

      <ReporteDiarioModal
        show={showReporteDiario}
        onClose={() => setShowReporteDiario(false)}
        proyectoActivo={proyectoActivo || proyectosAsignados[0] || ""}
        registradoPor={nombreUsuario}
        onSuccess={(msg) => {
          mostrarExito(msg || "REPORTE GUARDADO");
          setShowReporteDiario(false);
        }}
      />

      <ModalExito
        show={modalExito.show}
        mensaje={modalExito.mensaje}
        onClose={() => setModalExito({ show: false, mensaje: "" })}
      />

      <footer className="mt-8 text-center opacity-20 text-[9px] font-bold uppercase tracking-[0.3em] text-black">
        Blendfort Control Interno v1.0
      </footer>
    </div>
  );
};

export default ResidentDashboard;