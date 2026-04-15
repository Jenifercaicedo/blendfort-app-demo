import React, { useMemo, useState } from "react";
import logo from "../assets/blendfort-logo-largo.png";
import { useClienteAccess } from "../context/ClienteAccessContext";
import CustomSelect from "../components/CustomSelect";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const iso10 = (d) => String(d || "").slice(0, 10);

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusTone = (estado) => {
  const e = normalize(estado);

  if (e === "PAGADO") return "bg-green-50 text-green-700 border-green-200";
  if (e === "COMPLETADO") return "bg-blue-50 text-blue-700 border-blue-200";
  if (e === "PENDIENTE") return "bg-amber-50 text-amber-700 border-amber-200";

  return "bg-slate-50 text-slate-600 border-slate-200";
};

const cajaTone = (estado) => {
  const e = normalize(estado);

  if (e === "DISPONIBLE") return "bg-green-50 text-green-700 border-green-200";
  if (e === "POR AGOTARSE") return "bg-amber-50 text-amber-700 border-amber-200";
  if (e === "AGOTADA") return "bg-red-50 text-red-700 border-red-200";
  if (e === "EXCEDIDA") return "bg-red-100 text-red-800 border-red-200";

  return "bg-slate-50 text-slate-600 border-slate-200";
};

const KpiCard = ({ icon, label, value, hint }) => (
  <div className="rounded-[1.4rem] border border-[#FCB017]/25 bg-white p-3.5 md:p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] md:text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">
          {label}
        </p>
        <h3 className="mt-2 text-[19px] md:text-[26px] font-black tracking-tight text-slate-800 leading-none">
          {value}
        </h3>
        {hint ? (
          <p className="mt-2 text-[11px] md:text-[12px] font-medium text-slate-500 leading-snug">
            {hint}
          </p>
        ) : null}
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]">
        <i className={`${icon} text-[14px]`} />
      </div>
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white px-5 py-10 text-center">
    <p className="text-[13px] font-semibold text-slate-500">{message}</p>
  </div>
);

const InfoChip = ({ icon, children, tone = "default" }) => {
  const toneClass =
    tone === "accent"
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

const EgresoMobileCard = ({ item }) => (
  <div className="rounded-[1.3rem] border border-black/6 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <i className="pi pi-calendar text-[11px]" />
          <span>{iso10(item?.fecha)}</span>
        </div>

        <p className="mt-2 text-[14px] font-black text-slate-800 leading-snug">
          {normalize(item?.concepto || item?.detalles || "SIN DESCRIPCIÓN")}
        </p>

        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
          <i className="pi pi-tag text-[10px]" />
          <span>{normalize(item?.categoria || "SIN CATEGORÍA")}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[14px] font-black text-slate-800">{money(item?.valor)}</p>
        <span
          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone(
            item?.estado
          )}`}
        >
          {normalize(item?.estado || "PENDIENTE")}
        </span>
      </div>
    </div>
  </div>
);

const DesembolsoMobileCard = ({ item }) => (
  <div className="rounded-[1.3rem] border border-black/6 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <i className="pi pi-calendar text-[11px]" />
          <span>{iso10(item?.fecha_desembolso)}</span>
        </div>

        <p className="mt-2 text-[14px] font-black text-slate-800">
          {money(item?.monto_desembolsado)}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            Antes: {normalize(item?.estado_antes || "SIN FONDO")}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cajaTone(
            item?.estado_nuevo
          )}`}
        >
          {normalize(item?.estado_nuevo || "SIN FONDO")}
        </span>
      </div>
    </div>
  </div>
);

