import React from "react";

const normU = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const formatFecha = (iso) => {
  if (!iso) return "NO REGISTRADA";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const money = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "$ 0.00";
  return `$ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PersonalDetailModal = ({ empleado, onClose, onEdit, onDelete }) => {
  if (!empleado) return null;

  const tipo = normU(empleado.tipo || "CAMPO");
  const rol = normU(empleado.rol || "OPERARIO");
  const esOficina = tipo === "OFICINA";

  const salarioMensual = empleado.salarioMensual ?? empleado.salario_mensual ?? "";
  const valorDia = empleado.valorDia ?? empleado.valor_dia ?? "";
  const valorHoraExtra = empleado.valorHoraExtra ?? empleado.valor_hora_extra ?? 0;

  const nombre = normU(empleado.nombre || "SIN NOMBRE");
  const cargo = normU(empleado.cargo || "SIN CARGO");
  const proyecto = normU(empleado.proyecto || "SIN ASIGNAR");

  return (
    <div
      className="fixed inset-0 z-[150] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-md rounded-[2.4rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-black/5 my-2 md:my-4 max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Header */}
          <div className="bg-black text-white relative px-7 sm:px-8 pt-9 sm:pt-10 pb-7 sm:pb-8">
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-blendfort-naranja transition-all"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-[2px] bg-blendfort-naranja"></div>
              <span className="text-[8px] font-black uppercase tracking-[0.45em] text-white/60">
                Employee Profile
              </span>
            </div>

            <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">
              {nombre}
            </h4>

            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50 mt-1">
              {cargo}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">
                  ROL
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {rol}
                </span>
              </span>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">
                  TIPO
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {tipo}
                </span>
              </span>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50">
                  PROY
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {proyecto}
                </span>
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 sm:p-8 space-y-6">
            {/* Identidad */}
            <div className="bg-blendfort-fondo rounded-[2.5rem] border border-black/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                  Identidad
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                  Datos generales
                </span>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                    Fecha contratación
                  </span>
                  <span className="font-black uppercase tracking-tight text-black text-right">
                    {formatFecha(empleado.fechaContratacion || empleado.fecha_contratacion)}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                    Proyecto
                  </span>
                  <span className="font-black uppercase tracking-tight text-black text-right max-w-[56%] truncate">
                    {proyecto}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                    Cargo
                  </span>
                  <span className="font-black uppercase tracking-tight text-black text-right max-w-[56%] truncate">
                    {cargo}
                  </span>
                </div>
              </div>
            </div>

            {/* Compensación */}
            <div className="bg-white rounded-[2.5rem] border border-black/5 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20">
                  Compensación
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                  {esOficina ? "Oficina" : "Campo"}
                </span>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                    Salario mensual
                  </span>
                  <span className="font-black uppercase tracking-tight text-black text-right">
                    {salarioMensual !== "" && salarioMensual !== null && salarioMensual !== undefined
                      ? money(salarioMensual)
                      : "—"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                    Valor día
                  </span>
                  <span className="font-black uppercase tracking-tight text-black text-right">
                    {valorDia !== "" && valorDia !== null && valorDia !== undefined
                      ? money(valorDia)
                      : "—"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">
                    Hora extra
                  </span>
                  <span className="font-black uppercase tracking-tight text-blendfort-naranja text-right">
                    {money(valorHoraExtra)}
                  </span>
                </div>

                <div className="pt-4 mt-2 border-t border-black/5 flex items-center justify-between gap-4">
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-[0.25em]">
                    Referencia principal
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-tight text-black text-right">
                    {esOficina
                      ? `${money(salarioMensual || 0)} / MES`
                      : `${money(valorDia || 0)} / DÍA`}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-[7px] font-black uppercase opacity-20 tracking-[0.3em]">
                PERFIL
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  type="button"
                  className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
                  aria-label="Editar"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>

                <button
                  onClick={onDelete}
                  type="button"
                  className="w-11 h-11 rounded-full bg-red-50 text-red-500/40 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20">
              Tip: edita el perfil para actualizar salarios y asignación
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailModal;