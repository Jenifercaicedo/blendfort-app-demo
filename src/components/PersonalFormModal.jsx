import React from "react";
import CustomSelect from "./CustomSelect";

const PersonalFormModal = ({
  show,
  onClose,
  onSave,
  editando,
  empleado,
  setEmpleado,
  opcionesProyectos,
  nombreInputRef,
}) => {
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

  const esOficina = empleado.tipo === "OFICINA";

  return (
    <div
      className="fixed inset-0 z-[210] overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-2xl rounded-[2.4rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          <div className="relative pt-8 md:pt-12 px-6 md:px-12 pb-5 md:pb-6 border-b border-black/5">
            <div className="space-y-2 pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 md:w-8 h-[2px] bg-blendfort-naranja"></div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.32em] md:tracking-[0.5em] text-black/40">
                  {editando ? "Update Employee" : "New Employee"}
                </span>
              </div>

              <h3 className="text-[1.8rem] md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                {editando ? "Editar Empleado" : "Nuevo Empleado"}
              </h3>

              {editando && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja"></span>
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-black/50">
                    EDICIÓN ACTIVA
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 md:top-8 right-5 md:right-8 bg-black text-white p-2.5 md:p-3 rounded-full hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={onSave} className="p-6 pt-6 md:p-12 md:pt-8 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Nombre completo
                </label>
                <input
                  ref={nombreInputRef}
                  required
                  type="text"
                  placeholder="EJ. JUAN PÉREZ"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={empleado.nombre}
                  onChange={(e) => setEmpleado({ ...empleado, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Cargo
                </label>
                <input
                  required
                  type="text"
                  placeholder="EJ. ALBAÑIL / MAESTRO / RESIDENTE"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 md:p-4.5 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={empleado.cargo}
                  onChange={(e) => setEmpleado({ ...empleado, cargo: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <CustomSelect
                  label="Rol"
                  options={["OPERARIO", "RESIDENTE", "OFICINA"]}
                  value={empleado.rol || ""}
                  onChange={setRol}
                  placeholder="SELECCIONAR..."
                />
              </div>

              <div className="space-y-1">
                <CustomSelect
                  label="Tipo"
                  options={["CAMPO", "OFICINA"]}
                  value={empleado.tipo}
                  onChange={setTipo}
                  placeholder="SELECCIONAR..."
                />
              </div>

              <div className="space-y-1">
                <CustomSelect
                  label="Estado"
                  options={["ACTIVO", "INACTIVO"]}
                  value={empleado.estado || "ACTIVO"}
                  onChange={(val) =>
                    setEmpleado({ ...empleado, estado: String(val || "ACTIVO") })
                  }
                  placeholder="SELECCIONAR..."
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 ml-3 md:ml-4 mt-1">
                  El rol recomienda el tipo, pero puedes ajustarlo manualmente
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <CustomSelect
                label="Proyecto"
                options={opcionesProyectos}
                value={empleado.proyecto}
                onChange={(val) => setEmpleado({ ...empleado, proyecto: val })}
                placeholder="SIN ASIGNAR..."
              />

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Fecha de contratación
                </label>
                <input
                  type="date"
                  value={empleado.fechaContratacion}
                  onChange={(e) => setEmpleado({ ...empleado, fechaContratacion: e.target.value })}
                  className="w-full bg-white border border-black/5 px-4 py-3.5 md:p-4 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[10px] font-black outline-none h-[54px] focus:border-black transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="bg-blendfort-fondo p-5 md:p-6 rounded-[1.8rem] md:rounded-[2.5rem] border border-black/5 space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-[8px] font-black uppercase tracking-[0.4em] text-black/30">
                  Payment Setup
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50">
                  {esOficina ? "Salario mensual" : "Jornal diario"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!esOficina ? (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                      Valor Día
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">
                        $
                      </span>
                      <input
                        required
                        type="number"
                        step="any"
                        min="0"
                        className="w-full bg-white px-4 py-3.5 md:p-4 pl-10 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:border-black/5 transition-all"
                        value={empleado.valorDia}
                        onChange={onChangeNumero("valorDia")}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                      Salario Mensual
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">
                        $
                      </span>
                      <input
                        required
                        type="number"
                        step="any"
                        min="0"
                        className="w-full bg-white px-4 py-3.5 md:p-4 pl-10 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:border-black/5 transition-all"
                        value={empleado.salarioMensual ?? ""}
                        onChange={onChangeNumero("salarioMensual")}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                    Valor Hora Extra
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">
                      $
                    </span>
                    <input
                      required
                      type="number"
                      step="any"
                      min="0"
                      className="w-full bg-white px-4 py-3.5 md:p-4 pl-10 rounded-[1.1rem] md:rounded-2xl text-[16px] md:text-[11px] font-black outline-none border border-transparent focus:border-black/5 transition-all"
                      value={empleado.valorHoraExtra}
                      onChange={onChangeNumero("valorHoraExtra")}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 ml-1 leading-relaxed">
                {esOficina
                  ? "Oficina usa salario mensual. No aparece en mano de obra."
                  : "Campo usa jornal diario. Aparece en mano de obra si el rol es OPERARIO."}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-5 md:py-7 rounded-full font-black text-[15px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.5em] hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 md:gap-4"
            >
              {editando ? "Actualizar" : "Guardar"}
              <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center tracking-widest"
            >
              ← Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalFormModal;