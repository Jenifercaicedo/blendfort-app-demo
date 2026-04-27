import React, { useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { useAppContext } from "../context/AppContext";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n || 0);
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const toRoleAndType = (cargo) => {
  const tipoPersonal = norm(cargo?.tipo_personal);
  const tipoPago = norm(cargo?.tipo_pago || "DIARIO");

  if (tipoPersonal === "RESIDENTE") {
    return {
      rol: "RESIDENTE",
      tipo: tipoPago === "MENSUAL" ? "OFICINA" : "CAMPO",
    };
  }

  if (tipoPersonal === "OFICINA" || tipoPersonal === "ADMINISTRATIVO") {
    return {
      rol: "OFICINA",
      tipo: "OFICINA",
    };
  }

  return {
    rol: "OPERARIO",
    tipo: "CAMPO",
  };
};

const PersonalFormModal = ({
  show,
  onClose,
  onSave,
  editando,
  empleado,
  setEmpleado,
  opcionesProyectos,
  nombreInputRef,
  modoAsignacion = "normal",
  empleadoOrigenMovimiento = null,
}) => {
  const { catalogoCargos } = useAppContext();

  const cargosActivos = useMemo(() => {
    return (catalogoCargos || []).filter((c) => c?.activo !== false);
  }, [catalogoCargos]);

  const opcionesCargoCatalogo = useMemo(() => {
    return cargosActivos.map((c) => norm(c?.nombre)).filter(Boolean);
  }, [cargosActivos]);

  const cargoSeleccionado = useMemo(() => {
    if (!empleado?.cargoCatalogoId) return null;
    return (
      cargosActivos.find((c) => String(c?.id) === String(empleado.cargoCatalogoId)) || null
    );
  }, [cargosActivos, empleado?.cargoCatalogoId]);

  const esResidente = norm(empleado?.rol) === "RESIDENTE";
  const esOficina = norm(empleado?.tipo) === "OFICINA";
  const esMensual = norm(empleado?.tipoPago || "DIARIO") === "MENSUAL";
  const usaCatalogo = Boolean(empleado?.cargoCatalogoId);
  const tieneProyecto = Boolean(String(empleado?.proyecto || "").trim());

  const tituloSuperior = useMemo(() => {
    if (editando) return "Actualizar asignación";
    if (modoAsignacion === "duplicar") return "Nueva asignación";
    if (modoAsignacion === "mover") return "Reasignar proyecto";
    return "Nuevo personal";
  }, [editando, modoAsignacion]);

  const tituloPrincipal = useMemo(() => {
    if (editando) return "Editar asignación";
    if (modoAsignacion === "duplicar") return "Asignar a otro proyecto";
    if (modoAsignacion === "mover") return "Mover de proyecto";
    return "Nuevo empleado";
  }, [editando, modoAsignacion]);

  const subtituloOperacion = useMemo(() => {
    if (editando) {
      return "Actualiza la asignación sin alterar el flujo actual del proyecto.";
    }

    if (modoAsignacion === "duplicar") {
      return "Esta acción crea una nueva asignación adicional para el mismo empleado.";
    }

    if (modoAsignacion === "mover") {
      return "Esta acción crea la nueva asignación y luego inactiva la anterior.";
    }

    return "Configura el cargo, proyecto y tipo de pago manteniendo la lógica actual.";
  }, [editando, modoAsignacion]);

  if (!show) return null;

  const onChangeNumero = (key) => (e) => {
    const raw = e.target.value;

    if (raw === "") {
      setEmpleado({ ...empleado, [key]: "" });
      return;
    }

    const n = Number(raw);
    if (Number.isNaN(n)) return;
    if (n < 0) return;

    setEmpleado({ ...empleado, [key]: n });
  };

  const aplicarTipo = (next, tipo) => {
    const updated = { ...next, tipo };

    if (tipo === "OFICINA") {
      updated.valorDia = "";
      if (updated.salarioMensual === undefined) updated.salarioMensual = "";
    } else {
      updated.salarioMensual = "";
    }

    return updated;
  };

  const setRol = (rol) => {
    let next = { ...empleado, rol };

    if (rol === "OPERARIO") next = aplicarTipo(next, "CAMPO");
    if (rol === "RESIDENTE") next = aplicarTipo(next, "OFICINA");
    if (rol === "OFICINA") next = aplicarTipo(next, "OFICINA");

    setEmpleado(next);
  };

  const setTipo = (tipo) => {
    setEmpleado(aplicarTipo(empleado, tipo));
  };

  const setCargoCatalogo = (cargoNombre) => {
    const nombreN = norm(cargoNombre);
    const cargo = cargosActivos.find((c) => norm(c?.nombre) === nombreN) || null;

    if (!cargo) {
      setEmpleado({
        ...empleado,
        cargoCatalogoId: "",
        codigoCargo: "",
        tipoPago: empleado?.tipoPago || "DIARIO",
      });
      return;
    }

    const roleAndType = toRoleAndType(cargo);

    setEmpleado({
      ...empleado,
      cargoCatalogoId: cargo.id,
      codigoCargo: norm(cargo.codigo),
      cargo: norm(cargo.nombre),
      tipoPago: norm(cargo.tipo_pago || "DIARIO"),
      rol: roleAndType.rol,
      tipo: roleAndType.tipo,
      valorDia: Number(cargo.valor_dia || 0),
      valorHoraExtra: Number(cargo.valor_hora_extra || 0),
      salarioMensual: Number(cargo.salario_mensual || 0),
    });
  };

  const limpiarCargoCatalogo = () => {
    setEmpleado({
      ...empleado,
      cargoCatalogoId: "",
      codigoCargo: "",
      tipoPago: empleado?.tipoPago || "DIARIO",
    });
  };

  const textoAcceso = useMemo(() => {
    if (!esResidente) {
      return "Esta asignación es operativa y no abre acceso al portal residente.";
    }

    if (!tieneProyecto) {
      return "Esta asignación dará acceso resident cuando selecciones un proyecto.";
    }

    return `Esta asignación dará acceso resident al proyecto ${norm(
      empleado?.proyecto
    )}.`;
  }, [esResidente, tieneProyecto, empleado?.proyecto]);

  return (
    <div
      className="fixed inset-0 z-[210] overflow-y-auto bg-black/75 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[2.8rem] overflow-hidden shadow-[0_40px_90px_-20px_rgba(0,0,0,0.45)] border border-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          <div className="relative pt-7 md:pt-8 px-6 md:px-8 pb-5 border-b border-black/5 bg-white">
            <div className="pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 h-[2px] bg-[#FCB017]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C98500]">
                  {tituloSuperior}
                </span>
              </div>

              <h3 className="mt-3 text-[28px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none">
                {tituloPrincipal}
              </h3>

              <p className="mt-3 text-[12px] font-medium leading-relaxed text-slate-500 max-w-[620px]">
                {subtituloOperacion}
              </p>

              {editando && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
                  <i className="pi pi-pencil text-[11px]" />
                  <span>Edición activa</span>
                </div>
              )}

              {!editando && modoAsignacion === "duplicar" && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
                  <i className="pi pi-copy text-[11px]" />
                  <span>Asignación adicional</span>
                </div>
              )}

              {!editando && modoAsignacion === "mover" && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                  <i className="pi pi-arrow-right-arrow-left text-[11px]" />
                  <span>Movimiento entre proyectos</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-600 hover:border-[#FCB017] hover:text-[#C98500] transition-all"
              aria-label="Cerrar"
            >
              <i className="pi pi-times text-[13px]" />
            </button>
          </div>

          <form onSubmit={onSave} className="p-6 md:p-8 space-y-6">
            {modoAsignacion === "mover" && empleadoOrigenMovimiento?.proyecto ? (
              <div className="rounded-[1.4rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                    <i className="pi pi-send text-[12px]" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Proyecto de origen
                    </p>
                    <p className="mt-2 text-[14px] font-black uppercase text-slate-800">
                      {norm(empleadoOrigenMovimiento?.proyecto)}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-slate-500">
                      Al guardar, la asignación anterior se inactivará y se creará la nueva.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                  Nombre completo
                </label>
                <input
                  ref={nombreInputRef}
                  required
                  type="text"
                  placeholder="EJ. JUAN PÉREZ"
                  className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black uppercase outline-none focus:border-black transition-all shadow-sm"
                  value={empleado.nombre}
                  onChange={(e) => setEmpleado({ ...empleado, nombre: e.target.value })}
                />
              </div>

              <CustomSelect
                label="Cargo catálogo"
                options={opcionesCargoCatalogo}
                value={cargoSeleccionado ? norm(cargoSeleccionado.nombre) : ""}
                onChange={setCargoCatalogo}
                placeholder={opcionesCargoCatalogo.length ? "SELECCIONAR..." : "SIN CARGOS"}
                allowCustom={false}
                disabled={!opcionesCargoCatalogo.length}
              />

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                  Cargo visible
                </label>
                <input
                  required
                  type="text"
                  placeholder="EJ. MAESTRO / AYUDANTE / RESIDENTE"
                  className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black uppercase outline-none focus:border-black transition-all shadow-sm"
                  value={empleado.cargo}
                  onChange={(e) =>
                    setEmpleado({
                      ...empleado,
                      cargo: e.target.value,
                    })
                  }
                />
              </div>

              <CustomSelect
                label="Rol"
                options={["OPERARIO", "RESIDENTE", "OFICINA"]}
                value={empleado.rol || ""}
                onChange={setRol}
                placeholder="SELECCIONAR..."
              />

              <CustomSelect
                label="Tipo"
                options={["CAMPO", "OFICINA"]}
                value={empleado.tipo}
                onChange={setTipo}
                placeholder="SELECCIONAR..."
              />

              <CustomSelect
                label="Estado"
                options={["ACTIVO", "INACTIVO"]}
                value={empleado.estado || "ACTIVO"}
                onChange={(val) =>
                  setEmpleado({ ...empleado, estado: String(val || "ACTIVO") })
                }
                placeholder="SELECCIONAR..."
              />

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                  Tipo de pago
                </label>
                <input
                  type="text"
                  value={String(empleado.tipoPago || "DIARIO").toUpperCase()}
                  readOnly
                  className="w-full bg-[#F9F9F6] border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black uppercase outline-none shadow-sm text-slate-700"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-medium text-slate-500">
                  El cargo de catálogo autocompleta valores, pero puedes ajustarlos manualmente.
                </p>

                {usaCatalogo ? (
                  <button
                    type="button"
                    onClick={limpiarCargoCatalogo}
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 transition hover:border-[#FCB017] hover:text-[#C98500]"
                  >
                    <i className="pi pi-times text-[10px]" />
                    Quitar vínculo catálogo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-black/5 bg-[#FFF8E8] p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCB017]/15 text-[#C98500]">
                  <i className="pi pi-key text-[12px]" />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C98500]">
                    Acceso al portal
                  </p>
                  <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-600">
                    {textoAcceso}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                label="Proyecto"
                options={opcionesProyectos}
                value={empleado.proyecto}
                onChange={(val) => setEmpleado({ ...empleado, proyecto: val })}
                placeholder="SIN ASIGNAR..."
              />

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                  Fecha de contratación
                </label>
                <input
                  type="date"
                  value={empleado.fechaContratacion}
                  onChange={(e) =>
                    setEmpleado({ ...empleado, fechaContratacion: e.target.value })
                  }
                  className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[10px] font-black outline-none h-[50px] focus:border-black transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5 space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                    Configuración de pago
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-slate-500">
                    {esMensual ? "Salario mensual" : "Jornal diario"}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                  <i className="pi pi-briefcase text-[10px] text-[#C98500]" />
                  {usaCatalogo ? "Desde catálogo" : "Manual"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {esMensual ? (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                      Salario mensual
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                      value={empleado.salarioMensual}
                      onChange={onChangeNumero("salarioMensual")}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                        Valor por día
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                        value={empleado.valorDia}
                        onChange={onChangeNumero("valorDia")}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                        Valor hora extra
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                        value={empleado.valorHoraExtra}
                        onChange={onChangeNumero("valorHoraExtra")}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[1.2rem] border border-black/5 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Referencia principal
                  </p>
                  <p className="mt-2 text-[15px] font-black text-slate-800">
                    {esMensual
                      ? money(empleado.salarioMensual || 0)
                      : money(empleado.valorDia || 0)}
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-black/5 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {esMensual ? "Tipo de pago" : "Hora extra"}
                  </p>
                  <p className="mt-2 text-[15px] font-black text-[#C98500]">
                    {esMensual
                      ? String(empleado.tipoPago || "MENSUAL").toUpperCase()
                      : money(empleado.valorHoraExtra || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-[12px] font-semibold text-slate-600 transition hover:border-black/20 hover:text-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-800 px-6 py-3 text-[12px] font-semibold text-white transition hover:bg-[#FCB017]"
              >
                <i className={`pi ${editando ? "pi-check" : "pi-plus"} text-[11px]`} />
                <span>
                  {editando
                    ? "Guardar cambios"
                    : modoAsignacion === "duplicar"
                    ? "Crear asignación"
                    : modoAsignacion === "mover"
                    ? "Mover asignación"
                    : "Crear empleado"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalFormModal;