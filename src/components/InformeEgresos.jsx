import React, { useMemo, useState } from "react";
import FilterSelect from "./FilterSelect";
import TablaAdmin from "./TablaAdmin";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isPayrollRecord = (e) => {
  const cat = normalize(e?.categoria);
  const tipo = normalize(e?.tipoRegistro || e?.tipo_registro);
  return cat === "MANO DE OBRA" || tipo === "REPORTE_DIARIO";
};

const isOperationalExpense = (e) => !isPayrollRecord(e);

const shouldCountOperationalTotals = (e) => {
  const est = normalize(e?.estado || "PENDIENTE");
  if (est === "ANULADO") return false;
  if (!isOperationalExpense(e)) return false;
  return true;
};

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const InfoPill = ({ icon, children, accent = false, tone = "default" }) => {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : accent
      ? "bg-[#FFF8E8] text-[#C98500] border-[#FCB017]/20"
      : "bg-slate-100 text-slate-600 border-transparent";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${toneClass}`}
    >
      <i className={`${icon} text-[11px]`} />
      <span className="truncate">{children}</span>
    </div>
  );
};

const InformeEgresos = ({
  egresos,
  filtroProyecto,
  setFiltroProyecto,
  filtroResidente,
  setFiltroResidente,
  filtroFecha,
  setFiltroFecha,
  opcionesProyectos,
  opcionesResidentes,
  limpiarFiltros,
  prepararEdicion,
  setIdAEliminar,
  setEgresoSeleccionado,
  editandoId,
  totalFiltrado,
  onBack,
  onNuevoEgreso,
}) => {
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const egresosBase = useMemo(() => {
    return (egresos || []).filter((e) => isOperationalExpense(e));
  }, [egresos]);

  const opcionesCategorias = useMemo(() => {
    const unique = [
      ...new Set(egresosBase.map((e) => normalize(e?.categoria)).filter(Boolean)),
    ]
      .filter((c) => c !== "MANO DE OBRA")
      .sort();

    if (!unique.includes("OFICINA")) {
      unique.push("OFICINA");
    }

    return unique;
  }, [egresosBase]);

  const egresosFiltrados = useMemo(() => {
    return egresosBase.filter((e) => {
      if (!filtroCategoria) return true;
      return normalize(e?.categoria) === normalize(filtroCategoria);
    });
  }, [egresosBase, filtroCategoria]);

  const hayFiltros = useMemo(
    () => Boolean(filtroProyecto || filtroResidente || filtroFecha || filtroCategoria),
    [filtroProyecto, filtroResidente, filtroFecha, filtroCategoria]
  );

  const totalContable = useMemo(() => {
    return (egresosFiltrados || []).reduce((acc, curr) => {
      if (!shouldCountOperationalTotals(curr)) return acc;
      return acc + (Number(curr?.valor) || 0);
    }, 0);
  }, [egresosFiltrados]);

  const limpiarTodo = () => {
    setFiltroCategoria("");
    limpiarFiltros?.();
  };

  const filtrosUI = (
    <div className="rounded-[1.6rem] border border-black/5 bg-white p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-3">
          <FilterSelect
            label="Proyecto"
            options={opcionesProyectos}
            value={filtroProyecto}
            onChange={setFiltroProyecto}
            placeholder="TODOS..."
          />
        </div>

        <div className="md:col-span-3">
          <FilterSelect
            label="Residente"
            options={opcionesResidentes}
            value={filtroResidente}
            onChange={setFiltroResidente}
            placeholder="TODOS..."
          />
        </div>

        <div className="md:col-span-3">
          <FilterSelect
            label="Categoría"
            options={opcionesCategorias}
            value={filtroCategoria}
            onChange={setFiltroCategoria}
            placeholder="TODAS..."
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
            Fecha
          </label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full bg-white border border-black/5 p-4 rounded-xl text-[10px] font-black outline-none h-[50px] focus:border-black transition-all shadow-sm"
          />
        </div>

        {hayFiltros && (
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={limpiarTodo}
              type="button"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-slate-600 transition-all active:scale-95 hover:border-[#FCB017] hover:text-[#C98500] shadow-sm h-[50px]"
            >
              <i className="pi pi-filter-slash text-[12px]" />
              <span className="hidden lg:inline text-[12px] font-semibold">
                Limpiar
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
            <i className="pi pi-wallet text-[11px]" />
            <span>Control de egresos</span>
          </div>

          <h2 className="mt-3 text-[28px] md:text-[34px] xl:text-[38px] font-black tracking-tight text-slate-800 leading-none">
            Egresos operativos
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <InfoPill icon="pi pi-info-circle" accent>
              Sin mano de obra
            </InfoPill>

            {filtroCategoria ? (
              <InfoPill icon="pi pi-tag">{normalize(filtroCategoria)}</InfoPill>
            ) : null}
          </div>
        </div>

        <div className="w-full xl:w-auto flex flex-col gap-3 xl:items-end">
          <div className="rounded-[1.5rem] border border-[#FCB017]/20 bg-[#FFF8E8] px-4 py-3 md:px-5 md:py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] xl:min-w-[280px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C98500]">
              Total filtrado operativo
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-[11px] font-black text-[#C98500] uppercase tracking-[0.12em]">
                USD
              </span>
              <span className="text-[24px] md:text-[30px] font-black tracking-tight text-slate-800 leading-none">
                $ {money(totalContable)}
              </span>
            </div>
          </div>

          <div className="flex justify-end items-center gap-2">
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
              onClick={onNuevoEgreso}
              className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 md:px-4 md:py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017] active:scale-95 shadow-sm"
              aria-label="Nuevo egreso"
              title="Nuevo egreso"
            >
              <i className="pi pi-plus text-[12px]" />
              <span>Nuevo egreso</span>
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block">{filtrosUI}</div>

      {showFiltros && (
        <div className="md:hidden animate-in fade-in zoom-in duration-300">
          {filtrosUI}
        </div>
      )}

      <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
        <TablaAdmin
          egresos={egresosFiltrados}
          onEdit={prepararEdicion}
          onDelete={setIdAEliminar}
          onSelect={setEgresoSeleccionado}
          editandoId={editandoId}
          totalFiltrado={totalContable}
        />
      </div>
    </div>
  );
};

export default InformeEgresos;