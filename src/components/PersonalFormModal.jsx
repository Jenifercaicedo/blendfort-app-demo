// PersonalFormModal.jsx
import React from "react";
import CustomSelect from "../components/CustomSelect";

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

    // Limpieza de campos incompatibles (consistencia)
    if (tipo === "OFICINA") {
      updated.valorDia = "";
      if (updated.salarioMensual === undefined) updated.salarioMensual = "";
    } else {
      updated.salarioMensual = "";
    }

    return updated;
  };

  const setRol = (rol) => {
    // Regla de negocio:
    // OPERARIO -> CAMPO
    // RESIDENTE -> OFICINA
    // OFICINA -> OFICINA
    let next = { ...empleado, rol };

    if (rol === "OPERARIO") next = aplicarTipo(next, "CAMPO");
    if (rol === "RESIDENTE") next = aplicarTipo(next, "OFICINA");
    if (rol === "OFICINA") next = aplicarTipo(next, "OFICINA");

    setEmpleado(next);
  };

  const setTipo = (tipo) => {
    // Si el usuario cambia manualmente el tipo (aunque rol lo sugiera),
    // mantenemos coherencia de valores.
    setEmpleado(aplicarTipo(empleado, tipo));
  };

  const esOficina = empleado.tipo === "OFICINA";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col my-auto animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="relative pt-12 px-12 pb-6 flex justify-between items-end border-b border-black/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">
                {editando ? "Update Employee" : "New Employee"}
              </span>
            </div>
            <h3 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
              {editando ? "Editar Empleado" : "Nuevo Empleado"}
            </h3>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="absolute top-8 right-8 bg-black text-white p-3 rounded-full hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSave} className="p-12 pt-8 space-y-8">
          {/* Identificación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">
                Nombre completo
              </label>
              <input
                ref={nombreInputRef}
                required
                type="text"
                placeholder="EJ. JUAN PÉREZ"
                className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={empleado.nombre}
                onChange={(e) => setEmpleado({ ...empleado, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Cargo</label>
              <input
                required
                type="text"
                placeholder="EJ. ALBAÑIL / MAESTRO / RESIDENTE"
                className="w-full bg-blendfort-fondo p-4.5 rounded-2xl text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                value={empleado.cargo}
                onChange={(e) => setEmpleado({ ...empleado, cargo: e.target.value })}
              />
            </div>

            {/* Rol */}
            <div className="space-y-1">
              <CustomSelect
                label="Rol"
                options={["OPERARIO", "RESIDENTE", "OFICINA"]}
                value={empleado.rol || ""}
                onChange={setRol}
                placeholder="SELECCIONAR..."
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1 md:col-span-2">
              <CustomSelect
                label="Tipo"
                options={["CAMPO", "OFICINA"]}
                value={empleado.tipo}
                onChange={setTipo}
                placeholder="SELECCIONAR..."
              />
              <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 ml-4 mt-2">
                Rol recomendado define tipo automáticamente
              </div>
            </div>
          </div>

          {/* Asignación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CustomSelect
              label="Proyecto"
              options={opcionesProyectos}
              value={empleado.proyecto}
              onChange={(val) => setEmpleado({ ...empleado, proyecto: val })}
              placeholder="SIN ASIGNAR..."
            />

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Fecha de contratación</label>
              <input
                type="date"
                value={empleado.fechaContratacion}
                onChange={(e) => setEmpleado({ ...empleado, fechaContratacion: e.target.value })}
                className="w-full bg-white border border-black/5 p-4 rounded-2xl text-[10px] font-black outline-none h-[53px] focus:border-black transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Valores */}
          <div className="bg-blendfort-fondo p-6 rounded-[2.5rem] border border-black/5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black uppercase tracking-[0.4em] text-black/30">
                Payment Setup
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50">
                {esOficina ? "Salario mensual" : "Jornal diario"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo dinámico: Valor Día vs Salario Mensual */}
              {!esOficina ? (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Valor Día</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">$</span>
                    <input
                      required
                      type="number"
                      step="any"
                      min="0"
                      className="w-full bg-white p-4 pl-10 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:border-black/5 transition-all"
                      value={empleado.valorDia}
                      onChange={onChangeNumero("valorDia")}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Salario Mensual</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">$</span>
                    <input
                      required
                      type="number"
                      step="any"
                      min="0"
                      className="w-full bg-white p-4 pl-10 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:border-black/5 transition-all"
                      value={empleado.salarioMensual ?? ""}
                      onChange={onChangeNumero("salarioMensual")}
                    />
                  </div>
                </div>
              )}

              {/* Hora extra siempre */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-4 opacity-30 tracking-widest">Valor Hora Extra</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">$</span>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0"
                    className="w-full bg-white p-4 pl-10 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:border-black/5 transition-all"
                    value={empleado.valorHoraExtra}
                    onChange={onChangeNumero("valorHoraExtra")}
                  />
                </div>
              </div>
            </div>

            <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 ml-1">
              {esOficina
                ? "Oficina usa salario mensual. No aparece en mano de obra."
                : "Campo usa jornal diario. Aparece en mano de obra si el rol es OPERARIO."}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-black text-white py-7 rounded-full font-black text-[11px] uppercase tracking-[0.5em] hover:bg-blendfort-naranja hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
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
  );
};

export default PersonalFormModal;