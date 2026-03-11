// AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import logo from "../assets/blendfort-logo-largo.png";
import { useAppContext } from "../context/AppContext";

// Componentes
import FilterSelect from "../components/FilterSelect";
import TablaAdmin from "../components/TablaAdmin";
import ModalProyecto from "../components/ModalProyecto";
import ModalEgreso from "../components/ModalEgreso";
import ModalConfirmar from "../components/ModalConfirmar";
import GestionProyectos from "../components/GestionProyectos";
import ModalExito from "../components/ModalExito";
import InformeEgresos from "../components/InformeEgresos";
import ManoObraCard from "../components/ManoObraCard";
import GestionPersonal from "../components/GestionPersonal";

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

// Toast interno (lo dejas igual)
const Toast = ({ mensaje, tipo = "exito", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const estilos = {
    exito: "bg-black text-white",
    error: "bg-red-500 text-white",
    info: "bg-blendfort-naranja text-white",
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`${estilos[tipo]} px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10`}>
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{mensaje}</span>
      </div>
    </div>
  );
};
const shouldCountInTotals = (e) => {
  const cat = normalize(e?.categoria);
  const est = normalize(e?.estado || "PENDIENTE");

  if (cat === "MANO DE OBRA") {
    return est === "PAGADO" || est === "COMPLETADO";
  }
  return true; // todo lo demás suma siempre
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

  // UI feedback
  const [toast, setToast] = useState({ show: false, mensaje: "", tipo: "exito" });
  const [modalExitoShow, setModalExitoShow] = useState({ show: false, mensaje: "" });

  // Filtros auditoría
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroResidente, setFiltroResidente] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const limpiarFiltros = () => {
    setFiltroProyecto("");
    setFiltroResidente("");
    setFiltroFecha("");
  };

  const mostrarExitoCentral = (mensaje) => {
    setModalExitoShow({ show: true, mensaje });
  };

  /* ===========================
     Egreso form
  =========================== */
  const initialEgreso = {
    proyecto: "",
    residente: "", //  se llenará automáticamente desde el proyecto al guardar
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
    //  mejor: sacar desde proyectos + egresos (para auditoría)
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
      // compat factura
      tieneFactura: item.factura === "si" || Boolean(item.tieneFactura),
      // normaliza campos clave para no romper UI
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
    setNuevoProyectoData({ nombre: "", residente: "", presupuesto: "", dueno: "", ubicacion: "", tiempo: "" });
  };

  /* ===========================
      Guardar egreso (API estable)
     - residente = responsable del proyecto
     - creadoPor / creadoPorRol los pone AppContext
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
    mostrarExitoCentral("REGISTRO ELIMINADO");
  } catch (error) {
    console.error("Error eliminando egreso:", error);
    setToast({ show: true, mensaje: "NO SE PUDO ELIMINAR EL EGRESO", tipo: "error" });
  }
};

  /* ===========================
     Guardar proyecto (igual que tú, solo “limpio”)
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

    // evitar duplicado por nombre
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

    // validar residente desde personal
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
      setToast({ show: true, mensaje: "RESIDENTE NO VÁLIDO. SELECCIONA UNO DE LA LISTA", tipo: "error" });
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
      setToast({ show: true, mensaje: "YA EXISTE UN PROYECTO CON ESE NOMBRE", tipo: "error" });
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
     Auditoría (filtros + total)
  =========================== */
  const egresosFiltrados = useMemo(() => {
    return (egresos || []).filter((item) => {
      const okProy = filtroProyecto === "" || normalize(item?.proyecto) === normalize(filtroProyecto);
      const okRes = filtroResidente === "" || normalize(item?.residente) === normalize(filtroResidente);
      const okFecha = filtroFecha === "" || iso10(item?.fecha) === iso10(filtroFecha);
      return okProy && okRes && okFecha;
    });
  }, [egresos, filtroProyecto, filtroResidente, filtroFecha]);

  // igual que tú: MO pendiente no suma
 const totalFiltrado = useMemo(() => {
  return (egresosFiltrados || []).reduce((acc, e) => {
    if (!shouldCountInTotals(e)) return acc;
    return acc + (Number(e?.valor) || 0);
  }, 0);
}, [egresosFiltrados]);

  return (
    <div className="min-h-screen bg-blendfort-fondo p-4 md:p-10 font-sans text-black relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-16 px-2">
        <img src={logo} alt="Blendfort" className="h-9 md:h-11 w-auto object-contain" />
        <button
  onClick={logout}
  className="group relative flex items-center gap-3 bg-white border border-black/10 pl-5 pr-2 py-2 rounded-full transition-all duration-300 hover:border-black hover:shadow-2xl active:scale-95"
>
  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 group-hover:text-black transition-colors">
    Cerrar Sesión
  </span>

  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center transition-all duration-300 group-hover:bg-blendfort-naranja">
    <svg
      className="w-3.5 h-3.5 rotate-180"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  </div>
</button>
      </div>

      {/* SECCIÓN DE TÍTULO Y BOTONES PRINCIPALES */}
      {!seccionActiva && (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-[2px] bg-blendfort-naranja"></div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase leading-none">Reporte Maestro</h1>
            </div>
            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.4em] ml-11">Global Control Panel</p>
          </div>

          <div className="flex flex-row items-center gap-4 w-full lg:w-auto">
  <button
    onClick={() => setShowModalProyecto(true)}
    className="group flex-1 lg:flex-none bg-white border border-black/10 px-7 py-4 rounded-[1.8rem] transition-all hover:border-black hover:shadow-xl active:scale-95 flex items-center gap-4"
    type="button"
  >
    <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-sm font-light group-hover:bg-blendfort-naranja transition-colors">
      +
    </div>

    <div className="text-left">
      <span className="block text-[7px] font-black opacity-30 uppercase tracking-widest leading-none">
        Master Setup
      </span>

      {/* Mobile: Proyecto | Desktop: Nuevo Proyecto */}
      <span className="text-[10px] font-black uppercase tracking-tight">
        <span className="lg:hidden">Proyecto</span>
        <span className="hidden lg:inline">Nuevo Proyecto</span>
      </span>
    </div>
  </button>

  <button
    onClick={() => setShowModalNuevo(true)}
    className="group flex-1 lg:flex-none relative bg-blendfort-naranja px-7 py-4 rounded-[1.8rem] transition-all duration-500 hover:bg-black hover:shadow-xl active:scale-95 flex items-center gap-4"
    type="button"
  >
    <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-light group-hover:bg-blendfort-naranja transition-all">
      +
    </div>

    <div className="text-left">
      <span className="block text-[7px] font-black text-white/50 uppercase tracking-widest leading-none">
        Quick Record
      </span>

      {/* Mobile: Egreso | Desktop: Nuevo Egreso */}
      <span className="text-[10px] font-black text-white uppercase tracking-tight">
        <span className="lg:hidden">Egreso</span>
        <span className="hidden lg:inline">Nuevo Egreso</span>
      </span>
    </div>
  </button>
</div>
        </div>
      )}

      {/* CARDS DE NAVEGACIÓN */}
      {!seccionActiva && (
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12 animate-in fade-in zoom-in-95 duration-500">
          {[
            { id: "informes", num: "01", title: "Informe de Egresos", desc: "Tabla y Auditoría" },
            { id: "manoDeObra", num: "02", title: "Mano de Obra", desc: "Control de Nómina" },
            { id: "presupuesto", num: "03", title: "Gestión Proyectos", desc: "Administración y Presupuesto" },
            { id: "gestionPersonal", num: "04", title: "Gestión de Personal", desc: "Administración del Equipo" },
          ].map((card) => (
            <button
              key={card.id}
              onClick={() => setSeccionActiva(card.id)}
              className="group relative p-9 rounded-[2.5rem] text-left transition-all duration-500 border bg-white border-black/5 hover:border-black shadow-sm hover:shadow-md"
              type="button"
            >
              <div className="relative z-10 space-y-4">
                <div className="w-10 h-[2px] bg-black/10 group-hover:bg-blendfort-naranja transition-colors"></div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight leading-tight">{card.title}</h3>
                  <p className="text-[8px] font-black opacity-40 uppercase tracking-[0.2em] mt-1">{card.desc}</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-2 text-8xl font-black text-black opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">{card.num}</div>
            </button>
          ))}
        </div>
      )}

      {/* CONTENIDO DINÁMICO */}
      <div className="max-w-7xl mx-auto">
        {seccionActiva === "informes" && (
          <InformeEgresos
            egresos={egresosFiltrados}
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
        )}

        {seccionActiva === "manoDeObra" && <ManoObraCard onBack={() => setSeccionActiva(null)} />}

        {seccionActiva === "presupuesto" && (
          <GestionProyectos
            proyectos={proyectos}
            egresos={egresos}
            onEdit={prepararEdicionProyecto}
            onDelete={solicitarEliminarProyecto}
            onBack={() => setSeccionActiva(null)}
            onNew={() => setShowModalProyecto(true)}
          />
        )}

        {seccionActiva === "gestionPersonal" && <GestionPersonal onBack={() => setSeccionActiva(null)} />}
      </div>

      {/* MODALES FORMULARIOS */}
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
        opcionesCategorias={["FERRETERIA", "MAQUINARIA", "PAPELERIA", "TRAMITES", "TRANSPORTE", "ASERRADERO", "MANO DE OBRA"]}
      />

      {/* MODALES DE CONFIRMACIÓN */}
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

      {/* MODAL DE ÉXITO */}
      <ModalExito
        show={modalExitoShow.show}
        mensaje={modalExitoShow.mensaje}
        onClose={() => setModalExitoShow({ show: false, mensaje: "" })}
      />

      {/* TOAST */}
      {toast.show && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast((t) => ({ ...t, show: false }))}
        />
      )}

      <footer className="mt-12 text-center opacity-20 text-[8px] font-bold uppercase tracking-[0.4em]">
        Blendfort Admin Master Console v2.0
      </footer>
    </div>
  );
};

export default AdminDashboard;