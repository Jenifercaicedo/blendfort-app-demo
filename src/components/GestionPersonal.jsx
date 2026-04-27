import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";

import PersonalFilters from "../components/PersonalFilters";
import PersonalTable from "../components/PersonalTable";
import PersonalFormModal from "../components/PersonalFormModal";
import PersonalDetailModal from "../components/PersonalDetailModal";
import CatalogoCargosModal from "../components/CatalogoCargosModal";

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

const normUpper = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const buildDefaultEmpleado = () => ({
  id: null,
  nombre: "",
  cargo: "",
  cargoCatalogoId: "",
  codigoCargo: "",
  tipoPago: "DIARIO",
  proyecto: "",
  tipo: "CAMPO",
  fechaContratacion: "",
  valorDia: "",
  salarioMensual: "",
  valorHoraExtra: "",
  rol: "OPERARIO",
  estado: "ACTIVO",
});

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

const esRolResidente = (value) => {
  const rol = normUpper(value);
  return rol === "RESIDENTE";
};

/* ===========================
   Component
=========================== */

const GestionPersonal = ({ onBack }) => {
  const nombreInputRef = useRef(null);

  const {
    proyectos,
    personal,
    catalogoCargos,
    loadingCatalogoCargos,
    addCatalogoCargo,
    updateCatalogoCargo,
    toggleCatalogoCargoActivo,
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
  const [showCatalogoCargos, setShowCatalogoCargos] = useState(false);
  const [editandoEmpleado, setEditandoEmpleado] = useState(null);

  const [detalleEmpleado, setDetalleEmpleado] = useState(null);

  const [modalExito, setModalExito] = useState({ show: false, mensaje: "" });
  const [toast, setToast] = useState({ show: false, mensaje: "", tipo: "exito" });

  const [nuevoEmpleado, setNuevoEmpleado] = useState(buildDefaultEmpleado());

  const [idAEliminar, setIdAEliminar] = useState(null);

  const [modoAsignacion, setModoAsignacion] = useState("normal");
  const [empleadoOrigenMovimiento, setEmpleadoOrigenMovimiento] = useState(null);

  const opcionesProyectos = useMemo(() => {
    return [...new Set((proyectos || []).map((p) => p?.nombre).filter(Boolean))].sort();
  }, [proyectos]);

  const opcionesEstado = useMemo(() => ["ACTIVO", "INACTIVO"], []);

  const totalCargosCatalogo = useMemo(() => {
    return (catalogoCargos || []).filter((c) => c?.activo !== false).length;
  }, [catalogoCargos]);

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

  const totalResidentesActivos = useMemo(() => {
    return personalAgrupado.filter((emp) => {
      const referencia =
        (emp?.asignaciones || []).find(
          (a) => String(a?.estado || "ACTIVO").toUpperCase() === "ACTIVO"
        ) ||
        emp?.asignaciones?.[0] ||
        null;

      return esRolResidente(referencia?.rol || emp?.rolPrincipal);
    }).length;
  }, [personalAgrupado]);

  const totalAsignacionesActivas = useMemo(() => {
    return personalAgrupado.reduce((acc, emp) => {
      return acc + Number(emp?.asignacionesActivas || 0);
    }, 0);
  }, [personalAgrupado]);

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
    setDetalleEmpleado(null);

    setNuevoEmpleado({
      ...buildDefaultEmpleado(),
      ...asignacion,
      cargoCatalogoId:
        asignacion?.cargoCatalogoId ||
        asignacion?.cargo_catalogo_id ||
        asignacion?.cargoCatalogo?.id ||
        "",
      codigoCargo:
        asignacion?.codigoCargo ||
        asignacion?.codigo_cargo ||
        asignacion?.cargoCatalogo?.codigo ||
        "",
      tipoPago:
        asignacion?.tipoPago ||
        asignacion?.tipo_pago ||
        asignacion?.cargoCatalogo?.tipo_pago ||
        "DIARIO",
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
      cargoCatalogoId:
        referencia?.cargoCatalogoId || referencia?.cargo_catalogo_id || "",
      codigoCargo: referencia?.codigoCargo || referencia?.codigo_cargo || "",
      tipoPago: referencia?.tipoPago || referencia?.tipo_pago || "DIARIO",
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

    setDetalleEmpleado(null);

    setNuevoEmpleado({
      ...buildDefaultEmpleado(),
      nombre: asignacion?.nombre || "",
      cargo: asignacion?.cargo || "",
      cargoCatalogoId:
        asignacion?.cargoCatalogoId || asignacion?.cargo_catalogo_id || "",
      codigoCargo: asignacion?.codigoCargo || asignacion?.codigo_cargo || "",
      tipoPago: asignacion?.tipoPago || asignacion?.tipo_pago || "DIARIO",
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
        cargoCatalogoId: nuevoEmpleado.cargoCatalogoId || null,
        codigoCargo: String(nuevoEmpleado.codigoCargo || "").toUpperCase(),
        tipoPago: String(nuevoEmpleado.tipoPago || "DIARIO").toUpperCase(),
        tipo: String(nuevoEmpleado.tipo || "CAMPO").toUpperCase(),
        rol: String(nuevoEmpleado.rol || "OPERARIO").toUpperCase(),
        estado: String(nuevoEmpleado.estado || "ACTIVO").toUpperCase(),
        valorDia: nuevoEmpleado.valorDia === "" ? 0 : Number(nuevoEmpleado.valorDia || 0),
        salarioMensual:
          nuevoEmpleado.salarioMensual === ""
            ? 0
            : Number(nuevoEmpleado.salarioMensual || 0),
        valorHoraExtra:
          nuevoEmpleado.valorHoraExtra === ""
            ? 0
            : Number(nuevoEmpleado.valorHoraExtra || 0),
      };

      if (existeDuplicado(payload)) {
        setToast({
          show: true,
          mensaje: "YA EXISTE EN ESE PROYECTO",
          tipo: "error",
        });
        return;
      }

      const esResidente = esRolResidente(payload.rol);

      if (editandoEmpleado) {
        await updatePersonal(payload.id, payload);
        setModalExito({
          show: true,
          mensaje: esResidente ? "ASIGNACIÓN DE RESIDENTE ACTUALIZADA" : "ASIGNACIÓN ACTUALIZADA",
        });
      } else if (modoAsignacion === "mover" && empleadoOrigenMovimiento?.id) {
        await addPersonal({
          ...payload,
          estado: "ACTIVO",
        });

        await toggleEstadoPersonal(empleadoOrigenMovimiento.id, "INACTIVO");

        setModalExito({
          show: true,
          mensaje: esResidente ? "RESIDENTE REASIGNADO DE PROYECTO" : "EMPLEADO MOVIDO DE PROYECTO",
        });
      } else {
        await addPersonal(payload);
        setModalExito({
          show: true,
          mensaje:
            modoAsignacion === "duplicar"
              ? esResidente
                ? "ACCESO DE RESIDENTE ASIGNADO"
                : "ASIGNACIÓN CREADA"
              : esResidente
              ? "RESIDENTE CREADO"
              : "EMPLEADO CREADO",
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
    setDetalleEmpleado(null);
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

  const abrirCatalogoCargos = () => {
    setShowCatalogoCargos(true);
  };

  const cerrarCatalogoCargos = () => {
    setShowCatalogoCargos(false);
  };

  const crearCargo = async (payload) => {
    try {
      await addCatalogoCargo(payload);
      setToast({
        show: true,
        mensaje: "CARGO CREADO",
        tipo: "exito",
      });
    } catch (error) {
      console.error("Error creando cargo:", error);
      setToast({
        show: true,
        mensaje: "NO SE PUDO CREAR EL CARGO",
        tipo: "error",
      });
      throw error;
    }
  };

  const actualizarCargo = async (id, payload) => {
    try {
      await updateCatalogoCargo(id, payload);
      setToast({
        show: true,
        mensaje: "CARGO ACTUALIZADO",
        tipo: "exito",
      });
    } catch (error) {
      console.error("Error actualizando cargo:", error);
      setToast({
        show: true,
        mensaje: "NO SE PUDO ACTUALIZAR EL CARGO",
        tipo: "error",
      });
      throw error;
    }
  };

  const toggleCargoActivo = async (id, nextActivo) => {
    try {
      await toggleCatalogoCargoActivo(id, nextActivo);
      setToast({
        show: true,
        mensaje: nextActivo ? "CARGO ACTIVADO" : "CARGO INACTIVADO",
        tipo: "exito",
      });
    } catch (error) {
      console.error("Error cambiando estado del cargo:", error);
      setToast({
        show: true,
        mensaje: "NO SE PUDO CAMBIAR EL ESTADO DEL CARGO",
        tipo: "error",
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
            <i className="pi pi-users text-[11px]" />
            <span>Gestión de personal</span>
          </div>

          <h2 className="mt-3 text-[28px] md:text-[34px] xl:text-[38px] font-black tracking-tight text-slate-800 leading-none">
            Personal
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <InfoPill icon="pi pi-id-card" accent>
              {personalAgrupado.length} empleados
            </InfoPill>

            <InfoPill icon="pi pi-user">
              {totalResidentesActivos} residentes
            </InfoPill>

            <InfoPill icon="pi pi-sitemap">
              {totalAsignacionesActivas} asignaciones activas
            </InfoPill>

            <InfoPill icon="pi pi-briefcase">
              {totalCargosCatalogo} cargos catálogo
            </InfoPill>

            {filtroProyecto ? (
              <InfoPill icon="pi pi-briefcase">
                {String(filtroProyecto).toUpperCase()}
              </InfoPill>
            ) : null}

            {filtroEstado ? (
              <InfoPill icon="pi pi-check-circle">
                {String(filtroEstado).toUpperCase()}
              </InfoPill>
            ) : null}
          </div>

          <div className="mt-4 rounded-[1.2rem] border border-[#FCB017]/20 bg-[#FFF8E8] px-4 py-3.5 md:max-w-[760px]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCB017]/15 text-[#C98500]">
                <i className="pi pi-info-circle text-[14px]" />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C98500]">
                  Flujo de residentes
                </p>

                <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-600">
                  El <span className="font-black text-slate-800">residente principal</span> se define en
                  <span className="font-black text-slate-800"> Proyectos</span>. Desde aquí gestionas
                  asignaciones adicionales por proyecto, movimientos y acceso multiproyecto sin tocar la
                  lógica principal de la obra.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setShowFiltros((v) => !v)}
            className={`md:hidden relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-95 ${
              showFiltros
                ? "border-[#FCB017] bg-[#FFF8E8] text-[#C98500]"
                : hayFiltros
                ? "border-[#FCB017]/30 bg-[#FFF8E8] text-[#C98500]"
                : "border-black/10 bg-white text-slate-600"
            }`}
            aria-label="Filtros"
            title="Filtros"
          >
            <i className="pi pi-filter text-[13px]" />
            {hayFiltros && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#FCB017]" />
            )}
          </button>

          <button
            type="button"
            onClick={abrirCatalogoCargos}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:border-[#FCB017] hover:text-[#C98500] active:scale-95 shadow-sm"
          >
            <i className="pi pi-briefcase text-[12px]" />
            <span>Cargos</span>
          </button>

          <button
            type="button"
            onClick={abrirModalNuevo}
            className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017] active:scale-95 shadow-sm"
          >
            <i className="pi pi-plus text-[12px]" />
            <span>Nuevo personal</span>
          </button>
        </div>
      </div>

      <div className="hidden md:block">
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

      {showFiltros && (
        <div className="md:hidden animate-in fade-in zoom-in duration-300">
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
      )}

      <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-4 md:p-5">
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
  modoAsignacion={modoAsignacion}
  empleadoOrigenMovimiento={empleadoOrigenMovimiento}
/>

      <CatalogoCargosModal
        show={showCatalogoCargos}
        onClose={cerrarCatalogoCargos}
        cargos={catalogoCargos}
        loading={loadingCatalogoCargos}
        onCreateCargo={crearCargo}
        onUpdateCargo={actualizarCargo}
        onToggleCargoActivo={toggleCargoActivo}
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