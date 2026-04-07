import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";

import PersonalTopBar from "../components/PersonalTopBar";
import PersonalFilters from "../components/PersonalFilters";
import PersonalTable from "../components/PersonalTable";
import PersonalFormModal from "../components/PersonalFormModal";
import PersonalDetailModal from "../components/PersonalDetailModal";

import ModalConfirmar from "../components/ModalConfirmar";
import ModalExito from "../components/ModalExito";
import Toast from "../components/Toast";

/* ===========================
   Helpers
=========================== */

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const buildDefaultEmpleado = () => ({
  id: null,
  nombre: "",
  cargo: "",
  proyecto: "",
  tipo: "CAMPO",
  fechaContratacion: "",
  valorDia: "",
  salarioMensual: "",
  valorHoraExtra: "",
  rol: "OPERARIO",
  estado: "ACTIVO",
});

/* ===========================
   Component
=========================== */

const GestionPersonal = ({ onBack }) => {
  const nombreInputRef = useRef(null);

  const {
    proyectos,
    personal,
    addPersonal,
    updatePersonal,
    toggleEstadoPersonal,
    deletePersonal,
    getPersonalAgrupado,
  } = useAppContext();

  const [showFiltros, setShowFiltros] = useState(false);
  const [queryNombre, setQueryNombre] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editandoEmpleado, setEditandoEmpleado] = useState(null);

  const [detalleEmpleado, setDetalleEmpleado] = useState(null);

  const [modalExito, setModalExito] = useState({ show: false, mensaje: "" });
  const [toast, setToast] = useState({ show: false, mensaje: "", tipo: "exito" });

  const [nuevoEmpleado, setNuevoEmpleado] = useState(buildDefaultEmpleado());

  const [idAEliminar, setIdAEliminar] = useState(null);

  const [modoAsignacion, setModoAsignacion] = useState("normal");
  const [empleadoOrigenMovimiento, setEmpleadoOrigenMovimiento] = useState(null);

  const opcionesProyectos = useMemo(() => {
    const fromContext = (proyectos || []).map((p) => p?.nombre).filter(Boolean);
    const fromPersonal = (personal || []).map((p) => p?.proyecto).filter(Boolean);
    return [...new Set([...fromContext, ...fromPersonal])].sort();
  }, [proyectos, personal]);

  const opcionesEstado = useMemo(() => ["ACTIVO", "INACTIVO"], []);

  const personalAgrupado = useMemo(() => {
    const grouped =
      typeof getPersonalAgrupado === "function" ? getPersonalAgrupado() : [];

    let base = grouped;

    if (filtroProyecto) {
      const proyectoN = String(filtroProyecto || "").toUpperCase();
      base = base.filter((emp) =>
        (emp.asignaciones || []).some(
          (a) => String(a?.proyecto || "").toUpperCase() === proyectoN
        )
      );
    }

    if (filtroEstado) {
      const estadoN = String(filtroEstado || "").toUpperCase();
      base = base.filter((emp) =>
        (emp.asignaciones || []).some(
          (a) => String(a?.estado || "ACTIVO").toUpperCase() === estadoN
        )
      );
    }

    if (queryNombre.trim()) {
      const q = normalize(queryNombre);
      base = base.filter((emp) => {
        const nombreOk = normalize(emp?.nombre).includes(q);
        const cargoOk = (emp?.cargos || []).some((c) => normalize(c).includes(q));
        const proyectoOk = (emp?.proyectos || []).some((p) => normalize(p).includes(q));
        return nombreOk || cargoOk || proyectoOk;
      });
    }

    return base;
  }, [getPersonalAgrupado, filtroProyecto, filtroEstado, queryNombre]);

  const hayFiltros = Boolean(queryNombre || filtroProyecto || filtroEstado);

  const modalConfirmarId = useMemo(() => {
    if (!idAEliminar) return null;
    return `PERSONAL:${idAEliminar}`;
  }, [idAEliminar]);

  useEffect(() => {
    if (!showModal) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = setTimeout(() => {
      nombreInputRef.current?.focus();
    }, 0);

    const onKey = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  const resetModoAsignacion = () => {
    setModoAsignacion("normal");
    setEmpleadoOrigenMovimiento(null);
  };

  const abrirModalNuevo = () => {
    setNuevoEmpleado(buildDefaultEmpleado());
    setEditandoEmpleado(null);
    resetModoAsignacion();
    setShowModal(true);
  };

  const abrirModalEditar = (asignacion) => {
    setNuevoEmpleado({
      ...buildDefaultEmpleado(),
      ...asignacion,
      estado: asignacion?.estado || "ACTIVO",
    });
    setEditandoEmpleado(asignacion);
    resetModoAsignacion();
    setShowModal(true);
  };

  const abrirAsignacionProyecto = (empleadoAgrupado) => {
    if (!empleadoAgrupado) return;

    const referencia =
      (empleadoAgrupado.asignaciones || []).find((a) => a.estado === "ACTIVO") ||
      empleadoAgrupado.asignaciones?.[0] ||
      null;

    setNuevoEmpleado({
      ...buildDefaultEmpleado(),
      nombre: empleadoAgrupado?.nombre || "",
      cargo: referencia?.cargo || "",
      proyecto: "",
      tipo: referencia?.tipo || "CAMPO",
      fechaContratacion: empleadoAgrupado?.fechaContratacion || "",
      valorDia: referencia?.valorDia ?? "",
      salarioMensual: referencia?.salarioMensual ?? "",
      valorHoraExtra: referencia?.valorHoraExtra ?? "",
      rol: referencia?.rol || "OPERARIO",
      estado: "ACTIVO",
    });

    setEditandoEmpleado(null);
    setModoAsignacion("duplicar");
    setEmpleadoOrigenMovimiento(null);
    setDetalleEmpleado(null);
    setShowModal(true);
  };

  const abrirMoverProyecto = (asignacion) => {
    if (!asignacion) return;

    setNuevoEmpleado({
      ...buildDefaultEmpleado(),
      nombre: asignacion?.nombre || "",
      cargo: asignacion?.cargo || "",
      proyecto: "",
      tipo: asignacion?.tipo || "CAMPO",
      fechaContratacion: asignacion?.fechaContratacion || "",
      valorDia: asignacion?.valorDia ?? "",
      salarioMensual: asignacion?.salarioMensual ?? "",
      valorHoraExtra: asignacion?.valorHoraExtra ?? "",
      rol: asignacion?.rol || "OPERARIO",
      estado: "ACTIVO",
    });

    setEditandoEmpleado(null);
    setModoAsignacion("mover");
    setEmpleadoOrigenMovimiento(asignacion);
    setShowModal(true);
  };

  const existeDuplicado = (payload) => {
    const nombreN = normalize(payload.nombre);
    const proyectoN = normalize(payload.proyecto);

    return (personal || []).some((emp) => {
      if (emp.id === payload.id) return false;
      return normalize(emp.nombre) === nombreN && normalize(emp.proyecto) === proyectoN;
    });
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();

    try {
      if (!nuevoEmpleado.nombre || !nuevoEmpleado.cargo) {
        setToast({
          show: true,
          mensaje: "NOMBRE Y CARGO SON OBLIGATORIOS",
          tipo: "error",
        });
        return;
      }

      const payload = {
        ...nuevoEmpleado,
        nombre: String(nuevoEmpleado.nombre || "").toUpperCase(),
        cargo: String(nuevoEmpleado.cargo || "").toUpperCase(),
        proyecto: String(nuevoEmpleado.proyecto || "").toUpperCase(),
        tipo: nuevoEmpleado.tipo || "CAMPO",
        rol: nuevoEmpleado.rol || "OPERARIO",
        estado: String(nuevoEmpleado.estado || "ACTIVO").toUpperCase(),
      };

      if (existeDuplicado(payload)) {
        setToast({
          show: true,
          mensaje: "YA EXISTE EN ESE PROYECTO",
          tipo: "error",
        });
        return;
      }

      if (editandoEmpleado) {
        await updatePersonal(payload.id, payload);
        setModalExito({ show: true, mensaje: "ASIGNACIÓN ACTUALIZADA" });
      } else if (modoAsignacion === "mover" && empleadoOrigenMovimiento?.id) {
        await addPersonal({
          ...payload,
          estado: "ACTIVO",
        });

        await toggleEstadoPersonal(empleadoOrigenMovimiento.id, "INACTIVO");

        setModalExito({ show: true, mensaje: "EMPLEADO MOVIDO DE PROYECTO" });
      } else {
        await addPersonal(payload);
        setModalExito({
          show: true,
          mensaje:
            modoAsignacion === "duplicar" ? "ASIGNACIÓN CREADA" : "EMPLEADO CREADO",
        });
      }

      resetModoAsignacion();
      setShowModal(false);
    } catch (error) {
      console.error("Error guardando empleado:", error);
      setToast({
        show: true,
        mensaje: "NO SE PUDO GUARDAR EL EMPLEADO",
        tipo: "error",
      });
    }
  };

  const toggleEstadoRapido = async (asignacion) => {
    try {
      const actual = String(asignacion?.estado || "ACTIVO").toUpperCase();
      const next = actual === "ACTIVO" ? "INACTIVO" : "ACTIVO";

      await toggleEstadoPersonal(asignacion.id, next);

      setToast({
        show: true,
        mensaje: next === "ACTIVO" ? "ASIGNACIÓN ACTIVADA" : "ASIGNACIÓN INACTIVADA",
        tipo: "exito",
      });
    } catch (error) {
      console.error("Error cambiando estado:", error);
      setToast({
        show: true,
        mensaje: "NO SE PUDO CAMBIAR EL ESTADO",
        tipo: "error",
      });
    }
  };

  const solicitarEliminar = (id) => {
    setIdAEliminar(id);
  };

  const eliminarConfirmado = async () => {
    try {
      await deletePersonal(idAEliminar);

      setIdAEliminar(null);
      setModalExito({ show: true, mensaje: "ASIGNACIÓN ELIMINADA" });
    } catch (error) {
      console.error("Error eliminando empleado:", error);
      setToast({
        show: true,
        mensaje: "NO SE PUDO ELIMINAR EL REGISTRO",
        tipo: "error",
      });
    }
  };

  const limpiarFiltros = () => {
    setQueryNombre("");
    setFiltroProyecto("");
    setFiltroEstado("");
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
      <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
        <PersonalTopBar
          onBack={onBack}
          onToggleFiltros={() => setShowFiltros((v) => !v)}
          hayFiltros={hayFiltros}
          onNuevo={abrirModalNuevo}
        />

        <div className="p-8 md:p-14 relative">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[8px] font-black text-blendfort-naranja uppercase tracking-[0.4em]">
                Personnel Control
              </span>
            </div>

            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black leading-none">
              Directorio de Personal
            </h3>

            <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-3">
              {personalAgrupado.length} Empleados encontrados
            </p>
          </div>

          <div className="hidden md:block mb-10">
            <PersonalFilters
              show={true}
              queryNombre={queryNombre}
              setQueryNombre={setQueryNombre}
              filtroProyecto={filtroProyecto}
              setFiltroProyecto={setFiltroProyecto}
              opcionesProyectos={opcionesProyectos}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              opcionesEstado={opcionesEstado}
              hayFiltros={hayFiltros}
              limpiarFiltros={limpiarFiltros}
            />
          </div>

          <div className="md:hidden mb-10">
            <PersonalFilters
              show={showFiltros}
              queryNombre={queryNombre}
              setQueryNombre={setQueryNombre}
              filtroProyecto={filtroProyecto}
              setFiltroProyecto={setFiltroProyecto}
              opcionesProyectos={opcionesProyectos}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              opcionesEstado={opcionesEstado}
              hayFiltros={hayFiltros}
              limpiarFiltros={limpiarFiltros}
            />
          </div>

          <PersonalTable
            data={personalAgrupado}
            onOpenDetalle={setDetalleEmpleado}
            onNew={abrirModalNuevo}
          />
        </div>
      </div>

      <PersonalFormModal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          resetModoAsignacion();
        }}
        onSave={guardarEmpleado}
        editando={Boolean(editandoEmpleado)}
        empleado={nuevoEmpleado}
        setEmpleado={setNuevoEmpleado}
        opcionesProyectos={opcionesProyectos}
        nombreInputRef={nombreInputRef}
      />

      <PersonalDetailModal
        empleado={detalleEmpleado}
        onClose={() => setDetalleEmpleado(null)}
        onEdit={abrirModalEditar}
        onAsignarProyecto={() => abrirAsignacionProyecto(detalleEmpleado)}
        onMoverProyecto={abrirMoverProyecto}
        onToggleEstado={toggleEstadoRapido}
        onDelete={(id) => solicitarEliminar(id)}
      />

      <ModalConfirmar
        id={modalConfirmarId}
        onConfirm={eliminarConfirmado}
        onCancel={() => setIdAEliminar(null)}
      />

      <ModalExito
        show={modalExito.show}
        mensaje={modalExito.mensaje}
        onClose={() => setModalExito({ show: false, mensaje: "" })}
      />

      {toast.show && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
};

export default GestionPersonal;