const ClienteDashboard = () => {
  const {
    clienteSesion,
    clienteDashboard,
    dashboardLoading,
    clienteError,
    logoutCliente,
    recargarDashboardCliente,
  } = useClienteAccess();

  const [tabActiva, setTabActiva] = useState("egresos");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [showFiltrosMobile, setShowFiltrosMobile] = useState(false);

  const resumen = clienteDashboard?.resumen || {};
  const proyecto = clienteDashboard?.proyecto || clienteSesion?.proyecto || {};
  const egresos = clienteDashboard?.egresos || [];
  const desembolsos = clienteDashboard?.desembolsos || [];

  const egresosVisibles = useMemo(() => {
    return (egresos || []).filter(
      (e) => normalize(e?.estado || "PENDIENTE") !== "ANULADO"
    );
  }, [egresos]);

  const categorias = useMemo(() => {
    return [
      ...new Set(
        (egresosVisibles || []).map((e) => normalize(e?.categoria)).filter(Boolean)
      ),
    ];
  }, [egresosVisibles]);

  const egresosFiltrados = useMemo(() => {
    return (egresosVisibles || []).filter((e) => {
      const okCategoria =
        !filtroCategoria || normalize(e?.categoria) === normalize(filtroCategoria);

      const okFecha = !filtroFecha || iso10(e?.fecha) === iso10(filtroFecha);

      return okCategoria && okFecha;
    });
  }, [egresosVisibles, filtroCategoria, filtroFecha]);

  const hayFiltros = Boolean(filtroCategoria || filtroFecha);

  const limpiarFiltros = () => {
    setFiltroCategoria("");
    setFiltroFecha("");
  };

  return (
    <div className="min-h-screen bg-[#F6F6F1] px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <div className="rounded-[1.8rem] border border-[#FCB017]/20 bg-white px-4 py-4 md:px-6 md:py-5 shadow-[0_16px_45px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 ">
              <img
                src={logo}
                alt="Blendfort"
                className="h-20 md:h-22 lg:h-25 w-auto object-contain"
              />

              <div className="text-center">
                <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
                  <i className="pi pi-briefcase text-[11px]" />
                  <span>Portal cliente</span>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-self-end">
                <button
                  type="button"
                  onClick={() => recargarDashboardCliente()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 md:px-4 text-[11px] md:text-[12px] font-semibold text-slate-700 transition hover:border-[#FCB017] hover:text-[#C98500]"
                  title="Actualizar"
                >
                  <i className="pi pi-refresh text-[12px]" />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>

                <button
                  type="button"
                  onClick={logoutCliente}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-800 px-3 md:px-4 text-[11px] md:text-[12px] font-semibold text-white transition hover:bg-[#FCB017]"
                  title="Salir"
                >
                  <i className="pi pi-sign-out text-[12px]" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-[24px] md:text-[34px] font-black tracking-tight text-slate-800 leading-tight">
                {normalize(proyecto?.nombre || resumen?.proyecto || "PROYECTO")}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
                <InfoChip icon="pi pi-user" tone="accent">
                  {normalize(resumen?.nombreCliente || "CLIENTE")}
                </InfoChip>

                <InfoChip icon="pi pi-id-card">
                  {normalize(resumen?.residente || "SIN RESIDENTE")}
                </InfoChip>

                {resumen?.ubicacion ? (
                  <InfoChip icon="pi pi-map-marker">
                    {normalize(resumen?.ubicacion)}
                  </InfoChip>
                ) : null}

                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${cajaTone(
                    resumen?.estadoCajaChica
                  )}`}
                >
                  <i className="pi pi-wallet text-[11px]" />
                  <span>{normalize(resumen?.estadoCajaChica || "SIN FONDO")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {clienteError ? (
          <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-4">
            <p className="text-[12px] font-semibold text-red-700">{clienteError}</p>
          </div>
        ) : null}

        {dashboardLoading ? (
          <div className="rounded-[1.8rem] border border-black/5 bg-white px-6 py-16 text-center shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
            <p className="text-[13px] font-semibold text-slate-500">
              Cargando información del proyecto...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <KpiCard
                icon="pi pi-arrow-down-left"
                label="Ingresos"
                value={money(resumen?.totalIngresosCajaChica || 0)}
                hint="Desembolsos"
              />
              <KpiCard
                icon="pi pi-arrow-up-right"
                label="Egresos"
                value={money(resumen?.totalEgresos || 0)}
                hint="Registrados"
              />
              <KpiCard
                icon="pi pi-wallet"
                label="Saldo actual"
                value={money(resumen?.saldoActualCajaChica || 0)}
                hint="Disponible"
              />
              <KpiCard
                icon="pi pi-chart-bar"
                label="Presupuesto"
                value={money(resumen?.presupuesto || 0)}
                hint={
                  resumen?.tiempo
                    ? normalize(resumen?.tiempo)
                    : "Sin tiempo definido"
                }
              />
            </div>

            <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-black/5 px-4 py-4 md:px-5 md:py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#C98500] uppercase">
                      Movimientos
                    </p>
                    <h2 className="mt-2 text-[22px] md:text-[26px] font-black tracking-tight text-slate-800">
                      Movimientos del proyecto
                    </h2>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="flex gap-2 rounded-full bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setTabActiva("egresos")}
                        className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${
                          tabActiva === "egresos"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i className="pi pi-wallet text-[11px]" />
                          <span>Egresos</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTabActiva("desembolsos")}
                        className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${
                          tabActiva === "desembolsos"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i className="pi pi-credit-card text-[11px]" />
                          <span>Desembolsos</span>
                        </span>
                      </button>
                    </div>

                    {tabActiva === "egresos" ? (
                      <div className="md:hidden flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFiltrosMobile((v) => !v)}
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition ${
                            showFiltrosMobile
                              ? "border-[#FCB017] text-[#C98500] bg-[#FFF8E8]"
                              : "border-black/10 text-slate-600 bg-white"
                          }`}
                          title="Filtros"
                        >
                          <i className="pi pi-filter text-[13px]" />
                          {hayFiltros && (
                            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#FCB017]" />
                          )}
                        </button>

                        {hayFiltros ? (
                          <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-600 transition hover:border-[#FCB017] hover:text-[#C98500]"
                            title="Limpiar filtros"
                          >
                            <i className="pi pi-filter-slash text-[13px]" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {tabActiva === "egresos" && (
                  <>
                    <div className="hidden md:grid grid-cols-[minmax(220px,1fr)_220px_auto] gap-4 items-end">
                      <CustomSelect
                        label="Categoría"
                        options={["TODAS", ...(categorias || [])]}
                        value={filtroCategoria ? filtroCategoria : "TODAS"}
                        onChange={(val) => {
                          const v = String(val || "");
                          setFiltroCategoria(v === "TODAS" ? "" : v);
                        }}
                        placeholder="TODAS"
                        allowCustom={false}
                      />

                      <div className="space-y-1">
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

                      <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="h-[50px] inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-[12px] font-semibold text-slate-600 transition hover:border-[#FCB017] hover:text-[#C98500]"
                      >
                        <i className="pi pi-filter-slash text-[12px]" />
                        <span>Limpiar filtros</span>
                      </button>
                    </div>

                    {showFiltrosMobile && (
                      <div className="md:hidden grid grid-cols-1 gap-4 pt-1">
                        <CustomSelect
                          label="Categoría"
                          options={["TODAS", ...(categorias || [])]}
                          value={filtroCategoria ? filtroCategoria : "TODAS"}
                          onChange={(val) => {
                            const v = String(val || "");
                            setFiltroCategoria(v === "TODAS" ? "" : v);
                          }}
                          placeholder="TODAS"
                          allowCustom={false}
                        />

                        <div className="space-y-1">
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
                      </div>
                    )}
                  </>
                )}
              </div>

              {tabActiva === "egresos" && (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50/80">
                        <tr className="border-b border-black/5">
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Fecha
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Categoría
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Concepto
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Valor
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Estado
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {egresosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-5 py-10">
                              <EmptyState message="No hay egresos para mostrar." />
                            </td>
                          </tr>
                        ) : (
                          egresosFiltrados.map((eg) => (
                            <tr
                              key={eg.id}
                              className="border-b border-black/5 last:border-b-0"
                            >
                              <td className="px-5 py-4 text-[13px] font-semibold text-slate-600">
                                <div className="flex items-center gap-2">
                                  <i className="pi pi-calendar text-[11px] text-slate-400" />
                                  <span>{iso10(eg?.fecha)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[13px] font-bold text-slate-800">
                                {normalize(eg?.categoria || "SIN CATEGORÍA")}
                              </td>
                              <td className="px-5 py-4 text-[13px] font-bold text-slate-800">
                                {normalize(
                                  eg?.concepto || eg?.detalles || "SIN DESCRIPCIÓN"
                                )}
                              </td>
                              <td className="px-5 py-4 text-[13px] font-black text-slate-800">
                                {money(eg?.valor)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusTone(
                                    eg?.estado
                                  )}`}
                                >
                                  {normalize(eg?.estado || "PENDIENTE")}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {egresosFiltrados.length === 0 ? (
                      <EmptyState message="No hay egresos para mostrar." />
                    ) : (
                      egresosFiltrados.map((eg) => (
                        <EgresoMobileCard key={eg.id} item={eg} />
                      ))
                    )}
                  </div>
                </>
              )}

              {tabActiva === "desembolsos" && (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50/80">
                        <tr className="border-b border-black/5">
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Fecha
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Monto
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Estado antes
                          </th>
                          <th className="px-5 py-4 text-left text-[12px] font-bold text-slate-500">
                            Estado nuevo
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {desembolsos.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-5 py-10">
                              <EmptyState message="No hay desembolsos registrados." />
                            </td>
                          </tr>
                        ) : (
                          desembolsos.map((d) => (
                            <tr
                              key={d.id}
                              className="border-b border-black/5 last:border-b-0"
                            >
                              <td className="px-5 py-4 text-[13px] font-semibold text-slate-600">
                                <div className="flex items-center gap-2">
                                  <i className="pi pi-calendar text-[11px] text-slate-400" />
                                  <span>{iso10(d?.fecha_desembolso)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[13px] font-black text-slate-800">
                                {money(d?.monto_desembolsado)}
                              </td>
                              <td className="px-5 py-4 text-[13px] font-bold text-slate-700">
                                {normalize(d?.estado_antes || "SIN FONDO")}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${cajaTone(
                                    d?.estado_nuevo
                                  )}`}
                                >
                                  {normalize(d?.estado_nuevo || "SIN FONDO")}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {desembolsos.length === 0 ? (
                      <EmptyState message="No hay desembolsos registrados." />
                    ) : (
                      desembolsos.map((d) => (
                        <DesembolsoMobileCard key={d.id} item={d} />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClienteDashboard;