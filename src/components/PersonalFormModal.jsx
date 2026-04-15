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
                  {editando ? "Actualizar empleado" : "Nuevo empleado"}
                </span>
              </div>

              <h3 className="mt-3 text-[28px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none">
                {editando ? "Editar empleado" : "Nuevo empleado"}
              </h3>

              {editando && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
                  <i className="pi pi-pencil text-[11px]" />
                  <span>Edición activa</span>
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

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                  Cargo
                </label>
                <input
                  required
                  type="text"
                  placeholder="EJ. ALBAÑIL / MAESTRO / RESIDENTE"
                  className="w-full bg-white border border-black/5 px-4 py-3.5 rounded-xl text-[16px] md:text-[11px] font-black uppercase outline-none focus:border-black transition-all shadow-sm"
                  value={empleado.cargo}
                  onChange={(e) => setEmpleado({ ...empleado, cargo: e.target.value })}
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

              <div className="md:col-span-2">
                <p className="text-[11px] font-medium text-slate-500">
                  El rol recomienda el tipo, pero puedes ajustarlo manualmente.
                </p>
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
                    {esOficina ? "Salario mensual" : "Jornal diario"}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                  <i className="pi pi-wallet text-[11px]" />
                  <span>{esOficina ? "OFICINA" : "CAMPO"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!esOficina ? (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                      Valor día
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">
                        $
                      </span>
                      <input
                        required
                        type="number"
                        step="any"
                        min="0"
                        className="w-full bg-white border border-black/5 px-4 py-3.5 pl-8 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                        value={empleado.valorDia}
                        onChange={onChangeNumero("valorDia")}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                      Salario mensual
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">
                        $
                      </span>
                      <input
                        required
                        type="number"
                        step="any"
                        min="0"
                        className="w-full bg-white border border-black/5 px-4 py-3.5 pl-8 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                        value={empleado.salarioMensual ?? ""}
                        onChange={onChangeNumero("salarioMensual")}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase ml-3 md:ml-4 opacity-40 tracking-widest">
                    Valor hora extra
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-black/30">
                      $
                    </span>
                    <input
                      required
                      type="number"
                      step="any"
                      min="0"
                      className="w-full bg-white border border-black/5 px-4 py-3.5 pl-8 rounded-xl text-[16px] md:text-[11px] font-black outline-none focus:border-black transition-all shadow-sm"
                      value={empleado.valorHoraExtra}
                      onChange={onChangeNumero("valorHoraExtra")}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                {esOficina
                  ? "Oficina usa salario mensual. No aparece en mano de obra."
                  : "Campo usa jornal diario. Aparece en mano de obra si el rol es OPERARIO."}
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 text-white py-4.5 md:py-5 rounded-full font-semibold text-[14px] uppercase tracking-[0.16em] hover:bg-[#FCB017] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <i className="pi pi-check text-[12px]" />
              {editando ? "Actualizar" : "Guardar"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-[11px] font-semibold text-slate-400 hover:text-slate-700 py-1 text-center"
            >
              Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalFormModal;