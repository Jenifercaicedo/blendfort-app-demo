// GestionProyectos.jsx
import React, { useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";

/* ===========================
   Helpers
=========================== */
const normU = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ✅ Regla: Mano de Obra solo suma si está PAGADO/COMPLETADO
const shouldCountInTotals = (e) => {
  const cat = normU(e?.categoria);
  const est = normU(e?.estado || "PENDIENTE");

  if (cat === "MANO DE OBRA") {
    return est === "PAGADO" || est === "COMPLETADO";
  }
  return true;
};

const GestionProyectos = ({
  proyectos = [],
  egresos = [],
  onEdit,
  onDelete,
  onBack,
  onNew,
}) => {
  // ✅ Hooks SIEMPRE arriba
  const [proyectoActivoIndex, setProyectoActivoIndex] = useState(0);

  const opcionesProyectos = useMemo(
    () => (proyectos || []).map((p) => p?.nombre).filter(Boolean),
    [proyectos]
  );

  // ✅ proyecto activo seguro (nunca revienta si cambia la lista)
  const safeIndex = useMemo(() => {
    if (!proyectos?.length) return 0;
    return Math.min(Math.max(0, proyectoActivoIndex), proyectos.length - 1);
  }, [proyectos?.length, proyectoActivoIndex]);

  const proy = proyectos?.[safeIndex] || null;

  // ✅ gasto acumulado por proyecto (CON regla MO)
  const gastoReal = useMemo(() => {
    const nombre = proy?.nombre;
    if (!nombre) return 0;

    return (egresos || [])
      .filter((e) => normU(e?.proyecto) === normU(nombre))
      .reduce((acc, curr) => {
        if (!shouldCountInTotals(curr)) return acc;
        return acc + (Number(curr?.valor) || 0);
      }, 0);
  }, [egresos, proy?.nombre]);

  const presupuesto = useMemo(() => Number(proy?.presupuesto) || 0, [proy?.presupuesto]);

  const porcentajeGasto = useMemo(() => {
    if (!presupuesto) return 0;
    return Math.min((gastoReal / presupuesto) * 100, 999); // dejamos pasar >100 para UI excedido
  }, [gastoReal, presupuesto]);

  const disponible = useMemo(() => presupuesto - gastoReal, [presupuesto, gastoReal]);
  const excedido = disponible < 0;

  // multi-residentes con fallback
  const residentes = useMemo(() => {
    if (Array.isArray(proy?.residentes) && proy.residentes.length) return proy.residentes;
    if (proy?.residente) return [proy.residente];
    return [];
  }, [proy]);

  /* ===========================
     Render: sin proyectos
  =========================== */
  if (!proyectos?.length) {
    return (
      <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
        <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl overflow-hidden">
          {/* TOP BAR */}
          <div className="flex justify-between items-center p-5 md:p-6 border-b border-black/5 bg-blendfort-fondo/30">
            <button
              onClick={onBack}
              className="flex items-center gap-3 group transition-all active:scale-95"
              type="button"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-black/30 group-hover:text-black">
                Volver
              </span>
            </button>

            <button
              onClick={onNew}
              type="button"
              className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black text-white transition-all active:scale-95 hover:bg-blendfort-naranja shadow-sm"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-light">+</span>
              </div>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em]">
                Proyecto
              </span>
            </button>
          </div>

          {/* BODY */}
          <div className="p-10 md:p-12 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.45em] text-black/20">
              No hay proyectos activos
            </div>
            <div className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black mt-4">
              Crea tu primer proyecto
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===========================
     Render: con proyectos
  =========================== */
  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto p-2 md:px-0">
      <div className="bg-white rounded-[3rem] md:rounded-[3.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
        {/* TOP BAR (no lo muevo) */}
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-black/5 bg-blendfort-fondo/30">
          <button
            onClick={onBack}
            className="flex items-center gap-3 group transition-all active:scale-95"
            type="button"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm">
              <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-black/30 group-hover:text-black">
              Volver
            </span>
          </button>

          <div className="flex-1 max-w-[180px] md:max-w-xs mx-3 md:mx-4">
            <CustomSelect
              label=""
              options={opcionesProyectos}
              value={proy?.nombre || ""}
              onChange={(val) => {
                const idx = proyectos.findIndex((p) => p?.nombre === val);
                setProyectoActivoIndex(idx >= 0 ? idx : 0);
              }}
              placeholder="PROYECTO..."
              allowCustom={false}
            />
          </div>

          <button
            onClick={onNew}
            type="button"
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black text-white transition-all active:scale-95 hover:bg-blendfort-naranja shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm font-light">+</span>
            </div>
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em]">
              Proyecto
            </span>
          </button>
        </div>

        {/* BODY */}
        <div className="p-7 md:p-10">
          {/* Header + acciones */}
          <div className="flex items-start justify-between gap-6 flex-wrap mb-7">
            <div className="min-w-[240px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-[2px] bg-blendfort-naranja"></div>
                <span className="text-[7px] md:text-[8px] font-black text-blendfort-naranja uppercase tracking-[0.4em]">
                  Project Dashboard
                </span>
              </div>

              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                {proy?.nombre}
              </h3>

              <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.25em] mt-2">
                {proy?.dueno} • {proy?.ubicacion}
              </p>
            </div>

            {/* Edit / Delete con texto en desktop */}
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(proy)}
                type="button"
                className="inline-flex items-center gap-2 px-3 py-3 bg-blendfort-fondo hover:bg-black hover:text-white rounded-xl md:rounded-2xl transition-all active:scale-90"
                title="Editar"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">
                  Editar
                </span>
              </button>

              <button
  onClick={() => onDelete?.(proy)}
  type="button"
  className="inline-flex items-center gap-2 px-3 py-3 bg-blendfort-fondo hover:bg-red-500 hover:text-white rounded-xl md:rounded-2xl transition-all text-red-500/30 active:scale-90"
  title="Eliminar"
>
  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
  <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">
    Eliminar
  </span>
</button>
            </div>
          </div>

          {/* Finance grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Inversión */}
            <div className="rounded-[2.5rem] border border-black/5 bg-white shadow-sm p-6 md:p-7">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-black/20">
                    Inversión acumulada
                  </div>
                  <div className="text-4xl md:text-5xl font-black tracking-tighter text-black mt-2">
                    $ {money(gastoReal)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-black text-black">{porcentajeGasto.toFixed(1)}%</div>
                  <div className="text-[6px] md:text-[7px] font-black uppercase tracking-[0.25em] text-black/20">
                    Consumo
                  </div>
                </div>
              </div>

              <div className="mt-5 w-full h-2.5 bg-blendfort-fondo rounded-full overflow-hidden p-[1px] border border-black/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${porcentajeGasto >= 100 ? "bg-red-500" : porcentajeGasto > 90 ? "bg-amber-500" : "bg-black"}`}
                  style={{ width: `${Math.min(porcentajeGasto, 100)}%` }}
                />
              </div>

              <div className="mt-4 flex justify-between items-center text-[7px] md:text-[8px] font-black uppercase tracking-widest text-black/30">
                <span>Presupuesto: $ {money(presupuesto)}</span>
                <span className="italic">{proy?.tiempo || "—"}</span>
              </div>
            </div>

            {/* Disponible + Residentes */}
            <div className="rounded-[2.5rem] border border-black/5 bg-blendfort-fondo/40 p-6 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-black/20">
                    Disponible
                  </div>

                  <div className={`text-3xl md:text-4xl font-black tracking-tighter mt-2 ${excedido ? "text-red-600" : "text-green-700"}`}>
                    $ {money(Math.abs(disponible))}
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                        excedido
                          ? "bg-red-50 border-red-200 text-red-600"
                          : "bg-green-50 border-green-200 text-green-700"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${excedido ? "bg-red-500" : "bg-green-500"}`} />
                      {excedido ? "EXCEDIDO" : "OK"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-black/20">
                    Capacidad
                  </div>
                  <div className="text-[11px] md:text-[12px] font-black text-black mt-2">
                    $ {money(presupuesto)}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[7px] font-black uppercase tracking-[0.3em] text-black/20 mb-3">
                  Residentes a cargo
                </div>

                {residentes.length ? (
                  <div className="flex flex-wrap gap-2">
                    {residentes.slice(0, 4).map((r, i) => (
                      <span key={`${r}-${i}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blendfort-naranja" />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-black/70">
                          {String(r).toUpperCase()}
                        </span>
                      </span>
                    ))}
                    {residentes.length > 4 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-black/5 text-[8px] font-black uppercase tracking-widest text-black/40">
                        +{residentes.length - 4}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-black/30">
                    Sin residente asignado
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-black/20" />
                  <span className="text-[7px] font-black opacity-30 uppercase">
                    {proy?.ubicacion || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* sin scroll extra */}
        </div>
      </div>
    </div>
  );
};

export default GestionProyectos;