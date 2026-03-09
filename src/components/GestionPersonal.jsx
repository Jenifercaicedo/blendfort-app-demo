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
});

/* ===========================
   Component
=========================== */

const GestionPersonal = ({ onBack }) => {
  const nombreInputRef = useRef(null);
  const {
  personal,
  proyectos,
  addPersonal,
  updatePersonal,
  deletePersonal,
} = useAppContext();

  /* ===========================
     Estados UI
  =========================== */

  const [showFiltros, setShowFiltros] = useState(false);
  const [queryNombre, setQueryNombre] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editandoEmpleado, setEditandoEmpleado] = useState(null);

  const [detalleEmpleado, setDetalleEmpleado] = useState(null);

  const [modalExito, setModalExito] = useState({ show: false, mensaje: "" });
  const [toast, setToast] = useState({ show: false, mensaje: "", tipo: "exito" });

  const [nuevoEmpleado, setNuevoEmpleado] = useState(buildDefaultEmpleado());

  // Confirmación eliminar (nuevo flujo)
  const [idAEliminar, setIdAEliminar] = useState(null);


  /* ===========================
     Derivados
  =========================== */

  const opcionesProyectos = useMemo(() => {
    const fromContext = (proyectos || []).map((p) => p?.nombre).filter(Boolean);
    const fromPersonal = (personal || []).map((p) => p?.proyecto).filter(Boolean);
    return [...new Set([...fromContext, ...fromPersonal])].sort();
  }, [proyectos, personal]);

  const personalFiltrado = useMemo(() => {
    const q = normalize(queryNombre);
    let base = personal || [];

    if (filtroProyecto) base = base.filter((e) => (e.proyecto || "") === filtroProyecto);

    if (q) base = base.filter((e) => normalize(e.nombre).includes(q));

    return [...base].sort((a, b) => normalize(a.nombre).localeCompare(normalize(b.nombre)));
  }, [personal, filtroProyecto, queryNombre]);

  const hayFiltros = Boolean(queryNombre || filtroProyecto);



  /* ===========================
     Modal UX
  =========================== */

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

  /* ===========================
     Acciones
  =========================== */

  const abrirModalNuevo = () => {
    setNuevoEmpleado(buildDefaultEmpleado());
    setEditandoEmpleado(null);
    setShowModal(true);
  };

  const abrirModalEditar = (emp) => {
    setNuevoEmpleado({ ...buildDefaultEmpleado(), ...emp });
    setEditandoEmpleado(emp);
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
      setToast({ show: true, mensaje: "NOMBRE Y CARGO SON OBLIGATORIOS", tipo: "error" });
      return;
    }

    const payload = {
      ...nuevoEmpleado,
      nombre: String(nuevoEmpleado.nombre || "").toUpperCase(),
      cargo: String(nuevoEmpleado.cargo || "").toUpperCase(),
      proyecto: String(nuevoEmpleado.proyecto || "").toUpperCase(),
      tipo: nuevoEmpleado.tipo || "CAMPO",
      rol: nuevoEmpleado.rol || "OPERARIO",
    };

    if (existeDuplicado(payload)) {
      setToast({ show: true, mensaje: "YA EXISTE EN ESE PROYECTO", tipo: "error" });
      return;
    }

    if (editandoEmpleado) {
      await updatePersonal(payload.id, payload);
      setModalExito({ show: true, mensaje: "EMPLEADO ACTUALIZADO" });
    } else {
      await addPersonal(payload);
      setModalExito({ show: true, mensaje: "EMPLEADO CREADO" });
    }

    setShowModal(false);
  } catch (error) {
    console.error("Error guardando empleado:", error);
    setToast({ show: true, mensaje: "NO SE PUDO GUARDAR EL EMPLEADO", tipo: "error" });
  }
};

  // Nuevo: solicitar confirmación
  const solicitarEliminar = (id) => {
    setIdAEliminar(id);
  };

  // Nuevo: eliminar confirmado
  const eliminarConfirmado = async () => {
  try {
    await deletePersonal(idAEliminar);
    setIdAEliminar(null);
    setModalExito({ show: true, mensaje: "EMPLEADO ELIMINADO" });

    if (detalleEmpleado?.id === idAEliminar) setDetalleEmpleado(null);
  } catch (error) {
    console.error("Error eliminando empleado:", error);
    setToast({ show: true, mensaje: "NO SE PUDO ELIMINAR EL EMPLEADO", tipo: "error" });
  }
};

  const limpiarFiltros = () => {
    setQueryNombre("");
    setFiltroProyecto("");
  };

  /* ===========================
     Render
  =========================== */

  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
      <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
        {/* TOP BAR */}
        <PersonalTopBar
          onBack={onBack}
          onToggleFiltros={() => setShowFiltros((v) => !v)}
          hayFiltros={hayFiltros}
          onNuevo={abrirModalNuevo}
        />

        <div className="p-8 md:p-14 relative">
          {/* Título */}
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
              {personalFiltrado.length} Registros encontrados
            </p>
          </div>

          {/* Filtros */}
          <PersonalFilters
            show={showFiltros}
            queryNombre={queryNombre}
            setQueryNombre={setQueryNombre}
            filtroProyecto={filtroProyecto}
            setFiltroProyecto={setFiltroProyecto}
            opcionesProyectos={opcionesProyectos}
            hayFiltros={hayFiltros}
            limpiarFiltros={limpiarFiltros}
          />

          {/* Tabla */}
          <PersonalTable
            data={personalFiltrado}
            onOpenDetalle={setDetalleEmpleado}
            onEdit={abrirModalEditar}
            onDelete={solicitarEliminar}
            onNew={abrirModalNuevo}
          />
        </div>
      </div>

      {/* Modales */}
      <PersonalFormModal
  show={showModal}
  onClose={() => setShowModal(false)}
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
        onEdit={() => {
          abrirModalEditar(detalleEmpleado);
          setDetalleEmpleado(null);
        }}
        onDelete={() => solicitarEliminar(detalleEmpleado?.id)}
      />

      {/* Confirmación eliminar */}
      <ModalConfirmar
        id={idAEliminar}
        onConfirm={eliminarConfirmado}
        onCancel={() => setIdAEliminar(null)}
      />

      {/* Notificaciones */}
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